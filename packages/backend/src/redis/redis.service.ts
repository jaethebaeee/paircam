import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { LoggerService } from '../services/logger.service';
import { env } from '../env';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor(private readonly logger: LoggerService) {}

  async onModuleInit() {
    try {
      // Prefer URL if provided (supports rediss:// for TLS, e.g., Upstash)
      if (env.REDIS_URL) {
        this.client = createClient({ url: env.REDIS_URL });
      } else {
        this.client = createClient({
          socket: {
            host: env.REDIS_HOST,
            port: env.REDIS_PORT,
          },
          password: env.REDIS_PASSWORD,
          database: env.REDIS_DB,
        });
      }

      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error', err.stack);
      });

      this.client.on('connect', () => {
        this.logger.log('Connected to Redis');
      });

      this.client.on('reconnecting', () => {
        this.logger.warn('Redis reconnecting...');
      });

      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to initialize Redis connection', error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.client) {
        await this.client.disconnect();
        this.logger.log('Redis disconnected');
      }
    } catch (error) {
      this.logger.error('Error disconnecting from Redis', error.stack);
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  // Queue operations
  async addToQueue<T extends { userId: string; timestamp: number }>(userId: string, item: T): Promise<void> {
    try {
      await this.client.lPush('matchmaking:queue', JSON.stringify(item));
    } catch (error) {
      this.logger.error(`Failed to add user ${userId} to queue`, error.stack);
      throw new Error('Queue operation failed');
    }
  }

  async removeFromQueue(userId: string): Promise<void> {
    try {
      const queueItems = await this.client.lRange('matchmaking:queue', 0, -1);
      for (const item of queueItems) {
        try {
          const data = JSON.parse(item);
          if (data.userId === userId) {
            await this.client.lRem('matchmaking:queue', 1, item);
            break;
          }
        } catch (parseError) {
          this.logger.warn('Failed to parse queue item', { item, error: parseError.message });
          continue;
        }
      }
    } catch (error) {
      this.logger.error(`Failed to remove user ${userId} from queue`, error.stack);
      throw new Error('Queue operation failed');
    }
  }

  async getQueueLength(): Promise<number> {
    try {
      return await this.client.lLen('matchmaking:queue');
    } catch (error) {
      this.logger.error('Failed to get queue length', error.stack);
      return 0;
    }
  }

  async getNextInQueue(): Promise<Record<string, unknown> | null> {
    try {
      const item = await this.client.rPop('matchmaking:queue');
      if (!item) return null;
      
      try {
        return JSON.parse(item);
      } catch (parseError) {
        this.logger.error('Failed to parse queue item', parseError.stack);
        return null;
      }
    } catch (error) {
      this.logger.error('Failed to get next in queue', error.stack);
      return null;
    }
  }

  // Recent matches tracking (avoid rematching)
  async addToRecentMatches(userId: string, matchedUserId: string): Promise<void> {
    try {
      const key = `recent-matches:${userId}`;
      await this.client.sAdd(key, matchedUserId);
      await this.client.expire(key, 3600); // Remember for 1 hour
      this.logger.debug('Added to recent matches', { userId, matchedUserId });
    } catch (error) {
      this.logger.error(`Failed to add recent match for ${userId}`, error.stack);
    }
  }

  async getRecentMatches(userId: string): Promise<string[]> {
    try {
      const key = `recent-matches:${userId}`;
      return await this.client.sMembers(key);
    } catch (error) {
      this.logger.error(`Failed to get recent matches for ${userId}`, error.stack);
      return [];
    }
  }

  async clearRecentMatches(userId: string): Promise<void> {
    try {
      const key = `recent-matches:${userId}`;
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Failed to clear recent matches for ${userId}`, error.stack);
    }
  }

  // User reputation tracking
  async getUserReputation(userId: string): Promise<{
    rating: number;
    totalRatings: number;
    skipRate: number;
    reportCount: number;
    averageCallDuration: number;
    lastUpdated: number;
  }> {
    try {
      const key = `reputation:${userId}`;
      const data = await this.client.get(key);
      
      if (!data) {
        // Default reputation for new users
        return {
          rating: 70, // Neutral start (0-100 scale)
          totalRatings: 0,
          skipRate: 0,
          reportCount: 0,
          averageCallDuration: 0,
          lastUpdated: Date.now(),
        };
      }
      
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Failed to get reputation for ${userId}`, error.stack);
      return {
        rating: 70,
        totalRatings: 0,
        skipRate: 0,
        reportCount: 0,
        averageCallDuration: 0,
        lastUpdated: Date.now(),
      };
    }
  }

  // Counter operations for analytics (removed duplicate - see below for main implementation)

  async updateReputation(userId: string, update: {
    wasSkipped?: boolean;
    callDuration?: number;
    wasReported?: boolean;
  }): Promise<void> {
    try {
      const key = `reputation:${userId}`;
      const rep = await this.getUserReputation(userId);
      
      // Update skip rate
      if (update.wasSkipped !== undefined) {
        rep.totalRatings++;
        const skipValue = update.wasSkipped ? 100 : 0;
        rep.skipRate = (rep.skipRate * (rep.totalRatings - 1) + skipValue) / rep.totalRatings;
      }
      
      // Update call duration
      if (update.callDuration !== undefined && update.callDuration > 0) {
        const totalCalls = rep.totalRatings || 1;
        rep.averageCallDuration = 
          (rep.averageCallDuration * (totalCalls - 1) + update.callDuration) / totalCalls;
      }
      
      // Update report count
      if (update.wasReported) {
        rep.reportCount++;
      }
      
      // Calculate overall rating (0-100)
      // Good call duration: +points, Low skip rate: +points, Few reports: +points
      let rating = 70; // Base score
      
      // Call duration bonus (0-20 points): longer calls = better
      if (rep.averageCallDuration > 120) rating += 20; // 2+ minutes
      else if (rep.averageCallDuration > 60) rating += 10; // 1+ minute
      else if (rep.averageCallDuration > 30) rating += 5; // 30+ seconds
      
      // Skip rate penalty (0-30 points): lower is better
      if (rep.skipRate < 20) rating += 30; // <20% skip rate = excellent
      else if (rep.skipRate < 50) rating += 15; // <50% = good
      else rating -= 10; // >50% = poor
      
      // Report penalty (0-30 points)
      rating -= Math.min(rep.reportCount * 10, 50); // -10 per report, cap at -50
      
      rep.rating = Math.max(0, Math.min(100, rating)); // Clamp 0-100
      rep.lastUpdated = Date.now();
      
      // Store with 90 day TTL
      await this.client.setEx(key, 86400 * 90, JSON.stringify(rep));
      
      this.logger.debug('Reputation updated', { userId, reputation: rep });
    } catch (error) {
      this.logger.error(`Failed to update reputation for ${userId}`, error.stack);
    }
  }

  // Session operations
  async createSession(sessionId: string, data: Record<string, unknown>, ttlSeconds = 300): Promise<void> {
    try {
      await this.client.setEx(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
    } catch (error) {
      this.logger.error(`Failed to create session ${sessionId}`, error.stack);
      throw new Error('Session creation failed');
    }
  }

  async getSession<T = Record<string, unknown>>(sessionId: string): Promise<T | null> {
    try {
      const data = await this.client.get(`session:${sessionId}`);
      if (!data) return null;
      
      try {
        return JSON.parse(data) as T;
      } catch (parseError) {
        this.logger.error(`Failed to parse session data for ${sessionId}`, parseError.stack);
        return null;
      }
    } catch (error) {
      this.logger.error(`Failed to get session ${sessionId}`, error.stack);
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.client.del(`session:${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to delete session ${sessionId}`, error.stack);
      // Don't throw - deletion failures shouldn't break the flow
    }
  }

  // Offer/Answer operations
  async storeOffer(sessionId: string, offer: unknown, ttlSeconds = 30): Promise<void> {
    try {
      await this.client.setEx(`offer:${sessionId}`, ttlSeconds, JSON.stringify(offer));
    } catch (error) {
      this.logger.error(`Failed to store offer for ${sessionId}`, error.stack);
      throw new Error('Failed to store offer');
    }
  }

  async getOffer<T = unknown>(sessionId: string): Promise<T | null> {
    try {
      const data = await this.client.get(`offer:${sessionId}`);
      if (!data) return null;
      
      try {
        return JSON.parse(data) as T;
      } catch (parseError) {
        this.logger.error(`Failed to parse offer for ${sessionId}`, parseError.stack);
        return null;
      }
    } catch (error) {
      this.logger.error(`Failed to get offer for ${sessionId}`, error.stack);
      return null;
    }
  }

  async storeAnswer(sessionId: string, answer: unknown, ttlSeconds = 30): Promise<void> {
    try {
      await this.client.setEx(`answer:${sessionId}`, ttlSeconds, JSON.stringify(answer));
    } catch (error) {
      this.logger.error(`Failed to store answer for ${sessionId}`, error.stack);
      throw new Error('Failed to store answer');
    }
  }

  async getAnswer<T = unknown>(sessionId: string): Promise<T | null> {
    try {
      const data = await this.client.get(`answer:${sessionId}`);
      if (!data) return null;
      
      try {
        return JSON.parse(data) as T;
      } catch (parseError) {
        this.logger.error(`Failed to parse answer for ${sessionId}`, parseError.stack);
        return null;
      }
    } catch (error) {
      this.logger.error(`Failed to get answer for ${sessionId}`, error.stack);
      return null;
    }
  }

  // ICE Candidates
  async addIceCandidate(
    sessionId: string,
    peerId: string,
    candidate: unknown,
    ttlSeconds = 60,
  ): Promise<void> {
    try {
      const key = `candidates:${sessionId}:${peerId}`;
      // Deduplicate by candidate content when possible
      const existing = await this.client.lRange(key, 0, -1);
      const candStr = JSON.stringify(candidate);
      const isDuplicate = existing.some((raw) => raw === candStr);
      if (isDuplicate) {
        return;
      }

      await this.client.lPush(key, candStr);
      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      this.logger.error(`Failed to add ICE candidate for ${sessionId}:${peerId}`, error.stack);
      throw new Error('Failed to store ICE candidate');
    }
  }

  async getIceCandidates<T = unknown>(sessionId: string, peerId: string): Promise<T[]> {
    try {
      const candidates = await this.client.lRange(`candidates:${sessionId}:${peerId}`, 0, -1);
      return candidates.map(c => {
        try {
          return JSON.parse(c);
        } catch (parseError) {
          this.logger.warn('Failed to parse ICE candidate', { error: parseError.message });
          return null;
        }
      }).filter((c): c is T => c !== null);
    } catch (error) {
      this.logger.error(`Failed to get ICE candidates for ${sessionId}:${peerId}`, error.stack);
      return [];
    }
  }

  // Rate limiting
  async incrementRateLimit(key: string, windowSeconds = 60): Promise<number> {
    try {
      const multi = this.client.multi();
      multi.incr(key);
      multi.expire(key, windowSeconds);
      const results = await multi.exec();
      return results[0] as number;
    } catch (error) {
      this.logger.error(`Failed to increment rate limit for ${key}`, error.stack);
      return 0;
    }
  }

  async getRateLimit(key: string): Promise<number> {
    try {
      const count = await this.client.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      this.logger.error(`Failed to get rate limit for ${key}`, error.stack);
      return 0;
    }
  }

  // Block lists
  async addToBlockList(type: 'ip' | 'device', identifier: string, reason: string): Promise<void> {
    try {
      const blockData = {
        identifier,
        reason,
        timestamp: Date.now(),
      };
      await this.client.sAdd(`blocklist:${type}`, JSON.stringify(blockData));
    } catch (error) {
      this.logger.error(`Failed to add ${identifier} to blocklist`, error.stack);
      throw new Error('Failed to add to blocklist');
    }
  }

  async isBlocked(type: 'ip' | 'device', identifier: string): Promise<boolean> {
    try {
      const members = await this.client.sMembers(`blocklist:${type}`);
      return members.some(member => {
        try {
          const data = JSON.parse(member);
          return data.identifier === identifier;
        } catch (parseError) {
          this.logger.warn('Failed to parse blocklist member', { error: parseError.message });
          return false;
        }
      });
    } catch (error) {
      this.logger.error(`Failed to check if ${identifier} is blocked`, error.stack);
      return false; // Fail open - don't block if Redis is down
    }
  }

  // Reports
  async addReport(reportId: string, reportData: unknown): Promise<void> {
    try {
      await this.client.lPush('reports:queue', reportId);
      await this.client.setEx(`report:${reportId}`, 86400, JSON.stringify(reportData)); // 24 hours
    } catch (error) {
      this.logger.error(`Failed to add report ${reportId}`, error.stack);
      throw new Error('Failed to add report');
    }
  }

  async getNextReport(): Promise<string | null> {
    try {
      return await this.client.rPop('reports:queue');
    } catch (error) {
      this.logger.error('Failed to get next report', error.stack);
      return null;
    }
  }

  async getReport<T = Record<string, unknown>>(reportId: string): Promise<T | null> {
    try {
      const data = await this.client.get(`report:${reportId}`);
      if (!data) return null;
      
      try {
        return JSON.parse(data) as T;
      } catch (parseError) {
        this.logger.error(`Failed to parse report ${reportId}`, parseError.stack);
        return null;
      }
    } catch (error) {
      this.logger.error(`Failed to get report ${reportId}`, error.stack);
      return null;
    }
  }

  // Analytics
  async incrementCounter(key: string, increment = 1): Promise<number> {
    try {
      return await this.client.incrBy(key, increment);
    } catch (error) {
      this.logger.error(`Failed to increment counter ${key}`, error.stack);
      return 0;
    }
  }

  async setCounter(key: string, value: number, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value.toString());
      } else {
        await this.client.set(key, value.toString());
      }
    } catch (error) {
      this.logger.error(`Failed to set counter ${key}`, error.stack);
      // Don't throw - counter failures shouldn't break the flow
    }
  }

  async getCounter(key: string): Promise<number> {
    try {
      const value = await this.client.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      this.logger.error(`Failed to get counter ${key}`, error.stack);
      return 0;
    }
  }
}