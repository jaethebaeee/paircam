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

  // ========================================
  // DISTRIBUTED LOCKING
  // ========================================

  /**
   * Acquire a distributed lock using Redis SET NX
   * Returns true if lock acquired, false if already locked
   */
  async acquireLock(lockKey: string, ttlMs = 5000): Promise<boolean> {
    try {
      const lockValue = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const result = await this.client.set(`lock:${lockKey}`, lockValue, {
        NX: true,
        PX: ttlMs,
      });
      return result === 'OK';
    } catch (error) {
      this.logger.error(`Failed to acquire lock ${lockKey}`, error.stack);
      return false;
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.client.del(`lock:${lockKey}`);
    } catch (error) {
      this.logger.error(`Failed to release lock ${lockKey}`, error.stack);
    }
  }

  /**
   * Execute operation with lock (auto-release)
   */
  async withLock<T>(
    lockKey: string,
    operation: () => Promise<T>,
    ttlMs = 5000,
    retries = 3,
    retryDelayMs = 100,
  ): Promise<T | null> {
    for (let attempt = 0; attempt < retries; attempt++) {
      const acquired = await this.acquireLock(lockKey, ttlMs);
      if (acquired) {
        try {
          return await operation();
        } finally {
          await this.releaseLock(lockKey);
        }
      }
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, retryDelayMs * Math.pow(2, attempt)));
    }
    this.logger.warn(`Failed to acquire lock after ${retries} attempts`, { lockKey });
    return null;
  }

  /**
   * Acquire lock for matching two users (prevents race conditions)
   */
  async acquireMatchLock(user1Id: string, user2Id: string, ttlMs = 3000): Promise<boolean> {
    // Sort IDs to ensure consistent lock key regardless of order
    const [first, second] = [user1Id, user2Id].sort();
    return this.acquireLock(`match:${first}:${second}`, ttlMs);
  }

  /**
   * Release match lock
   */
  async releaseMatchLock(user1Id: string, user2Id: string): Promise<void> {
    const [first, second] = [user1Id, user2Id].sort();
    await this.releaseLock(`match:${first}:${second}`);
  }

  // ========================================
  // SESSION STATE MANAGEMENT
  // ========================================

  /**
   * Session states for state machine
   */
  static readonly SESSION_STATES = {
    PENDING: 'pending',       // Match created, waiting for connection
    CONNECTING: 'connecting', // WebRTC negotiation in progress
    CONNECTED: 'connected',   // Call active
    ENDING: 'ending',         // One user disconnected, waiting for cleanup
    ENDED: 'ended',           // Session fully terminated
  } as const;

  /**
   * Create session with state machine
   */
  async createSessionWithState(
    sessionId: string,
    data: Record<string, unknown>,
    ttlSeconds = 300,
  ): Promise<boolean> {
    try {
      const sessionData = {
        ...data,
        state: RedisService.SESSION_STATES.PENDING,
        stateHistory: [{ state: RedisService.SESSION_STATES.PENDING, timestamp: Date.now() }],
        createdAt: Date.now(),
      };

      // Use NX to prevent overwriting existing session
      const result = await this.client.set(
        `session:${sessionId}`,
        JSON.stringify(sessionData),
        { NX: true, EX: ttlSeconds }
      );

      if (result === 'OK') {
        this.logger.debug('Session created with state', { sessionId, state: 'pending' });
        return true;
      }

      this.logger.warn('Session already exists', { sessionId });
      return false;
    } catch (error) {
      this.logger.error(`Failed to create session ${sessionId}`, error.stack);
      throw new Error('Session creation failed');
    }
  }

  /**
   * Transition session state (with validation)
   */
  async transitionSessionState(
    sessionId: string,
    newState: string,
    allowedFromStates: string[],
  ): Promise<boolean> {
    const session = await this.getSession<{ state: string; stateHistory: Array<{ state: string; timestamp: number }> }>(sessionId);
    if (!session) {
      this.logger.warn('Cannot transition state: session not found', { sessionId });
      return false;
    }

    if (!allowedFromStates.includes(session.state)) {
      this.logger.warn('Invalid state transition', {
        sessionId,
        currentState: session.state,
        requestedState: newState,
        allowedFromStates,
      });
      return false;
    }

    // Update state
    session.state = newState;
    session.stateHistory = session.stateHistory || [];
    session.stateHistory.push({ state: newState, timestamp: Date.now() });

    // Determine TTL based on state
    let ttl = 300; // Default 5 minutes
    if (newState === RedisService.SESSION_STATES.CONNECTED) {
      ttl = 3600; // 1 hour for active calls
    } else if (newState === RedisService.SESSION_STATES.ENDING) {
      ttl = 60; // 1 minute for cleanup
    } else if (newState === RedisService.SESSION_STATES.ENDED) {
      ttl = 30; // 30 seconds before deletion
    }

    await this.client.setEx(`session:${sessionId}`, ttl, JSON.stringify(session));
    this.logger.debug('Session state transitioned', { sessionId, newState });
    return true;
  }

  /**
   * Get session state
   */
  async getSessionState(sessionId: string): Promise<string | null> {
    const session = await this.getSession<{ state: string }>(sessionId);
    return session?.state || null;
  }

  /**
   * Refresh session TTL (for active calls)
   */
  async refreshSessionTTL(sessionId: string, ttlSeconds = 3600): Promise<void> {
    try {
      await this.client.expire(`session:${sessionId}`, ttlSeconds);
    } catch (error) {
      this.logger.error(`Failed to refresh session TTL for ${sessionId}`, error.stack);
    }
  }

  // ========================================
  // ATOMIC OPERATIONS
  // ========================================

  /**
   * Atomically create a match (prevents duplicates)
   */
  async createMatchAtomic(
    user1Id: string,
    user2Id: string,
    sessionId: string,
    matchData: Record<string, unknown>,
  ): Promise<boolean> {
    const lockAcquired = await this.acquireMatchLock(user1Id, user2Id);
    if (!lockAcquired) {
      this.logger.warn('Failed to acquire match lock', { user1Id, user2Id });
      return false;
    }

    try {
      // Check if either user is already in a session
      const [user1Session, user2Session] = await Promise.all([
        this.client.get(`user:session:${user1Id}`),
        this.client.get(`user:session:${user2Id}`),
      ]);

      if (user1Session || user2Session) {
        this.logger.warn('User already in session', {
          user1Id,
          user2Id,
          user1Session,
          user2Session,
        });
        return false;
      }

      // Atomically create session and mark users as matched
      const pipeline = this.client.multi();

      // Create session
      pipeline.setEx(`session:${sessionId}`, 300, JSON.stringify({
        ...matchData,
        state: RedisService.SESSION_STATES.PENDING,
        createdAt: Date.now(),
      }));

      // Mark users as in session
      pipeline.setEx(`user:session:${user1Id}`, 300, sessionId);
      pipeline.setEx(`user:session:${user2Id}`, 300, sessionId);

      // Remove from queue
      pipeline.zRem(this.QUEUE_ZSET_KEY, user1Id);
      pipeline.zRem(this.QUEUE_ZSET_KEY, user2Id);
      pipeline.del(`${this.QUEUE_DATA_PREFIX}${user1Id}`);
      pipeline.del(`${this.QUEUE_DATA_PREFIX}${user2Id}`);

      await pipeline.exec();

      this.logger.debug('Match created atomically', { sessionId, user1Id, user2Id });
      return true;
    } finally {
      await this.releaseMatchLock(user1Id, user2Id);
    }
  }

  /**
   * Check if user is currently in a session
   */
  async isUserInSession(userId: string): Promise<boolean> {
    try {
      const session = await this.client.get(`user:session:${userId}`);
      return session !== null;
    } catch (error) {
      this.logger.error(`Failed to check user session for ${userId}`, error.stack);
      return false;
    }
  }

  /**
   * Get user's current session ID
   */
  async getUserSessionId(userId: string): Promise<string | null> {
    try {
      return await this.client.get(`user:session:${userId}`);
    } catch (error) {
      this.logger.error(`Failed to get session for ${userId}`, error.stack);
      return null;
    }
  }

  /**
   * Clear user session mapping
   */
  async clearUserSession(userId: string): Promise<void> {
    try {
      await this.client.del(`user:session:${userId}`);
    } catch (error) {
      this.logger.error(`Failed to clear session for ${userId}`, error.stack);
    }
  }

  // ========================================
  // FRAUD DETECTION HELPERS
  // ========================================

  /**
   * Track user activity for fraud detection
   */
  async trackUserActivity(userId: string, activityType: string): Promise<void> {
    try {
      const key = `activity:${userId}:${activityType}`;
      const pipeline = this.client.multi();
      pipeline.incr(key);
      pipeline.expire(key, 3600); // 1 hour window
      await pipeline.exec();
    } catch (error) {
      this.logger.error(`Failed to track activity for ${userId}`, error.stack);
    }
  }

  /**
   * Get user activity count
   */
  async getUserActivityCount(userId: string, activityType: string): Promise<number> {
    try {
      const count = await this.client.get(`activity:${userId}:${activityType}`);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      this.logger.error(`Failed to get activity count for ${userId}`, error.stack);
      return 0;
    }
  }

  /**
   * Flag user as suspicious
   */
  async flagSuspiciousUser(userId: string, reason: string): Promise<void> {
    try {
      const key = `suspicious:${userId}`;
      const existing = await this.client.get(key);
      const flags = existing ? JSON.parse(existing) : [];
      flags.push({ reason, timestamp: Date.now() });
      await this.client.setEx(key, 86400 * 7, JSON.stringify(flags)); // 7 day TTL
      this.logger.warn('User flagged as suspicious', { userId, reason });
    } catch (error) {
      this.logger.error(`Failed to flag user ${userId}`, error.stack);
    }
  }

  /**
   * Check if user is flagged
   */
  async isUserFlagged(userId: string): Promise<boolean> {
    try {
      const flags = await this.client.get(`suspicious:${userId}`);
      return flags !== null;
    } catch (error) {
      this.logger.error(`Failed to check flags for ${userId}`, error.stack);
      return false;
    }
  }

  /**
   * Get user flags
   */
  async getUserFlags(userId: string): Promise<Array<{ reason: string; timestamp: number }>> {
    try {
      const flags = await this.client.get(`suspicious:${userId}`);
      return flags ? JSON.parse(flags) : [];
    } catch (error) {
      this.logger.error(`Failed to get flags for ${userId}`, error.stack);
      return [];
    }
  }

  // ========================================
  // QUEUE OPERATIONS (Using ZSET for O(log n))
  // ========================================

  // Queue keys:
  // - matchmaking:queue:zset - Sorted set with userId as member, timestamp as score
  // - matchmaking:queue:data:{userId} - Hash storing full queue user data

  private readonly QUEUE_ZSET_KEY = 'matchmaking:queue:zset';
  private readonly QUEUE_DATA_PREFIX = 'matchmaking:queue:data:';

  /**
   * Add user to queue using ZSET (O(log n))
   */
  async addToQueue<T extends { userId: string; timestamp: number }>(userId: string, item: T): Promise<void> {
    try {
      const pipeline = this.client.multi();

      // Add to sorted set with timestamp as score (for ordering by wait time)
      pipeline.zAdd(this.QUEUE_ZSET_KEY, { score: item.timestamp, value: userId });

      // Store full data in a hash (expires after 10 minutes max)
      pipeline.setEx(`${this.QUEUE_DATA_PREFIX}${userId}`, 600, JSON.stringify(item));

      await pipeline.exec();

      this.logger.debug('User added to ZSET queue', { userId, timestamp: item.timestamp });
    } catch (error) {
      this.logger.error(`Failed to add user ${userId} to queue`, error.stack);
      throw new Error('Queue operation failed');
    }
  }

  /**
   * Remove user from queue (O(log n))
   */
  async removeFromQueue(userId: string): Promise<void> {
    try {
      const pipeline = this.client.multi();

      // Remove from sorted set
      pipeline.zRem(this.QUEUE_ZSET_KEY, userId);

      // Remove data
      pipeline.del(`${this.QUEUE_DATA_PREFIX}${userId}`);

      await pipeline.exec();

      this.logger.debug('User removed from queue', { userId });
    } catch (error) {
      this.logger.error(`Failed to remove user ${userId} from queue`, error.stack);
      throw new Error('Queue operation failed');
    }
  }

  /**
   * Get queue length (O(1))
   */
  async getQueueLength(): Promise<number> {
    try {
      return await this.client.zCard(this.QUEUE_ZSET_KEY);
    } catch (error) {
      this.logger.error('Failed to get queue length', error.stack);
      return 0;
    }
  }

  /**
   * Get all users in queue ordered by wait time (oldest first)
   * Returns full QueueUser data for each user
   */
  async getAllQueueUsers<T>(): Promise<T[]> {
    try {
      // Get all userIds ordered by timestamp (oldest first)
      const userIds = await this.client.zRange(this.QUEUE_ZSET_KEY, 0, -1);

      if (userIds.length === 0) {
        return [];
      }

      // Fetch all user data in a single pipeline
      const pipeline = this.client.multi();
      for (const userId of userIds) {
        pipeline.get(`${this.QUEUE_DATA_PREFIX}${userId}`);
      }
      const results = await pipeline.exec();

      // Parse results, filtering out null/invalid entries
      const users: T[] = [];
      for (let i = 0; i < results.length; i++) {
        const data = results[i] as string | null;
        if (data) {
          try {
            users.push(JSON.parse(data) as T);
          } catch (parseError) {
            // Invalid data - clean it up
            this.logger.warn('Invalid queue data, cleaning up', { userId: userIds[i] });
            await this.removeFromQueue(userIds[i]);
          }
        } else {
          // Missing data but in ZSET - clean it up
          this.logger.warn('Missing queue data, cleaning up', { userId: userIds[i] });
          await this.client.zRem(this.QUEUE_ZSET_KEY, userIds[i]);
        }
      }

      return users;
    } catch (error) {
      this.logger.error('Failed to get all queue users', error.stack);
      return [];
    }
  }

  /**
   * Get users waiting longer than specified time
   */
  async getUrgentQueueUsers<T>(olderThanMs: number): Promise<T[]> {
    try {
      const cutoffTime = Date.now() - olderThanMs;

      // Get userIds with timestamp < cutoffTime (waiting longer)
      const userIds = await this.client.zRangeByScore(this.QUEUE_ZSET_KEY, '-inf', cutoffTime);

      if (userIds.length === 0) {
        return [];
      }

      // Fetch all user data
      const pipeline = this.client.multi();
      for (const userId of userIds) {
        pipeline.get(`${this.QUEUE_DATA_PREFIX}${userId}`);
      }
      const results = await pipeline.exec();

      const users: T[] = [];
      for (let i = 0; i < results.length; i++) {
        const data = results[i] as string | null;
        if (data) {
          try {
            users.push(JSON.parse(data) as T);
          } catch {
            // Skip invalid
          }
        }
      }

      return users;
    } catch (error) {
      this.logger.error('Failed to get urgent queue users', error.stack);
      return [];
    }
  }

  /**
   * Check if user is in queue (O(log n))
   */
  async isInQueue(userId: string): Promise<boolean> {
    try {
      const score = await this.client.zScore(this.QUEUE_ZSET_KEY, userId);
      return score !== null;
    } catch (error) {
      this.logger.error(`Failed to check if user ${userId} is in queue`, error.stack);
      return false;
    }
  }

  /**
   * Get user's position in queue (O(log n))
   * Returns 1-indexed position, or -1 if not in queue
   */
  async getQueuePosition(userId: string): Promise<number> {
    try {
      const rank = await this.client.zRank(this.QUEUE_ZSET_KEY, userId);
      return rank !== null ? rank + 1 : -1;
    } catch (error) {
      this.logger.error(`Failed to get queue position for ${userId}`, error.stack);
      return -1;
    }
  }

  /**
   * Get user's wait time in milliseconds
   */
  async getQueueWaitTime(userId: string): Promise<number> {
    try {
      const score = await this.client.zScore(this.QUEUE_ZSET_KEY, userId);
      if (score === null) return 0;
      return Date.now() - score;
    } catch (error) {
      this.logger.error(`Failed to get wait time for ${userId}`, error.stack);
      return 0;
    }
  }

  async getNextInQueue(): Promise<Record<string, unknown> | null> {
    try {
      // Get oldest user (lowest score = earliest timestamp)
      const results = await this.client.zRangeWithScores(this.QUEUE_ZSET_KEY, 0, 0);
      if (results.length === 0) return null;

      const userId = results[0].value;
      const data = await this.client.get(`${this.QUEUE_DATA_PREFIX}${userId}`);

      if (!data) return null;

      try {
        return JSON.parse(data);
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

  // Bulk fetch recent matches for multiple users (optimized for matchmaking)
  async getRecentMatchesBulk(userIds: string[]): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>();

    if (userIds.length === 0) {
      return result;
    }

    try {
      // Use pipeline for efficient bulk fetch
      const pipeline = this.client.multi();

      for (const userId of userIds) {
        pipeline.sMembers(`recent-matches:${userId}`);
      }

      const responses = await pipeline.exec();

      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const matches = responses[i] as string[] || [];
        result.set(userId, new Set(matches));
      }

      this.logger.debug('Bulk fetched recent matches', {
        userCount: userIds.length,
        totalMatches: Array.from(result.values()).reduce((sum, set) => sum + set.size, 0)
      });
    } catch (error) {
      this.logger.error('Failed to bulk fetch recent matches', error.stack);
      // Return empty sets on error
      for (const userId of userIds) {
        result.set(userId, new Set());
      }
    }

    return result;
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
      
      try {
        return JSON.parse(data);
      } catch (parseError) {
        this.logger.error(`Failed to parse reputation data for ${userId}`, parseError.stack);
        return {
          rating: 70,
          totalRatings: 0,
          skipRate: 0,
          reportCount: 0,
          averageCallDuration: 0,
          lastUpdated: Date.now(),
        };
      }
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

  // Client-to-Instance mapping for horizontal scaling
  async registerClient(deviceId: string, instanceId: string, socketId: string): Promise<void> {
    try {
      const key = `client:${deviceId}`;
      const data = JSON.stringify({ instanceId, socketId, timestamp: Date.now() });
      await this.client.setEx(key, 600, data); // 10 minute TTL, refreshed on activity
      this.logger.debug('Client registered', { deviceId, instanceId });
    } catch (error) {
      this.logger.error(`Failed to register client ${deviceId}`, error.stack);
    }
  }

  async unregisterClient(deviceId: string): Promise<void> {
    try {
      await this.client.del(`client:${deviceId}`);
      this.logger.debug('Client unregistered', { deviceId });
    } catch (error) {
      this.logger.error(`Failed to unregister client ${deviceId}`, error.stack);
    }
  }

  async getClientInstance(deviceId: string): Promise<{ instanceId: string; socketId: string } | null> {
    try {
      const data = await this.client.get(`client:${deviceId}`);
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch (parseError) {
        this.logger.error(`Failed to parse client instance data for ${deviceId}`, parseError.stack);
        return null;
      }
    } catch (error) {
      this.logger.error(`Failed to get client instance for ${deviceId}`, error.stack);
      return null;
    }
  }

  async refreshClientTTL(deviceId: string): Promise<void> {
    try {
      await this.client.expire(`client:${deviceId}`, 600);
    } catch (error) {
      this.logger.error(`Failed to refresh client TTL for ${deviceId}`, error.stack);
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