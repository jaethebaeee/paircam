import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoggerService } from '../services/logger.service';
import { UsersService } from '../users/users.service';
import { GoogleUserInfo } from './dto/google-auth.dto';
import { env } from '../env';

export interface JwtPayload {
  sub: string;
  deviceId: string;
  userId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: string;
}

export interface GoogleAuthResult extends AuthTokens {
  user: {
    id: string;
    email: string;
    username?: string;
    avatarUrl?: string;
    isPremium: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
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

  async authenticateWithGoogle(credential: string, deviceId?: string): Promise<GoogleAuthResult> {
    // Verify the Google ID token
    const googleUser = await this.verifyGoogleToken(credential);

    // Find or create user with Google info
    const user = await this.usersService.findOrCreateByGoogle(
      {
        googleId: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
      },
      deviceId,
    );

    // Check premium status
    const isPremium = await this.usersService.isPremium(user.id);

    // Generate JWT token with user's device ID
    const payload: JwtPayload = {
      sub: user.deviceId,
      deviceId: user.deviceId,
      userId: user.id,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    this.logger.log('Google OAuth successful', { userId: user.id, email: googleUser.email });

    return {
      accessToken,
      expiresIn: env.JWT_EXPIRATION,
      user: {
        id: user.id,
        email: user.email!,
        username: user.username,
        avatarUrl: user.avatarUrl,
        isPremium,
      },
    };
  }

  private async verifyGoogleToken(credential: string): Promise<GoogleUserInfo> {
    // Use Google's tokeninfo endpoint to verify the ID token
    // This is simpler than using the google-auth-library and works for our use case
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    if (!response.ok) {
      this.logger.warn('Google token verification failed', { status: response.status });
      throw new UnauthorizedException('Invalid Google token');
    }

    const payload = await response.json() as GoogleUserInfo & { aud?: string };

    // Verify the token was issued for our app
    if (env.GOOGLE_CLIENT_ID && payload.aud !== env.GOOGLE_CLIENT_ID) {
      this.logger.warn('Google token audience mismatch', {
        expected: env.GOOGLE_CLIENT_ID,
        received: payload.aud
      });
      throw new UnauthorizedException('Invalid Google token audience');
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException('Google email not verified');
    }

    return payload;
  }
}
