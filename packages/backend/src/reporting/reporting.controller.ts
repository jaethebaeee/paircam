import { Controller, Post, Get, Body, UseGuards, Req, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ReportingService, ReportData } from './reporting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SubmitReportDto } from './dto/submit-report.dto';
import { ModerateReportDto } from './dto/moderate-report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // Any authenticated user can submit a report
  @Post()
  async submitReport(@Body() body: SubmitReportDto, @Req() req: { user: { deviceId: string } }): Promise<{ reportId: string }> {
    const reporterId = req.user.deviceId;

    const reportData: ReportData = {
      reporterId,
      reportedPeerId: body.reportedPeerId,
      sessionId: body.sessionId,
      reason: body.reason,
      comment: body.comment,
      timestamp: Date.now(),
    };

    const reportId = await this.reportingService.submitReport(reportData);
    return { reportId };
  }

  // Only moderators and admins can view reports
  @UseGuards(RolesGuard)
  @Roles('moderator', 'admin')
  @Get('next')
  async getNextReport() {
    return await this.reportingService.getNextReport();
  }

  // Only moderators and admins can view all reports
  @UseGuards(RolesGuard)
  @Roles('moderator', 'admin')
  @Get()
  async getAllReports(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    // Enforce max limit of 100
    const safeLimit = Math.min(Math.max(1, limit), 100);
    return await this.reportingService.getAllReports(safeLimit);
  }

  // Only moderators and admins can moderate reports
  @UseGuards(RolesGuard)
  @Roles('moderator', 'admin')
  @Post('moderate')
  async moderateReport(@Body() body: ModerateReportDto, @Req() req: { user: { deviceId: string } }) {
    const moderatorId = req.user.deviceId;
    await this.reportingService.moderateReport(body.reportId, moderatorId, body.decision);
    return { success: true };
  }

  // Only moderators and admins can view stats
  @UseGuards(RolesGuard)
  @Roles('moderator', 'admin')
  @Get('stats')
  async getReportStats() {
    return await this.reportingService.getReportStats();
  }
}
