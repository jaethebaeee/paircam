import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../services/logger.service';

@Injectable()
export class GameAnalyticsService {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Track a new game creation
   */
  async trackGameCreated(data: {
    gameSessionId: string;
    user1Id: string;
    user2Id: string;
    difficulty: 'easy' | 'medium' | 'hard';
    questionCount: number;
  }): Promise<void> {
    try {
      // Increment total games counter
      await this.redisService.incrementCounter('analytics:games:total');

      // Increment difficulty-specific counter
      await this.redisService.incrementCounter(`analytics:games:difficulty:${data.difficulty}`);

      // Track per-user games
      await this.redisService.incrementCounter(`analytics:games:user:${data.user1Id}`);
      await this.redisService.incrementCounter(`analytics:games:user:${data.user2Id}`);

      this.logger.debug('Game created tracked', {
        gameSessionId: data.gameSessionId,
        difficulty: data.difficulty,
      });
    } catch (error) {
      this.logger.error('Failed to track game creation', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Track an answer submission
   */
  async trackAnswerSubmitted(data: {
    gameSessionId: string;
    userId: string;
    questionNumber: number;
    correct: boolean;
    timeSpent: number;
  }): Promise<void> {
    try {
      // Track correctness
      if (data.correct) {
        await this.redisService.incrementCounter(`analytics:answers:correct:${data.userId}`);
      } else {
        await this.redisService.incrementCounter(`analytics:answers:incorrect:${data.userId}`);
      }

      // Track response time
      const timesKey = `analytics:responseTimes:${data.userId}`;
      await this.redisService.getClient().lPush(timesKey, data.timeSpent.toString());

      // Keep only last 1000 response times
      await this.redisService.getClient().lTrim(timesKey, 0, 999);

      this.logger.debug('Answer tracked', {
        gameSessionId: data.gameSessionId,
        correct: data.correct,
        timeSpent: data.timeSpent,
      });
    } catch (error) {
      this.logger.error('Failed to track answer', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Track a completed game
   */
  async trackGameCompleted(data: {
    gameSessionId: string;
    winnerId: string;
    user1Id: string;
    user1Score: number;
    user2Id: string;
    user2Score: number;
    durationSeconds: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }): Promise<void> {
    try {
      // Increment completion counter
      await this.redisService.incrementCounter('analytics:games:completed');

      // Track wins
      await this.redisService.incrementCounter(`analytics:games:wins:${data.winnerId}`);

      // Track by difficulty
      await this.redisService.incrementCounter(`analytics:games:completed:${data.difficulty}`);

      // Track game duration
      const durationsKey = 'analytics:gameDurations';
      await this.redisService.getClient().lPush(durationsKey, data.durationSeconds.toString());
      await this.redisService.getClient().lTrim(durationsKey, 0, 9999);

      // Track average score
      const avgScore = (data.user1Score + data.user2Score) / 2;
      const scoresKey = 'analytics:averageScores';
      await this.redisService.getClient().lPush(scoresKey, avgScore.toString());
      await this.redisService.getClient().lTrim(scoresKey, 0, 9999);

      // Track user scores
      await this.redisService.getClient().lPush(`analytics:userScores:${data.user1Id}`, data.user1Score.toString());
      await this.redisService.getClient().lPush(`analytics:userScores:${data.user2Id}`, data.user2Score.toString());

      this.logger.debug('Game completion tracked', {
        gameSessionId: data.gameSessionId,
        winnerId: data.winnerId,
        user1Score: data.user1Score,
        user2Score: data.user2Score,
        duration: data.durationSeconds,
      });
    } catch (error) {
      this.logger.error('Failed to track game completion', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Track game abandonment
   */
  async trackGameAbandoned(data: {
    gameSessionId: string;
    userId: string;
    durationSeconds: number;
  }): Promise<void> {
    try {
      await this.redisService.incrementCounter('analytics:games:abandoned');
      await this.redisService.incrementCounter(`analytics:games:abandoned:${data.userId}`);

      this.logger.debug('Game abandonment tracked', {
        gameSessionId: data.gameSessionId,
        userId: data.userId,
      });
    } catch (error) {
      this.logger.error('Failed to track game abandonment', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get game analytics summary
   */
  async getGameAnalytics(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<{
    totalGames: number;
    completedGames: number;
    abandonedGames: number;
    averageGameDuration: number;
    averageScore: number;
    difficultyDistribution: Record<string, number>;
  }> {
    try {
      const totalGames = await this.redisService.getCounter('analytics:games:total');
      const completedGames = await this.redisService.getCounter('analytics:games:completed');
      const abandonedGames = await this.redisService.getCounter('analytics:games:abandoned');

      // Get game durations
      const durations = await this.redisService.getClient().lRange('analytics:gameDurations', 0, -1);
      const avgDuration =
        durations.length > 0
          ? Math.round(durations.reduce((sum, d) => sum + parseInt(d, 10), 0) / durations.length)
          : 0;

      // Get average scores
      const scores = await this.redisService.getClient().lRange('analytics:averageScores', 0, -1);
      const avgScore =
        scores.length > 0
          ? Math.round((scores.reduce((sum, s) => sum + parseInt(s, 10), 0) / scores.length) * 10) / 10
          : 0;

      // Get difficulty distribution
      const easyGames = await this.redisService.getCounter('analytics:games:difficulty:easy');
      const mediumGames = await this.redisService.getCounter('analytics:games:difficulty:medium');
      const hardGames = await this.redisService.getCounter('analytics:games:difficulty:hard');

      return {
        totalGames,
        completedGames,
        abandonedGames,
        averageGameDuration: avgDuration,
        averageScore: avgScore,
        difficultyDistribution: {
          easy: easyGames,
          medium: mediumGames,
          hard: hardGames,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get game analytics', error instanceof Error ? error.message : 'Unknown error');

      return {
        totalGames: 0,
        completedGames: 0,
        abandonedGames: 0,
        averageGameDuration: 0,
        averageScore: 0,
        difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
      };
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    gamesPlayed: number;
    wins: number;
    correctAnswers: number;
    incorrectAnswers: number;
    averageScore: number;
    averageResponseTime: number;
  }> {
    try {
      const gamesPlayed = await this.redisService.getCounter(`analytics:games:user:${userId}`);
      const wins = await this.redisService.getCounter(`analytics:games:wins:${userId}`);
      const correctAnswers = await this.redisService.getCounter(`analytics:answers:correct:${userId}`);
      const incorrectAnswers = await this.redisService.getCounter(`analytics:answers:incorrect:${userId}`);

      // Get average score
      const scoresStr = await this.redisService.getClient().lRange(`analytics:userScores:${userId}`, 0, -1);
      const averageScore =
        scoresStr.length > 0
          ? Math.round((scoresStr.reduce((sum, s) => sum + parseInt(s, 10), 0) / scoresStr.length) * 10) / 10
          : 0;

      // Get average response time
      const timesStr = await this.redisService.getClient().lRange(`analytics:responseTimes:${userId}`, 0, -1);
      const averageResponseTime =
        timesStr.length > 0
          ? Math.round((timesStr.reduce((sum, t) => sum + parseInt(t, 10), 0) / timesStr.length) * 10) / 10
          : 0;

      return {
        gamesPlayed,
        wins,
        correctAnswers,
        incorrectAnswers,
        averageScore,
        averageResponseTime,
      };
    } catch (error) {
      this.logger.error('Failed to get user stats', error instanceof Error ? error.message : 'Unknown error');

      return {
        gamesPlayed: 0,
        wins: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        averageScore: 0,
        averageResponseTime: 0,
      };
    }
  }
}
