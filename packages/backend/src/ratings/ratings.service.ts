import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallRating } from './entities/call-rating.entity';
import { LoggerService } from '../services/logger.service';
import { RedisService } from '../redis/redis.service';

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<number, number>;
  topTags: Array<{ tag: string; count: number }>;
  favoriteCount: number;
}

export interface SubmitRatingDto {
  sessionId: string;
  toUserId: string;
  rating: number;
  comment?: string;
  tags?: string[];
  isFavorite?: boolean;
  callDuration?: number;
}

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(CallRating)
    private readonly ratingsRepository: Repository<CallRating>,
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Submit a rating for a call
   */
  async submitRating(fromUserId: string, data: SubmitRatingDto): Promise<CallRating> {
    // Validate rating value
    if (data.rating < 1 || data.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if already rated this session
    const existingRating = await this.ratingsRepository.findOne({
      where: {
        fromUserId,
        sessionId: data.sessionId,
      },
    });

    if (existingRating) {
      throw new Error('You have already rated this call');
    }

    const rating = this.ratingsRepository.create({
      fromUserId,
      toUserId: data.toUserId,
      sessionId: data.sessionId,
      rating: data.rating,
      comment: data.comment?.substring(0, 200), // Limit comment length
      tags: data.tags?.slice(0, 5), // Max 5 tags
      isFavorite: data.isFavorite || false,
      callDuration: data.callDuration || 0,
    });

    const saved = await this.ratingsRepository.save(rating);

    // Update user's average rating in Redis for quick access
    await this.updateUserRatingCache(data.toUserId);

    // If marked as favorite, add to favorites list
    if (data.isFavorite) {
      await this.addToFavorites(fromUserId, data.toUserId);
    }

    this.logger.log('Rating submitted', {
      fromUserId,
      toUserId: data.toUserId,
      rating: data.rating,
      isFavorite: data.isFavorite,
    });

    return saved;
  }

  /**
   * Get rating statistics for a user
   */
  async getUserRatingStats(userId: string): Promise<RatingStats> {
    const ratings = await this.ratingsRepository.find({
      where: { toUserId: userId },
    });

    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        topTags: [],
        favoriteCount: 0,
      };
    }

    // Calculate average
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = sum / ratings.length;

    // Calculate distribution
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
    });

    // Calculate top tags
    const tagCounts: Record<string, number> = {};
    ratings.forEach((r) => {
      r.tags?.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Count favorites
    const favoriteCount = ratings.filter((r) => r.isFavorite).length;

    return {
      averageRating,
      totalRatings: ratings.length,
      ratingDistribution,
      topTags,
      favoriteCount,
    };
  }

  /**
   * Get recent ratings for a user
   */
  async getUserRatings(userId: string, limit: number = 10): Promise<CallRating[]> {
    return this.ratingsRepository.find({
      where: { toUserId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get ratings given by a user
   */
  async getRatingsGiven(userId: string, limit: number = 50): Promise<CallRating[]> {
    return this.ratingsRepository.find({
      where: { fromUserId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get user's favorites list
   */
  async getFavorites(userId: string): Promise<string[]> {
    const key = `user:${userId}:favorites`;
    const favorites = await this.redisService.getClient().sMembers(key);
    return favorites;
  }

  /**
   * Add user to favorites
   */
  private async addToFavorites(userId: string, favoriteUserId: string): Promise<void> {
    const key = `user:${userId}:favorites`;
    await this.redisService.getClient().sAdd(key, favoriteUserId);

    this.logger.log('User added to favorites', {
      userId,
      favoriteUserId,
    });
  }

  /**
   * Remove user from favorites
   */
  async removeFromFavorites(userId: string, favoriteUserId: string): Promise<void> {
    const key = `user:${userId}:favorites`;
    await this.redisService.getClient().sRem(key, favoriteUserId);

    this.logger.log('User removed from favorites', {
      userId,
      favoriteUserId,
    });
  }

  /**
   * Check if user is in favorites
   */
  async isFavorite(userId: string, targetUserId: string): Promise<boolean> {
    const key = `user:${userId}:favorites`;
    return await this.redisService.getClient().sIsMember(key, targetUserId);
  }

  /**
   * Update cached average rating for a user
   */
  private async updateUserRatingCache(userId: string): Promise<void> {
    const stats = await this.getUserRatingStats(userId);
    const key = `user:${userId}:avgRating`;
    await this.redisService.getClient().setEx(
      key,
      3600 * 24, // 24 hour cache
      stats.averageRating.toFixed(2),
    );
  }

  /**
   * Get cached average rating (fast lookup)
   */
  async getCachedAverageRating(userId: string): Promise<number | null> {
    const key = `user:${userId}:avgRating`;
    const cached = await this.redisService.getClient().get(key);
    return cached ? parseFloat(cached) : null;
  }
}
