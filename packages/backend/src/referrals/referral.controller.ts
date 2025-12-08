import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { ReferralService } from './referral.service';
import { UsersService } from '../users/users.service';
import { ApplyReferralCodeDto } from './dto';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(
    private referralService: ReferralService,
    private usersService: UsersService,
  ) {}

  /**
   * GET MY REFERRAL CODE AND STATS
   */
  @Get('me')
  async getMyReferralStats(@Req() req: { user: { deviceId: string } }) {
    const user = await this.usersService.findOrCreate(req.user.deviceId);
    const stats = await this.referralService.getReferralStats(user.id);

    return stats;
  }

  /**
   * GET MY REFERRAL HISTORY
   */
  @Get('history')
  async getMyReferralHistory(@Req() req: { user: { deviceId: string } }) {
    const user = await this.usersService.findOrCreate(req.user.deviceId);
    const history = await this.referralService.getReferralHistory(user.id);

    return { history };
  }

  /**
   * GET REFERRAL TIERS INFO
   */
  @Get('tiers')
  async getReferralTiers() {
    return { tiers: this.referralService.getReferralTiers() };
  }

  /**
   * CHECK IF USER HAS APPLIED A REFERRAL CODE
   */
  @Get('status')
  async getReferralStatus(@Req() req: { user: { deviceId: string } }) {
    const user = await this.usersService.findOrCreate(req.user.deviceId);
    const hasApplied = await this.referralService.hasAppliedReferralCode(user.id);
    const referrerInfo = await this.referralService.getReferrerInfo(user.id);

    return {
      hasAppliedReferralCode: hasApplied,
      referrerInfo,
    };
  }

  /**
   * APPLY A REFERRAL CODE
   * Rate limited: 5 requests per minute per user
   */
  @Post('apply')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async applyReferralCode(
    @Req() req: { user: { deviceId: string } },
    @Body() dto: ApplyReferralCodeDto,
  ) {
    const user = await this.usersService.findOrCreate(req.user.deviceId);

    if (!dto.referralCode || dto.referralCode.trim().length < 6) {
      throw new BadRequestException('Invalid referral code format');
    }

    const result = await this.referralService.applyReferralCode(
      user.id,
      dto.referralCode,
    );

    return result;
  }

  /**
   * VALIDATE A REFERRAL CODE (check if it exists)
   * Public endpoint with strict rate limiting: 10 requests per minute
   */
  @Post('validate')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async validateReferralCode(@Body() dto: ApplyReferralCodeDto) {
    const referral = await this.referralService.getReferralByCode(dto.referralCode);

    return {
      valid: !!referral,
      message: referral ? 'Valid referral code' : 'Invalid referral code',
    };
  }
}
