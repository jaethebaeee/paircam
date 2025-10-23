import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LoggerModule } from './services/logger.module';
import { AuthModule } from './auth/auth.module';
import { SignalingModule } from './signaling/signaling.module';
import { RedisModule } from './redis/redis.module';
import { TurnModule } from './turn/turn.module';
import { ReportingModule } from './reporting/reporting.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { HealthController } from './health/health.controller';
import { env } from './env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => env],
    }),
    LoggerModule,
    RedisModule,
    AuthModule, // AuthModule already provides JwtModule and PassportModule globally
    SignalingModule,
    TurnModule,
    ReportingModule,
    MonitoringModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
