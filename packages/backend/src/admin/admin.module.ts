import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ReportingModule } from '../reporting/reporting.module';
import { MatchesModule } from '../matches/matches.module';
import { ReputationModule } from '../reputation/reputation.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SignalingModule } from '../signaling/signaling.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => ReportingModule),
    forwardRef(() => MatchesModule),
    forwardRef(() => ReputationModule),
    forwardRef(() => AnalyticsModule),
    forwardRef(() => SignalingModule),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
