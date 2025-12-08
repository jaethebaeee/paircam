import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSession } from '../entities';
import { RedisService } from '../../redis/redis.service';
import { UserService } from '../../users/services/user.service';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  coinsEarned: number;
  gamesWon: number;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(GameSession) private gameRepo: Repository<GameSession>,
    private redisService: RedisService,
    private userService: UserService,
  ) {}

  /**
   * UPDATE LEADERBOARD AFTER GAME
   */
  async updateLeaderboard(winnerId: string, gameType: string): Promise<void> {
    // Update weekly leaderboard
    await this.redisService.hincrby(
      `leaderboard:weekly:games`,
      winnerId,
      1,
    );

    // Update all-time leaderboard
    await this.redisService.hincrby(
      `leaderboard:all-time:games`,
      winnerId,
      1,
    );

    // Invalidate cache so it gets regenerated
    await this.redisService.del(`leaderboard:weekly`);
    await this.redisService.del(`leaderboard:all-time`);
  }

  /**
   * GET WEEKLY LEADERBOARD
   */
  async getWeeklyLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    return this.getLeaderboard('weekly', limit);
  }

  /**
   * GET ALL-TIME LEADERBOARD
   */
  async getAllTimeLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    return this.getLeaderboard('all-time', limit);
  }

  /**
   * GET LEADERBOARD (generic)
   */
  private async getLeaderboard(
    period: 'weekly' | 'all-time',
    limit: number,
  ): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:${period}`;

    // Try cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    let query = this.gameRepo
      .createQueryBuilder('game')
      .select('game.winnerId', 'userId')
      .addSelect('COUNT(*)', 'gamesWon')
      .where('game.status = :status', { status: 'completed' })
      .andWhere('game.winnerId IS NOT NULL')
      .groupBy('game.winnerId')
      .orderBy('gamesWon', 'DESC')
      .limit(limit);

    // Add time filter for weekly
    if (period === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.andWhere('game.endedAt > :weekAgo', {
        weekAgo,
      });
    }

    const results = await query.getRawMany();

    // Enrich with user data and calculate coins
    const leaderboard: LeaderboardEntry[] = [];

    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const user = await this.userService.getUser(row.userId);

      leaderboard.push({
        rank: i + 1,
        userId: row.userId,
        username: user.username || `User${row.userId.slice(0, 8)}`,
        coinsEarned: parseInt(row.gamesWon) * 50, // 50 coins per win (average)
        gamesWon: parseInt(row.gamesWon),
      });
    }

    // Cache for 1 hour
    await this.redisService.setex(
      cacheKey,
      3600,
      JSON.stringify(leaderboard),
    );

    return leaderboard;
  }

  /**
   * GET LEADERBOARD RANK FOR USER
   */
  async getUserLeaderboardRank(
    userId: string,
    period: 'weekly' | 'all-time' = 'weekly',
  ): Promise<{ rank: number; pointsToNext: number } | null> {
    const leaderboard = await this.getLeaderboard(period, 1000);
    const userEntry = leaderboard.find(e => e.userId === userId);

    if (!userEntry) {
      return null;
    }

    const nextEntry = leaderboard[userEntry.rank]; // Next rank
    const pointsToNext = nextEntry
      ? nextEntry.coinsEarned - userEntry.coinsEarned
      : 0;

    return {
      rank: userEntry.rank,
      pointsToNext,
    };
  }

  /**
   * GET FRIENDS LEADERBOARD
   */
  async getFriendsLeaderboard(
    userId: string,
    friendIds: string[],
  ): Promise<LeaderboardEntry[]> {
    const leaderboard = await this.getWeeklyLeaderboard(1000);

    return leaderboard
      .filter(
        e =>
          friendIds.includes(e.userId) ||
          e.userId === userId,
      )
      .slice(0, 100);
  }

  /**
   * RESET WEEKLY LEADERBOARD (cron job)
   */
  async resetWeeklyLeaderboard(): Promise<void> {
    // Clear Redis cache
    await this.redisService.del(`leaderboard:weekly`);
    // Weekly data is ephemeral, just tied to query results
  }

  /**
   * GET USER GAME STATS
   */
  async getUserGameStats(userId: string) {
    const games = await this.gameRepo.find({
      where: [
        { player1Id: userId },
        { player2Id: userId },
      ],
    });

    const completedGames = games.filter(g => g.status === 'completed');
    const wins = completedGames.filter(g => g.winnerId === userId).length;
    const losses = completedGames.filter(
      g => g.winnerId && g.winnerId !== userId,
    ).length;
    const draws = completedGames.filter(g => !g.winnerId).length;

    return {
      totalMatches: completedGames.length,
      wins,
      losses,
      draws,
      winRate: completedGames.length > 0
        ? (wins / completedGames.length * 100).toFixed(2) + '%'
        : '0%',
    };
  }
}
