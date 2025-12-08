import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../services/logger.service';

/**
 * Premium Features Service
 * Handles all premium subscription checks and feature enforcement
 */
@Injectable()
export class PremiumFeaturesService {
  // Game limits per day
  private readonly FREE_GAMES_PER_DAY = 10;
  private readonly PREMIUM_GAMES_PER_DAY = 50;

  // Premium multipliers
  private readonly PREMIUM_EXTRA_TIME = 5; // +5 seconds per question
  private readonly PREMIUM_BONUS_POINTS = 5; // +5 bonus points per correct answer
  private readonly PREMIUM_SCORE_MULTIPLIER = 1.25; // 25% score boost

  // Hard difficulty restriction
  private readonly HARD_DIFFICULTY_REQUIRED_PREMIUM = true;

  constructor(
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Check if user has premium subscription
   */
  async isPremium(userId: string): Promise<boolean> {
    return await this.usersService.isPremium(userId);
  }

  /**
   * Get premium feature configuration for a user
   */
  async getPremiumConfig(userId: string): Promise<{
    isPremium: boolean;
    timePerQuestion: number;
    scoreMultiplier: number;
    allowedDifficulties: string[];
    gamesPlayedToday: number;
    dailyLimit: number;
    canPlayMore: boolean;
  }> {
    const isPremium = await this.isPremium(userId);
    const gamesPlayedToday = await this.getGamesPlayedToday(userId);
    const dailyLimit = isPremium ? this.PREMIUM_GAMES_PER_DAY : this.FREE_GAMES_PER_DAY;

    return {
      isPremium,
      timePerQuestion: isPremium ? 15 + this.PREMIUM_EXTRA_TIME : 15,
      scoreMultiplier: isPremium ? this.PREMIUM_SCORE_MULTIPLIER : 1.0,
      allowedDifficulties: isPremium ? ['easy', 'medium', 'hard'] : ['easy', 'medium'],
      gamesPlayedToday,
      dailyLimit,
      canPlayMore: gamesPlayedToday < dailyLimit,
    };
  }

  /**
   * Enforce premium restrictions before game start
   * Throws if user cannot play
   */
  async enforceGameStart(
    userId: string,
    difficulty: 'easy' | 'medium' | 'hard',
  ): Promise<{
    timePerQuestion: number;
    scoreMultiplier: number;
  }> {
    const isPremium = await this.isPremium(userId);

    // Check daily limit
    const gamesPlayedToday = await this.getGamesPlayedToday(userId);
    const dailyLimit = isPremium ? this.PREMIUM_GAMES_PER_DAY : this.FREE_GAMES_PER_DAY;

    if (gamesPlayedToday >= dailyLimit) {
      const remainingText = isPremium
        ? `Come back tomorrow! You've played ${dailyLimit} games.`
        : `Upgrade to premium for unlimited games! You've played ${dailyLimit} games today.`;

      throw new BadRequestException({
        message: 'Daily game limit reached',
        remainingText,
        requiresPremium: !isPremium,
        gamesPlayedToday,
        dailyLimit,
      });
    }

    // Check difficulty restriction
    if (difficulty === 'hard' && this.HARD_DIFFICULTY_REQUIRED_PREMIUM && !isPremium) {
      throw new BadRequestException({
        message: 'Hard difficulty requires premium subscription',
        requiresPremium: true,
        difficulty,
      });
    }

    // Return configuration
    return {
      timePerQuestion: isPremium ? 15 + this.PREMIUM_EXTRA_TIME : 15,
      scoreMultiplier: isPremium ? this.PREMIUM_SCORE_MULTIPLIER : 1.0,
    };
  }

  /**
   * Increment game count for a user today
   */
  async incrementGamesPlayedToday(userId: string): Promise<number> {
    const today = new Date().toDateString();
    const key = `games:played:${userId}:${today}`;

    const count = await this.redisService.getClient().incr(key);

    // Set TTL to 24 hours if this is the first increment
    if (count === 1) {
      await this.redisService.getClient().expire(key, 86400);
    }

    this.logger.debug('Games played today incremented', {
      userId,
      count,
    });

    return count;
  }

  /**
   * Get how many games user has played today
   */
  async getGamesPlayedToday(userId: string): Promise<number> {
    const today = new Date().toDateString();
    const key = `games:played:${userId}:${today}`;

    const countStr = await this.redisService.getClient().get(key);
    return countStr ? parseInt(countStr, 10) : 0;
  }

  /**
   * Calculate final score with premium multiplier
   */
  async calculatePremiumScore(
    userId: string,
    baseScore: number,
    correctAnswers: number,
  ): Promise<number> {
    const isPremium = await this.isPremium(userId);

    let finalScore = baseScore;

    // Apply score multiplier for premium
    if (isPremium) {
      finalScore = Math.round(finalScore * this.PREMIUM_SCORE_MULTIPLIER);

      // Add bonus points per correct answer
      finalScore += correctAnswers * this.PREMIUM_BONUS_POINTS;

      this.logger.debug('Premium score multiplier applied', {
        userId,
        baseScore,
        finalScore,
        correctAnswers,
        multiplier: this.PREMIUM_SCORE_MULTIPLIER,
      });
    }

    return finalScore;
  }

  /**
   * Check if user should see ads
   */
  async shouldShowAds(userId: string): Promise<boolean> {
    return !(await this.isPremium(userId));
  }

  /**
   * Get feature status for game (used by frontend)
   */
  async getGameFeatures(userId: string): Promise<{
    showAds: boolean;
    hardDifficultyAvailable: boolean;
    extraTimePerQuestion: number;
    bonusPointsPerAnswer: number;
    scoreMultiplier: number;
    gamesRemainingToday: number;
  }> {
    const isPremium = await this.isPremium(userId);
    const gamesPlayedToday = await this.getGamesPlayedToday(userId);
    const dailyLimit = isPremium ? this.PREMIUM_GAMES_PER_DAY : this.FREE_GAMES_PER_DAY;

    return {
      showAds: !isPremium,
      hardDifficultyAvailable: isPremium,
      extraTimePerQuestion: isPremium ? this.PREMIUM_EXTRA_TIME : 0,
      bonusPointsPerAnswer: isPremium ? this.PREMIUM_BONUS_POINTS : 0,
      scoreMultiplier: isPremium ? this.PREMIUM_SCORE_MULTIPLIER : 1.0,
      gamesRemainingToday: Math.max(0, dailyLimit - gamesPlayedToday),
    };
  }

  /**
   * Get readable feature comparison (for UI)
   */
  getFeatureComparison(): {
    feature: string;
    free: string;
    premium: string;
  }[] {
    return [
      {
        feature: 'Daily Games',
        free: `${this.FREE_GAMES_PER_DAY} games`,
        premium: `${this.PREMIUM_GAMES_PER_DAY} games`,
      },
      {
        feature: 'Time per Question',
        free: '15 seconds',
        premium: `${15 + this.PREMIUM_EXTRA_TIME} seconds (+${this.PREMIUM_EXTRA_TIME}s)`,
      },
      {
        feature: 'Difficulty Levels',
        free: 'Easy, Medium',
        premium: 'Easy, Medium, Hard',
      },
      {
        feature: 'Score Boost',
        free: 'Standard',
        premium: `+${Math.round((this.PREMIUM_SCORE_MULTIPLIER - 1) * 100)}% multiplier`,
      },
      {
        feature: 'Bonus Points',
        free: 'None',
        premium: `+${this.PREMIUM_BONUS_POINTS} per correct answer`,
      },
      {
        feature: 'Ads',
        free: 'Yes',
        premium: 'No ads',
      },
    ];
  }
}
