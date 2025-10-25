import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { SignalingGateway } from './signaling.gateway';
import { LoggerService } from '../services/logger.service';
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
  
  preferences: Record<string, unknown>;
}

@Injectable()
export class MatchmakingService {
  constructor(
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => SignalingGateway))
    private readonly signalingGateway: SignalingGateway,
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
    reputation?: number; // 🆕 Include reputation
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
      reputation: metadata.reputation, // 🆕 Pass through reputation
      preferences: metadata.preferences || {},
    };

    await this.redisService.addToQueue(userId, queueData);
    this.logger.debug('User added to queue', { 
      userId, 
      isPremium: queueData.isPremium,
      genderPreference: queueData.genderPreference,
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

      // Try to find matches (now async)
      const matches = await this.findMatches(users);
      
      for (const match of matches) {
        await this.createSession(match.user1, match.user2);
        
        // Remove matched users from queue
        await this.redisService.removeFromQueue(match.user1.userId);
        await this.redisService.removeFromQueue(match.user2.userId);
      }

    } catch (error) {
      this.logger.error('Queue processing error', error.stack);
    }
  }

  private async findMatches(users: QueueUser[]): Promise<Array<{ user1: QueueUser; user2: QueueUser; waitTime?: number; score?: number }>> {
    const matches: Array<{ user1: QueueUser; user2: QueueUser; waitTime?: number; score?: number }> = [];
    const used = new Set<string>();
    const now = Date.now();

    // 🆕 WAIT TIME BALANCING - Separate by wait time
    const urgent = users.filter(u => now - u.timestamp > 60000); // 1+ minute wait
    const normal = users.filter(u => now - u.timestamp <= 60000);

    this.logger.debug('Queue breakdown', {
      total: users.length,
      urgent: urgent.length,
      normal: normal.length,
    });

    // 🆕 Priority 1: Match urgent waiters first (lower compatibility standards)
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

    // 🆕 Priority 2: SMART COMPATIBILITY SCORING for normal users
    const premiumUsers = normal.filter(u => !used.has(u.userId) && u.isPremium);
    const freeUsers = normal.filter(u => !used.has(u.userId) && !u.isPremium);
    const remainingUsers = [...premiumUsers, ...freeUsers];

    // Calculate compatibility scores for all pairs
    const scoredPairs: Array<{ user1: QueueUser; user2: QueueUser; score: number }> = [];
    
    for (let i = 0; i < remainingUsers.length - 1; i++) {
      for (let j = i + 1; j < remainingUsers.length; j++) {
        const user1 = remainingUsers[i];
        const user2 = remainingUsers[j];
        
        if (used.has(user1.userId) || used.has(user2.userId)) continue;
        
        // Check basic compatibility first
        if (await this.areCompatible(user1, user2)) {
          const score = await this.calculateCompatibilityScore(user1, user2, now);
          scoredPairs.push({ user1, user2, score });
        }
      }
    }

    // Sort by compatibility score (highest first)
    scoredPairs.sort((a, b) => b.score - a.score);

    // Match from highest to lowest score
    for (const pair of scoredPairs) {
      if (!used.has(pair.user1.userId) && !used.has(pair.user2.userId)) {
        matches.push({ 
          user1: pair.user1, 
          user2: pair.user2,
          score: pair.score 
        });
        used.add(pair.user1.userId);
        used.add(pair.user2.userId);
        
        this.logger.log('Smart match created', {
          user1: pair.user1.userId,
          user2: pair.user2.userId,
          compatibilityScore: pair.score.toFixed(1),
          premium: pair.user1.isPremium || pair.user2.isPremium,
        });
      }
    }

    return matches;
  }

  // 🆕 Calculate compatibility score (0-100)
  private async calculateCompatibilityScore(user1: QueueUser, user2: QueueUser, now: number): Promise<number> {
    let score = 0;

    // 1. Location Match (25 points) - Same region = lower latency
    if (user1.region === user2.region) {
      score += 25;
    } else if (user1.region === 'global' || user2.region === 'global') {
      score += 12; // Partial credit for flexible region
    }

    // 2. Language Match (20 points)
    if (user1.language === user2.language) {
      score += 20;
    }

    // 3. Reputation Score (30 points) - Match good users together
    const rep1 = user1.reputation || 70;
    const rep2 = user2.reputation || 70;
    
    // Both high reputation (70+)
    if (rep1 >= 70 && rep2 >= 70) {
      score += 30;
    }
    // Both medium reputation (40-70)
    else if (rep1 >= 40 && rep2 >= 40) {
      score += 20;
    }
    // Give low-rep users a chance with high-rep (rehab)
    else if ((rep1 >= 70 && rep2 >= 30) || (rep2 >= 70 && rep1 >= 30)) {
      score += 15;
    }
    // Both low reputation
    else {
      score += 10; // Still allow match but low priority
    }

    // 4. Wait Time Bonus (15 points) - Reward longer waiters
    const avgWaitTime = ((now - user1.timestamp) + (now - user2.timestamp)) / 2;
    if (avgWaitTime > 45000) score += 15; // 45+ seconds
    else if (avgWaitTime > 30000) score += 10; // 30+ seconds
    else if (avgWaitTime > 15000) score += 5; // 15+ seconds

    // 5. Premium Priority (10 points)
    if (user1.isPremium || user2.isPremium) {
      score += 10; // Premium users get slight boost
    }

    return Math.min(100, Math.max(0, score)); // Clamp to 0-100
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

  private async createSession(user1: QueueUser, user2: QueueUser): Promise<void> {
    const sessionId = uuidv4();
    const sessionData = {
      id: sessionId,
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

    // Notify both users
    await this.signalingGateway.notifyMatch(user1.userId, user2.userId, sessionId);

    // Track analytics
    await this.redisService.incrementCounter('sessions:created');
    await this.redisService.incrementCounter(`sessions:region:${user1.region}`);

    this.logger.log('Session created', {
      sessionId,
      user1: user1.userId,
      user2: user2.userId,
      region: user1.region,
      language: user1.language,
    });
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
