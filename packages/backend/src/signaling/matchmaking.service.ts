import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';
import { SignalingGateway } from './signaling.gateway';
import { LoggerService } from '../services/logger.service';
import { MatchAnalyticsService } from '../analytics/match-analytics.service';
import { BlockingService } from '../blocking/blocking.service';
import { MatchesService } from '../matches/matches.service';
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

  // 🆕 Constants for scoring (avoid recreating on each call)
  private readonly REGION_TIMEZONES: Record<string, number> = {
    'us-east': -5,
    'us-west': -8,
    'europe': 1,
    'asia': 8,
    'global': 0,
  };

  private readonly REGION_LATENCY_MAP: Record<string, Record<string, number>> = {
    'us-east': { 'us-east': 5, 'us-west': 3, 'europe': 2, 'asia': 1, 'global': 3 },
    'us-west': { 'us-west': 5, 'us-east': 3, 'europe': 2, 'asia': 2, 'global': 3 },
    'europe': { 'europe': 5, 'us-east': 2, 'us-west': 2, 'asia': 1, 'global': 3 },
    'asia': { 'asia': 5, 'us-west': 2, 'us-east': 1, 'europe': 1, 'global': 3 },
    'global': { 'global': 3, 'us-east': 3, 'us-west': 3, 'europe': 3, 'asia': 3 },
  };

  constructor(
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => SignalingGateway))
    private readonly signalingGateway: SignalingGateway,
    @Inject(forwardRef(() => MatchAnalyticsService))
    private readonly analyticsService: MatchAnalyticsService,
    @Inject(forwardRef(() => BlockingService))
    private readonly blockingService: BlockingService,
    @Inject(forwardRef(() => MatchesService))
    private readonly matchesService: MatchesService,
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

      // ⚡ Get all users using ZSET-based queue (O(n) fetch, already ordered by wait time)
      const users = await this.redisService.getAllQueueUsers<QueueUser>();

      if (users.length < 2) {
        return;
      }

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
        .filter(([type, queueUserList]) => queueUserList.length === 1 && type !== 'language') // Language queue is special
        .flatMap(([, queueUserList]) => queueUserList);

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

    // ⚡ PRE-FETCH: Bulk load recent matches to avoid per-pair Redis calls
    const userIds = users.map(u => u.userId);
    const deviceIds = users.map(u => u.deviceId);
    const recentMatchesMap = await this.redisService.getRecentMatchesBulk(userIds);

    // ⚡ PRE-FETCH: Bulk load blocked users to avoid per-pair DB calls
    const blockedUsersMap = await this.blockingService.getBlockedDeviceIdsBulk(deviceIds);

    // 🆕 DYNAMIC URGENCY THRESHOLD - Adjust based on queue size
    // Larger queues = stricter threshold (more matches available)
    // Smaller queues = lower threshold (need to match faster)
    const baseUrgencyMs = 60000; // 1 minute base
    const urgencyThreshold = users.length > 50
      ? baseUrgencyMs * 1.5  // 90 seconds for large queues
      : users.length < 10
        ? baseUrgencyMs * 0.5  // 30 seconds for small queues
        : baseUrgencyMs;

    // 🆕 WAIT TIME BALANCING - Separate by wait time (dynamic threshold)
    const urgent = users.filter(u => now - u.timestamp > urgencyThreshold);
    const normal = users.filter(u => now - u.timestamp <= urgencyThreshold);

    this.logger.debug('⚡ Optimized matching started', {
      total: users.length,
      urgent: urgent.length,
      normal: normal.length,
      urgencyThreshold: `${Math.round(urgencyThreshold / 1000)}s`,
    });

    // 🆕 Priority 1: Match urgent waiters first (lower compatibility standards)
    // Keep this simple for urgent users - they need matches FAST
    // Pre-compute candidates array once (avoid creating new array each iteration)
    const allCandidates = [...urgent, ...normal];

    for (const urgentUser of urgent) {
      if (used.has(urgentUser.userId)) continue;

      // Find ANY compatible match (ignore premium priority for urgent users)
      for (const candidate of allCandidates) {
        if (used.has(candidate.userId) || candidate.userId === urgentUser.userId) continue;

        if (this.areCompatibleFast(urgentUser, candidate, recentMatchesMap, blockedUsersMap)) {
          const waitTime = now - urgentUser.timestamp;
          const score = this.calculateCompatibilityScore(urgentUser, candidate, now);
          matches.push({
            user1: urgentUser,
            user2: candidate,
            waitTime,
            score,
          });
          used.add(urgentUser.userId);
          used.add(candidate.userId);
          this.logger.log('Urgent match created', {
            user1: urgentUser.userId,
            user2: candidate.userId,
            waitTime: `${Math.round(waitTime / 1000)}s`,
            score,
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
      const bucketedMatches = await this.findMatchesOptimized(remainingUsers, used, now, recentMatchesMap, blockedUsersMap);
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
    now: number,
    recentMatchesMap: Map<string, Set<string>>,
    blockedUsersMap: Map<string, Set<string>>,
  ): Promise<Array<{ user1: QueueUser; user2: QueueUser; score: number }>> {
    const matches: Array<{ user1: QueueUser; user2: QueueUser; score: number }> = [];
    
    // STEP 1: Create buckets by key attributes (O(n))
    const buckets = this.createMatchingBuckets(users);
    const bucketCount = Object.keys(buckets).length;

    this.logger.debug('📦 Buckets created', {
      totalBuckets: bucketCount,
      avgBucketSize: bucketCount > 0 ? (users.length / bucketCount).toFixed(1) : '0',
    });

    // STEP 2: Process each bucket independently (O(n log n) total)
    const scoredPairs: Array<{ user1: QueueUser; user2: QueueUser; score: number }> = [];
    const seenPairs = new Set<string>(); // Track pairs to avoid duplicates from multi-bucket users
    let comparisons = 0;

    for (const bucketUsers of Object.values(buckets)) {
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

          // Skip if we've already compared this pair (users can be in multiple buckets)
          const pairKey = user1.userId < user2.userId
            ? `${user1.userId}:${user2.userId}`
            : `${user2.userId}:${user1.userId}`;

          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);

          comparisons++;

          // Quick compatibility check (cheap - uses pre-fetched data)
          if (this.areCompatibleFast(user1, user2, recentMatchesMap, blockedUsersMap)) {
            // Calculate score (expensive, but only for compatible pairs)
            const score = this.calculateCompatibilityScore(user1, user2, now);
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
  private calculateCompatibilityScore(user1: QueueUser, user2: QueueUser, now: number): number {
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

    // 🆕 7. Age Bracket Match (10 points) - Similar age groups connect better
    const ageScore = this.calculateAgeBracketScore(user1, user2);
    score += ageScore;

    // 🆕 8. Timezone Bonus (5 points) - Similar timezones = better availability
    const timezoneScore = this.calculateTimezoneScore(user1, user2);
    score += timezoneScore;

    return Math.min(100, Math.max(0, score)); // Clamp to 0-100
  }

  // 🆕 Calculate age bracket compatibility score
  private calculateAgeBracketScore(user1: QueueUser, user2: QueueUser): number {
    // If either user hasn't provided age, give partial credit
    if (!user1.age || !user2.age) {
      return 3; // Neutral score
    }

    const ageDiff = Math.abs(user1.age - user2.age);

    // Same age bracket scoring
    if (ageDiff <= 3) return 10;      // Very close in age
    if (ageDiff <= 7) return 7;       // Similar age
    if (ageDiff <= 12) return 4;      // Moderate difference
    return 1;                          // Large age gap
  }

  // 🆕 Calculate timezone compatibility score based on region
  private calculateTimezoneScore(user1: QueueUser, user2: QueueUser): number {
    const tz1 = this.REGION_TIMEZONES[user1.region] ?? 0;
    const tz2 = this.REGION_TIMEZONES[user2.region] ?? 0;
    const tzDiff = Math.abs(tz1 - tz2);

    // Score based on timezone difference
    if (tzDiff === 0) return 5;       // Same timezone
    if (tzDiff <= 3) return 4;        // Close timezone
    if (tzDiff <= 6) return 2;        // Moderate difference
    return 0;                          // Opposite sides of the world
  }

  // 🆕 Calculate latency score based on geographic location
  private calculateLatencyScore(user1: QueueUser, user2: QueueUser): number {
    const region1 = user1.region || 'global';
    const region2 = user2.region || 'global';

    return this.REGION_LATENCY_MAP[region1]?.[region2] ?? 2;
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

  // ⚡ FAST: Synchronous compatibility check using pre-fetched data
  private areCompatibleFast(
    user1: QueueUser,
    user2: QueueUser,
    recentMatchesMap: Map<string, Set<string>>,
    blockedUsersMap: Map<string, Set<string>>,
  ): boolean {
    // Same region preference
    if (user1.region !== 'global' && user2.region !== 'global' && user1.region !== user2.region) {
      return false;
    }

    // Same language preference
    if (user1.language !== user2.language) {
      return false;
    }

    // ⚡ CHECK BLOCKED USERS - Uses pre-fetched map (no DB call!)
    const user1Blocked = blockedUsersMap.get(user1.deviceId) || new Set();
    const user2Blocked = blockedUsersMap.get(user2.deviceId) || new Set();

    if (user1Blocked.has(user2.deviceId) || user2Blocked.has(user1.deviceId)) {
      this.logger.debug('Skipping blocked users (fast check)', {
        user1: user1.userId,
        user2: user2.userId,
      });
      return false;
    }

    // ⚡ AVOID RECENT MATCHES - Uses pre-fetched map (no Redis call!)
    const user1Recent = recentMatchesMap.get(user1.userId) || new Set();
    const user2Recent = recentMatchesMap.get(user2.userId) || new Set();

    if (user1Recent.has(user2.userId) || user2Recent.has(user1.userId)) {
      return false;
    }

    // Gender filter checks
    if (user1.isPremium && user1.genderPreference && user1.genderPreference !== 'any') {
      if (!user2.gender || user2.gender !== user1.genderPreference) {
        return false;
      }
    }

    if (user2.isPremium && user2.genderPreference && user2.genderPreference !== 'any') {
      if (!user1.gender || user1.gender !== user2.genderPreference) {
        return false;
      }
    }

    return true;
  }

  // Legacy async version (kept for backwards compatibility)
  private async areCompatible(user1: QueueUser, user2: QueueUser): Promise<boolean> {
    // Same region preference
    if (user1.region !== 'global' && user2.region !== 'global' && user1.region !== user2.region) {
      return false;
    }

    // Same language preference
    if (user1.language !== user2.language) {
      return false;
    }

    // CHECK IF USERS HAVE BLOCKED EACH OTHER
    try {
      const areBlocked = await this.blockingService.areBlocked(user1.deviceId, user2.deviceId);
      if (areBlocked) {
        this.logger.debug('Skipping blocked users', {
          user1: user1.userId,
          user2: user2.userId,
          reason: 'One user has blocked the other',
        });
        return false;
      }
    } catch (error) {
      // Log error but continue with matching (fail open)
      this.logger.warn('Failed to check block status', { error: error.message });
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

    const now = Date.now();

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

    // 🆕 Persist match to PostgreSQL for long-term analytics
    try {
      await this.matchesService.createMatch({
        sessionId,
        user1Id: user1.userId,
        user2Id: user2.userId,
        compatibilityScore: compatibilityScore || 0,
        commonInterests,
        region: user1.region,
        language: user1.language,
        queueType: user1.queueType || 'casual',
        user1WaitTime: now - user1.timestamp,
        user2WaitTime: now - user2.timestamp,
      });
    } catch (dbError) {
      // Don't fail the match if DB persistence fails
      this.logger.error('Failed to persist match to DB', dbError.stack);
    }

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
    // ⚡ Use ZSET-based queue methods
    const queueLength = await this.redisService.getQueueLength();
    const users = await this.redisService.getAllQueueUsers<QueueUser>();
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

  // ========================================
  // SCHEDULED TASKS
  // ========================================

  /**
   * Cleanup stale queue entries every 30 seconds
   *
   * This handles cases where:
   * - Users disconnect without properly leaving the queue
   * - Server restarts leave orphaned queue entries
   * - Redis connection drops cause inconsistent state
   *
   * ⚡ OPTIMIZED: Uses ZSET ZRANGEBYSCORE for O(log n + m) cleanup
   */
  @Interval(30000) // Every 30 seconds
  async cleanupStaleQueueEntries(): Promise<void> {
    try {
      const maxAge = 5 * 60 * 1000; // 5 minutes max in queue

      // ⚡ Get stale users directly using ZSET score range (much faster than iterating)
      const staleUsers = await this.redisService.getUrgentQueueUsers<QueueUser>(maxAge);

      if (staleUsers.length === 0) {
        return;
      }

      const now = Date.now();
      let cleanedCount = 0;

      for (const user of staleUsers) {
        const age = now - user.timestamp;

        await this.redisService.removeFromQueue(user.userId);
        cleanedCount++;

        this.logger.warn('Cleaned up stale queue entry', {
          userId: user.userId,
          deviceId: user.deviceId,
          ageSeconds: Math.round(age / 1000),
        });
      }

      if (cleanedCount > 0) {
        const queueLength = await this.redisService.getQueueLength();
        this.logger.log(`🧹 Queue cleanup completed`, {
          removed: cleanedCount,
          remaining: queueLength,
        });

        // Track cleanup metrics
        await this.redisService.incrementCounter('queue:cleanup:runs');
        await this.redisService.incrementCounter('queue:cleanup:removed', cleanedCount);
      }
    } catch (error) {
      this.logger.error('Queue cleanup error', error.stack);
    }
  }

  /**
   * Process queue periodically to find matches
   * Runs every 2 seconds to ensure quick matching
   */
  @Interval(2000) // Every 2 seconds
  async periodicQueueProcessing(): Promise<void> {
    try {
      await this.processQueue();
    } catch (error) {
      this.logger.error('Periodic queue processing error', error.stack);
    }
  }
}
