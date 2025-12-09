import { Module } from '@nestjs/common';
import { ContentScreeningService } from './content-screening.service';
import { RedisModule } from '../redis/redis.module';
import { LoggerModule } from '../services/logger.module';

@Module({
  imports: [RedisModule, LoggerModule],
  providers: [ContentScreeningService],
  exports: [ContentScreeningService],
})
export class ModerationModule {}
