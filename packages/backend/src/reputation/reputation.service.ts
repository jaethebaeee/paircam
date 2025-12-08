import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UserReputation } from './entities/user-reputation.entity';
import { ReputationEvent } from './entities/reputation-event.entity';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../services/logger.service';

/**
 * Rating change values for different events
 */
const RATING_CHANGES = {
  call_completed: 0.5, // Small positive for completing a call
  call_skipped: -1.0, // Negative for skipping
  report_received: -3.0, // Significant negative for being reported
  report_submitted: 0.0, // Neutral (unless abused)
  warning_issued: -10.0, // Large negative for warnings
  ban_issued: -20.0, // Very large negative for bans
  ban_lifted: 5.0, // Small recovery when ban lifted
  friend_request: 1.0, // Positive for being wanted as friend
  connection_failed: -0.2, // Small negative (might not be their fault)
  long_call_bonus: 2.0, // Bonus for calls > 5 minutes
  rating_decay: -0.1, // Small decay for inactivity
  manual_adjustment: 0.0, // Determined by admin
};

@Injectable()
export class ReputationService {
  constructor(
    @InjectRepository(UserReputation)
    private readonly reputationRepository: Repository<UserReputation>,
    @InjectRepository(ReputationEvent)
    private readonly eventRepository: Repository<ReputationEvent>,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get or create reputation record for a user
   */
  async getOrCreateReputation(userId: string): Promise<UserReputation> {
    let reputation = await this.reputationRepository.findOne({
      where: { userId },
    });

    if (!reputation) {
      reputation = this.reputationRepository.create({
        userId,
        rating: 50.0, // Start at neutral
      });
      await this.reputationRepository.save(reputation);
      this.logger.log('Created new reputation record', { userId });
    }

    return reputation;
  }

  /**
   * Get user's current rating (with Redis cache)
   */
  async getRating(userId: string): Promise<number> {
    // Try cache first
    const cacheKey = `reputation:rating:${userId}`;
    const cached = await this.redisService.getClient().get(cacheKey);
    if (cached) {
      return parseFloat(cached);
    }

    // Get from DB
    const reputation = await this.getOrCreateReputation(userId);

    // Cache for 5 minutes
    await this.redisService.getClient().setEx(cacheKey, 300, reputation.rating.toString());

    return reputation.rating;
  }

  /**
   * Record a call completion and update reputation
   */
  async recordCallCompleted(
    userId: string,
    sessionId: string,
    callDuration: number,
    wasSkipped: boolean,
  ): Promise<void> {
    const reputation = await this.getOrCreateReputation(userId);
    const previousRating = reputation.rating;

    // Determine rating change
    let eventType: ReputationEvent['eventType'];
    let ratingChange: number;

    if (wasSkipped && callDuration < 30) {
      // Quick skip - negative
      eventType = 'call_skipped';
      ratingChange = RATING_CHANGES.call_skipped;
    } else if (callDuration >= 300) {
      // Long call (5+ min) - bonus
      eventType = 'long_call_bonus';
      ratingChange = RATING_CHANGES.long_call_bonus;
    } else if (callDuration >= 60) {
      // Completed call (1+ min) - positive
      eventType = 'call_completed';
      ratingChange = RATING_CHANGES.call_completed;
    } else {
      // Short call - neutral to slightly negative
      eventType = 'call_completed';
      ratingChange = callDuration < 15 ? -0.3 : 0;
    }

    // Apply rating change (clamped to 0-100)
    const newRating = Math.max(0, Math.min(100, previousRating + ratingChange));

    // Update reputation
    reputation.rating = newRating;
    reputation.totalCalls += 1;
    reputation.totalCallDuration += callDuration;
    reputation.avgCallDuration = reputation.totalCallDuration / reputation.totalCalls;
    reputation.lastCallAt = new Date();

    if (wasSkipped) {
      reputation.skippedCalls += 1;
    } else if (callDuration >= 60) {
      reputation.completedCalls += 1;
    }

    reputation.skipRate =
      reputation.totalCalls > 0
        ? (reputation.skippedCalls / reputation.totalCalls) * 100
        : 0;

    await this.reputationRepository.save(reputation);

    // Record event
    await this.recordEvent({
      userId,
      eventType,
      previousRating,
      newRating,
      ratingChange,
      sessionId,
      reason: wasSkipped
        ? `Call skipped after ${callDuration}s`
        : `Call completed (${callDuration}s)`,
      metadata: { callDuration, wasSkipped },
    });

    // Invalidate cache
    await this.redisService.getClient().del(`reputation:rating:${userId}`);

    this.logger.debug('Reputation updated for call', {
      userId,
      previousRating,
      newRating,
      eventType,
      callDuration,
    });
  }

  /**
   * Record when user receives a report
   */
  async recordReportReceived(
    userId: string,
    sessionId: string,
    reporterId: string,
    reason: string,
  ): Promise<void> {
    const reputation = await this.getOrCreateReputation(userId);
    const previousRating = reputation.rating;
    const ratingChange = RATING_CHANGES.report_received;
    const newRating = Math.max(0, previousRating + ratingChange);

    reputation.rating = newRating;
    reputation.reportsReceived += 1;

    await this.reputationRepository.save(reputation);

    await this.recordEvent({
      userId,
      eventType: 'report_received',
      previousRating,
      newRating,
      ratingChange,
      sessionId,
      relatedUserId: reporterId,
      reason: `Reported for: ${reason}`,
    });

    await this.redisService.getClient().del(`reputation:rating:${userId}`);
  }

  /**
   * Record a warning issued by moderator
   */
  async recordWarning(
    userId: string,
    moderatorId: string,
    reason: string,
  ): Promise<void> {
    const reputation = await this.getOrCreateReputation(userId);
    const previousRating = reputation.rating;
    const ratingChange = RATING_CHANGES.warning_issued;
    const newRating = Math.max(0, previousRating + ratingChange);

    reputation.rating = newRating;
    reputation.warningsCount += 1;

    await this.reputationRepository.save(reputation);

    await this.recordEvent({
      userId,
      eventType: 'warning_issued',
      previousRating,
      newRating,
      ratingChange,
      relatedUserId: moderatorId,
      reason,
    });

    await this.redisService.getClient().del(`reputation:rating:${userId}`);
  }

  /**
   * Record a ban
   */
  async recordBan(
    userId: string,
    moderatorId: string,
    reason: string,
    duration?: number,
  ): Promise<void> {
    const reputation = await this.getOrCreateReputation(userId);
    const previousRating = reputation.rating;
    const ratingChange = RATING_CHANGES.ban_issued;
    const newRating = Math.max(0, previousRating + ratingChange);

    reputation.rating = newRating;
    reputation.bansCount += 1;

    await this.reputationRepository.save(reputation);

    await this.recordEvent({
      userId,
      eventType: 'ban_issued',
      previousRating,
      newRating,
      ratingChange,
      relatedUserId: moderatorId,
      reason,
      metadata: { duration },
    });

    await this.redisService.getClient().del(`reputation:rating:${userId}`);
  }

  /**
   * Record connection failure
   */
  async recordConnectionFailure(userId: string, sessionId: string): Promise<void> {
    const reputation = await this.getOrCreateReputation(userId);
    const previousRating = reputation.rating;
    const ratingChange = RATING_CHANGES.connection_failed;
    const newRating = Math.max(0, previousRating + ratingChange);

    reputation.rating = newRating;
    reputation.connectionFailures += 1;

    // Recalculate connection success rate
    const totalConnections = reputation.totalCalls + reputation.connectionFailures;
    reputation.connectionSuccessRate =
      totalConnections > 0
        ? (reputation.totalCalls / totalConnections) * 100
        : 100;

    await this.reputationRepository.save(reputation);

    await this.recordEvent({
      userId,
      eventType: 'connection_failed',
      previousRating,
      newRating,
      ratingChange,
      sessionId,
      reason: 'WebRTC connection failed',
    });

    await this.redisService.getClient().del(`reputation:rating:${userId}`);
  }

  /**
   * Record friend request received (positive indicator)
   */
  async recordFriendRequest(userId: string, fromUserId: string): Promise<void> {
    const reputation = await this.getOrCreateReputation(userId);
    const previousRating = reputation.rating;
    const ratingChange = RATING_CHANGES.friend_request;
    const newRating = Math.min(100, previousRating + ratingChange);

    reputation.rating = newRating;
    reputation.friendRequestsReceived += 1;

    await this.reputationRepository.save(reputation);

    await this.recordEvent({
      userId,
      eventType: 'friend_request',
      previousRating,
      newRating,
      ratingChange,
      relatedUserId: fromUserId,
      reason: 'Received friend request',
    });

    await this.redisService.getClient().del(`reputation:rating:${userId}`);
  }

  /**
   * Get user's reputation history
   */
  async getReputationHistory(
    userId: string,
    limit = 50,
  ): Promise<ReputationEvent[]> {
    return this.eventRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get leaderboard (top rated users)
   */
  async getLeaderboard(limit = 100): Promise<UserReputation[]> {
    return this.reputationRepository.find({
      where: { totalCalls: MoreThan(10) }, // Minimum 10 calls to qualify
      order: { rating: 'DESC' },
      take: limit,
    });
  }

  /**
   * Helper: Record reputation event
   */
  private async recordEvent(data: {
    userId: string;
    eventType: ReputationEvent['eventType'];
    previousRating: number;
    newRating: number;
    ratingChange: number;
    sessionId?: string;
    relatedUserId?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ReputationEvent> {
    const event = this.eventRepository.create(data);
    return this.eventRepository.save(event);
  }

  /**
   * Sync reputation from Redis to PostgreSQL (migration helper)
   */
  async syncFromRedis(userId: string): Promise<void> {
    try {
      const redisData = await this.redisService.getUserReputation(userId);
      if (!redisData) return;

      const reputation = await this.getOrCreateReputation(userId);

      // Only update if Redis data is more recent (use totalRatings as proxy for activity)
      if (redisData.totalRatings > reputation.totalCalls) {
        reputation.rating = redisData.rating || 50;
        reputation.totalCalls = redisData.totalRatings || 0;
        reputation.skipRate = redisData.skipRate || 0;
        reputation.reportsReceived = redisData.reportCount || 0;
        reputation.avgCallDuration = redisData.averageCallDuration || 0;

        await this.reputationRepository.save(reputation);
        this.logger.log('Synced reputation from Redis', { userId });
      }
    } catch (error) {
      this.logger.warn('Failed to sync reputation from Redis', {
        userId,
        error: error.message,
      });
    }
  }
}
