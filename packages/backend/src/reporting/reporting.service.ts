import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../services/logger.service';
import { ReputationService } from '../reputation/reputation.service';
import { v4 as uuidv4 } from 'uuid';

export interface ReportData {
  reporterId: string;
  reportedPeerId: string;
  sessionId: string;
  reason: string;
  comment?: string;
  timestamp: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface Report {
  id: string;
  reporterId: string;
  reportedPeerId: string;
  sessionId: string;
  reason: string;
  comment?: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'appealed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  moderatorId?: string;
  moderatedAt?: number;
  appealReason?: string;
  appealedAt?: number;
  appealDecision?: 'upheld' | 'overturned';
  appealDecidedAt?: number;
}

export interface ModerationAuditLog {
  id: string;
  reportId: string;
  action: 'accepted' | 'rejected' | 'appeal_upheld' | 'appeal_overturned';
  moderatorId: string;
  timestamp: number;
  notes?: string;
  previousStatus: string;
  newStatus: string;
}

@Injectable()
export class ReportingService {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    @Inject(forwardRef(() => ReputationService))
    private readonly reputationService: ReputationService,
  ) {}

  async submitReport(reportData: ReportData): Promise<string> {
    const reportId = uuidv4();

    // Determine severity based on reason if not provided
    const severity = reportData.severity || this.determineSeverity(reportData.reason);

    const report: Report = {
      id: reportId,
      ...reportData,
      severity,
      status: 'pending',
    };

    // Add to reports queue
    await this.redisService.addReport(reportId, report);

    // Track reports against this device for fraud detection
    await this.redisService.incrementCounter(`reports:against:${reportData.reportedPeerId}`);

    // Track analytics
    await this.redisService.incrementCounter('reports:submitted');
    await this.redisService.incrementCounter(`reports:reason:${reportData.reason}`);
    await this.redisService.incrementCounter(`reports:severity:${severity}`);

    // Check for serial abuser (5+ reports in 7 days)
    const reportCount = await this.redisService.getCounter(`reports:against:${reportData.reportedPeerId}`);
    if (reportCount >= 5) {
      await this.redisService.flagSuspiciousUser(
        reportData.reportedPeerId,
        `serial_abuse:${reportCount}_reports`
      );
      this.logger.warn('Serial abuser detected', {
        reportedPeerId: reportData.reportedPeerId,
        reportCount,
      });
    }

    this.logger.log('Report submitted', {
      reportId,
      reporterId: reportData.reporterId,
      reportedPeerId: reportData.reportedPeerId,
      reason: reportData.reason,
      severity,
    });

    return reportId;
  }

  /**
   * Determine severity based on report reason
   */
  private determineSeverity(reason: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'spam': 'low',
      'other': 'low',
      'inappropriate_behavior': 'medium',
      'harassment': 'high',
      'inappropriate_content': 'high',
      'threats': 'critical',
      'illegal_content': 'critical',
      'child_safety': 'critical',
    };
    return severityMap[reason] || 'medium';
  }

  async getNextReport(): Promise<Report | null> {
    const reportId = await this.redisService.getNextReport();
    if (!reportId) {
      return null;
    }

    return await this.redisService.getReport<Report>(reportId);
  }

  async getReport(reportId: string): Promise<Report | null> {
    return await this.redisService.getReport<Report>(reportId);
  }

  async getAllReports(limit = 50): Promise<Report[]> {
    const reportIds = await this.redisService.getClient().lRange('reports:queue', 0, limit - 1);
    const reports: Report[] = [];

    for (const reportId of reportIds) {
      const report = await this.redisService.getReport<Report>(reportId);
      if (report) {
        reports.push(report);
      }
    }

    return reports;
  }

  async moderateReport(
    reportId: string,
    moderatorId: string,
    decision: 'accepted' | 'rejected',
    notes?: string,
  ): Promise<void> {
    const report = await this.redisService.getReport<Report>(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const previousStatus = report.status;
    const updatedReport: Report = {
      ...report,
      status: decision,
      moderatorId,
      moderatedAt: Date.now(),
    };

    // Update report
    await this.redisService.getClient().setEx(
      `report:${reportId}`,
      86400 * 7, // 7 days retention
      JSON.stringify(updatedReport)
    );

    // Create audit log entry
    await this.createAuditLog({
      reportId,
      action: decision,
      moderatorId,
      notes,
      previousStatus,
      newStatus: decision,
    });

    // If accepted, apply consequences
    if (decision === 'accepted') {
      // Add to block list
      await this.redisService.addToBlockList(
        'device',
        report.reportedPeerId,
        `Reported for: ${report.reason}`
      );

      // Update reputation - this is the key integration
      try {
        await this.reputationService.recordReportReceived(
          report.reportedPeerId,
          report.sessionId,
          report.reporterId,
          report.reason,
        );
      } catch (error) {
        this.logger.error('Failed to update reputation for report', error.stack, {
          reportId,
          reportedPeerId: report.reportedPeerId,
        });
      }

      // Track analytics
      await this.redisService.incrementCounter('reports:accepted');
      await this.redisService.incrementCounter('blocks:created');
      await this.redisService.incrementCounter(`reports:accepted:${report.severity}`);
    } else {
      await this.redisService.incrementCounter('reports:rejected');
    }

    // Track moderator performance
    await this.redisService.incrementCounter(`moderator:${moderatorId}:${decision}`);

    this.logger.log('Report moderated', {
      reportId,
      moderatorId,
      decision,
      reportedPeerId: report.reportedPeerId,
      severity: report.severity,
    });
  }

  /**
   * Submit an appeal for a rejected user
   */
  async submitAppeal(
    reportId: string,
    appealReason: string,
  ): Promise<void> {
    const report = await this.redisService.getReport<Report>(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== 'accepted') {
      throw new Error('Can only appeal accepted reports');
    }

    const updatedReport: Report = {
      ...report,
      status: 'appealed',
      appealReason,
      appealedAt: Date.now(),
    };

    await this.redisService.getClient().setEx(
      `report:${reportId}`,
      86400 * 30, // 30 days for appeals
      JSON.stringify(updatedReport)
    );

    // Add to appeals queue
    await this.redisService.getClient().lPush('reports:appeals', reportId);

    await this.redisService.incrementCounter('reports:appealed');

    this.logger.log('Appeal submitted', {
      reportId,
      reportedPeerId: report.reportedPeerId,
    });
  }

  /**
   * Decide on an appeal
   */
  async decideAppeal(
    reportId: string,
    moderatorId: string,
    decision: 'upheld' | 'overturned',
    notes?: string,
  ): Promise<void> {
    const report = await this.redisService.getReport<Report>(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== 'appealed') {
      throw new Error('Report is not in appeal status');
    }

    const previousStatus = report.status;
    const newStatus = decision === 'upheld' ? 'accepted' : 'rejected';

    const updatedReport: Report = {
      ...report,
      status: newStatus,
      appealDecision: decision,
      appealDecidedAt: Date.now(),
    };

    await this.redisService.getClient().setEx(
      `report:${reportId}`,
      86400 * 30,
      JSON.stringify(updatedReport)
    );

    // Create audit log
    await this.createAuditLog({
      reportId,
      action: decision === 'upheld' ? 'appeal_upheld' : 'appeal_overturned',
      moderatorId,
      notes,
      previousStatus,
      newStatus,
    });

    // If overturned, remove from blocklist and restore reputation
    if (decision === 'overturned') {
      // Note: Would need to implement removeFromBlockList in RedisService
      this.logger.log('Appeal overturned - user should be unblocked', {
        reportId,
        reportedPeerId: report.reportedPeerId,
      });

      await this.redisService.incrementCounter('reports:appeals:overturned');
    } else {
      await this.redisService.incrementCounter('reports:appeals:upheld');
    }

    this.logger.log('Appeal decided', {
      reportId,
      moderatorId,
      decision,
      reportedPeerId: report.reportedPeerId,
    });
  }

  /**
   * Get pending appeals
   */
  async getPendingAppeals(limit = 50): Promise<Report[]> {
    const reportIds = await this.redisService.getClient().lRange('reports:appeals', 0, limit - 1);
    const reports: Report[] = [];

    for (const reportId of reportIds) {
      const report = await this.redisService.getReport<Report>(reportId);
      if (report && report.status === 'appealed') {
        reports.push(report);
      }
    }

    return reports;
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(data: Omit<ModerationAuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditLog: ModerationAuditLog = {
      id: uuidv4(),
      ...data,
      timestamp: Date.now(),
    };

    // Store audit log (keep for 90 days)
    await this.redisService.getClient().setEx(
      `audit:${auditLog.id}`,
      86400 * 90,
      JSON.stringify(auditLog)
    );

    // Add to audit log list for the report
    await this.redisService.getClient().lPush(`audit:report:${data.reportId}`, auditLog.id);
  }

  /**
   * Get audit log for a report
   */
  async getReportAuditLog(reportId: string): Promise<ModerationAuditLog[]> {
    const auditIds = await this.redisService.getClient().lRange(`audit:report:${reportId}`, 0, -1);
    const auditLogs: ModerationAuditLog[] = [];

    for (const auditId of auditIds) {
      const data = await this.redisService.getClient().get(`audit:${auditId}`);
      if (data) {
        try {
          auditLogs.push(JSON.parse(data));
        } catch {
          // Skip invalid
        }
      }
    }

    return auditLogs.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getReportStats(): Promise<{
    totalReports: number;
    pendingReports: number;
    acceptedReports: number;
    rejectedReports: number;
    reportsByReason: Record<string, number>;
  }> {
    const totalReports = await this.redisService.getCounter('reports:submitted');
    const acceptedReports = await this.redisService.getCounter('reports:accepted');
    const rejectedReports = await this.redisService.getCounter('reports:rejected');
    const pendingReports = totalReports - acceptedReports - rejectedReports;

    // Get reports by reason (this would need to be implemented with Redis sets)
    const reportsByReason: Record<string, number> = {};
    const reasons = ['harassment', 'inappropriate_content', 'spam', 'other'];
    
    for (const reason of reasons) {
      reportsByReason[reason] = await this.redisService.getCounter(`reports:reason:${reason}`);
    }

    return {
      totalReports,
      pendingReports,
      acceptedReports,
      rejectedReports,
      reportsByReason,
    };
  }

  async detectAbusePatterns(deviceId: string): Promise<{
    isAbusive: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    // Check if device is already blocked
    const isBlocked = await this.redisService.isBlocked('device', deviceId);
    if (isBlocked) {
      reasons.push('device_blocked');
    }

    // Check rate limiting
    const rateLimitKey = `ratelimit:device:${deviceId}`;
    const callCount = await this.redisService.getRateLimit(rateLimitKey);
    if (callCount > 20) { // More than 20 calls per minute
      reasons.push('excessive_calls');
    }

    // Check report history (would need to implement report tracking per device)
    const reportCount = await this.redisService.getCounter(`reports:against:${deviceId}`);
    if (reportCount > 3) { // More than 3 reports against this device
      reasons.push('multiple_reports');
    }

    return {
      isAbusive: reasons.length > 0,
      reasons,
    };
  }
}
