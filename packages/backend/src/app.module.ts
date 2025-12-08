import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { LoggerModule } from './services/logger.module';
import { AuthModule } from './auth/auth.module';
import { SignalingModule } from './signaling/signaling.module';
import { RedisModule } from './redis/redis.module';
import { TurnModule } from './turn/turn.module';
import { ReportingModule } from './reporting/reporting.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UsersModule } from './users/users.module';
import { FriendsModule } from './friends/friends.module'; // 🆕 Friends & Social
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { BlockingModule } from './blocking/blocking.module';
import { MatchesModule } from './matches/matches.module';
import { ReputationModule } from './reputation/reputation.module';
import { AdminModule } from './admin/admin.module'; // 🆕 Admin dashboard & moderation
import { FraudModule } from './fraud/fraud.module'; // 🆕 Fraud detection
import { HealthController } from './health/health.controller';
import { env } from './env';

// Import entities
import { User } from './users/entities/user.entity';
import { Subscription } from './subscriptions/entities/subscription.entity';
import { Payment } from './payments/entities/payment.entity';
import { BlockedUser } from './blocking/entities/blocked-user.entity';
import { Match } from './matches/entities/match.entity';
import { UserReputation } from './reputation/entities/user-reputation.entity';
import { ReputationEvent } from './reputation/entities/reputation-event.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => env],
    }),
    ScheduleModule.forRoot(), // Enable scheduled tasks/cron jobs
    // TypeORM Configuration
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: env.DATABASE_URL,
      entities: [User, Subscription, Payment, BlockedUser, Match, UserReputation, ReputationEvent],
      synchronize: env.NODE_ENV === 'development', // Auto-create tables in dev only
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
    }),
    LoggerModule,
    RedisModule,
    AuthModule,
    UsersModule,
    FriendsModule, // 🆕 Friends & Social
    SubscriptionsModule,
    PaymentsModule,
    BlockingModule,
    MatchesModule, // 🆕 Match persistence for analytics
    ReputationModule, // 🆕 Reputation persistence for long-term tracking
    AdminModule, // 🆕 Admin dashboard & moderation tools
    FraudModule, // 🆕 Fraud detection & prevention
    AnalyticsModule,
    SignalingModule,
    TurnModule,
    ReportingModule,
    MonitoringModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
