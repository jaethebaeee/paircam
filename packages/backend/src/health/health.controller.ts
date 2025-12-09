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
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Public()
  @Get()
  async getHealth() {
    const redisHealthy = this.redisService.getClient().isReady;
    const pubSubHealthy = this.redisPubSub.isHealthy();
    const pubSubStats = await this.redisPubSub.getStats();

    // Check PostgreSQL connection
    let postgresHealthy = false;
    try {
      await this.dataSource.query('SELECT 1');
      postgresHealthy = true;
    } catch {
      postgresHealthy = false;
    }

    const allHealthy = redisHealthy && pubSubHealthy && postgresHealthy;

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        postgres: postgresHealthy ? 'up' : 'down',
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

    // Check PostgreSQL connection
    let postgresReady = false;
    try {
      await this.dataSource.query('SELECT 1');
      postgresReady = true;
    } catch {
      postgresReady = false;
    }

    const allReady = redisReady && pubSubReady && postgresReady;

    return {
      status: allReady ? 'ready' : 'not-ready',
      timestamp: new Date().toISOString(),
      services: {
        postgres: postgresReady,
        redis: redisReady,
        pubsub: pubSubReady,
      },
    };
  }
}
