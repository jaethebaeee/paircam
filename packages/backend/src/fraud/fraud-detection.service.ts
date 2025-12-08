import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../services/logger.service';
import { ReputationService } from '../reputation/reputation.service';

export interface FraudIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  value: number;
  threshold: number;
}

export interface FraudAnalysis {
  userId: string;
  isSuspicious: boolean;
  riskScore: number; // 0-100
  indicators: FraudIndicator[];
  recommendedAction: 'none' | 'monitor' | 'warn' | 'restrict' | 'ban';
  analyzedAt: number;
}

export interface FraudPattern {
  patternType: string;
  description: string;
  userIds: string[];
  detectedAt: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Fraud Detection Service
 * Identifies and flags suspicious user behavior patterns
 */
@Injectable()
export class FraudDetectionService {
  private readonly THRESHOLDS = {
    CONNECTION_FAILURE_RATE: 50, // % - Users who fail to connect > 50% of the time
    SKIP_RATE: 80, // % - Users who skip > 80% of matches
    RAPID_QUEUE_JOINS: 10, // joins per minute - Potential bot
    REPORT_COUNT: 5, // reports in 7 days - Serial abuser
    SHORT_CALL_RATE: 70, // % - Calls under 10 seconds
    LOW_REPUTATION: 30, // reputation score threshold
  };

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    @Inject(forwardRef(() => ReputationService))
    private readonly reputationService: ReputationService,
  ) {}

  /**
   * Analyze a user for fraud indicators
   */
  async analyzeUser(userId: string): Promise<FraudAnalysis> {
    const indicators: FraudIndicator[] = [];
    let riskScore = 0;

    // 1. Check connection failure rate
    const connectionFailures = await this.redisService.getUserActivityCount(userId, 'connection_failed');
    const connectionAttempts = await this.redisService.getUserActivityCount(userId, 'connection_attempt');
    if (connectionAttempts > 5) {
      const failureRate = (connectionFailures / connectionAttempts) * 100;
      if (failureRate > this.THRESHOLDS.CONNECTION_FAILURE_RATE) {
        indicators.push({
          type: 'high_connection_failure',
          severity: 'medium',
          description: `${failureRate.toFixed(1)}% connection failure rate`,
          value: failureRate,
          threshold: this.THRESHOLDS.CONNECTION_FAILURE_RATE,
        });
        riskScore += 20;
      }
    }

    // 2. Check skip rate
    const redisReputation = await this.redisService.getUserReputation(userId);
    if (redisReputation.totalRatings > 10 && redisReputation.skipRate > this.THRESHOLDS.SKIP_RATE) {
      indicators.push({
        type: 'excessive_skipping',
        severity: 'high',
        description: `${redisReputation.skipRate.toFixed(1)}% skip rate (griefing pattern)`,
        value: redisReputation.skipRate,
        threshold: this.THRESHOLDS.SKIP_RATE,
      });
      riskScore += 30;
    }

    // 3. Check rapid queue joining (bot detection)
    const queueJoins = await this.redisService.getUserActivityCount(userId, 'queue_join');
    if (queueJoins > this.THRESHOLDS.RAPID_QUEUE_JOINS) {
      indicators.push({
        type: 'rapid_queue_activity',
        severity: 'high',
        description: `${queueJoins} queue joins in last hour (potential bot)`,
        value: queueJoins,
        threshold: this.THRESHOLDS.RAPID_QUEUE_JOINS,
      });
      riskScore += 35;
    }

    // 4. Check report count
    const reportCount = await this.redisService.getCounter(`reports:against:${userId}`);
    if (reportCount >= this.THRESHOLDS.REPORT_COUNT) {
      indicators.push({
        type: 'multiple_reports',
        severity: 'critical',
        description: `${reportCount} reports received (serial abuser)`,
        value: reportCount,
        threshold: this.THRESHOLDS.REPORT_COUNT,
      });
      riskScore += 40;
    }

    // 5. Check low reputation
    if (redisReputation.rating < this.THRESHOLDS.LOW_REPUTATION) {
      indicators.push({
        type: 'low_reputation',
        severity: 'medium',
        description: `Reputation score ${redisReputation.rating.toFixed(0)}`,
        value: redisReputation.rating,
        threshold: this.THRESHOLDS.LOW_REPUTATION,
      });
      riskScore += 15;
    }

    // 6. Check existing flags
    const existingFlags = await this.redisService.getUserFlags(userId);
    if (existingFlags.length > 0) {
      indicators.push({
        type: 'previously_flagged',
        severity: 'medium',
        description: `${existingFlags.length} previous flags`,
        value: existingFlags.length,
        threshold: 1,
      });
      riskScore += existingFlags.length * 10;
    }

    // Cap risk score at 100
    riskScore = Math.min(100, riskScore);

    // Determine recommended action
    let recommendedAction: FraudAnalysis['recommendedAction'] = 'none';
    if (riskScore >= 80) {
      recommendedAction = 'ban';
    } else if (riskScore >= 60) {
      recommendedAction = 'restrict';
    } else if (riskScore >= 40) {
      recommendedAction = 'warn';
    } else if (riskScore >= 20) {
      recommendedAction = 'monitor';
    }

    const analysis: FraudAnalysis = {
      userId,
      isSuspicious: riskScore >= 20,
      riskScore,
      indicators,
      recommendedAction,
      analyzedAt: Date.now(),
    };

    // Store analysis result
    await this.storeAnalysis(analysis);

    if (analysis.isSuspicious) {
      this.logger.warn('Suspicious user detected', {
        userId,
        riskScore,
        recommendedAction,
        indicatorCount: indicators.length,
      });
    }

    return analysis;
  }

  /**
   * Track user activity for fraud detection
   */
  async trackActivity(userId: string, activityType: string): Promise<void> {
    await this.redisService.trackUserActivity(userId, activityType);

    // Auto-analyze after certain activities
    if (['connection_failed', 'skip', 'queue_join'].includes(activityType)) {
      // Rate limit analysis to once per 5 minutes per user
      const analysisKey = `fraud:analysis:${userId}:lastRun`;
      const lastRun = await this.redisService.getClient().get(analysisKey);

      if (!lastRun || Date.now() - parseInt(lastRun, 10) > 300000) {
        await this.redisService.getClient().setEx(analysisKey, 300, Date.now().toString());
        // Run analysis in background
        this.analyzeUser(userId).catch(err => {
          this.logger.error('Background fraud analysis failed', err.stack, { userId });
        });
      }
    }
  }

  /**
   * Store analysis result for later review
   */
  private async storeAnalysis(analysis: FraudAnalysis): Promise<void> {
    await this.redisService.getClient().setEx(
      `fraud:analysis:${analysis.userId}`,
      86400 * 7, // 7 days
      JSON.stringify(analysis)
    );

    // If suspicious, add to suspicious users set
    if (analysis.isSuspicious) {
      await this.redisService.getClient().zAdd('fraud:suspicious:users', {
        score: analysis.riskScore,
        value: analysis.userId,
      });
    }
  }

  /**
   * Get stored analysis for a user
   */
  async getAnalysis(userId: string): Promise<FraudAnalysis | null> {
    const data = await this.redisService.getClient().get(`fraud:analysis:${userId}`);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Get top suspicious users
   */
  async getSuspiciousUsers(limit = 50): Promise<FraudAnalysis[]> {
    const userIds = await this.redisService.getClient().zRange(
      'fraud:suspicious:users',
      0,
      limit - 1,
      { REV: true } // Highest risk first
    );

    const analyses: FraudAnalysis[] = [];
    for (const userId of userIds) {
      const analysis = await this.getAnalysis(userId);
      if (analysis) {
        analyses.push(analysis);
      }
    }

    return analyses;
  }

  /**
   * Auto-flag users based on fraud analysis
   */
  async autoFlagIfNeeded(userId: string, analysis: FraudAnalysis): Promise<void> {
    if (analysis.riskScore >= 60 && analysis.indicators.length >= 2) {
      const reasons = analysis.indicators
        .map(i => `${i.type}:${i.value}`)
        .join(', ');

      await this.redisService.flagSuspiciousUser(userId, `auto_flagged:${reasons}`);

      this.logger.warn('User auto-flagged for fraud', {
        userId,
        riskScore: analysis.riskScore,
        reasons,
      });
    }
  }

  /**
   * Check if a match should be allowed based on fraud scores
   */
  async shouldAllowMatch(user1Id: string, user2Id: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const [user1Flagged, user2Flagged] = await Promise.all([
      this.redisService.isUserFlagged(user1Id),
      this.redisService.isUserFlagged(user2Id),
    ]);

    // Don't match two flagged users (prevent collusion)
    if (user1Flagged && user2Flagged) {
      return {
        allowed: false,
        reason: 'both_users_flagged',
      };
    }

    return { allowed: true };
  }

  /**
   * Periodic cleanup of old suspicious user entries
   */
  @Interval(3600000) // Every hour
  async cleanupOldEntries(): Promise<void> {
    try {
      // Remove entries older than 7 days from the sorted set
      const cutoff = Date.now() - 86400000 * 7;
      const oldUserIds = await this.redisService.getClient().zRangeByScore(
        'fraud:suspicious:users',
        '-inf',
        0 // Score 0 would be from very old entries
      );

      if (oldUserIds.length > 0) {
        // Re-analyze old entries to see if they're still suspicious
        for (const userId of oldUserIds.slice(0, 10)) {
          const analysis = await this.getAnalysis(userId);
          if (!analysis || analysis.analyzedAt < cutoff) {
            await this.redisService.getClient().zRem('fraud:suspicious:users', userId);
          }
        }
      }

      this.logger.debug('Fraud detection cleanup completed');
    } catch (error) {
      this.logger.error('Fraud detection cleanup failed', error.stack);
    }
  }

  /**
   * Get fraud detection statistics
   */
  async getStats(): Promise<{
    totalSuspiciousUsers: number;
    byRiskLevel: Record<string, number>;
    topIndicators: Array<{ type: string; count: number }>;
  }> {
    const suspiciousCount = await this.redisService.getClient().zCard('fraud:suspicious:users');

    // Count by risk level
    const byRiskLevel = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    // Get sample of users to analyze distribution
    const sampleUsers = await this.getSuspiciousUsers(100);
    for (const analysis of sampleUsers) {
      if (analysis.riskScore >= 80) byRiskLevel.critical++;
      else if (analysis.riskScore >= 60) byRiskLevel.high++;
      else if (analysis.riskScore >= 40) byRiskLevel.medium++;
      else byRiskLevel.low++;
    }

    // Count indicator types
    const indicatorCounts: Record<string, number> = {};
    for (const analysis of sampleUsers) {
      for (const indicator of analysis.indicators) {
        indicatorCounts[indicator.type] = (indicatorCounts[indicator.type] || 0) + 1;
      }
    }

    const topIndicators = Object.entries(indicatorCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalSuspiciousUsers: suspiciousCount,
      byRiskLevel,
      topIndicators,
    };
  }
}
