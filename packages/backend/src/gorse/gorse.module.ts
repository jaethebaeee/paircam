import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GorseService } from './gorse.service';
import { GorseController } from './gorse.controller';
import { FeedbackModule } from '../feedback/feedback.module';

@Module({
  imports: [
    HttpModule,
    FeedbackModule,
  ],
  providers: [GorseService],
  controllers: [GorseController],
  exports: [GorseService],
})
export class GorseModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly gorseService: GorseService) {}

  async onModuleInit() {
    // Start periodic sync of feedback to Gorse when app starts
    await this.gorseService.startPeriodicSync();
  }

  async onModuleDestroy() {
    // Clean up periodic sync when app shuts down
    await this.gorseService.stopPeriodicSync();
  }
}
