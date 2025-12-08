import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameSession } from './entities/game-session.entity';
import { GamesGateway } from './games.gateway';
import { TriviaService } from './services/trivia.service';
import { OpenTriviaDatabaseService } from './services/open-trivia-db.service';
import { GameAnalyticsService } from './services/game-analytics.service';
import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';
import { LoggerModule } from '../services/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameSession]),
    RedisModule,
    forwardRef(() => UsersModule),
    LoggerModule,
  ],
  providers: [
    GamesGateway,
    TriviaService,
    OpenTriviaDatabaseService,
    GameAnalyticsService,
  ],
  exports: [TriviaService, GameAnalyticsService, OpenTriviaDatabaseService],
})
export class GamesModule {}
