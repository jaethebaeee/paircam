import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { LoggerService } from '../services/logger.service';
import { UsersService } from '../users/users.service';
import { GoogleUserInfo } from './dto/google-auth.dto';
import { UserRole } from '../users/entities/user.entity';
import { env } from '../env';

export interface JwtPayload {
  sub: string;
  deviceId: string;
  userId?: string;
  role?: UserRole;
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
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {
    // Initialize Google OAuth client
    this.googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }

  async generateToken(deviceId: string): Promise<AuthTokens> {
    // Fetch user to get their role
    const user = await this.usersService.findOrCreate(deviceId);

    const payload: JwtPayload = {
      sub: deviceId,
      deviceId,
      userId: user.id,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    this.logger.debug('Generated JWT token', { deviceId, role: user.role });

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

    // Generate JWT token with user's device ID and role
    const payload: JwtPayload = {
      sub: user.deviceId,
      deviceId: user.deviceId,
      userId: user.id,
      role: user.role,
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
    try {
      // Use official google-auth-library for secure token verification
      // This validates the token signature and expiration cryptographically
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        this.logger.warn('Google token verification returned no payload');
        throw new UnauthorizedException('Invalid Google token');
      }

      // Verify email is verified
      if (!payload.email_verified) {
        this.logger.warn('Google email not verified', { email: payload.email });
        throw new UnauthorizedException('Google email not verified');
      }

      if (!payload.email || !payload.sub) {
        this.logger.warn('Google token missing required fields');
        throw new UnauthorizedException('Invalid Google token: missing required fields');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified,
        name: payload.name || '',
        picture: payload.picture,
        given_name: payload.given_name,
        family_name: payload.family_name,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn('Google token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
