import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchFeedback } from './entities/match-feedback.entity';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../services/logger.service';

export interface SubmitFeedbackDto {
  matchId: string;
  sessionId: string;
  userId: string;
  peerId: string;
  rating: number; // 1-5
  reasons?: string[];
  comment?: string;
  callDuration?: number;
  connectionQuality?: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface FeedbackStats {
  averageRating: number;
  totalFeedback: number;
  ratingDistribution: Record<number, number>; // { 1: count, 2: count, ... }
  topReasons: Array<{ reason: string; count: number }>;
  connectionQualityStats: Record<string, number>;
}

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(MatchFeedback)
    private readonly feedbackRepository: Repository<MatchFeedback>,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Submit feedback for a match
   */
  async submitFeedback(data: SubmitFeedbackDto): Promise<MatchFeedback> {
    try {
      // Create feedback record
      const feedback = this.feedbackRepository.create({
        matchId: data.matchId,
        sessionId: data.sessionId,
        userId: data.userId,
        peerId: data.peerId,
        rating: Math.min(5, Math.max(1, data.rating)), // Clamp 1-5
        reasons: data.reasons || [],
        callDuration: data.callDuration,
        connectionQuality: data.connectionQuality,
      });

      const saved = await this.feedbackRepository.save(feedback);

      // Update Redis cache for quick stats
      await this.updateFeedbackCache(data.userId);
      await this.updateFeedbackCache(data.peerId);

      // Track feedback received
      await this.redisService.incrementCounter('feedback:total');
      await this.redisService.incrementCounter(`feedback:rating:${data.rating}`);

      if (data.connectionQuality) {
        await this.redisService.incrementCounter(`feedback:connection:${data.connectionQuality}`);
      }

      this.logger.debug('Feedback submitted', {
        feedbackId: saved.id,
        matchId: data.matchId,
        userId: data.userId,
        rating: data.rating,
      });

      return saved;
    } catch (error) {
      this.logger.error('Failed to submit feedback', error.stack);
      throw error;
    }
  }

  /**
   * Get feedback stats for a user
   */
  async getUserFeedbackStats(userId: string): Promise<FeedbackStats> {
    try {
      // Try to get from cache first
      const cached = await this.redisService.getClient().get(`feedback:stats:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Query feedback received by this user
      const feedbacks = await this.feedbackRepository.find({
        where: { peerId: userId },
        order: { createdAt: 'DESC' },
        take: 100, // Last 100 feedback entries
      });

      const stats = this.calculateStats(feedbacks);

      // Cache for 1 hour
      await this.redisService.getClient().setEx(
        `feedback:stats:${userId}`,
        3600,
        JSON.stringify(stats),
      );

      return stats;
    } catch (error) {
      this.logger.error('Failed to get user feedback stats', error.stack);
      throw error;
    }
  }

  /**
   * Get global feedback stats
   */
  async getGlobalFeedbackStats(): Promise<{
    totalFeedback: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
    topReasons: Array<{ reason: string; count: number }>;
  }> {
    try {
      // Try cache first
      const cached = await this.redisService.getClient().get('feedback:stats:global');
      if (cached) {
        return JSON.parse(cached);
      }

      // Get all recent feedback
      const feedbacks = await this.feedbackRepository.find({
        order: { createdAt: 'DESC' },
        take: 500, // Last 500 feedback entries
      });

      const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const reasonCounts: Record<string, number> = {};
      let totalRating = 0;

      for (const feedback of feedbacks) {
        ratingDistribution[feedback.rating]++;
        totalRating += feedback.rating;

        if (feedback.reasons) {
          for (const reason of feedback.reasons) {
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
          }
        }
      }

      const topReasons = Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const stats = {
        totalFeedback: feedbacks.length,
        averageRating: feedbacks.length > 0 ? totalRating / feedbacks.length : 0,
        ratingDistribution,
        topReasons,
      };

      // Cache for 1 hour
      await this.redisService.getClient().setEx(
        'feedback:stats:global',
        3600,
        JSON.stringify(stats),
      );

      return stats;
    } catch (error) {
      this.logger.error('Failed to get global feedback stats', error.stack);
      throw error;
    }
  }

  /**
   * Get feedback for match analysis (for Gorse training)
   */
  async getUnusedFeedback(limit: number = 100): Promise<MatchFeedback[]> {
    try {
      return await this.feedbackRepository.find({
        where: { usedForTraining: false },
        order: { createdAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      this.logger.error('Failed to get unused feedback', error.stack);
      throw error;
    }
  }

  /**
   * Mark feedback as used for training
   */
  async markAsUsedForTraining(feedbackIds: string[]): Promise<void> {
    try {
      await this.feedbackRepository.update(
        { id: feedbackIds[0] }, // This will be updated to use WHERE IN clause
        { usedForTraining: true },
      );

      // Better approach: update multiple at once
      if (feedbackIds.length > 0) {
        await this.feedbackRepository
          .createQueryBuilder()
          .update()
          .set({ usedForTraining: true })
          .where('id IN (:...ids)', { ids: feedbackIds })
          .execute();
      }
    } catch (error) {
      this.logger.error('Failed to mark feedback as used', error.stack);
      throw error;
    }
  }

  /**
   * Get correlation between feedback rating and match factors
   */
  async analyzeFeedbackCorrelations(): Promise<any> {
    try {
      const feedbacks = await this.feedbackRepository.find({
        order: { createdAt: 'DESC' },
        take: 200,
      });

      const stats = {
        byQueueType: {} as Record<string, any>,
        byRegion: {} as Record<string, any>,
        byCallDuration: {
          veryShort: [] as number[], // 0-30s
          short: [] as number[], // 30s-2m
          medium: [] as number[], // 2m-5m
          long: [] as number[], // 5m+
        },
        byConnectionQuality: {} as Record<string, any>,
      };

      for (const feedback of feedbacks) {
        // Group by queue type
        if (feedback.queueType) {
          if (!stats.byQueueType[feedback.queueType]) {
            stats.byQueueType[feedback.queueType] = [];
          }
          stats.byQueueType[feedback.queueType].push(feedback.rating);
        }

        // Group by region
        if (feedback.region) {
          if (!stats.byRegion[feedback.region]) {
            stats.byRegion[feedback.region] = [];
          }
          stats.byRegion[feedback.region].push(feedback.rating);
        }

        // Group by call duration
        if (feedback.callDuration) {
          if (feedback.callDuration <= 30) {
            stats.byCallDuration.veryShort.push(feedback.rating);
          } else if (feedback.callDuration <= 120) {
            stats.byCallDuration.short.push(feedback.rating);
          } else if (feedback.callDuration <= 300) {
            stats.byCallDuration.medium.push(feedback.rating);
          } else {
            stats.byCallDuration.long.push(feedback.rating);
          }
        }

        // Group by connection quality
        if (feedback.connectionQuality) {
          if (!stats.byConnectionQuality[feedback.connectionQuality]) {
            stats.byConnectionQuality[feedback.connectionQuality] = [];
          }
          stats.byConnectionQuality[feedback.connectionQuality].push(feedback.rating);
        }
      }

      // Calculate averages for each group
      const formatGroupStats = (groups: Record<string, number[]>) => {
        const result: Record<string, any> = {};
        for (const [key, ratings] of Object.entries(groups)) {
          if (ratings.length > 0) {
            result[key] = {
              count: ratings.length,
              average: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2),
            };
          }
        }
        return result;
      };

      return {
        byQueueType: formatGroupStats(stats.byQueueType),
        byRegion: formatGroupStats(stats.byRegion),
        byCallDuration: formatGroupStats(stats.byCallDuration),
        byConnectionQuality: formatGroupStats(stats.byConnectionQuality),
      };
    } catch (error) {
      this.logger.error('Failed to analyze feedback correlations', error.stack);
      throw error;
    }
  }

  /**
   * Private helper: Calculate feedback stats
   */
  private calculateStats(feedbacks: MatchFeedback[]): FeedbackStats {
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const reasonCounts: Record<string, number> = {};
    let totalRating = 0;

    for (const feedback of feedbacks) {
      ratingDistribution[feedback.rating]++;
      totalRating += feedback.rating;

      if (feedback.reasons) {
        for (const reason of feedback.reasons) {
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        }
      }
    }

    const topReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      averageRating: feedbacks.length > 0 ? totalRating / feedbacks.length : 0,
      totalFeedback: feedbacks.length,
      ratingDistribution,
      topReasons,
    };
  }

  /**
   * Private helper: Update feedback cache
   */
  private async updateFeedbackCache(userId: string): Promise<void> {
    // Invalidate cache so next request recalculates
    await this.redisService.getClient().del(`feedback:stats:${userId}`);
  }
}
