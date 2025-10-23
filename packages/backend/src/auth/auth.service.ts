import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoggerService } from '../services/logger.service';
import { env } from '../env';

export interface JwtPayload {
  sub: string;
  deviceId: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
  ) {}

  async generateToken(deviceId: string): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: deviceId,
      deviceId,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    
    this.logger.debug('Generated JWT token', { deviceId });

    return {
      accessToken,
      expiresIn: env.JWT_EXPIRATION,
    };
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch (error) {
      this.logger.warn('Invalid JWT token', { error: error.message });
      throw new UnauthorizedException('Invalid token');
    }
  }

  async refreshToken(deviceId: string): Promise<AuthTokens> {
    return this.generateToken(deviceId);
  }

  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
