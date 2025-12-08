import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
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
  byRegion: Record<string, { count: number; avgDuration: number; skipRate: number }>;
  byQueueType: Record<string, { count: number; avgDuration: number; skipRate: number }>;
}

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    private readonly logger: LoggerService,
  ) {}

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
  async markConnected(sessionId: string, connectionTime: number, connectionType?: string): Promise<void> {
    await this.matchRepository.update(
      { sessionId },
      {
        connectedAt: new Date(),
        connectionTime,
        connectionType: connectionType || 'unknown',
      },
    );
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
  }

  /**
   * Get match by session ID
   */
  async findBySessionId(sessionId: string): Promise<Match | null> {
    return this.matchRepository.findOne({ where: { sessionId } });
  }

  /**
   * Get user's match history
   */
  async getUserMatchHistory(
    userId: string,
    limit = 50,
  ): Promise<Match[]> {
    return this.matchRepository.find({
      where: [{ user1Id: userId }, { user2Id: userId }],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get analytics for a time period
   */
  async getAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<MatchAnalyticsDto> {
    const matches = await this.matchRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    if (matches.length === 0) {
      return {
        totalMatches: 0,
        avgCompatibilityScore: 0,
        avgCallDuration: 0,
        skipRate: 0,
        connectionFailRate: 0,
        avgConnectionTime: 0,
        byRegion: {},
        byQueueType: {},
      };
    }

    // Calculate aggregates
    const totalMatches = matches.length;
    const skippedCount = matches.filter(m => m.wasSkipped).length;
    const failedCount = matches.filter(m => m.connectionFailed).length;
    const connectedMatches = matches.filter(m => m.connectionTime && m.connectionTime > 0);

    const avgCompatibilityScore =
      matches.reduce((sum, m) => sum + m.compatibilityScore, 0) / totalMatches;
    const avgCallDuration =
      matches.reduce((sum, m) => sum + m.callDuration, 0) / totalMatches;
    const avgConnectionTime =
      connectedMatches.length > 0
        ? connectedMatches.reduce((sum, m) => sum + (m.connectionTime || 0), 0) / connectedMatches.length
        : 0;

    // By region
    const byRegion: Record<string, { count: number; avgDuration: number; skipRate: number }> = {};
    const regionGroups = this.groupBy(matches, 'region');

    for (const [region, regionMatches] of Object.entries(regionGroups)) {
      const regionSkipped = regionMatches.filter(m => m.wasSkipped).length;
      byRegion[region] = {
        count: regionMatches.length,
        avgDuration: regionMatches.reduce((sum, m) => sum + m.callDuration, 0) / regionMatches.length,
        skipRate: (regionSkipped / regionMatches.length) * 100,
      };
    }

    // By queue type
    const byQueueType: Record<string, { count: number; avgDuration: number; skipRate: number }> = {};
    const queueGroups = this.groupBy(matches, 'queueType');

    for (const [queueType, queueMatches] of Object.entries(queueGroups)) {
      const queueSkipped = queueMatches.filter(m => m.wasSkipped).length;
      byQueueType[queueType] = {
        count: queueMatches.length,
        avgDuration: queueMatches.reduce((sum, m) => sum + m.callDuration, 0) / queueMatches.length,
        skipRate: (queueSkipped / queueMatches.length) * 100,
      };
    }

    return {
      totalMatches,
      avgCompatibilityScore: Math.round(avgCompatibilityScore * 10) / 10,
      avgCallDuration: Math.round(avgCallDuration),
      skipRate: Math.round((skippedCount / totalMatches) * 1000) / 10,
      connectionFailRate: Math.round((failedCount / totalMatches) * 1000) / 10,
      avgConnectionTime: Math.round(avgConnectionTime),
      byRegion,
      byQueueType,
    };
  }

  /**
   * Get recent matches count (for dashboard)
   */
  async getRecentMatchesCount(hours = 24): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.matchRepository.count({
      where: { createdAt: MoreThan(since) },
    });
  }

  /**
   * Helper: Group array by property
   */
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
}
