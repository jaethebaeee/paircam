import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Req() req: { user: { deviceId: string } }) {
    const result = await this.usersService.getUserWithPremiumStatus(req.user.deviceId);
    if (!result) {
      return { error: 'User not found' };
    }

    const { user, isPremium } = result;
    
    // Don't expose sensitive fields
    const { subscriptions, ...userProfile } = user;
    
    return {
      ...userProfile,
      isPremium,
    };
  }

  @Put('me')
  async updateProfile(
    @Req() req: { user: { deviceId: string } },
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(req.user.deviceId, updateProfileDto);
    const isPremium = await this.usersService.isPremium(user.id);
    
    // Don't expose sensitive fields
    const { subscriptions, ...userProfile } = user;
    
    return {
      ...userProfile,
      isPremium,
    };
  }

  @Get('premium-status')
  async getPremiumStatus(@Req() req: { user: { deviceId: string } }) {
    const user = await this.usersService.findByDeviceId(req.user.deviceId);
    if (!user) {
      return { isPremium: false };
    }

    const isPremium = await this.usersService.isPremium(user.id);
    return { isPremium };
  }
}

