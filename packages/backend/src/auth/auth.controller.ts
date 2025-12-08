import { Controller, Post, Body, Get, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthService, AuthTokens } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { LinkAccountDto } from './dto/link-account.dto';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
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

  @UseGuards(JwtAuthGuard)
  @Post('link-account')
  async linkAccount(
    @Req() req: { user: { deviceId: string } },
    @Body() linkAccountDto: LinkAccountDto,
  ): Promise<{ success: boolean; email: string }> {
    const deviceId = req.user.deviceId;

    if (linkAccountDto.provider === 'google') {
      const user = await this.usersService.linkGoogleAccount(deviceId, {
        googleId: linkAccountDto.providerId,
        email: linkAccountDto.email,
        name: linkAccountDto.name,
        avatarUrl: linkAccountDto.avatarUrl,
      });

      return {
        success: true,
        email: user.email,
      };
    }

    // Other providers can be added here
    return { success: false, email: '' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('unlink-account')
  async unlinkAccount(
    @Req() req: { user: { deviceId: string } },
    @Body() body: { provider: string },
  ): Promise<{ success: boolean }> {
    const deviceId = req.user.deviceId;

    if (body.provider === 'google') {
      await this.usersService.unlinkGoogleAccount(deviceId);
      return { success: true };
    }

    return { success: false };
  }

  @UseGuards(JwtAuthGuard)
  @Get('linked-accounts')
  async getLinkedAccounts(
    @Req() req: { user: { deviceId: string } },
  ): Promise<{ google: boolean; email?: string; avatarUrl?: string }> {
    const deviceId = req.user.deviceId;
    return this.usersService.getLinkedAccounts(deviceId);
  }
}
