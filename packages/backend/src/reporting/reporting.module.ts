import { Module, forwardRef } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ReputationModule } from '../reputation/reputation.module';
import { ModeratorGuard } from '../auth/moderator.guard';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    forwardRef(() => ReputationModule), // Reputation integration for report impact
  ],
  providers: [ReportingService, ModeratorGuard],
  controllers: [ReportingController],
  exports: [ReportingService],
})
export class ReportingModule {}
