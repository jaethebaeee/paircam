import { Module, forwardRef } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { MatchmakingService } from './matchmaking.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [SignalingGateway, MatchmakingService],
  exports: [SignalingGateway, MatchmakingService],
})
export class SignalingModule {}
