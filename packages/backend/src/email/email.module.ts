import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { LoggerService } from '../services/logger.service';

@Global()
@Module({
  providers: [EmailService, LoggerService],
  exports: [EmailService],
})
export class EmailModule {}
