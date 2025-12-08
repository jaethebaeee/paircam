import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerModule } from './services/logger.module';
import { AuthModule } from './auth/auth.module';
import { SignalingModule } from './signaling/signaling.module';
import { RedisModule } from './redis/redis.module';
import { TurnModule } from './turn/turn.module';
import { ReportingModule } from './reporting/reporting.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UsersModule } from './users/users.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { HealthController } from './health/health.controller';
import { env } from './env';

// Import entities
import { User } from './users/entities/user.entity';
import { Subscription } from './subscriptions/entities/subscription.entity';
import { Payment } from './payments/entities/payment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => env],
    }),
    // TypeORM Configuration
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: env.DATABASE_URL,
      entities: [User, Subscription, Payment],
      synchronize: env.NODE_ENV === 'development', // Auto-create tables in dev only
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
    }),
    LoggerModule,
    RedisModule,
    AuthModule,
    UsersModule,
    SubscriptionsModule,
    PaymentsModule,
    AnalyticsModule,
    SignalingModule,
    TurnModule,
    ReportingModule,
    MonitoringModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
