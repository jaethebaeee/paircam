import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { RedisService } from '../redis/redis.service';
import { RedisPubSubService } from '../redis/redis-pubsub.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly redisService: RedisService,
    private readonly redisPubSub: RedisPubSubService,
  ) {}

  @Public()
  @Get()
  async getHealth() {
    const redisHealthy = this.redisService.getClient().isReady;
    const pubSubHealthy = this.redisPubSub.isHealthy();
    const pubSubStats = await this.redisPubSub.getStats();

    return {
      status: (redisHealthy && pubSubHealthy) ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        redis: redisHealthy ? 'up' : 'down',
        pubsub: pubSubHealthy ? 'up' : 'down',
      },
      instance: {
        id: pubSubStats.instanceId,
        subscribedChannels: pubSubStats.subscribedChannels,
        totalHandlers: pubSubStats.totalHandlers,
      },
    };
  }

  @Public()
  @Get('ready')
  async getReadiness() {
    const redisReady = this.redisService.getClient().isReady;
    const pubSubReady = this.redisPubSub.isHealthy();

    return {
      status: (redisReady && pubSubReady) ? 'ready' : 'not-ready',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisReady,
        pubsub: pubSubReady,
      },
    };
  }
}
