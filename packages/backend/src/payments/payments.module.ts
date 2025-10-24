import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { LoggerModule } from '../services/logger.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    LoggerModule,
    UsersModule,
    SubscriptionsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

