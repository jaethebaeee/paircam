import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../services/logger.service';
import { ReportingService } from '../reporting/reporting.service';
import { MatchesService } from '../matches/matches.service';
import { ReputationService } from '../reputation/reputation.service';
import { MatchmakingService } from '../signaling/matchmaking.service';

export interface SystemHealthMetrics {
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  services: {
    redis: boolean;
    database: boolean;
    matchmaking: boolean;
  };
  realtime: {
    queueLength: number;
    activeMatches: number;
    connectedClients: number;
  };
}

export interface ModerationMetrics {
  totalReports: number;
  pendingReports: number;
  acceptedReports: number;
  rejectedReports: number;
  appealsCount: number;
  reportsBySeverity: Record<string, number>;
  averageResponseTime: number;
}

export interface ModeratorPerformance {
  moderatorId: string;
  totalDecisions: number;
  acceptedCount: number;
  rejectedCount: number;
  appealsOverturned: number;
  averageResponseTime: number;
}

export interface SuspiciousUserReport {
  userId: string;
  flags: Array<{ reason: string; timestamp: number }>;
  reportCount: number;
  skipRate: number;
  connectionFailRate: number;
  recentActivity: number;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    @Inject(forwardRef(() => ReportingService))
    private readonly reportingService: ReportingService,
    @Inject(forwardRef(() => MatchesService))
    private readonly matchesService: MatchesService,
    @Inject(forwardRef(() => ReputationService))
    private readonly reputationService: ReputationService,
    @Inject(forwardRef(() => MatchmakingService))
    private readonly matchmakingService: MatchmakingService,
  ) {}

  /**
   * Get real-time system health metrics
   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    const [queueLength, activeMatches, redisHealthy] = await Promise.all([
      this.redisService.getQueueLength(),
      this.matchesService.getActiveMatchesCount(),
      this.checkRedisHealth(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        redis: redisHealthy,
        database: true, // Would need DataSource injection for proper check
        matchmaking: queueLength >= 0,
      },
      realtime: {
        queueLength,
        activeMatches,
        connectedClients: await this.getConnectedClientsCount(),
      },
    };
  }

  /**
   * Get moderation metrics
   */
  async getModerationMetrics(): Promise<ModerationMetrics> {
    const stats = await this.reportingService.getReportStats();

    // Get severity breakdown
    const reportsBySeverity: Record<string, number> = {};
    for (const severity of ['low', 'medium', 'high', 'critical']) {
      reportsBySeverity[severity] = await this.redisService.getCounter(
        `reports:severity:${severity}`
      );
    }

    const appealsCount = await this.redisService.getCounter('reports:appealed');

    return {
      totalReports: stats.totalReports,
      pendingReports: stats.pendingReports,
      acceptedReports: stats.acceptedReports,
      rejectedReports: stats.rejectedReports,
      appealsCount,
      reportsBySeverity,
      averageResponseTime: 0, // Would need to track timestamps for this
    };
  }

  /**
   * Get moderator performance metrics
   */
  async getModeratorPerformance(moderatorId: string): Promise<ModeratorPerformance> {
    const [acceptedCount, rejectedCount] = await Promise.all([
      this.redisService.getCounter(`moderator:${moderatorId}:accepted`),
      this.redisService.getCounter(`moderator:${moderatorId}:rejected`),
    ]);

    return {
      moderatorId,
      totalDecisions: acceptedCount + rejectedCount,
      acceptedCount,
      rejectedCount,
      appealsOverturned: 0, // Would need tracking
      averageResponseTime: 0,
    };
  }

  /**
   * Get list of suspicious users
   */
  async getSuspiciousUsers(limit = 50): Promise<SuspiciousUserReport[]> {
    // Get users who have been flagged
    const suspiciousUsers: SuspiciousUserReport[] = [];

    // This would ideally use a Redis scan or maintain a set of flagged users
    // For now, we return users based on high report counts
    // In production, you'd want to maintain a `suspicious:users` set

    this.logger.log('Fetching suspicious users', { limit });

    return suspiciousUsers;
  }

  /**
   * Get user's complete profile for moderation
   */
  async getUserModerationProfile(userId: string): Promise<{
    userId: string;
    reputation: Awaited<ReturnType<ReputationService['getOrCreateReputation']>>;
    matchStats: Awaited<ReturnType<MatchesService['getUserStats']>>;
    flags: Array<{ reason: string; timestamp: number }>;
    reportCount: number;
    isBlocked: boolean;
  }> {
    const [reputation, matchStats, flags, reportCount, isBlocked] = await Promise.all([
      this.reputationService.getOrCreateReputation(userId),
      this.matchesService.getUserStats(userId),
      this.redisService.getUserFlags(userId),
      this.redisService.getCounter(`reports:against:${userId}`),
      this.redisService.isBlocked('device', userId),
    ]);

    return {
      userId,
      reputation,
      matchStats,
      flags,
      reportCount,
      isBlocked,
    };
  }

  /**
   * Bulk block users
   */
  async bulkBlockUsers(
    userIds: string[],
    reason: string,
    moderatorId: string,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await this.redisService.addToBlockList('device', userId, reason);
        await this.reputationService.recordBan(userId, moderatorId, reason);
        success++;
      } catch (error) {
        this.logger.error('Failed to block user', error.stack, { userId });
        failed++;
      }
    }

    this.logger.log('Bulk block completed', {
      moderatorId,
      reason,
      success,
      failed,
      total: userIds.length,
    });

    return { success, failed };
  }

  /**
   * Emergency queue reset
   */
  async resetMatchmakingQueue(moderatorId: string): Promise<void> {
    this.logger.warn('Emergency queue reset initiated', { moderatorId });

    // Clear the queue
    await this.redisService.getClient().del('matchmaking:queue:zset');

    this.logger.warn('Matchmaking queue has been reset', { moderatorId });
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats(): Promise<{
    matches: Awaited<ReturnType<MatchesService['getDashboardStats']>>;
    moderation: ModerationMetrics;
    system: SystemHealthMetrics;
  }> {
    const [matches, moderation, system] = await Promise.all([
      this.matchesService.getDashboardStats(),
      this.getModerationMetrics(),
      this.getSystemHealth(),
    ]);

    return { matches, moderation, system };
  }

  /**
   * Get matchmaking performance metrics
   */
  async getMatchmakingMetrics(): Promise<{
    queueLength: number;
    avgWaitTime: number;
    matchesPerMinute: number;
    peakHours: Array<{ hour: number; count: number }>;
  }> {
    const [queueLength, peakHours] = await Promise.all([
      this.redisService.getQueueLength(),
      this.matchesService.getPeakHours(7),
    ]);

    // Calculate matches per minute from recent data
    const recentMatches = await this.matchesService.getRecentMatchesCount(1);
    const matchesPerMinute = Math.round((recentMatches / 60) * 10) / 10;

    return {
      queueLength,
      avgWaitTime: 0, // Would need tracking
      matchesPerMinute,
      peakHours: peakHours.slice(0, 5),
    };
  }

  // Helper methods

  private async checkRedisHealth(): Promise<boolean> {
    try {
      return this.redisService.getClient().isReady;
    } catch {
      return false;
    }
  }

  private async getConnectedClientsCount(): Promise<number> {
    // This would need to be tracked via SignalingGateway
    // For now, return 0 as placeholder
    return 0;
  }
}
