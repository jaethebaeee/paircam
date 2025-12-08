import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GameAnalyticsService } from './services/game-analytics.service';
import { PremiumFeaturesService } from './services/premium-features.service';
import { TriviaService } from './services/trivia.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSession } from './entities/game-session.entity';
import { User } from '../users/entities/user.entity';

interface AuthRequest extends Request {
  user: { deviceId: string };
}

@Controller('games')
export class GamesController {
  constructor(
    @InjectRepository(GameSession)
    private readonly gameSessionRepository: Repository<GameSession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly gameAnalytics: GameAnalyticsService,
    private readonly premiumFeatures: PremiumFeaturesService,
  ) {}

  /**
   * GET /games/analytics
   * Get overall game statistics (admin dashboard)
   */
  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  async getGameAnalytics(@Query('timeRange') timeRange: '1h' | '24h' | '7d' = '24h') {
    const analytics = await this.gameAnalytics.getGameAnalytics(timeRange);

    // Get total games in database
    const totalGamesDb = await this.gameSessionRepository.count();
    const completedGamesDb = await this.gameSessionRepository.count({
      where: { completedAt: true },
    });

    // Get premium conversion metrics
    const totalUsers = await this.userRepository.count();
    const premiumUsers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.subscriptions', 'subscription')
      .where('subscription.status = :status', { status: 'active' })
      .andWhere('subscription.currentPeriodEnd > :now', { now: new Date() })
      .distinct(true)
      .getCount();

    const conversionRate = totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0;

    return {
      timeRange,
      metrics: {
        ...analytics,
        totalGamesDatabase: totalGamesDb,
        completedGamesDatabase: completedGamesDb,
      },
      users: {
        total: totalUsers,
        premium: premiumUsers,
        free: totalUsers - premiumUsers,
        conversionRate: Math.round(conversionRate * 10) / 10,
      },
      timestamp: new Date(),
    };
  }

  /**
   * GET /games/leaderboard
   * Get top players by wins and average score
   */
  @Get('leaderboard')
  @UseGuards(JwtAuthGuard)
  async getLeaderboard(
    @Query('limit') limit: number = 50,
    @Query('sortBy') sortBy: 'wins' | 'score' | 'gamesPlayed' = 'wins',
  ) {
    const games = await this.gameSessionRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.user1', 'user1')
      .leftJoinAndSelect('game.user2', 'user2')
      .where('game.completedAt IS NOT NULL')
      .take(limit * 2)
      .getMany();

    // Aggregate stats per user
    const userStats = new Map<
      string,
      {
        userId: string;
        gamesPlayed: number;
        wins: number;
        losses: number;
        totalScore: number;
        averageScore: number;
        winRate: number;
      }
    >();

    for (const game of games) {
      // Process user1
      if (game.user1Results) {
        const key = game.user1Id;
        const existing = userStats.get(key) || {
          userId: key,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          totalScore: 0,
          averageScore: 0,
          winRate: 0,
        };

        existing.gamesPlayed++;
        existing.totalScore += game.user1Results.score;
        if (game.winnerId === game.user1Id) {
          existing.wins++;
        } else {
          existing.losses++;
        }

        userStats.set(key, existing);
      }

      // Process user2
      if (game.user2Results) {
        const key = game.user2Id;
        const existing = userStats.get(key) || {
          userId: key,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          totalScore: 0,
          averageScore: 0,
          winRate: 0,
        };

        existing.gamesPlayed++;
        existing.totalScore += game.user2Results.score;
        if (game.winnerId === game.user2Id) {
          existing.wins++;
        } else {
          existing.losses++;
        }

        userStats.set(key, existing);
      }
    }

    // Calculate derived metrics
    const leaderboard = Array.from(userStats.values())
      .map(stat => ({
        ...stat,
        averageScore: Math.round((stat.totalScore / stat.gamesPlayed) * 10) / 10,
        winRate: Math.round((stat.wins / stat.gamesPlayed) * 1000) / 10,
      }))
      .sort((a, b) => {
        switch (sortBy) {
          case 'wins':
            return b.wins - a.wins;
          case 'score':
            return b.averageScore - a.averageScore;
          case 'gamesPlayed':
            return b.gamesPlayed - a.gamesPlayed;
          default:
            return b.wins - a.wins;
        }
      })
      .slice(0, limit);

    return {
      sortBy,
      limit,
      leaderboard,
      timestamp: new Date(),
    };
  }

  /**
   * GET /games/user/:userId/stats
   * Get game statistics for a specific user
   */
  @Get('user/stats')
  @UseGuards(JwtAuthGuard)
  async getUserStats(@Req() req: AuthRequest) {
    const user = await this.userRepository.findOne({
      where: { deviceId: req.user.deviceId },
      relations: ['subscriptions'],
    });

    if (!user) {
      return { error: 'User not found' };
    }

    // Get user's games
    const userGames = await this.gameSessionRepository
      .createQueryBuilder('game')
      .where('game.user1Id = :userId OR game.user2Id = :userId', { userId: user.id })
      .andWhere('game.completedAt IS NOT NULL')
      .getMany();

    // Calculate stats
    let wins = 0;
    let losses = 0;
    let totalScore = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;

    for (const game of userGames) {
      if (game.user1Id === user.id && game.user1Results) {
        totalScore += game.user1Results.score;
        totalCorrect += game.user1Results.correctAnswers;
        totalQuestions += game.user1Results.totalQuestions;
        if (game.winnerId === user.id) wins++;
        else losses++;
      } else if (game.user2Id === user.id && game.user2Results) {
        totalScore += game.user2Results.score;
        totalCorrect += game.user2Results.correctAnswers;
        totalQuestions += game.user2Results.totalQuestions;
        if (game.winnerId === user.id) wins++;
        else losses++;
      }
    }

    const gamesPlayed = wins + losses;

    // Get premium config
    const premiumConfig = await this.premiumFeatures.getPremiumConfig(user.id);
    const userStats = await this.gameAnalytics.getUserStats(user.id);

    return {
      user: {
        id: user.id,
        deviceId: user.deviceId,
        isPremium: premiumConfig.isPremium,
        createdAt: user.createdAt,
      },
      gameStats: {
        gamesPlayed,
        wins,
        losses,
        winRate: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 1000) / 10 : 0,
        totalScore,
        averageScore: gamesPlayed > 0 ? Math.round((totalScore / gamesPlayed) * 10) / 10 : 0,
        totalCorrectAnswers: totalCorrect,
        totalQuestions,
        accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 1000) / 10 : 0,
      },
      premiumStatus: {
        isPremium: premiumConfig.isPremium,
        gamesRemainingToday: premiumConfig.gamesRemainingToday,
        dailyLimit: premiumConfig.dailyLimit,
      },
      analyticsStats: userStats,
      timestamp: new Date(),
    };
  }

  /**
   * GET /games/difficulty-stats
   * Get game statistics broken down by difficulty
   */
  @Get('difficulty-stats')
  @UseGuards(JwtAuthGuard)
  async getDifficultyStats() {
    const games = await this.gameSessionRepository
      .createQueryBuilder('game')
      .where('game.completedAt IS NOT NULL')
      .getMany();

    const difficultyStats = {
      easy: { total: 0, completed: 0, avgDuration: 0, avgScore: 0 },
      medium: { total: 0, completed: 0, avgDuration: 0, avgScore: 0 },
      hard: { total: 0, completed: 0, avgDuration: 0, avgScore: 0 },
    };

    const durations = {
      easy: [] as number[],
      medium: [] as number[],
      hard: [] as number[],
    };

    const scores = {
      easy: [] as number[],
      medium: [] as number[],
      hard: [] as number[],
    };

    for (const game of games) {
      const difficulty = game.gameConfig.difficulty;
      const key = difficulty as 'easy' | 'medium' | 'hard';

      difficultyStats[key].total++;
      if (game.completedAt) {
        difficultyStats[key].completed++;
      }

      if (game.durationSeconds) {
        durations[key].push(game.durationSeconds);
      }

      if (game.user1Results && game.user2Results) {
        scores[key].push(game.user1Results.score);
        scores[key].push(game.user2Results.score);
      }
    }

    // Calculate averages
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      if (durations[difficulty].length > 0) {
        difficultyStats[difficulty].avgDuration = Math.round(
          durations[difficulty].reduce((a, b) => a + b, 0) / durations[difficulty].length,
        );
      }

      if (scores[difficulty].length > 0) {
        difficultyStats[difficulty].avgScore = Math.round(
          (scores[difficulty].reduce((a, b) => a + b, 0) / scores[difficulty].length) * 10,
        ) / 10;
      }
    }

    return {
      difficultyStats,
      timestamp: new Date(),
    };
  }

  /**
   * GET /games/premium-metrics
   * Get premium conversion and engagement metrics
   */
  @Get('premium-metrics')
  @UseGuards(JwtAuthGuard)
  async getPremiumMetrics() {
    const totalUsers = await this.userRepository.count();

    // Active premium users
    const premiumUsers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.subscriptions', 'subscription')
      .where('subscription.status = :status', { status: 'active' })
      .andWhere('subscription.currentPeriodEnd > :now', { now: new Date() })
      .distinct(true)
      .getCount();

    // Games played by premium vs free users
    const allGames = await this.gameSessionRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.user1', 'user1')
      .leftJoinAndSelect('game.user2', 'user2')
      .leftJoinAndSelect('user1.subscriptions', 'sub1')
      .leftJoinAndSelect('user2.subscriptions', 'sub2')
      .where('game.completedAt IS NOT NULL')
      .getMany();

    let premiumGamesCount = 0;
    let freeGamesCount = 0;

    for (const game of allGames) {
      const user1Premium =
        game.user1 &&
        game.user1.subscriptions?.some(
          s => s.status === 'active' && new Date(s.currentPeriodEnd) > new Date(),
        );
      const user2Premium =
        game.user2 &&
        game.user2.subscriptions?.some(
          s => s.status === 'active' && new Date(s.currentPeriodEnd) > new Date(),
        );

      if (user1Premium || user2Premium) {
        premiumGamesCount++;
      } else {
        freeGamesCount++;
      }
    }

    const conversionRate = totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0;
    const premiumEngagementRatio =
      premiumGamesCount + freeGamesCount > 0
        ? (premiumGamesCount / (premiumGamesCount + freeGamesCount)) * 100
        : 0;

    return {
      users: {
        total: totalUsers,
        premium: premiumUsers,
        free: totalUsers - premiumUsers,
        conversionRate: Math.round(conversionRate * 10) / 10,
      },
      games: {
        total: allGames.length,
        playedByPremium: premiumGamesCount,
        playedByFree: freeGamesCount,
        premiumEngagementRatio: Math.round(premiumEngagementRatio * 10) / 10,
      },
      averageGamesPerUser: {
        premium:
          premiumUsers > 0 ? Math.round((premiumGamesCount / premiumUsers) * 10) / 10 : 0,
        free:
          totalUsers - premiumUsers > 0
            ? Math.round((freeGamesCount / (totalUsers - premiumUsers)) * 10) / 10
            : 0,
      },
      timestamp: new Date(),
    };
  }

  /**
   * GET /games/feature-comparison
   * Get feature comparison between free and premium
   */
  @Get('feature-comparison')
  @UseGuards(JwtAuthGuard)
  async getFeatureComparison() {
    return {
      features: this.premiumFeatures.getFeatureComparison(),
      timestamp: new Date(),
    };
  }
}
