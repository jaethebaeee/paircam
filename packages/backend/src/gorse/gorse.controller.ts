import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { GorseService } from './gorse.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/gorse')
export class GorseController {
  constructor(private readonly gorseService: GorseService) {}

  /**
   * Get Gorse service status
   * GET /api/gorse/status
   */
  @Get('status')
  async getStatus() {
    const health = await this.gorseService.checkGorseHealth();
    const stats = await this.gorseService.getStatus();
    return {
      healthy: health,
      stats,
    };
  }

  /**
   * Get recommendations for authenticated user
   * GET /api/gorse/recommendations
   */
  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  async getRecommendations(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return {
      userId,
      recommendations: await this.gorseService.getRecommendations(userId, 10),
    };
  }

  /**
   * Manually trigger Gorse model training
   * POST /api/gorse/train
   */
  @Post('train')
  async triggerTraining() {
    await this.gorseService.triggerTraining();
    return { message: 'Training triggered' };
  }
}
