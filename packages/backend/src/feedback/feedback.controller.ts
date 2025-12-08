import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { FeedbackService, SubmitFeedbackDto } from './feedback.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Submit feedback for a match
   * POST /api/feedback
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async submitFeedback(@Body() data: SubmitFeedbackDto, @Req() req: any) {
    // Extract user ID from JWT token
    const userId = req.user?.userId || req.user?.sub;

    // Ensure user ID matches the feedback data
    if (userId !== data.userId) {
      throw new Error('Unauthorized: userId mismatch');
    }

    return await this.feedbackService.submitFeedback(data);
  }

  /**
   * Get feedback stats for authenticated user
   * GET /api/feedback/me/stats
   */
  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  async getUserStats(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return await this.feedbackService.getUserFeedbackStats(userId);
  }

  /**
   * Get feedback stats for a specific user
   * GET /api/feedback/:userId/stats
   */
  @Get(':userId/stats')
  async getUserStatsPublic(@Param('userId') userId: string) {
    return await this.feedbackService.getUserFeedbackStats(userId);
  }

  /**
   * Get global feedback statistics
   * GET /api/feedback/stats/global
   */
  @Get('stats/global')
  async getGlobalStats() {
    return await this.feedbackService.getGlobalFeedbackStats();
  }

  /**
   * Get feedback correlation analysis
   * GET /api/feedback/analysis/correlations
   */
  @Get('analysis/correlations')
  async getCorrelations() {
    return await this.feedbackService.analyzeFeedbackCorrelations();
  }
}
