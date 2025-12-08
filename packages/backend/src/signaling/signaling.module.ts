import { Module, forwardRef } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { MatchmakingService } from './matchmaking.service';
import { FastMatchService } from './fast-match.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => AnalyticsModule), // 🆕 Analytics for match quality tracking
    UsersModule,
  ],
  providers: [SignalingGateway, MatchmakingService, FastMatchService],
  exports: [SignalingGateway, MatchmakingService, FastMatchService],
})
export class SignalingModule {}
