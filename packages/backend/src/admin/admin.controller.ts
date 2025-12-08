import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReportingService, Report } from '../reporting/reporting.service';
import { MatchesService } from '../matches/matches.service';
import { ReputationService } from '../reputation/reputation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModeratorGuard } from '../auth/moderator.guard';

/**
 * Admin Controller - Protected endpoints for moderation and system management
 * All endpoints require authentication and moderator/admin role
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, ModeratorGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reportingService: ReportingService,
    private readonly matchesService: MatchesService,
    private readonly reputationService: ReputationService,
  ) {}

  // ========================================
  // DASHBOARD & HEALTH
  // ========================================

  /**
   * Get comprehensive dashboard stats
   */
  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  /**
   * Get real-time system health
   */
  @Get('health/realtime')
  async getRealtimeHealth() {
    return this.adminService.getSystemHealth();
  }

  /**
   * Get matchmaking performance metrics
   */
  @Get('matchmaking/metrics')
  async getMatchmakingMetrics() {
    return this.adminService.getMatchmakingMetrics();
  }

  // ========================================
  // MODERATION
  // ========================================

  /**
   * Get pending reports for moderation
   */
  @Get('reports/pending')
  async getPendingReports(@Query('limit') limit?: string) {
    return this.reportingService.getAllReports(parseInt(limit || '50', 10));
  }

  /**
   * Get pending appeals
   */
  @Get('reports/appeals')
  async getPendingAppeals(@Query('limit') limit?: string) {
    return this.reportingService.getPendingAppeals(parseInt(limit || '50', 10));
  }

  /**
   * Get report details with audit log
   */
  @Get('reports/:reportId')
  async getReportDetails(@Param('reportId') reportId: string) {
    const [report, auditLog] = await Promise.all([
      this.reportingService.getReport(reportId),
      this.reportingService.getReportAuditLog(reportId),
    ]);

    if (!report) {
      return { error: 'Report not found' };
    }

    return { report, auditLog };
  }

  /**
   * Moderate a report (accept/reject)
   */
  @Post('reports/:reportId/moderate')
  @HttpCode(HttpStatus.OK)
  async moderateReport(
    @Param('reportId') reportId: string,
    @Body() body: { decision: 'accepted' | 'rejected'; moderatorId: string; notes?: string },
  ) {
    await this.reportingService.moderateReport(
      reportId,
      body.moderatorId,
      body.decision,
      body.notes,
    );
    return { success: true, reportId, decision: body.decision };
  }

  /**
   * Decide on an appeal
   */
  @Post('reports/:reportId/appeal')
  @HttpCode(HttpStatus.OK)
  async decideAppeal(
    @Param('reportId') reportId: string,
    @Body() body: { decision: 'upheld' | 'overturned'; moderatorId: string; notes?: string },
  ) {
    await this.reportingService.decideAppeal(
      reportId,
      body.moderatorId,
      body.decision,
      body.notes,
    );
    return { success: true, reportId, decision: body.decision };
  }

  /**
   * Get moderation metrics
   */
  @Get('moderation/metrics')
  async getModerationMetrics() {
    return this.adminService.getModerationMetrics();
  }

  /**
   * Get moderator performance
   */
  @Get('moderation/performance/:moderatorId')
  async getModeratorPerformance(@Param('moderatorId') moderatorId: string) {
    return this.adminService.getModeratorPerformance(moderatorId);
  }

  // ========================================
  // USER MANAGEMENT
  // ========================================

  /**
   * Get user's complete moderation profile
   */
  @Get('users/:userId/profile')
  async getUserProfile(@Param('userId') userId: string) {
    return this.adminService.getUserModerationProfile(userId);
  }

  /**
   * Get user's reputation details
   */
  @Get('users/:userId/reputation')
  async getUserReputation(@Param('userId') userId: string) {
    const [reputation, history] = await Promise.all([
      this.reputationService.getOrCreateReputation(userId),
      this.reputationService.getReputationHistory(userId),
    ]);
    return { reputation, history };
  }

  /**
   * Get user's match history
   */
  @Get('users/:userId/matches')
  async getUserMatches(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.matchesService.getUserMatchHistory(
      userId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '20', 10),
    );
  }

  /**
   * Issue a warning to a user
   */
  @Post('users/:userId/warn')
  @HttpCode(HttpStatus.OK)
  async warnUser(
    @Param('userId') userId: string,
    @Body() body: { moderatorId: string; reason: string },
  ) {
    await this.reputationService.recordWarning(userId, body.moderatorId, body.reason);
    return { success: true, userId, action: 'warning' };
  }

  /**
   * Ban a user
   */
  @Post('users/:userId/ban')
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Param('userId') userId: string,
    @Body() body: { moderatorId: string; reason: string; duration?: number },
  ) {
    await this.reputationService.recordBan(userId, body.moderatorId, body.reason, body.duration);
    return { success: true, userId, action: 'ban' };
  }

  /**
   * Bulk block users
   */
  @Post('blocks/bulk')
  @HttpCode(HttpStatus.OK)
  async bulkBlockUsers(
    @Body() body: { userIds: string[]; reason: string; moderatorId: string },
  ) {
    return this.adminService.bulkBlockUsers(body.userIds, body.reason, body.moderatorId);
  }

  // ========================================
  // FRAUD DETECTION
  // ========================================

  /**
   * Get list of suspicious users
   */
  @Get('fraud/suspicious-users')
  async getSuspiciousUsers(@Query('limit') limit?: string) {
    return this.adminService.getSuspiciousUsers(parseInt(limit || '50', 10));
  }

  // ========================================
  // ANALYTICS
  // ========================================

  /**
   * Get match analytics for a date range
   */
  @Get('analytics/matches')
  async getMatchAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.matchesService.getAnalytics(
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * Get trend analysis comparing two periods
   */
  @Get('analytics/trends')
  async getTrendAnalysis(
    @Query('currentStart') currentStart: string,
    @Query('currentEnd') currentEnd: string,
    @Query('previousStart') previousStart: string,
    @Query('previousEnd') previousEnd: string,
  ) {
    return this.matchesService.getTrendAnalysis(
      new Date(currentStart),
      new Date(currentEnd),
      new Date(previousStart),
      new Date(previousEnd),
    );
  }

  /**
   * Get daily match counts for charting
   */
  @Get('analytics/daily')
  async getDailyMatchCounts(@Query('days') days?: string) {
    return this.matchesService.getDailyMatchCounts(parseInt(days || '30', 10));
  }

  /**
   * Get peak hours analysis
   */
  @Get('analytics/peak-hours')
  async getPeakHours(@Query('days') days?: string) {
    return this.matchesService.getPeakHours(parseInt(days || '7', 10));
  }

  /**
   * Get reputation leaderboard
   */
  @Get('analytics/leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    return this.reputationService.getLeaderboard(parseInt(limit || '100', 10));
  }

  // ========================================
  // SYSTEM OPERATIONS
  // ========================================

  /**
   * Emergency reset of matchmaking queue
   * Use with extreme caution - disconnects all queued users
   */
  @Post('system/reset-queue')
  @HttpCode(HttpStatus.OK)
  async resetMatchmakingQueue(@Body() body: { moderatorId: string; reason: string }) {
    await this.adminService.resetMatchmakingQueue(body.moderatorId);
    return {
      success: true,
      action: 'queue_reset',
      timestamp: new Date().toISOString(),
    };
  }
}
