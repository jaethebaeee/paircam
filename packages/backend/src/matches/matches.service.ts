import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, In } from 'typeorm';
import { Match } from './entities/match.entity';
import { LoggerService } from '../services/logger.service';

export interface CreateMatchDto {
  sessionId: string;
  user1Id: string;
  user2Id: string;
  compatibilityScore: number;
  commonInterests?: string[];
  region: string;
  language: string;
  queueType: string;
  user1WaitTime: number;
  user2WaitTime: number;
}

export interface MatchAnalyticsDto {
  totalMatches: number;
  avgCompatibilityScore: number;
  avgCallDuration: number;
  skipRate: number;
  connectionFailRate: number;
  avgConnectionTime: number;
  avgWaitTime: number;
  avgQualityScore: number;
  byRegion: Record<string, RegionStats>;
  byQueueType: Record<string, QueueTypeStats>;
  byHour: Record<number, HourlyStats>;
  connectionTypes: Record<string, number>;
}

export interface RegionStats {
  count: number;
  avgDuration: number;
  skipRate: number;
  avgCompatibility: number;
  avgWaitTime: number;
}

export interface QueueTypeStats {
  count: number;
  avgDuration: number;
  skipRate: number;
  avgCompatibility: number;
}

export interface HourlyStats {
  count: number;
  avgDuration: number;
  skipRate: number;
}

export interface UserMatchStats {
  totalMatches: number;
  completedMatches: number;
  skippedMatches: number;
  skipRate: number;
  avgCallDuration: number;
  totalCallTime: number;
  avgCompatibilityScore: number;
  avgQualityScore: number;
  connectionSuccessRate: number;
  longestCall: number;
  mostCommonRegion: string;
  preferredQueueType: string;
  recentPartners: string[];
}

export interface TrendAnalysis {
  currentPeriod: MatchAnalyticsDto;
  previousPeriod: MatchAnalyticsDto;
  changes: {
    matchesChange: number;
    durationChange: number;
    skipRateChange: number;
    qualityChange: number;
  };
}

export interface PaginatedMatches {
  matches: Match[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly logger: LoggerService,
  ) {}

  // ========================================
  // CORE CRUD OPERATIONS
  // ========================================

  /**
   * Create a new match record
   */
  async createMatch(data: CreateMatchDto): Promise<Match> {
    const match = this.matchRepository.create({
      ...data,
      createdAt: new Date(),
    });

    await this.matchRepository.save(match);

    this.logger.log('Match persisted to DB', {
      sessionId: data.sessionId,
      compatibilityScore: data.compatibilityScore,
    });

    return match;
  }

  /**
   * Update match when connection is established
   */
  async markConnected(
    sessionId: string,
    connectionTime: number,
    connectionType?: string,
  ): Promise<void> {
    await this.matchRepository.update(
      { sessionId },
      {
        connectedAt: new Date(),
        connectionTime,
        connectionType: connectionType || 'unknown',
      },
    );

    this.logger.debug('Match marked as connected', {
      sessionId,
      connectionTime,
      connectionType,
    });
  }

  /**
   * Update match when connection fails
   */
  async markConnectionFailed(sessionId: string): Promise<void> {
    await this.matchRepository.update(
      { sessionId },
      {
        connectionFailed: true,
        endedAt: new Date(),
        endReason: 'connection_failed',
      },
    );

    this.logger.warn('Match connection failed', { sessionId });
  }

  /**
   * Update match when call ends
   */
  async endMatch(
    sessionId: string,
    data: {
      wasSkipped: boolean;
      endedBy?: string;
      callDuration: number;
      qualityScore?: number;
    },
  ): Promise<void> {
    await this.matchRepository.update(
      { sessionId },
      {
        wasSkipped: data.wasSkipped,
        endedBy: data.endedBy,
        callDuration: data.callDuration,
        endReason: data.wasSkipped ? 'skip' : 'natural',
        qualityScore: data.qualityScore || 0,
        endedAt: new Date(),
      },
    );

    this.logger.debug('Match ended', {
      sessionId,
      wasSkipped: data.wasSkipped,
      callDuration: data.callDuration,
    });
  }

  // ========================================
  // QUERY OPERATIONS
  // ========================================

  /**
   * Get match by session ID
   */
  async findBySessionId(sessionId: string): Promise<Match | null> {
    return this.matchRepository.findOne({ where: { sessionId } });
  }

  /**
   * Get match by ID
   */
  async findById(id: string): Promise<Match | null> {
    return this.matchRepository.findOne({ where: { id } });
  }

  /**
   * Get user's match history with pagination
   */
  async getUserMatchHistory(
    userId: string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedMatches> {
    const [matches, total] = await this.matchRepository.findAndCount({
      where: [{ user1Id: userId }, { user2Id: userId }],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      matches,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Check if two users have matched before
   */
  async havePreviouslyMatched(user1Id: string, user2Id: string): Promise<boolean> {
    const count = await this.matchRepository.count({
      where: [
        { user1Id: user1Id, user2Id: user2Id },
        { user1Id: user2Id, user2Id: user1Id },
      ],
    });
    return count > 0;
  }

  /**
   * Get previous matches between two users
   */
  async getPreviousMatches(user1Id: string, user2Id: string): Promise<Match[]> {
    return this.matchRepository.find({
      where: [
        { user1Id: user1Id, user2Id: user2Id },
        { user1Id: user2Id, user2Id: user1Id },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get matches by region
   */
  async getMatchesByRegion(
    region: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Match[]> {
    return this.matchRepository.find({
      where: {
        region,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get long calls (successful matches > X minutes)
   */
  async getLongCalls(minDurationSeconds = 300, limit = 100): Promise<Match[]> {
    return this.matchRepository.find({
      where: {
        callDuration: MoreThan(minDurationSeconds),
        wasSkipped: false,
      },
      order: { callDuration: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get failed connections for debugging
   */
  async getFailedConnections(
    startDate: Date,
    endDate: Date,
  ): Promise<Match[]> {
    return this.matchRepository.find({
      where: {
        connectionFailed: true,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'DESC' },
    });
  }

  // ========================================
  // USER STATISTICS
  // ========================================

  /**
   * Get comprehensive user match statistics
   */
  async getUserStats(userId: string): Promise<UserMatchStats> {
    const matches = await this.matchRepository.find({
      where: [{ user1Id: userId }, { user2Id: userId }],
    });

    if (matches.length === 0) {
      return {
        totalMatches: 0,
        completedMatches: 0,
        skippedMatches: 0,
        skipRate: 0,
        avgCallDuration: 0,
        totalCallTime: 0,
        avgCompatibilityScore: 0,
        avgQualityScore: 0,
        connectionSuccessRate: 100,
        longestCall: 0,
        mostCommonRegion: 'unknown',
        preferredQueueType: 'casual',
        recentPartners: [],
      };
    }

    const totalMatches = matches.length;
    const skippedMatches = matches.filter(m => m.wasSkipped).length;
    const completedMatches = matches.filter(
      m => !m.wasSkipped && m.callDuration >= 60,
    ).length;
    const failedConnections = matches.filter(m => m.connectionFailed).length;

    const totalCallTime = matches.reduce((sum, m) => sum + m.callDuration, 0);
    const avgCallDuration = totalCallTime / totalMatches;
    const avgCompatibilityScore =
      matches.reduce((sum, m) => sum + m.compatibilityScore, 0) / totalMatches;
    const avgQualityScore =
      matches.reduce((sum, m) => sum + m.qualityScore, 0) / totalMatches;

    const longestCall = Math.max(...matches.map(m => m.callDuration));

    // Find most common region
    const regionCounts = this.countBy(matches, 'region');
    const mostCommonRegion = this.getMostCommon(regionCounts) || 'global';

    // Find preferred queue type
    const queueCounts = this.countBy(matches, 'queueType');
    const preferredQueueType = this.getMostCommon(queueCounts) || 'casual';

    // Get recent unique partners (last 10)
    const recentPartners = matches
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20)
      .map(m => (m.user1Id === userId ? m.user2Id : m.user1Id))
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 10);

    return {
      totalMatches,
      completedMatches,
      skippedMatches,
      skipRate: Math.round((skippedMatches / totalMatches) * 100 * 10) / 10,
      avgCallDuration: Math.round(avgCallDuration),
      totalCallTime,
      avgCompatibilityScore: Math.round(avgCompatibilityScore * 10) / 10,
      avgQualityScore: Math.round(avgQualityScore * 10) / 10,
      connectionSuccessRate:
        Math.round(((totalMatches - failedConnections) / totalMatches) * 100 * 10) / 10,
      longestCall,
      mostCommonRegion,
      preferredQueueType,
      recentPartners,
    };
  }

  // ========================================
  // ANALYTICS
  // ========================================

  /**
   * Get comprehensive analytics for a time period
   */
  async getAnalytics(startDate: Date, endDate: Date): Promise<MatchAnalyticsDto> {
    const matches = await this.matchRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    if (matches.length === 0) {
      return this.getEmptyAnalytics();
    }

    const totalMatches = matches.length;
    const skippedCount = matches.filter(m => m.wasSkipped).length;
    const failedCount = matches.filter(m => m.connectionFailed).length;
    const connectedMatches = matches.filter(
      m => m.connectionTime && m.connectionTime > 0,
    );

    // Basic aggregates
    const avgCompatibilityScore =
      matches.reduce((sum, m) => sum + m.compatibilityScore, 0) / totalMatches;
    const avgCallDuration =
      matches.reduce((sum, m) => sum + m.callDuration, 0) / totalMatches;
    const avgConnectionTime =
      connectedMatches.length > 0
        ? connectedMatches.reduce((sum, m) => sum + (m.connectionTime || 0), 0) /
          connectedMatches.length
        : 0;
    const avgWaitTime =
      matches.reduce((sum, m) => sum + m.user1WaitTime + m.user2WaitTime, 0) /
      (totalMatches * 2);
    const avgQualityScore =
      matches.reduce((sum, m) => sum + m.qualityScore, 0) / totalMatches;

    // By region
    const byRegion: Record<string, RegionStats> = {};
    const regionGroups = this.groupBy(matches, 'region');

    for (const [region, regionMatches] of Object.entries(regionGroups)) {
      const regionSkipped = regionMatches.filter(m => m.wasSkipped).length;
      byRegion[region] = {
        count: regionMatches.length,
        avgDuration:
          regionMatches.reduce((sum, m) => sum + m.callDuration, 0) /
          regionMatches.length,
        skipRate: (regionSkipped / regionMatches.length) * 100,
        avgCompatibility:
          regionMatches.reduce((sum, m) => sum + m.compatibilityScore, 0) /
          regionMatches.length,
        avgWaitTime:
          regionMatches.reduce(
            (sum, m) => sum + m.user1WaitTime + m.user2WaitTime,
            0,
          ) /
          (regionMatches.length * 2),
      };
    }

    // By queue type
    const byQueueType: Record<string, QueueTypeStats> = {};
    const queueGroups = this.groupBy(matches, 'queueType');

    for (const [queueType, queueMatches] of Object.entries(queueGroups)) {
      const queueSkipped = queueMatches.filter(m => m.wasSkipped).length;
      byQueueType[queueType] = {
        count: queueMatches.length,
        avgDuration:
          queueMatches.reduce((sum, m) => sum + m.callDuration, 0) /
          queueMatches.length,
        skipRate: (queueSkipped / queueMatches.length) * 100,
        avgCompatibility:
          queueMatches.reduce((sum, m) => sum + m.compatibilityScore, 0) /
          queueMatches.length,
      };
    }

    // By hour of day
    const byHour: Record<number, HourlyStats> = {};
    for (const match of matches) {
      const hour = match.createdAt.getHours();
      if (!byHour[hour]) {
        byHour[hour] = { count: 0, avgDuration: 0, skipRate: 0 };
      }
      byHour[hour].count++;
    }

    // Calculate hourly averages
    for (const hour of Object.keys(byHour).map(Number)) {
      const hourMatches = matches.filter(
        m => m.createdAt.getHours() === hour,
      );
      const hourSkipped = hourMatches.filter(m => m.wasSkipped).length;
      byHour[hour].avgDuration =
        hourMatches.reduce((sum, m) => sum + m.callDuration, 0) /
        hourMatches.length;
      byHour[hour].skipRate = (hourSkipped / hourMatches.length) * 100;
    }

    // Connection types distribution
    const connectionTypes: Record<string, number> = {};
    for (const match of connectedMatches) {
      const type = match.connectionType || 'unknown';
      connectionTypes[type] = (connectionTypes[type] || 0) + 1;
    }

    return {
      totalMatches,
      avgCompatibilityScore: Math.round(avgCompatibilityScore * 10) / 10,
      avgCallDuration: Math.round(avgCallDuration),
      skipRate: Math.round((skippedCount / totalMatches) * 1000) / 10,
      connectionFailRate: Math.round((failedCount / totalMatches) * 1000) / 10,
      avgConnectionTime: Math.round(avgConnectionTime),
      avgWaitTime: Math.round(avgWaitTime),
      avgQualityScore: Math.round(avgQualityScore * 10) / 10,
      byRegion,
      byQueueType,
      byHour,
      connectionTypes,
    };
  }

  /**
   * Get trend analysis comparing two periods
   */
  async getTrendAnalysis(
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date,
  ): Promise<TrendAnalysis> {
    const [currentPeriod, previousPeriod] = await Promise.all([
      this.getAnalytics(currentStart, currentEnd),
      this.getAnalytics(previousStart, previousEnd),
    ]);

    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    };

    return {
      currentPeriod,
      previousPeriod,
      changes: {
        matchesChange: calculateChange(
          currentPeriod.totalMatches,
          previousPeriod.totalMatches,
        ),
        durationChange: calculateChange(
          currentPeriod.avgCallDuration,
          previousPeriod.avgCallDuration,
        ),
        skipRateChange: calculateChange(
          currentPeriod.skipRate,
          previousPeriod.skipRate,
        ),
        qualityChange: calculateChange(
          currentPeriod.avgQualityScore,
          previousPeriod.avgQualityScore,
        ),
      },
    };
  }

  /**
   * Get peak hours (hours with most matches)
   */
  async getPeakHours(days = 7): Promise<{ hour: number; count: number }[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const matches = await this.matchRepository.find({
      where: { createdAt: MoreThan(since) },
      select: ['createdAt'],
    });

    const hourCounts: Record<number, number> = {};
    for (const match of matches) {
      const hour = match.createdAt.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: Number(hour), count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get daily match counts for charting
   */
  async getDailyMatchCounts(days = 30): Promise<{ date: string; count: number }[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const matches = await this.matchRepository.find({
      where: { createdAt: MoreThan(since) },
      select: ['createdAt'],
    });

    const dayCounts: Record<string, number> = {};
    for (const match of matches) {
      const dateStr = match.createdAt.toISOString().split('T')[0];
      dayCounts[dateStr] = (dayCounts[dateStr] || 0) + 1;
    }

    // Fill in missing days with 0
    const result: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      result.push({ date: dateStr, count: dayCounts[dateStr] || 0 });
    }

    return result;
  }

  // ========================================
  // COUNTS AND QUICK STATS
  // ========================================

  /**
   * Get recent matches count
   */
  async getRecentMatchesCount(hours = 24): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.matchRepository.count({
      where: { createdAt: MoreThan(since) },
    });
  }

  /**
   * Get active matches count (currently in progress)
   */
  async getActiveMatchesCount(): Promise<number> {
    return this.matchRepository.count({
      where: {
        endedAt: null as any,
        connectionFailed: false,
      },
    });
  }

  /**
   * Get total matches count
   */
  async getTotalMatchesCount(): Promise<number> {
    return this.matchRepository.count();
  }

  /**
   * Get quick dashboard stats
   */
  async getDashboardStats(): Promise<{
    totalMatches: number;
    matchesToday: number;
    matchesThisWeek: number;
    avgDurationToday: number;
    skipRateToday: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalMatches, matchesToday, matchesThisWeek] = await Promise.all([
      this.getTotalMatchesCount(),
      this.matchRepository.count({
        where: { createdAt: MoreThan(todayStart) },
      }),
      this.matchRepository.count({
        where: { createdAt: MoreThan(weekStart) },
      }),
    ]);

    // Get today's detailed stats
    const todayMatches = await this.matchRepository.find({
      where: { createdAt: MoreThan(todayStart) },
    });

    const avgDurationToday =
      todayMatches.length > 0
        ? todayMatches.reduce((sum, m) => sum + m.callDuration, 0) /
          todayMatches.length
        : 0;

    const skippedToday = todayMatches.filter(m => m.wasSkipped).length;
    const skipRateToday =
      todayMatches.length > 0 ? (skippedToday / todayMatches.length) * 100 : 0;

    return {
      totalMatches,
      matchesToday,
      matchesThisWeek,
      avgDurationToday: Math.round(avgDurationToday),
      skipRateToday: Math.round(skipRateToday * 10) / 10,
    };
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private getEmptyAnalytics(): MatchAnalyticsDto {
    return {
      totalMatches: 0,
      avgCompatibilityScore: 0,
      avgCallDuration: 0,
      skipRate: 0,
      connectionFailRate: 0,
      avgConnectionTime: 0,
      avgWaitTime: 0,
      avgQualityScore: 0,
      byRegion: {},
      byQueueType: {},
      byHour: {},
      connectionTypes: {},
    };
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce(
      (groups, item) => {
        const value = String(item[key]);
        if (!groups[value]) {
          groups[value] = [];
        }
        groups[value].push(item);
        return groups;
      },
      {} as Record<string, T[]>,
    );
  }

  private countBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce(
      (counts, item) => {
        const value = String(item[key]);
        counts[value] = (counts[value] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );
  }

  private getMostCommon(counts: Record<string, number>): string | null {
    let maxKey: string | null = null;
    let maxCount = 0;

    for (const [key, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxKey = key;
      }
    }

    return maxKey;
  }
}
