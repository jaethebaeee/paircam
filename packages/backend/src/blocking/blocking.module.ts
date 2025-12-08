import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockingController } from './blocking.controller';
import { BlockingService } from './blocking.service';
import { BlockedUser } from './entities/blocked-user.entity';
import { User } from '../users/entities/user.entity';
import { RedisModule } from '../redis/redis.module';
import { LoggerModule } from '../services/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockedUser, User]),
    RedisModule,
    LoggerModule,
  ],
  controllers: [BlockingController],
  providers: [BlockingService],
  exports: [BlockingService],
})
export class BlockingModule {}
