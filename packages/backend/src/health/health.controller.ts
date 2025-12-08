import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../auth/public.decorator';
import { RedisService } from '../redis/redis.service';
import { RedisPubSubService } from '../redis/redis-pubsub.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly redisService: RedisService,
    private readonly redisPubSub: RedisPubSubService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Check if database is healthy
   */
  private async checkDatabase(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  @Public()
  @Get()
  async getHealth() {
    const redisHealthy = this.redisService.getClient().isReady;
    const pubSubHealthy = this.redisPubSub.isHealthy();
    const pubSubStats = await this.redisPubSub.getStats();
    const dbHealth = await this.checkDatabase();

    const allHealthy = redisHealthy && pubSubHealthy && dbHealth.healthy;

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        redis: redisHealthy ? 'up' : 'down',
        pubsub: pubSubHealthy ? 'up' : 'down',
        database: dbHealth.healthy ? 'up' : 'down',
      },
      database: {
        connected: dbHealth.healthy,
        latencyMs: dbHealth.latency,
        error: dbHealth.error,
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
    const dbHealth = await this.checkDatabase();

    const allReady = redisReady && pubSubReady && dbHealth.healthy;

    return {
      status: allReady ? 'ready' : 'not-ready',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisReady,
        pubsub: pubSubReady,
        database: dbHealth.healthy,
      },
    };
  }

  @Public()
  @Get('live')
  async getLiveness() {
    // Simple liveness check - just confirms the process is running
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      pid: process.pid,
    };
  }
}
