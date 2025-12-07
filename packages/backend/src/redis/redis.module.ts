import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisPubSubService } from './redis-pubsub.service';
import { LoggerModule } from '../services/logger.module';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [RedisService, RedisPubSubService],
  exports: [RedisService, RedisPubSubService],
})
export class RedisModule {}
