import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { LoggerModule } from '../services/logger.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { StripeProvider } from './stripe';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, WebhookEvent]),
    LoggerModule,
    UsersModule,
    SubscriptionsModule,
  ],
  controllers: [PaymentsController],
  providers: [StripeProvider, PaymentsService],
  exports: [PaymentsService, StripeProvider],
})
export class PaymentsModule {}

