import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { CallRating } from './entities/call-rating.entity';
import { RedisModule } from '../redis/redis.module';
import { LoggerModule } from '../services/logger.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallRating]),
    RedisModule,
    LoggerModule,
    UsersModule,
  ],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
