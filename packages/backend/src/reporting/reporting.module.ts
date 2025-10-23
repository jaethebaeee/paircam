import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [ReportingService],
  controllers: [ReportingController],
  exports: [ReportingService],
})
export class ReportingModule {}
