import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { UsersService } from '../users/users.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('my')
  async getMySubscriptions(@Req() req: { user: { deviceId: string } }) {
    const user = await this.usersService.findByDeviceId(req.user.deviceId);
    if (!user) {
      return { subscriptions: [] };
    }

    const subscriptions = await this.subscriptionsService.findByUserId(user.id);
    return { subscriptions };
  }

  @Get('active')
  async getActiveSubscription(@Req() req: { user: { deviceId: string } }) {
    const user = await this.usersService.findByDeviceId(req.user.deviceId);
    if (!user) {
      return { subscription: null };
    }

    const subscription = await this.subscriptionsService.findActiveByUserId(user.id);
    return { subscription };
  }

  @Get('status')
  async getPremiumStatus(@Req() req: { user: { deviceId: string } }) {
    const user = await this.usersService.findByDeviceId(req.user.deviceId);
    if (!user) {
      return { isPremium: false, userId: null, subscription: null };
    }

    const subscription = await this.subscriptionsService.findActiveByUserId(user.id);
    const isPremium = !!subscription && subscription.status === 'active';

    return {
      isPremium,
      userId: user.id,
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
    };
  }
}

