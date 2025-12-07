import { Module } from '@nestjs/common';
import { MatchAnalyticsService } from './match-analytics.service';
import { AnalyticsController } from './analytics.controller';
import { RedisModule } from '../redis/redis.module';
import { LoggerModule } from '../services/logger.module';

@Module({
  imports: [RedisModule, LoggerModule],
  providers: [MatchAnalyticsService],
  controllers: [AnalyticsController],
  exports: [MatchAnalyticsService],
})
export class AnalyticsModule {}

