import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

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
import { HealthController } from './health/health.controller';
import { env } from './env';

// Import entities
import { User } from './users/entities/user.entity';
import { Subscription } from './subscriptions/entities/subscription.entity';
import { Payment } from './payments/entities/payment.entity';
import { BlockedUser } from './blocking/entities/blocked-user.entity';
import { FriendRequest } from './friends/entities/friend-request.entity';
import { Friendship } from './friends/entities/friendship.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => env],
    }),
    // Rate Limiting - Global throttler for all endpoints
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,   // 1 second
      limit: 10,   // 10 requests per second max
    }, {
      name: 'medium',
      ttl: 10000,  // 10 seconds
      limit: 50,   // 50 requests per 10 seconds
    }, {
      name: 'long',
      ttl: 60000,  // 1 minute
      limit: 200,  // 200 requests per minute
    }]),
    // TypeORM Configuration
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: env.DATABASE_URL,
      entities: [User, Subscription, Payment, BlockedUser, FriendRequest, Friendship],
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
    AnalyticsModule,
    SignalingModule,
    TurnModule,
    ReportingModule,
    MonitoringModule,
  ],
  controllers: [HealthController],
  providers: [
    // Apply rate limiting globally to all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
