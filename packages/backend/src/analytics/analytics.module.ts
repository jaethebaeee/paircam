import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchAnalyticsService } from './match-analytics.service';
import { CallHistoryService } from './call-history.service';
import { AnalyticsController } from './analytics.controller';
import { CallHistory } from './entities/call-history.entity';
import { RedisModule } from '../redis/redis.module';
import { LoggerModule } from '../services/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallHistory]),
    RedisModule,
    LoggerModule,
  ],
  providers: [MatchAnalyticsService, CallHistoryService],
  controllers: [AnalyticsController],
  exports: [MatchAnalyticsService, CallHistoryService],
})
export class AnalyticsModule {}

