import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { CallHistory } from './entities/call-history.entity';
import { LoggerService } from '../services/logger.service';

export interface UserAnalytics {
  totalCalls: number;
  totalMinutes: number;
  averageCallLength: number;
  averageConnectionTime: number;
  skipRate: number;
  topLanguages: Array<{ language: string; count: number }>;
  topRegions: Array<{ region: string; count: number }>;
  averageCompatibilityScore: number;
  stats7Days: PeriodStats;
  stats30Days: PeriodStats;
}

export interface PeriodStats {
  calls: number;
  minutes: number;
  avgDuration: number;
  skipRate: number;
}

@Injectable()
export class CallHistoryService {
  constructor(
    @InjectRepository(CallHistory)
    private readonly callHistoryRepository: Repository<CallHistory>,
    private readonly logger: LoggerService,
  ) {}

  async recordCallSession(
    userId: string,
    sessionData: {
      peerId?: string;
      sessionId: string;
      matchId?: string;
      duration: number;
      connectionTime?: number;
      peerReputation?: number;
      region?: string;
      language?: string;
      queueType?: string;
      wasSkipped?: boolean;
      compatibilityScore?: number;
      commonInterests?: string[];
      isTextOnly?: boolean;
    },
  ): Promise<CallHistory> {
    try {
      const callHistory = this.callHistoryRepository.create({
        userId,
        peerId: sessionData.peerId,
        sessionId: sessionData.sessionId,
        matchId: sessionData.matchId,
        duration: sessionData.duration,
        connectionTime: sessionData.connectionTime || 0,
        peerReputation: sessionData.peerReputation,
        region: sessionData.region,
        language: sessionData.language,
        queueType: sessionData.queueType,
        wasSkipped: sessionData.wasSkipped || false,
        compatibilityScore: sessionData.compatibilityScore,
        commonInterests: sessionData.commonInterests,
        isTextOnly: sessionData.isTextOnly || false,
      });

      const saved = await this.callHistoryRepository.save(callHistory);

      this.logger.log('Call history recorded', {
        userId,
        sessionId: sessionData.sessionId,
        duration: sessionData.duration,
        wasSkipped: sessionData.wasSkipped,
      });

      return saved;
    } catch (error) {
      this.logger.error('Failed to record call history', error.stack);
      throw error;
    }
  }

  async getUserStats(userId: string): Promise<UserAnalytics> {
    const history = await this.callHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const totalCalls = history.length;
    const totalSeconds = history.reduce((sum, h) => sum + (h.duration || 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const averageCallLength = totalCalls > 0 ? totalSeconds / totalCalls : 0;

    const connectionTimes = history.filter(h => h.connectionTime > 0).map(h => h.connectionTime);
    const averageConnectionTime = connectionTimes.length > 0
      ? connectionTimes.reduce((sum, ct) => sum + ct, 0) / connectionTimes.length
      : 0;

    const skippedCount = history.filter(h => h.wasSkipped).length;
    const skipRate = totalCalls > 0 ? (skippedCount / totalCalls) * 100 : 0;

    const compatScores = history.filter(h => h.compatibilityScore !== null).map(h => h.compatibilityScore!);
    const averageCompatibilityScore = compatScores.length > 0
      ? compatScores.reduce((sum, s) => sum + s, 0) / compatScores.length
      : 0;

    // Top languages
    const languageCounts: Record<string, number> = {};
    history.forEach(h => {
      if (h.language) {
        languageCounts[h.language] = (languageCounts[h.language] || 0) + 1;
      }
    });
    const topLanguages = Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top regions
    const regionCounts: Record<string, number> = {};
    history.forEach(h => {
      if (h.region) {
        regionCounts[h.region] = (regionCounts[h.region] || 0) + 1;
      }
    });
    const topRegions = Object.entries(regionCounts)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate period stats
    const stats7Days = this.calculatePeriodStats(history, 7);
    const stats30Days = this.calculatePeriodStats(history, 30);

    return {
      totalCalls,
      totalMinutes,
      averageCallLength,
      averageConnectionTime,
      skipRate,
      topLanguages,
      topRegions,
      averageCompatibilityScore,
      stats7Days,
      stats30Days,
    };
  }

  private calculatePeriodStats(history: CallHistory[], days: number): PeriodStats {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const periodHistory = history.filter(h => new Date(h.createdAt) >= cutoff);
    const calls = periodHistory.length;
    const totalSeconds = periodHistory.reduce((sum, h) => sum + (h.duration || 0), 0);
    const minutes = Math.round(totalSeconds / 60);
    const avgDuration = calls > 0 ? totalSeconds / calls : 0;
    const skipped = periodHistory.filter(h => h.wasSkipped).length;
    const skipRate = calls > 0 ? (skipped / calls) * 100 : 0;

    return { calls, minutes, avgDuration, skipRate };
  }

  async getCallHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<CallHistory[]> {
    return this.callHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getRecentCallsCount(userId: string, hours: number = 24): Promise<number> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);

    return this.callHistoryRepository.count({
      where: {
        userId,
        createdAt: MoreThan(cutoff),
      },
    });
  }
}
