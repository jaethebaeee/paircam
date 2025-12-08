import { Module, forwardRef } from '@nestjs/common';
import { FraudDetectionService } from './fraud-detection.service';
import { RedisModule } from '../redis/redis.module';
import { ReputationModule } from '../reputation/reputation.module';

@Module({
  imports: [
    forwardRef(() => RedisModule),
    forwardRef(() => ReputationModule),
  ],
  providers: [FraudDetectionService],
  exports: [FraudDetectionService],
})
export class FraudModule {}
