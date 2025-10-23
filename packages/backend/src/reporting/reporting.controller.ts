import { Controller, Post, Get, Body, UseGuards, Req, Query } from '@nestjs/common';
import { ReportingService, ReportData } from './reporting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubmitReportDto } from './dto/submit-report.dto';
import { ModerateReportDto } from './dto/moderate-report.dto';

@Controller('reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Get('next')
  async getNextReport(@Req() _req: { user: { deviceId: string } }) {
    // In a real implementation, you'd check if the user is a moderator
    return await this.reportingService.getNextReport();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllReports(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return await this.reportingService.getAllReports(limitNum);
  }

  @UseGuards(JwtAuthGuard)
  @Post('moderate')
  async moderateReport(@Body() body: ModerateReportDto, @Req() req: { user: { deviceId: string } }) {
    const moderatorId = req.user.deviceId;
    await this.reportingService.moderateReport(body.reportId, moderatorId, body.decision);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getReportStats() {
    return await this.reportingService.getReportStats();
  }
}
