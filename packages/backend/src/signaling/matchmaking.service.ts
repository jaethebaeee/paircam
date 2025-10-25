import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { SignalingGateway } from './signaling.gateway';
import { LoggerService } from '../services/logger.service';
import { MatchAnalyticsService } from '../analytics/match-analytics.service';
import { v4 as uuidv4 } from 'uuid';

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
  
  // 🆕 Reputation data
  reputation?: number; // 0-100 rating
  
  // 🆕 Interest tags for better matching
  interests?: string[]; // ['gaming', 'music', 'coding', etc.]
  
  // 🆕 Queue type for multi-queue system
  queueType?: 'casual' | 'serious' | 'language' | 'gaming';
  
  // 🆕 Language learning (for language queue)
  nativeLanguage?: string;
  learningLanguage?: string;
  
  preferences: Record<string, unknown>;
}

@Injectable()
export class MatchmakingService {
  // ⚡ Performance metrics
  private performanceMetrics = {
    totalMatchingRuns: 0,
    totalDuration: 0,
    totalComparisons: 0,
    totalUsers: 0,
    avgBucketSize: 0,
  };

  constructor(
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => SignalingGateway))
    private readonly signalingGateway: SignalingGateway,
    @Inject(forwardRef(() => MatchAnalyticsService))
    private readonly analyticsService: MatchAnalyticsService,
    private readonly logger: LoggerService,
  ) {}

  async addToQueue(userId: string, metadata: { 
    region?: string; 
    language?: string; 
    socketId: string;
    deviceId: string;
    gender?: string;
    age?: number;
    isPremium: boolean;
    genderPreference?: string;
    reputation?: number;
    interests?: string[]; // 🆕 Interest tags
    queueType?: 'casual' | 'serious' | 'language' | 'gaming'; // 🆕 Queue type
    nativeLanguage?: string; // 🆕 For language learning
    learningLanguage?: string; // 🆕 For language learning
    preferences?: Record<string, unknown>;
  }): Promise<void> {
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
      reputation: metadata.reputation,
      interests: metadata.interests || [], // 🆕 Default to empty array
      queueType: metadata.queueType || 'casual', // 🆕 Default to casual
      nativeLanguage: metadata.nativeLanguage, // 🆕
      learningLanguage: metadata.learningLanguage, // 🆕
      preferences: metadata.preferences || {},
    };

    await this.redisService.addToQueue(userId, queueData);
    this.logger.debug('User added to queue', { 
      userId, 
      isPremium: queueData.isPremium,
      genderPreference: queueData.genderPreference,
      queueType: queueData.queueType, // 🆕
      interests: queueData.interests, // 🆕
      reputation: queueData.reputation, // 🆕
    });
  }

  async removeFromQueue(userId: string): Promise<void> {
    await this.redisService.removeFromQueue(userId);
    this.logger.debug('User removed from queue', { userId });
  }

  async processQueue(): Promise<void> {
    try {
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

  // ⚡ NEW: Create buckets for efficient matching
  private createMatchingBuckets(users: QueueUser[]): Record<string, QueueUser[]> {
    const buckets: Record<string, QueueUser[]> = {};

    for (const user of users) {
      // Create bucket key from attributes that MUST match
      // Format: "region|language|queueType|genderPref"
      const region = user.region || 'global';
      const language = user.language || 'en';
      const queueType = user.queueType || 'casual';
      
      // For gender preference, bucket together:
      // - Users with 'any' preference
      // - Users whose gender matches others' preferences
      // Multiple bucket keys per user for flexibility
      
      const bucketKeys: string[] = [];
      
      // Primary bucket: exact match
      bucketKeys.push(`${region}|${language}|${queueType}|any`);
      
      // Cross-region bucket if region is 'global'
      if (region === 'global') {
        bucketKeys.push(`*|${language}|${queueType}|any`);
      }
      
      // Cross-language bucket if language is 'en' (most common)
      if (language === 'en') {
        bucketKeys.push(`${region}|*|${queueType}|any`);
      }

      // Add user to all relevant buckets
      for (const key of bucketKeys) {
        if (!buckets[key]) {
          buckets[key] = [];
        }
        buckets[key].push(user);
      }
    }

    return buckets;
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

    // 5. Wait Time Bonus (12 points) - Reward longer waiters
    const avgWaitTime = ((now - user1.timestamp) + (now - user2.timestamp)) / 2;
    if (avgWaitTime > 45000) score += 12; // 45+ seconds
    else if (avgWaitTime > 30000) score += 8; // 30+ seconds
    else if (avgWaitTime > 15000) score += 4; // 15+ seconds

    // 6. Premium Priority (8 points)
    if (user1.isPremium || user2.isPremium) {
      score += 8; // Premium users get slight boost
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

  private async areCompatible(user1: QueueUser, user2: QueueUser): Promise<boolean> {
    // Same region preference
    if (user1.region !== 'global' && user2.region !== 'global' && user1.region !== user2.region) {
      return false;
    }

    // Same language preference
    if (user1.language !== user2.language) {
      return false;
    }

    // 🆕 AVOID RECENT MATCHES - Don't match same people within 1 hour
    const user1Recent = await this.redisService.getRecentMatches(user1.userId);
    const user2Recent = await this.redisService.getRecentMatches(user2.userId);
    
    if (user1Recent.includes(user2.userId) || user2Recent.includes(user1.userId)) {
      this.logger.debug('Skipping recent match', { 
        user1: user1.userId, 
        user2: user2.userId,
        reason: 'Matched within last hour'
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
