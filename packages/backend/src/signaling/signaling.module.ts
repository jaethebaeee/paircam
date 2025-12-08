import { Module, forwardRef } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { MatchmakingService } from './matchmaking.service';
import { MatchingController } from './matching.controller';
import { MatchOptimizationService } from './match-optimization.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => AnalyticsModule),
    UsersModule,
  ],
  controllers: [MatchingController],
  providers: [SignalingGateway, MatchmakingService, MatchOptimizationService],
  exports: [SignalingGateway, MatchmakingService, MatchOptimizationService],
})
export class SignalingModule {}
