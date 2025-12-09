import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService, AuthTokens } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';
import { GenerateTokenDto } from './dto/generate-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Generate a new JWT token for a device.
   * RATE LIMITED: Max 5 requests per minute per IP to prevent abuse.
   * This endpoint is public but heavily rate-limited.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute max
  @Post('token')
  async generateToken(@Body() body: GenerateTokenDto): Promise<AuthTokens> {
    return this.authService.generateToken(body.deviceId);
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
