import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { SignalingGateway } from './signaling.gateway';
import { LoggerService } from '../services/logger.service';
import { v4 as uuidv4 } from 'uuid';

export interface QueueUser {
  userId: string;
  timestamp: number;
  region: string;
  language: string;
  preferences: Record<string, unknown>;
  socketId: string;
}

@Injectable()
export class MatchmakingService {
  constructor(
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => SignalingGateway))
    private readonly signalingGateway: SignalingGateway,
    private readonly logger: LoggerService,
  ) {}

  async addToQueue(userId: string, metadata: { region?: string; language?: string; preferences?: Record<string, unknown>; socketId: string }): Promise<void> {
    const queueData: QueueUser = {
      userId,
      timestamp: Date.now(),
      region: metadata.region || 'global',
      language: metadata.language || 'en',
      preferences: metadata.preferences || {},
      socketId: metadata.socketId,
    };

    await this.redisService.addToQueue(userId, queueData);
    this.logger.debug('User added to queue', { ...queueData });
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

    // Sort users by timestamp (FIFO)
    users.sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < users.length - 1; i++) {
      if (used.has(users[i].userId)) continue;

      for (let j = i + 1; j < users.length; j++) {
        if (used.has(users[j].userId)) continue;

        // Check compatibility
        if (this.areCompatible(users[i], users[j])) {
          matches.push({ user1: users[i], user2: users[j] });
          used.add(users[i].userId);
          used.add(users[j].userId);
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
