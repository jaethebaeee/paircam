import { Controller, Get, Put, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CallHistoryService } from '../analytics/call-history.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly callHistoryService: CallHistoryService,
  ) {}

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

  @Post('sync')
  async syncUser(
    @Req() req: { user: { deviceId: string } },
    @Body() body: { supabaseUserId?: string; email?: string; name?: string },
  ) {
    const user = await this.usersService.findOrCreate(req.user.deviceId);
    
    // Update user with Supabase info if provided
    if (body.supabaseUserId || body.email || body.name) {
      await this.usersService.updateProfile(req.user.deviceId, {
        email: body.email,
        // Store supabaseUserId in a custom field if needed
        // For now, we'll just update email and name
      });
    }
    
    const isPremium = await this.usersService.isPremium(user.id);
    const { subscriptions, ...userProfile } = user;

    return {
      success: true,
      user: {
        ...userProfile,
        isPremium,
      },
    };
  }

  @Get('me/stats')
  async getUserStats(@Req() req: { user: { deviceId: string } }) {
    const user = await this.usersService.findByDeviceId(req.user.deviceId);
    if (!user) {
      return { error: 'User not found' };
    }

    const stats = await this.callHistoryService.getUserStats(user.id);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('me/call-history')
  async getCallHistory(
    @Req() req: { user: { deviceId: string } },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const user = await this.usersService.findByDeviceId(req.user.deviceId);
    if (!user) {
      return { error: 'User not found' };
    }

    const parsedLimit = Math.min(parseInt(limit || '50', 10), 100);
    const parsedOffset = parseInt(offset || '0', 10);

    const history = await this.callHistoryService.getCallHistory(
      user.id,
      parsedLimit,
      parsedOffset,
    );

    return {
      success: true,
      data: history,
    };
  }
}

