import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserReputation } from './entities/user-reputation.entity';
import { ReputationEvent } from './entities/reputation-event.entity';
import { ReputationService } from './reputation.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserReputation, ReputationEvent]),
    forwardRef(() => RedisModule),
  ],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}
