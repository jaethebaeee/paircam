import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { GamesController } from './games.controller';
import { GamesGateway } from './games.gateway';
import {
  GameService,
  WalletService,
  GiftService,
  MissionService,
  LeaderboardService,
} from './services';
import {
  GameSession,
  GameMove,
  UserWallet,
  GiftCatalog,
  GiftTransaction,
  DailyMission,
} from './entities';
import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';
import { env } from '../env';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameSession,
      GameMove,
      UserWallet,
      GiftCatalog,
      GiftTransaction,
      DailyMission,
    ]),
    RedisModule,
    UsersModule,
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: env.JWT_EXPIRES_IN },
    }),
  ],
  controllers: [GamesController],
  providers: [
    GameService,
    WalletService,
    GiftService,
    MissionService,
    LeaderboardService,
    GamesGateway,
  ],
  exports: [
    GameService,
    WalletService,
    GiftService,
    MissionService,
    LeaderboardService,
    GamesGateway,
  ],
})
export class GamesModule {}
