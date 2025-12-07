import { Module, Global, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import { LoggerModule } from '../services/logger.module';
import { env } from '../env';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: env.JWT_EXPIRES_IN },
      global: true,
    }),
    forwardRef(() => UsersModule),
    LoggerModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, JwtStrategy, JwtModule, PassportModule],
})
export class AuthModule {}
