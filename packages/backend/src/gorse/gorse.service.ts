import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '../services/logger.service';
import { FeedbackService } from '../feedback/feedback.service';
import { MatchFeedback } from '../feedback/entities/match-feedback.entity';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

/**
 * Gorse Integration Service
 *
 * Gorse is an open-source recommendation engine that learns from user feedback
 * to improve matchmaking predictions over time.
 *
 * Docs: https://gorse.io/
 * GitHub: https://github.com/gorse-io/gorse
 */
@Injectable()
export class GorseService {
  private readonly gorseApiUrl: string;
  private readonly syncIntervalMinutes: number = 60; // Sync every 1 hour
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly feedbackService: FeedbackService,
    private readonly logger: LoggerService,
  ) {
    // Initialize Gorse API endpoint
    this.gorseApiUrl = process.env.GORSE_API_URL || 'http://localhost:8088';
    this.logger.log(`Gorse Service initialized with API URL: ${this.gorseApiUrl}`);
  }

  /**
   * Start periodic sync of feedback data to Gorse for training
   */
  async startPeriodicSync(): Promise<void> {
    try {
      // Check if Gorse is available
      const available = await this.checkGorseHealth();
      if (!available) {
        this.logger.warn('Gorse server not available - disabling periodic sync');
        return;
      }

      // Run initial sync immediately
      await this.syncFeedbackToGorse();

      // Schedule periodic sync
      this.syncInterval = setInterval(async () => {
        try {
          await this.syncFeedbackToGorse();
        } catch (error) {
          this.logger.error('Periodic Gorse sync failed', error);
        }
      }, this.syncIntervalMinutes * 60 * 1000);

      this.logger.log(`Gorse periodic sync started (interval: ${this.syncIntervalMinutes}m)`);
    } catch (error) {
      this.logger.error('Failed to start Gorse periodic sync', error);
    }
  }

  /**
   * Stop periodic sync
   */
  async stopPeriodicSync(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.logger.log('Gorse periodic sync stopped');
    }
  }

  /**
   * Check if Gorse server is healthy
   */
  async checkGorseHealth(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(`${this.gorseApiUrl}/api/health`),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.debug('Gorse health check failed', (error as any).message);
      return false;
    }
  }

  /**
   * Sync feedback data to Gorse for ML training
   *
   * Converts user feedback into Gorse training format:
   * - Ratings (1-5) become scores in Gorse
   * - User pairs become items
   * - Feedback becomes ratings
   */
  private async syncFeedbackToGorse(): Promise<void> {
    try {
      // Get unused feedback entries
      const feedbacks = await this.feedbackService.getUnusedFeedback(100);

      if (feedbacks.length === 0) {
        this.logger.debug('No new feedback to sync with Gorse');
        return;
      }

      this.logger.log(`Syncing ${feedbacks.length} feedback entries to Gorse`);

      // Convert feedback to Gorse ratings format
      const ratings = feedbacks.map((feedback) => ({
        userId: feedback.userId,
        itemId: feedback.peerId, // The matched user becomes the "item"
        score: this.normalizeRating(feedback.rating),
        timestamp: Math.floor(feedback.createdAt.getTime() / 1000),
        comment: feedback.comment || '',
      }));

      // Post ratings to Gorse
      await this.postRatingsToGorse(ratings);

      // Mark feedback as used for training
      const feedbackIds = feedbacks.map((f) => f.id);
      await this.feedbackService.markAsUsedForTraining(feedbackIds);

      this.logger.log(`Successfully synced ${feedbacks.length} ratings to Gorse`);
    } catch (error) {
      this.logger.error('Failed to sync feedback to Gorse', error.stack);
    }
  }

  /**
   * Post ratings to Gorse
   */
  private async postRatingsToGorse(
    ratings: Array<{ userId: string; itemId: string; score: number; timestamp: number; comment: string }>,
  ): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<any>(`${this.gorseApiUrl}/api/ratings`, ratings),
      );

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Gorse returned status ${response.status}`);
      }

      this.logger.debug(`Posted ${ratings.length} ratings to Gorse`);
    } catch (error) {
      this.logger.error('Failed to post ratings to Gorse', error);
      throw error;
    }
  }

  /**
   * Get recommendations for a user from Gorse
   *
   * Returns recommended user IDs based on feedback history
   */
  async getRecommendations(userId: string, limit: number = 10): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(
          `${this.gorseApiUrl}/api/recommend/${userId}?n=${limit}`,
        ),
      );

      if (response.status !== 200) {
        throw new Error(`Gorse returned status ${response.status}`);
      }

      // Gorse returns an array of items
      const items = response.data as Array<{ Id: string; Score: number }>;
      return items.map((item) => item.Id).slice(0, limit);
    } catch (error) {
      this.logger.debug('Failed to get recommendations from Gorse', (error as any).message);
      return []; // Return empty array if Gorse is unavailable
    }
  }

  /**
   * Train Gorse model with recent feedback
   * (This typically happens automatically in Gorse, but can be triggered manually)
   */
  async triggerTraining(): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post<any>(`${this.gorseApiUrl}/api/reload`, {}),
      );
      this.logger.log('Gorse model training triggered');
    } catch (error) {
      this.logger.error('Failed to trigger Gorse training', error);
    }
  }

  /**
   * Get Gorse service status
   */
  async getStatus(): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(`${this.gorseApiUrl}/api/stats`),
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get Gorse status', error);
      return null;
    }
  }

  /**
   * Normalize feedback rating (1-5) to Gorse score (0-10)
   */
  private normalizeRating(rating: number): number {
    // Convert 1-5 scale to 0-10 scale for Gorse
    return ((rating - 1) / 4) * 10;
  }
}
