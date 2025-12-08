import { Module, forwardRef } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { MatchmakingService } from './matchmaking.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => AnalyticsModule),
    UsersModule,
    SubscriptionsModule, // For premium skip limits
  ],
  providers: [SignalingGateway, MatchmakingService],
  exports: [SignalingGateway, MatchmakingService],
})
export class SignalingModule {}
