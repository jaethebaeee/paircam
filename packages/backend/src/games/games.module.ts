import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameSession } from './entities/game-session.entity';
import { GamesGateway } from './games.gateway';
import { GamesController } from './games.controller';
import { TriviaService } from './services/trivia.service';
import { OpenTriviaDatabaseService } from './services/open-trivia-db.service';
import { GameAnalyticsService } from './services/game-analytics.service';
import { PremiumFeaturesService } from './services/premium-features.service';
import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';
import { LoggerModule } from '../services/logger.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameSession, User]),
    RedisModule,
    forwardRef(() => UsersModule),
    LoggerModule,
  ],
  providers: [
    GamesGateway,
    TriviaService,
    OpenTriviaDatabaseService,
    GameAnalyticsService,
    PremiumFeaturesService,
  ],
  controllers: [GamesController],
  exports: [TriviaService, GameAnalyticsService, OpenTriviaDatabaseService, PremiumFeaturesService],
})
export class GamesModule {}
