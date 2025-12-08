import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MatchAnalyticsService } from './match-analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AnalyticsController {
  constructor(private readonly analyticsService: MatchAnalyticsService) {}

  /**
   * GET /analytics/matches
   * Get comprehensive match quality analytics
   */
  @Get('matches')
  async getMatchAnalytics(@Query('timeRange') timeRange?: '1h' | '24h' | '7d') {
    const analytics = await this.analyticsService.getAnalytics(timeRange || '24h');
    
    return {
      success: true,
      data: analytics,
      timestamp: Date.now(),
    };
  }

  /**
   * GET /analytics/health
   * Get system health metrics
   */
  @Get('health')
  async getHealthMetrics() {
    const analytics = await this.analyticsService.getAnalytics('1h');
    
    // Calculate health scores
    const connectionSuccessRate = analytics.totalMatches > 0
      ? (analytics.successfulConnections / analytics.totalMatches) * 100
      : 0;
    
    const recommendations: string[] = [];

    // Add recommendations
    if (connectionSuccessRate < 80) {
      recommendations.push('Connection success rate is low. Check TURN server and network quality.');
    }
    if (analytics.skipRate > 50) {
      recommendations.push('High skip rate detected. Review matching algorithm quality.');
    }

    const health = {
      status: connectionSuccessRate > 80 ? 'healthy' : connectionSuccessRate > 60 ? 'degraded' : 'critical',
      connectionSuccessRate: Math.round(connectionSuccessRate * 10) / 10,
      skipRate: analytics.skipRate,
      totalMatches: analytics.totalMatches,
      recommendations,
    };

    return {
      success: true,
      data: health,
      timestamp: Date.now(),
    };
  }

  /**
   * GET /analytics/regions
   * Get regional performance breakdown
   */
  @Get('regions')
  async getRegionalStats() {
    const analytics = await this.analyticsService.getAnalytics('24h');
    
    return {
      success: true,
      data: analytics.regionalStats,
      timestamp: Date.now(),
    };
  }

  /**
   * GET /analytics/interests
   * Get interest effectiveness stats
   */
  @Get('interests')
  async getInterestStats() {
    const analytics = await this.analyticsService.getAnalytics('24h');
    
    // Sort interests by effectiveness (call duration)
    const sortedInterests = Object.entries(analytics.interestStats)
      .map(([interest, stats]) => ({
        interest,
        ...stats,
        effectivenessScore: stats.avgCallDuration * (1 - stats.skipRate / 100),
      }))
      .sort((a, b) => b.effectivenessScore - a.effectivenessScore);
    
    return {
      success: true,
      data: {
        interests: sortedInterests,
        mostEffective: sortedInterests[0]?.interest || 'N/A',
        leastEffective: sortedInterests[sortedInterests.length - 1]?.interest || 'N/A',
      },
      timestamp: Date.now(),
    };
  }
}

