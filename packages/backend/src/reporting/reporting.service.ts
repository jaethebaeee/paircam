import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../services/logger.service';
import { v4 as uuidv4 } from 'uuid';

export interface ReportData {
  reporterId: string;
  reportedPeerId: string;
  sessionId: string;
  reason: string;
  comment?: string;
  timestamp: number;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedPeerId: string;
  sessionId: string;
  reason: string;
  comment?: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected';
  moderatorId?: string;
  moderatedAt?: number;
}

@Injectable()
export class ReportingService {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async submitReport(reportData: ReportData): Promise<string> {
    const reportId = uuidv4();
    const report: Report = {
      id: reportId,
      ...reportData,
      status: 'pending',
    };

    // Add to reports queue
    await this.redisService.addReport(reportId, report);

    // Track analytics
    await this.redisService.incrementCounter('reports:submitted');
    await this.redisService.incrementCounter(`reports:reason:${reportData.reason}`);

    this.logger.log('Report submitted', {
      reportId,
      reporterId: reportData.reporterId,
      reportedPeerId: reportData.reportedPeerId,
      reason: reportData.reason,
    });

    return reportId;
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
  ): Promise<void> {
    const report = await this.redisService.getReport<Report>(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const updatedReport: Report = {
      id: report.id,
      reporterId: report.reporterId,
      reportedPeerId: report.reportedPeerId,
      sessionId: report.sessionId,
      reason: report.reason,
      comment: report.comment,
      timestamp: report.timestamp,
      status: decision,
      moderatorId,
      moderatedAt: Date.now(),
    };

    // Update report
    await this.redisService.getClient().setEx(
      `report:${reportId}`,
      86400, // 24 hours
      JSON.stringify(updatedReport)
    );

    // If accepted, add to block list
    if (decision === 'accepted') {
      await this.redisService.addToBlockList(
        'device',
        report.reportedPeerId,
        `Reported for: ${report.reason}`
      );

      // Track analytics
      await this.redisService.incrementCounter('reports:accepted');
      await this.redisService.incrementCounter('blocks:created');
    } else {
      await this.redisService.incrementCounter('reports:rejected');
    }

    this.logger.log('Report moderated', {
      reportId,
      moderatorId,
      decision,
      reportedPeerId: report.reportedPeerId,
    });
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
