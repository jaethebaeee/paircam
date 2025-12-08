import { Module, forwardRef } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { MatchmakingService } from './matchmaking.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { BlockingModule } from '../blocking/blocking.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => AnalyticsModule), // 🆕 Analytics for match quality tracking
    forwardRef(() => BlockingModule), // User blocking for matchmaking
    UsersModule,
  ],
  providers: [SignalingGateway, MatchmakingService],
  exports: [SignalingGateway, MatchmakingService],
})
export class SignalingModule {}
