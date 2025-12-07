import { Controller, Post, Body, Get, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService, AuthTokens } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';

interface GoogleAuthResponse extends AuthTokens {
  user: {
    id: string;
    email: string;
    username?: string;
    avatarUrl?: string;
    isPremium: boolean;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Rate limit: 5 requests per 60 seconds per IP for token generation
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('token')
  async generateToken(@Body() body: GenerateTokenDto): Promise<AuthTokens> {
    return this.authService.generateToken(body.deviceId);
  }

  // Rate limit: 3 requests per 60 seconds per IP for Google auth (stricter)
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('google')
  async googleAuth(@Body() body: GoogleAuthDto): Promise<GoogleAuthResponse> {
    try {
      return await this.authService.authenticateWithGoogle(body.credential, body.deviceId);
    } catch (error) {
      throw new UnauthorizedException('Invalid Google credentials');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refreshToken(@Req() req: { user: { deviceId: string } }): Promise<AuthTokens> {
    const deviceId = req.user.deviceId;
    return this.authService.refreshToken(deviceId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify')
  async verifyToken(@Req() req: { user: { deviceId: string } }): Promise<{ valid: boolean; deviceId: string }> {
    return {
      valid: true,
      deviceId: req.user.deviceId,
    };
  }
}
