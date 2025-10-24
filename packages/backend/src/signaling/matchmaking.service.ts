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

      // Try to find matches
      const matches = this.findMatches(users);
      
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

  private findMatches(users: QueueUser[]): Array<{ user1: QueueUser; user2: QueueUser }> {
    const matches: Array<{ user1: QueueUser; user2: QueueUser }> = [];
    const used = new Set<string>();

    // Separate premium and free users
    const premiumUsers = users.filter(u => u.isPremium).sort((a, b) => a.timestamp - b.timestamp);
    const freeUsers = users.filter(u => !u.isPremium).sort((a, b) => a.timestamp - b.timestamp);

    // Match premium users first (they get priority)
    for (const premiumUser of premiumUsers) {
      if (used.has(premiumUser.userId)) continue;

      // Try to find match in all users (premium can match with anyone compatible)
      for (const candidate of [...premiumUsers, ...freeUsers]) {
        if (used.has(candidate.userId) || candidate.userId === premiumUser.userId) continue;

        if (this.areCompatible(premiumUser, candidate)) {
          matches.push({ user1: premiumUser, user2: candidate });
          used.add(premiumUser.userId);
          used.add(candidate.userId);
          this.logger.debug('Premium match created', {
            user1: premiumUser.userId,
            user2: candidate.userId,
            genderFilter: premiumUser.genderPreference,
          });
          break;
        }
      }
    }

    // Then match remaining free users
    for (let i = 0; i < freeUsers.length - 1; i++) {
      if (used.has(freeUsers[i].userId)) continue;

      for (let j = i + 1; j < freeUsers.length; j++) {
        if (used.has(freeUsers[j].userId)) continue;

        if (this.areCompatible(freeUsers[i], freeUsers[j])) {
          matches.push({ user1: freeUsers[i], user2: freeUsers[j] });
          used.add(freeUsers[i].userId);
          used.add(freeUsers[j].userId);
          break;
        }
      }
    }

    return matches;
  }

  private areCompatible(user1: QueueUser, user2: QueueUser): boolean {
    // Same region preference
    if (user1.region !== 'global' && user2.region !== 'global' && user1.region !== user2.region) {
      return false;
    }

    // Same language preference
    if (user1.language !== user2.language) {
      return false;
    }

    // PREMIUM FEATURE: Gender filter
    // If user1 is premium and has gender preference, check if user2 matches
    if (user1.isPremium && user1.genderPreference && user1.genderPreference !== 'any') {
      if (!user2.gender || user2.gender !== user1.genderPreference) {
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
      if (!user1.gender || user1.gender !== user2.genderPreference) {
        this.logger.debug('Gender filter mismatch', {
          user2: user2.userId,
          wantsGender: user2.genderPreference,
          user1: user1.userId,
          hasGender: user1.gender,
        });
        return false;
      }
    }

    // Check if users have been matched recently (prevent immediate re-matching)
    const _recentMatchKey = `recent_match:${user1.userId}:${user2.userId}`;
    // This would need to be implemented with Redis TTL

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
