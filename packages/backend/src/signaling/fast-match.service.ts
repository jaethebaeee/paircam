import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { SignalingGateway } from './signaling.gateway';
import { LoggerService } from '../services/logger.service';
import { v4 as uuidv4 } from 'uuid';

export interface FastQueueUser {
  userId: string;
  deviceId: string;
  socketId: string;
  timestamp: number;
}

/**
 * FastMatchService: Fastest possible matching
 * - Simple FIFO queue (no bucketing, no scoring)
 * - Matches first two users immediately
 * - Optimal for speed, not for quality
 *
 * Performance: O(1) queue operations, instant matching
 */
@Injectable()
export class FastMatchService {
  private readonly QUEUE_KEY = 'fast-match:queue';
  private readonly SESSION_PREFIX = 'fast-session:';
  private readonly SESSION_TTL = 300; // 5 minutes

  constructor(
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => SignalingGateway))
    private readonly signalingGateway: SignalingGateway,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Join the fast match queue
   * If someone is waiting, match immediately
   * Otherwise, wait for next user
   */
  async joinFastQueue(userId: string, metadata: {
    deviceId: string;
    socketId: string;
  }): Promise<{ sessionId?: string; matched: boolean }> {
    const queueUser: FastQueueUser = {
      userId,
      deviceId: metadata.deviceId,
      socketId: metadata.socketId,
      timestamp: Date.now(),
    };

    // Check if someone is already waiting
    const waitingUser = await this.redisService.lpop(this.QUEUE_KEY) as FastQueueUser | null;

    if (!waitingUser) {
      // No one waiting, add this user to queue
      await this.redisService.rpush(this.QUEUE_KEY, queueUser);
      this.logger.debug('User joined fast queue', { userId });
      return { matched: false };
    }

    // Someone is waiting! Match them immediately
    const sessionId = uuidv4();
    const sessionData = {
      id: sessionId,
      peers: [waitingUser.userId, userId],
      createdAt: Date.now(),
    };

    // Store session
    await this.redisService.set(
      `${this.SESSION_PREFIX}${sessionId}`,
      sessionData,
      this.SESSION_TTL,
    );

    this.logger.log('Fast match found!', {
      user1: waitingUser.userId,
      user2: userId,
      sessionId,
    });

    // Notify both users of match
    await this.signalingGateway.server
      .to(waitingUser.socketId)
      .emit('matched', {
        sessionId,
        peerId: userId,
        timestamp: Date.now(),
      });

    await this.signalingGateway.server
      .to(metadata.socketId)
      .emit('matched', {
        sessionId,
        peerId: waitingUser.userId,
        timestamp: Date.now(),
      });

    return { sessionId, matched: true };
  }

  /**
   * Leave the fast queue without being matched
   * Uses atomic LREM for safe removal without race conditions
   */
  async leaveFastQueue(userId: string): Promise<void> {
    try {
      // Get the queue to find user's record
      const queue = await this.redisService.lrange(this.QUEUE_KEY, 0, -1) as FastQueueUser[];
      const userToRemove = queue.find(u => u.userId === userId);

      if (userToRemove) {
        // Atomically remove this exact user object from queue
        // count=1: remove first occurrence
        await this.redisService.lrem(this.QUEUE_KEY, 1, userToRemove);
        this.logger.debug('User removed from fast queue', { userId });
      }
    } catch (error) {
      this.logger.error('Failed to leave fast queue', error.stack);
    }
  }

  /**
   * Get current queue length (for UI: "X people waiting")
   */
  async getQueueLength(): Promise<number> {
    const length = await this.redisService.llen(this.QUEUE_KEY);
    return length;
  }

  /**
   * Get current wait time estimate (seconds)
   * Formula: (queue_length - 1) * avg_connection_time
   * Assuming ~3-5 seconds average connection time
   */
  async getEstimatedWaitTime(): Promise<number> {
    const length = await this.getQueueLength();
    if (length < 2) return 0;
    return (length - 1) * 4; // Average 4 seconds per match
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    // Redis automatically deletes expired keys, nothing to do
    this.logger.debug('Session cleanup completed (Redis auto-cleanup)');
  }
}
