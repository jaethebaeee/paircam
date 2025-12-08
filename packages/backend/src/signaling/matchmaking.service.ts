import { Injectable, Inject, forwardRef, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { SignalingGateway } from './signaling.gateway';
import { LoggerService } from '../services/logger.service';
import { MatchAnalyticsService } from '../analytics/match-analytics.service';
import { v4 as uuidv4 } from 'uuid';

// Configuration for matching system
export const MATCHING_CONFIG = {
  // Queue processing interval (ms)
  QUEUE_PROCESS_INTERVAL: 5000, // Process queue every 5 seconds

  // Match timeout settings
  MATCH_ACCEPT_TIMEOUT: 30000, // 30 seconds to accept match
  MATCH_CLEANUP_INTERVAL: 10000, // Check for expired matches every 10 seconds

  // Rematch cooldown settings (in seconds)
  REMATCH_COOLDOWN_FREE: 3600, // 1 hour for free users
  REMATCH_COOLDOWN_PREMIUM: 1800, // 30 minutes for premium users

  // Age matching settings
  DEFAULT_AGE_RANGE: 10, // ±10 years by default
  PREMIUM_AGE_RANGE: 5, // ±5 years for premium (more precise)

  // Priority boost for premium users
  PREMIUM_PRIORITY_BOOST: 15, // Extra points in compatibility score

  // Wait time thresholds
  URGENT_WAIT_THRESHOLD: 60000, // 1 minute
  VERY_URGENT_WAIT_THRESHOLD: 120000, // 2 minutes

  // Adaptive bucketing
  MIN_BUCKET_SIZE: 2,
  MAX_BUCKET_SIZE: 50,
  TARGET_BUCKET_SIZE: 20,
};

export interface QueueUser {
  userId: string;
  deviceId: string;
  timestamp: number;
  region: string;
  language: string;
  socketId: string;

  // User profile data
  gender?: string;
  age?: number;

  // Premium features
  isPremium: boolean;
  genderPreference?: string; // 'any', 'male', 'female'

  // Age range preferences (premium feature)
  minAge?: number;
  maxAge?: number;

  // Reputation data
  reputation?: number; // 0-100 rating

  // Interest tags for better matching
  interests?: string[]; // ['gaming', 'music', 'coding', etc.]

  // Queue type for multi-queue system
  queueType?: 'casual' | 'serious' | 'language' | 'gaming';

  // Language learning (for language queue)
  nativeLanguage?: string;
  learningLanguage?: string;

  // Match quality feedback from previous sessions
  preferredMatchTypes?: string[]; // e.g., ['long-conversation', 'quick-chat']

  preferences: Record<string, unknown>;
}

// Pending match waiting for acceptance
export interface PendingMatch {
  matchId: string;
  sessionId: string;
  user1Id: string;
  user2Id: string;
  createdAt: number;
  user1Accepted: boolean;
  user2Accepted: boolean;
  compatibilityScore: number;
}

@Injectable()
export class MatchmakingService implements OnModuleInit, OnModuleDestroy {
  // Scheduled processing intervals
  private queueProcessingInterval: NodeJS.Timeout | null = null;
  private matchTimeoutInterval: NodeJS.Timeout | null = null;

  // Track if queue is currently being processed (prevent overlap)
  private isProcessingQueue = false;

  // Performance metrics
  private performanceMetrics = {
    totalMatchingRuns: 0,
    totalDuration: 0,
    totalComparisons: 0,
    totalUsers: 0,
    avgBucketSize: 0,
    scheduledRuns: 0,
    eventTriggeredRuns: 0,
  };

  constructor(
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => SignalingGateway))
    private readonly signalingGateway: SignalingGateway,
    @Inject(forwardRef(() => MatchAnalyticsService))
    private readonly analyticsService: MatchAnalyticsService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    // Start scheduled queue processing
    this.startScheduledProcessing();
    this.logger.log('🚀 MatchmakingService initialized with scheduled processing', {
      queueInterval: `${MATCHING_CONFIG.QUEUE_PROCESS_INTERVAL}ms`,
      matchTimeout: `${MATCHING_CONFIG.MATCH_ACCEPT_TIMEOUT}ms`,
    });
  }

  async onModuleDestroy() {
    // Clean up intervals
    this.stopScheduledProcessing();
    this.logger.log('MatchmakingService destroyed, intervals cleared');
  }

  private startScheduledProcessing() {
    // Process queue periodically (catches users left behind by event-driven processing)
    this.queueProcessingInterval = setInterval(async () => {
      if (this.isProcessingQueue) {
        this.logger.debug('Skipping scheduled queue processing - already in progress');
        return;
      }

      try {
        this.isProcessingQueue = true;
        this.performanceMetrics.scheduledRuns++;
        await this.processQueue();
      } catch (error) {
        this.logger.error('Scheduled queue processing error', error.stack);
      } finally {
        this.isProcessingQueue = false;
      }
    }, MATCHING_CONFIG.QUEUE_PROCESS_INTERVAL);

    // Check for expired pending matches
    this.matchTimeoutInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredMatches();
      } catch (error) {
        this.logger.error('Match timeout cleanup error', error.stack);
      }
    }, MATCHING_CONFIG.MATCH_CLEANUP_INTERVAL);

    this.logger.log('⏰ Scheduled queue processing started');
  }

  private stopScheduledProcessing() {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
      this.queueProcessingInterval = null;
    }
    if (this.matchTimeoutInterval) {
      clearInterval(this.matchTimeoutInterval);
      this.matchTimeoutInterval = null;
    }
  }

  // Clean up matches that weren't accepted within timeout
  private async cleanupExpiredMatches(): Promise<void> {
    try {
      const pendingMatches = await this.redisService.getPendingMatches();
      const now = Date.now();

      for (const match of pendingMatches) {
        if (now - match.createdAt > MATCHING_CONFIG.MATCH_ACCEPT_TIMEOUT) {
          this.logger.log('Match expired - cleaning up', {
            matchId: match.matchId,
            user1: match.user1Id,
            user2: match.user2Id,
            elapsed: `${Math.round((now - match.createdAt) / 1000)}s`,
          });

          // Remove pending match
          await this.redisService.removePendingMatch(match.matchId);

          // Notify users that match expired
          await this.signalingGateway.notifyMatchExpired(match.user1Id, match.user2Id, match.sessionId);

          // Re-add users to queue if they haven't disconnected
          // (they'll need to join again, but we can auto-rejoin in future)
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired matches', error.stack);
    }
  }

  async addToQueue(userId: string, metadata: {
    region?: string;
    language?: string;
    socketId: string;
    deviceId: string;
    gender?: string;
    age?: number;
    isPremium: boolean;
    genderPreference?: string;
    minAge?: number;
    maxAge?: number;
    reputation?: number;
    interests?: string[];
    queueType?: 'casual' | 'serious' | 'language' | 'gaming';
    nativeLanguage?: string;
    learningLanguage?: string;
    preferredMatchTypes?: string[];
    preferences?: Record<string, unknown>;
  }): Promise<void> {
    // Calculate default age range if user has age but no preference
    let minAge = metadata.minAge;
    let maxAge = metadata.maxAge;

    if (metadata.age && !minAge && !maxAge && metadata.isPremium) {
      // Premium users get tighter default range
      const range = MATCHING_CONFIG.PREMIUM_AGE_RANGE;
      minAge = Math.max(18, metadata.age - range);
      maxAge = metadata.age + range;
    } else if (metadata.age && !minAge && !maxAge) {
      // Free users get wider default range
      const range = MATCHING_CONFIG.DEFAULT_AGE_RANGE;
      minAge = Math.max(18, metadata.age - range);
      maxAge = metadata.age + range;
    }

    const queueData: QueueUser = {
      userId,
      deviceId: metadata.deviceId,
      timestamp: Date.now(),
      region: metadata.region || 'global',
      language: metadata.language || 'en',
      socketId: metadata.socketId,
      gender: metadata.gender,
      age: metadata.age,
      isPremium: metadata.isPremium,
      genderPreference: metadata.genderPreference || 'any',
      minAge,
      maxAge,
      reputation: metadata.reputation,
      interests: metadata.interests || [],
      queueType: metadata.queueType || 'casual',
      nativeLanguage: metadata.nativeLanguage,
      learningLanguage: metadata.learningLanguage,
      preferredMatchTypes: metadata.preferredMatchTypes,
      preferences: metadata.preferences || {},
    };

    await this.redisService.addToQueue(userId, queueData);
    this.logger.debug('User added to queue', {
      userId,
      isPremium: queueData.isPremium,
      genderPreference: queueData.genderPreference,
      ageRange: minAge && maxAge ? `${minAge}-${maxAge}` : 'any',
      queueType: queueData.queueType,
      interests: queueData.interests,
      reputation: queueData.reputation,
    });
  }

  async removeFromQueue(userId: string): Promise<void> {
    await this.redisService.removeFromQueue(userId);
    this.logger.debug('User removed from queue', { userId });
  }

  async processQueue(): Promise<void> {
    try {
      // Track last run for health monitoring
      await this.redisService.getClient().set('matchmaking:last_run', Date.now().toString());

      const queueLength = await this.redisService.getQueueLength();

      if (queueLength < 2) {
        return; // Need at least 2 users to match
      }

      // Get all users in queue
      const queueItems = await this.redisService.getClient().lRange('matchmaking:queue', 0, -1);
      const users: QueueUser[] = queueItems.map(item => JSON.parse(item));

      // 🆕 Process multi-queue: Separate by queue type for better matching
      const queuesByType: Record<string, QueueUser[]> = {
        casual: [],
        serious: [],
        language: [],
        gaming: [],
      };

      users.forEach(user => {
        const type = user.queueType || 'casual';
        queuesByType[type].push(user);
      });

      // Process each queue type separately
      for (const [queueType, queueUsers] of Object.entries(queuesByType)) {
        if (queueUsers.length < 2) continue;

        this.logger.debug(`Processing ${queueType} queue`, { count: queueUsers.length });

        // Try to find matches within this queue type
        const matches = await this.findMatches(queueUsers);
      
      for (const match of matches) {
          await this.createSession(match.user1, match.user2, match.score); // 🆕 Pass compatibility score
        
        // Remove matched users from queue
        await this.redisService.removeFromQueue(match.user1.userId);
        await this.redisService.removeFromQueue(match.user2.userId);
        }
      }

      // 🆕 If some queues have only 1 user, allow cross-queue matching (except language queue)
      const singleUsers = Object.entries(queuesByType)
        .filter(([type, users]) => users.length === 1 && type !== 'language') // Language queue is special
        .flatMap(([, users]) => users);

      if (singleUsers.length >= 2) {
        this.logger.debug('Cross-queue matching for single users', { count: singleUsers.length });
        const crossMatches = await this.findMatches(singleUsers);
        
        for (const match of crossMatches) {
          await this.createSession(match.user1, match.user2, match.score); // 🆕 Pass compatibility score
          await this.redisService.removeFromQueue(match.user1.userId);
          await this.redisService.removeFromQueue(match.user2.userId);
        }
      }

    } catch (error) {
      this.logger.error('Queue processing error', error.stack);
    }
  }

  // ⚡ OPTIMIZED: O(n²) → O(n log n) using bucketing
  private async findMatches(users: QueueUser[]): Promise<Array<{ user1: QueueUser; user2: QueueUser; waitTime?: number; score?: number }>> {
    const startTime = Date.now();
    const matches: Array<{ user1: QueueUser; user2: QueueUser; waitTime?: number; score?: number }> = [];
    const used = new Set<string>();
    const now = Date.now();

    // 🆕 WAIT TIME BALANCING - Separate by wait time
    const urgent = users.filter(u => now - u.timestamp > 60000); // 1+ minute wait
    const normal = users.filter(u => now - u.timestamp <= 60000);

    this.logger.debug('⚡ Optimized matching started', {
      total: users.length,
      urgent: urgent.length,
      normal: normal.length,
    });

    // 🆕 Priority 1: Match urgent waiters first (lower compatibility standards)
    // Keep this simple for urgent users - they need matches FAST
    for (const urgentUser of urgent) {
      if (used.has(urgentUser.userId)) continue;

      // Find ANY compatible match (ignore premium priority for urgent users)
      for (const candidate of [...urgent, ...normal]) {
        if (used.has(candidate.userId) || candidate.userId === urgentUser.userId) continue;

        if (await this.areCompatible(urgentUser, candidate)) {
          const waitTime = now - urgentUser.timestamp;
          matches.push({ 
            user1: urgentUser, 
            user2: candidate,
            waitTime 
          });
          used.add(urgentUser.userId);
          used.add(candidate.userId);
          this.logger.log('Urgent match created', {
            user1: urgentUser.userId,
            user2: candidate.userId,
            waitTime: `${Math.round(waitTime / 1000)}s`,
          });
          break;
        }
      }
    }

    // ⚡ Priority 2: OPTIMIZED BUCKETED MATCHING for normal users
    const premiumUsers = normal.filter(u => !used.has(u.userId) && u.isPremium);
    const freeUsers = normal.filter(u => !used.has(u.userId) && !u.isPremium);
    const remainingUsers = [...premiumUsers, ...freeUsers];

    if (remainingUsers.length > 0) {
      const bucketedMatches = await this.findMatchesOptimized(remainingUsers, used, now);
      matches.push(...bucketedMatches);
    }

    const duration = Date.now() - startTime;
    
    // Update performance metrics
    this.performanceMetrics.totalMatchingRuns++;
    this.performanceMetrics.totalDuration += duration;
    this.performanceMetrics.totalUsers += users.length;

    this.logger.log('⚡ Matching completed', {
      totalUsers: users.length,
      matchesFound: matches.length,
      duration: `${duration}ms`,
      efficiency: `${(matches.length / (users.length / 2) * 100).toFixed(1)}%`,
      avgDuration: `${(this.performanceMetrics.totalDuration / this.performanceMetrics.totalMatchingRuns).toFixed(1)}ms`,
    });

    // Track performance metrics in Redis for analytics
    await this.redisService.incrementCounter('matchmaking:runs');
    await this.redisService.incrementCounter('matchmaking:total_duration', duration);

    return matches;
  }

  // ⚡ NEW: Optimized O(n log n) matching using buckets
  private async findMatchesOptimized(
    users: QueueUser[], 
    used: Set<string>, 
    now: number
  ): Promise<Array<{ user1: QueueUser; user2: QueueUser; score: number }>> {
    const matches: Array<{ user1: QueueUser; user2: QueueUser; score: number }> = [];
    
    // STEP 1: Create buckets by key attributes (O(n))
    const buckets = this.createMatchingBuckets(users);
    
    this.logger.debug('📦 Buckets created', {
      totalBuckets: Object.keys(buckets).length,
      avgBucketSize: (users.length / Object.keys(buckets).length).toFixed(1),
    });

    // STEP 2: Process each bucket independently (O(n log n) total)
    const scoredPairs: Array<{ user1: QueueUser; user2: QueueUser; score: number }> = [];
    let comparisons = 0;

    for (const [bucketKey, bucketUsers] of Object.entries(buckets)) {
      if (bucketUsers.length < 2) continue;

      // Within bucket: still O(n²) but n is MUCH smaller (typically 5-20 users)
      // 1000 users → 50 buckets × 20 users = 50 × 190 = 9,500 comparisons
      // vs original 1000 × 999 / 2 = 499,500 comparisons (50x improvement!)
      
      for (let i = 0; i < bucketUsers.length - 1; i++) {
        const user1 = bucketUsers[i];
        if (used.has(user1.userId)) continue;

        for (let j = i + 1; j < bucketUsers.length; j++) {
          const user2 = bucketUsers[j];
          if (used.has(user2.userId)) continue;

          comparisons++;

          // Quick compatibility check (cheap)
          if (await this.areCompatible(user1, user2)) {
            // Calculate score (expensive, but only for compatible pairs)
            const score = await this.calculateCompatibilityScore(user1, user2, now);
            scoredPairs.push({ user1, user2, score });
          }
        }
      }
    }

    // STEP 3: Sort by score and create matches (O(n log n))
    scoredPairs.sort((a, b) => b.score - a.score);

    for (const pair of scoredPairs) {
      if (!used.has(pair.user1.userId) && !used.has(pair.user2.userId)) {
        matches.push(pair);
        used.add(pair.user1.userId);
        used.add(pair.user2.userId);
        
        this.logger.log('⚡ Optimized match created', {
          user1: pair.user1.userId,
          user2: pair.user2.userId,
          score: pair.score.toFixed(1),
          premium: pair.user1.isPremium || pair.user2.isPremium,
        });
      }
    }

    const naiveComparisons = (users.length * (users.length - 1)) / 2;
    const reductionPercent = naiveComparisons > 0 
      ? (100 - (comparisons / naiveComparisons * 100)).toFixed(1)
      : '0';

    // Update global metrics
    this.performanceMetrics.totalComparisons += comparisons;

    this.logger.debug('⚡ Optimization stats', {
      totalComparisons: comparisons,
      naiveComparisons,
      reduction: `${reductionPercent}%`,
      avgComparisonsPerRun: Math.round(this.performanceMetrics.totalComparisons / this.performanceMetrics.totalMatchingRuns),
    });

    // Track optimization metrics
    await this.redisService.incrementCounter('matchmaking:comparisons', comparisons);
    await this.redisService.incrementCounter('matchmaking:comparisons_saved', naiveComparisons - comparisons);

    return matches;
  }

  // Adaptive bucket creation for efficient matching
  private createMatchingBuckets(users: QueueUser[]): Record<string, QueueUser[]> {
    const buckets: Record<string, QueueUser[]> = {};

    // Calculate adaptive bucket granularity based on queue size
    const queueDensity = users.length;
    const adaptiveBucketing = this.calculateAdaptiveBucketingStrategy(queueDensity);

    for (const user of users) {
      const bucketKeys = this.generateBucketKeys(user, adaptiveBucketing);

      // Add user to all relevant buckets
      for (const key of bucketKeys) {
        if (!buckets[key]) {
          buckets[key] = [];
        }
        buckets[key].push(user);
      }
    }

    // Log bucketing efficiency
    const bucketSizes = Object.values(buckets).map((b) => b.length);
    const avgBucketSize = bucketSizes.reduce((a, b) => a + b, 0) / bucketSizes.length;
    this.performanceMetrics.avgBucketSize = avgBucketSize;

    this.logger.debug('Adaptive bucketing applied', {
      queueSize: users.length,
      bucketCount: Object.keys(buckets).length,
      avgBucketSize: avgBucketSize.toFixed(1),
      strategy: adaptiveBucketing.strategy,
    });

    return buckets;
  }

  // Calculate bucketing strategy based on queue density
  private calculateAdaptiveBucketingStrategy(queueSize: number): {
    strategy: 'tight' | 'balanced' | 'loose';
    useRegionWildcard: boolean;
    useLanguageWildcard: boolean;
    useAgeRangeBucketing: boolean;
  } {
    if (queueSize < 10) {
      // Small queue: loose bucketing to find any match
      return {
        strategy: 'loose',
        useRegionWildcard: true,
        useLanguageWildcard: true,
        useAgeRangeBucketing: false,
      };
    } else if (queueSize < 50) {
      // Medium queue: balanced bucketing
      return {
        strategy: 'balanced',
        useRegionWildcard: true,
        useLanguageWildcard: false, // Keep language strict
        useAgeRangeBucketing: false,
      };
    } else {
      // Large queue: tight bucketing for better matches
      return {
        strategy: 'tight',
        useRegionWildcard: false,
        useLanguageWildcard: false,
        useAgeRangeBucketing: true, // Enable age-based sub-buckets
      };
    }
  }

  // Generate bucket keys for a user based on strategy
  private generateBucketKeys(
    user: QueueUser,
    strategy: {
      strategy: 'tight' | 'balanced' | 'loose';
      useRegionWildcard: boolean;
      useLanguageWildcard: boolean;
      useAgeRangeBucketing: boolean;
    },
  ): string[] {
    const region = user.region || 'global';
    const language = user.language || 'en';
    const queueType = user.queueType || 'casual';
    const bucketKeys: string[] = [];

    // Primary bucket: exact match
    let primaryKey = `${region}|${language}|${queueType}`;

    // Add age range suffix for tight bucketing
    if (strategy.useAgeRangeBucketing && user.age) {
      const ageGroup = this.getAgeGroup(user.age);
      primaryKey += `|${ageGroup}`;
    }

    bucketKeys.push(primaryKey);

    // Cross-region bucket for global users or loose strategy
    if (region === 'global' || strategy.useRegionWildcard) {
      let wildcardKey = `*|${language}|${queueType}`;
      if (strategy.useAgeRangeBucketing && user.age) {
        wildcardKey += `|${this.getAgeGroup(user.age)}`;
      }
      bucketKeys.push(wildcardKey);
    }

    // Cross-language bucket for English speakers or loose strategy
    if (language === 'en' || strategy.useLanguageWildcard) {
      let langWildcardKey = `${region}|*|${queueType}`;
      if (strategy.useAgeRangeBucketing && user.age) {
        langWildcardKey += `|${this.getAgeGroup(user.age)}`;
      }
      bucketKeys.push(langWildcardKey);
    }

    // Premium users get additional priority bucket
    if (user.isPremium) {
      bucketKeys.push(`premium|${region}|${language}|${queueType}`);
    }

    // High reputation users get quality bucket
    if (user.reputation && user.reputation >= 80) {
      bucketKeys.push(`quality|${region}|${language}|${queueType}`);
    }

    return bucketKeys;
  }

  // Get age group for bucketing
  private getAgeGroup(age: number): string {
    if (age < 20) return '18-19';
    if (age < 25) return '20-24';
    if (age < 30) return '25-29';
    if (age < 35) return '30-34';
    if (age < 40) return '35-39';
    if (age < 50) return '40-49';
    return '50+';
  }

  // Get queue statistics including adaptive bucketing metrics
  async getExtendedQueueStats(): Promise<{
    queueLength: number;
    averageWaitTime: number;
    regionDistribution: Record<string, number>;
    queueTypeDistribution: Record<string, number>;
    premiumCount: number;
    averageReputation: number;
    performanceMetrics: typeof this.performanceMetrics;
  }> {
    const basicStats = await this.getQueueStats();
    const queueItems = await this.redisService.getClient().lRange('matchmaking:queue', 0, -1);
    const users: QueueUser[] = queueItems.map((item) => JSON.parse(item));

    const queueTypeDistribution: Record<string, number> = {};
    let premiumCount = 0;
    let totalReputation = 0;
    let reputationCount = 0;

    users.forEach((user) => {
      const queueType = user.queueType || 'casual';
      queueTypeDistribution[queueType] = (queueTypeDistribution[queueType] || 0) + 1;

      if (user.isPremium) premiumCount++;
      if (user.reputation) {
        totalReputation += user.reputation;
        reputationCount++;
      }
    });

    return {
      ...basicStats,
      queueTypeDistribution,
      premiumCount,
      averageReputation: reputationCount > 0 ? Math.round(totalReputation / reputationCount) : 70,
      performanceMetrics: this.performanceMetrics,
    };
  }

  // 🆕 Calculate compatibility score (0-100)
  private async calculateCompatibilityScore(user1: QueueUser, user2: QueueUser, now: number): Promise<number> {
    let score = 0;

    // 1. Location Match (20 points) - Same region = lower latency
    if (user1.region === user2.region) {
      score += 20;
    } else if (user1.region === 'global' || user2.region === 'global') {
      score += 10; // Partial credit for flexible region
    }
    
    // 🆕 1a. Geographic Latency Prediction (additional 5 points)
    const latencyScore = this.calculateLatencyScore(user1, user2);
    score += latencyScore;

    // 2. Language Match (15 points)
    if (user1.language === user2.language) {
      score += 15;
    }

    // 🆕 2a. Language Learning Match (special case for language queue)
    if (user1.queueType === 'language' && user2.queueType === 'language') {
      const langScore = this.calculateLanguageLearningScore(user1, user2);
      score += langScore; // Up to 20 points
    }

    // 3. Reputation Score (25 points) - Match good users together
    const rep1 = user1.reputation || 70;
    const rep2 = user2.reputation || 70;
    
    // Both high reputation (70+)
    if (rep1 >= 70 && rep2 >= 70) {
      score += 25;
    }
    // Both medium reputation (40-70)
    else if (rep1 >= 40 && rep2 >= 40) {
      score += 18;
    }
    // Give low-rep users a chance with high-rep (rehab)
    else if ((rep1 >= 70 && rep2 >= 30) || (rep2 >= 70 && rep1 >= 30)) {
      score += 12;
    }
    // Both low reputation
    else {
      score += 8; // Still allow match but low priority
    }

    // 🆕 4. Interest Match (20 points) - Common interests
    if (user1.interests && user2.interests && user1.interests.length > 0 && user2.interests.length > 0) {
      const commonInterests = user1.interests.filter(i => user2.interests?.includes(i));
      const interestScore = Math.min(commonInterests.length * 7, 20); // 7 points per common interest, max 20
      score += interestScore;
      
      if (commonInterests.length > 0) {
        this.logger.debug('Common interests found', {
          user1: user1.userId,
          user2: user2.userId,
          common: commonInterests,
          score: interestScore,
        });
      }
    }

    // 5. Age Match Bonus (15 points) - Similar ages get bonus
    const ageBonus = this.calculateAgeMatchBonus(user1, user2);
    score += ageBonus;

    // 6. Wait Time Bonus (15 points) - Reward longer waiters with tiered urgency
    const avgWaitTime = ((now - user1.timestamp) + (now - user2.timestamp)) / 2;
    if (avgWaitTime > MATCHING_CONFIG.VERY_URGENT_WAIT_THRESHOLD) {
      score += 15; // Very urgent (2+ minutes)
    } else if (avgWaitTime > MATCHING_CONFIG.URGENT_WAIT_THRESHOLD) {
      score += 12; // Urgent (1+ minute)
    } else if (avgWaitTime > 45000) {
      score += 8; // 45+ seconds
    } else if (avgWaitTime > 30000) {
      score += 5; // 30+ seconds
    } else if (avgWaitTime > 15000) {
      score += 2; // 15+ seconds
    }

    // 7. Premium Priority - Enhanced boost for premium users
    if (user1.isPremium && user2.isPremium) {
      score += MATCHING_CONFIG.PREMIUM_PRIORITY_BOOST; // Both premium = highest boost
    } else if (user1.isPremium || user2.isPremium) {
      score += Math.round(MATCHING_CONFIG.PREMIUM_PRIORITY_BOOST * 0.6); // One premium = partial boost
    }

    // 8. Preferred Match Type Bonus (5 points)
    if (user1.preferredMatchTypes && user2.preferredMatchTypes) {
      const commonTypes = user1.preferredMatchTypes.filter((t) =>
        user2.preferredMatchTypes?.includes(t),
      );
      if (commonTypes.length > 0) {
        score += 5;
      }
    }

    return Math.min(100, Math.max(0, score)); // Clamp to 0-100
  }

  // 🆕 Calculate latency score based on geographic location
  private calculateLatencyScore(user1: QueueUser, user2: QueueUser): number {
    // Simple continent-based estimation
    // In production, you'd use actual GeoIP data
    const regionLatencyMap: Record<string, Record<string, number>> = {
      'us-east': { 'us-east': 5, 'us-west': 3, 'europe': 2, 'asia': 1, 'global': 3 },
      'us-west': { 'us-west': 5, 'us-east': 3, 'europe': 2, 'asia': 2, 'global': 3 },
      'europe': { 'europe': 5, 'us-east': 2, 'us-west': 2, 'asia': 1, 'global': 3 },
      'asia': { 'asia': 5, 'us-west': 2, 'us-east': 1, 'europe': 1, 'global': 3 },
      'global': { 'global': 3, 'us-east': 3, 'us-west': 3, 'europe': 3, 'asia': 3 },
    };

    const region1 = user1.region || 'global';
    const region2 = user2.region || 'global';
    
    return regionLatencyMap[region1]?.[region2] || 2;
  }

  // 🆕 Calculate language learning compatibility score
  private calculateLanguageLearningScore(user1: QueueUser, user2: QueueUser): number {
    let score = 0;
    
    // Perfect match: User1 learning User2's native, and vice versa
    if (
      user1.learningLanguage === user2.nativeLanguage &&
      user2.learningLanguage === user1.nativeLanguage
    ) {
      score += 20; // Perfect language exchange
    }
    // Good match: One teaches, one learns
    else if (
      user1.learningLanguage === user2.nativeLanguage ||
      user2.learningLanguage === user1.nativeLanguage
    ) {
      score += 15; // One-way teaching
    }
    // Okay match: Both learning same language
    else if (user1.learningLanguage === user2.learningLanguage) {
      score += 10; // Practice together
    }

    return score;
  }

  // Check if users' ages are compatible based on their preferences
  private checkAgeCompatibility(user1: QueueUser, user2: QueueUser): boolean {
    // If neither user has age preferences, they're compatible
    if (!user1.minAge && !user1.maxAge && !user2.minAge && !user2.maxAge) {
      return true;
    }

    // Check user1's preferences against user2's age
    if (user1.minAge || user1.maxAge) {
      if (!user2.age) {
        // User2 hasn't specified age - only match if user1 isn't strict (free users)
        if (user1.isPremium) {
          return false; // Premium users with age preference need age info
        }
      } else {
        // Check if user2's age is within user1's range
        if (user1.minAge && user2.age < user1.minAge) return false;
        if (user1.maxAge && user2.age > user1.maxAge) return false;
      }
    }

    // Check user2's preferences against user1's age
    if (user2.minAge || user2.maxAge) {
      if (!user1.age) {
        if (user2.isPremium) {
          return false;
        }
      } else {
        if (user2.minAge && user1.age < user2.minAge) return false;
        if (user2.maxAge && user1.age > user2.maxAge) return false;
      }
    }

    return true;
  }

  // Smart rematch cooldown based on user type
  private async checkRematchCooldown(
    user1: QueueUser,
    user2: QueueUser,
  ): Promise<{ canMatch: boolean; reason?: string }> {
    // Get recent matches with timestamps
    const user1RecentData = await this.redisService.getRecentMatchesWithTimestamp(user1.userId);
    const user2RecentData = await this.redisService.getRecentMatchesWithTimestamp(user2.userId);

    const now = Date.now();

    // Determine cooldown based on user types
    const bothPremium = user1.isPremium && user2.isPremium;
    const eitherPremium = user1.isPremium || user2.isPremium;

    // Shorter cooldown for premium users
    const cooldownMs = bothPremium
      ? MATCHING_CONFIG.REMATCH_COOLDOWN_PREMIUM * 1000
      : eitherPremium
        ? MATCHING_CONFIG.REMATCH_COOLDOWN_PREMIUM * 1000 * 1.5 // 45 min if one is premium
        : MATCHING_CONFIG.REMATCH_COOLDOWN_FREE * 1000;

    // Check if user2 is in user1's recent matches
    const matchedUser1 = user1RecentData.find((m) => m.matchedUserId === user2.userId);
    if (matchedUser1) {
      const elapsed = now - matchedUser1.timestamp;
      if (elapsed < cooldownMs) {
        const remaining = Math.round((cooldownMs - elapsed) / 60000);
        return {
          canMatch: false,
          reason: `Matched ${Math.round(elapsed / 60000)}min ago, ${remaining}min remaining`,
        };
      }
    }

    // Check reverse direction too
    const matchedUser2 = user2RecentData.find((m) => m.matchedUserId === user1.userId);
    if (matchedUser2) {
      const elapsed = now - matchedUser2.timestamp;
      if (elapsed < cooldownMs) {
        const remaining = Math.round((cooldownMs - elapsed) / 60000);
        return {
          canMatch: false,
          reason: `Matched ${Math.round(elapsed / 60000)}min ago, ${remaining}min remaining`,
        };
      }
    }

    return { canMatch: true };
  }

  // Calculate age match bonus for compatibility score
  private calculateAgeMatchBonus(user1: QueueUser, user2: QueueUser): number {
    if (!user1.age || !user2.age) return 0;

    const ageDiff = Math.abs(user1.age - user2.age);

    // Close ages get bonus points
    if (ageDiff <= 2) return 15; // Very close in age
    if (ageDiff <= 5) return 10; // Close in age
    if (ageDiff <= 10) return 5; // Reasonable age range
    return 0; // Large age gap
  }

  private async areCompatible(user1: QueueUser, user2: QueueUser): Promise<boolean> {
    // Same region preference
    if (user1.region !== 'global' && user2.region !== 'global' && user1.region !== user2.region) {
      return false;
    }

    // Same language preference
    if (user1.language !== user2.language) {
      return false;
    }

    // AGE RANGE CHECK (Premium feature)
    if (!this.checkAgeCompatibility(user1, user2)) {
      this.logger.debug('Age range mismatch', {
        user1: user1.userId,
        user1Age: user1.age,
        user1Range: user1.minAge && user1.maxAge ? `${user1.minAge}-${user1.maxAge}` : 'any',
        user2: user2.userId,
        user2Age: user2.age,
        user2Range: user2.minAge && user2.maxAge ? `${user2.minAge}-${user2.maxAge}` : 'any',
      });
      return false;
    }

    // SMART REMATCH COOLDOWN - Different cooldowns for different user types
    const cooldownResult = await this.checkRematchCooldown(user1, user2);
    if (!cooldownResult.canMatch) {
      this.logger.debug('Rematch cooldown active', {
        user1: user1.userId,
        user2: user2.userId,
        reason: cooldownResult.reason,
      });
      return false;
    }

    // PREMIUM FEATURE: Gender filter (improved logic)
    // If user1 is premium and has gender preference, check if user2 matches
    if (user1.isPremium && user1.genderPreference && user1.genderPreference !== 'any') {
      // user2 must have specified a gender (not undefined/null) AND it must match
      if (!user2.gender) {
        // user2 chose "Private" - can't be filtered
        this.logger.debug('Gender filter: user2 is private', {
          user1: user1.userId,
          wantsGender: user1.genderPreference,
          user2: user2.userId,
          user2Gender: 'undefined/private',
        });
        return false; // Premium users can't match with private users when filtering
      }
      
      if (user2.gender !== user1.genderPreference) {
        this.logger.debug('Gender filter mismatch', {
          user1: user1.userId,
          wantsGender: user1.genderPreference,
          user2: user2.userId,
          hasGender: user2.gender,
        });
        return false;
      }
    }

    // If user2 is premium and has gender preference, check if user1 matches
    if (user2.isPremium && user2.genderPreference && user2.genderPreference !== 'any') {
      // user1 must have specified a gender (not undefined/null) AND it must match
      if (!user1.gender) {
        // user1 chose "Private" - can't be filtered
        this.logger.debug('Gender filter: user1 is private', {
          user2: user2.userId,
          wantsGender: user2.genderPreference,
          user1: user1.userId,
          user1Gender: 'undefined/private',
        });
        return false; // Premium users can't match with private users when filtering
      }
      
      if (user1.gender !== user2.genderPreference) {
        this.logger.debug('Gender filter mismatch', {
          user2: user2.userId,
          wantsGender: user2.genderPreference,
          user1: user1.userId,
          hasGender: user1.gender,
        });
        return false;
      }
    }

    // If neither user has gender filters, or both are compatible, match them
    // This means:
    // - Free users always match (no filter)
    // - Premium users with "any" preference match everyone
    // - Private users match with free users and premium users who want "any"
    
    this.logger.debug('Users are compatible', {
      user1: user1.userId,
      user1Gender: user1.gender || 'private',
      user1Premium: user1.isPremium,
      user1Pref: user1.genderPreference,
      user2: user2.userId,
      user2Gender: user2.gender || 'private',
      user2Premium: user2.isPremium,
      user2Pref: user2.genderPreference,
    });

    return true;
  }

  private async createSession(user1: QueueUser, user2: QueueUser, compatibilityScore?: number): Promise<void> {
    const sessionId = uuidv4();
    const matchId = uuidv4(); // Unique match ID for tracking
    
    const sessionData = {
      id: sessionId,
      matchId, // 🆕 For analytics
      peers: [user1.userId, user2.userId],
      createdAt: Date.now(),
      region: user1.region,
      language: user1.language,
    };

    // Store session in Redis (5 minute TTL)
    await this.redisService.createSession(sessionId, sessionData, 300);

    // 🆕 Remember this match to avoid rematching
    await this.redisService.addToRecentMatches(user1.userId, user2.userId);
    await this.redisService.addToRecentMatches(user2.userId, user1.userId);

    // 🆕 Track match creation analytics
    const commonInterests = user1.interests && user2.interests
      ? user1.interests.filter(i => user2.interests?.includes(i))
      : [];
    
    await this.analyticsService.trackMatchCreated({
      matchId,
      sessionId,
      user1Id: user1.userId,
      user2Id: user2.userId,
      compatibilityScore: compatibilityScore || 0,
      region: user1.region,
      queueType: user1.queueType || 'casual',
      commonInterests,
    });

    // Notify both users
    await this.signalingGateway.notifyMatch(user1.userId, user2.userId, sessionId);

    // Track legacy analytics (keep for backwards compatibility)
    await this.redisService.incrementCounter('sessions:created');
    await this.redisService.incrementCounter(`sessions:region:${user1.region}`);

    this.logger.log('Session created', {
      sessionId,
      matchId,
      user1: user1.userId,
      user2: user2.userId,
      region: user1.region,
      language: user1.language,
      compatibilityScore,
      commonInterests: commonInterests.length,
    });
  }

  // ⚡ NEW: Get performance statistics
  async getPerformanceStats(): Promise<{
    totalRuns: number;
    avgDuration: number;
    avgComparisons: number;
    avgUsers: number;
    efficiency: string;
  }> {
    const runs = this.performanceMetrics.totalMatchingRuns || 1;
    const avgComparisons = Math.round(this.performanceMetrics.totalComparisons / runs);
    const avgUsers = Math.round(this.performanceMetrics.totalUsers / runs);
    const naiveAvg = (avgUsers * (avgUsers - 1)) / 2;
    const efficiency = naiveAvg > 0 ? `${(100 - (avgComparisons / naiveAvg * 100)).toFixed(1)}%` : 'N/A';

    return {
      totalRuns: runs,
      avgDuration: Math.round(this.performanceMetrics.totalDuration / runs),
      avgComparisons,
      avgUsers,
      efficiency,
    };
  }

  async getQueueStats(): Promise<{
    queueLength: number;
    averageWaitTime: number;
    regionDistribution: Record<string, number>;
  }> {
    const queueLength = await this.redisService.getQueueLength();
    const queueItems = await this.redisService.getClient().lRange('matchmaking:queue', 0, -1);
    
    const users: QueueUser[] = queueItems.map(item => JSON.parse(item));
    const now = Date.now();
    
    const averageWaitTime = users.length > 0 
      ? users.reduce((sum, user) => sum + (now - user.timestamp), 0) / users.length
      : 0;

    const regionDistribution: Record<string, number> = {};
    users.forEach(user => {
      regionDistribution[user.region] = (regionDistribution[user.region] || 0) + 1;
    });

    return {
      queueLength,
      averageWaitTime,
      regionDistribution,
    };
  }
}
