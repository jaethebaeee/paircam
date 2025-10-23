import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  async getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Public()
  @Get('ready')
  async getReadiness() {
    // In a real implementation, you'd check Redis connectivity here
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}
