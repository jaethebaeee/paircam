import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referral, ReferralSuccess } from './entities';
import { WalletService } from '../games/services/wallet.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ReferralStatsDto, ReferralHistoryItemDto, ReferralTierDto } from './dto';
import { UsersService } from '../users/users.service';

// Referral reward configuration
const REFERRAL_TIERS: ReferralTierDto[] = [
  { tier: 1, name: 'Starter', minReferrals: 0, bonusPerReferral: 100, milestoneBonus: 0 },
  { tier: 2, name: 'Bronze', minReferrals: 5, bonusPerReferral: 125, milestoneBonus: 250 },
  { tier: 3, name: 'Silver', minReferrals: 15, bonusPerReferral: 150, milestoneBonus: 500 },
  { tier: 4, name: 'Gold', minReferrals: 30, bonusPerReferral: 200, milestoneBonus: 1000 },
  { tier: 5, name: 'Platinum', minReferrals: 50, bonusPerReferral: 250, milestoneBonus: 2000 },
  { tier: 6, name: 'Diamond', minReferrals: 100, bonusPerReferral: 350, milestoneBonus: 5000 },
];

const REFERRED_USER_BONUS = 150; // Coins for new user who uses a referral code

@Injectable()
export class ReferralService {
  constructor(
    @InjectRepository(Referral) private referralRepo: Repository<Referral>,
    @InjectRepository(ReferralSuccess) private successRepo: Repository<ReferralSuccess>,
    private walletService: WalletService,
    private supabaseService: SupabaseService,
    private usersService: UsersService,
  ) {}

  /**
   * Generate a unique referral code for a user
   */
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'PAIR';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Get the current tier based on referral count
   */
  private getTierForReferralCount(count: number): ReferralTierDto {
    let currentTier = REFERRAL_TIERS[0];
    for (const tier of REFERRAL_TIERS) {
      if (count >= tier.minReferrals) {
        currentTier = tier;
      } else {
        break;
      }
    }
    return currentTier;
  }

  /**
   * Get the next tier after current
   */
  private getNextTier(currentTier: number): ReferralTierDto | null {
    const nextTierIndex = REFERRAL_TIERS.findIndex((t) => t.tier === currentTier) + 1;
    if (nextTierIndex < REFERRAL_TIERS.length) {
      return REFERRAL_TIERS[nextTierIndex];
    }
    return null;
  }

  /**
   * Get or create referral record for a user
   */
  async getOrCreateReferral(userId: string): Promise<Referral> {
    let referral = await this.referralRepo.findOne({
      where: { referrerId: userId },
    });

    if (!referral) {
      // Generate unique code
      let code = this.generateReferralCode();
      let exists = true;
      let attempts = 0;

      while (exists && attempts < 10) {
        code = this.generateReferralCode();
        const existing = await this.referralRepo.findOne({ where: { referralCode: code } });
        exists = !!existing;
        attempts++;
      }

      if (exists) {
        throw new BadRequestException('Failed to generate unique referral code');
      }

      referral = this.referralRepo.create({
        referrerId: userId,
        referralCode: code,
        totalReferrals: 0,
        totalCoinsEarned: 0,
        currentTier: 1,
      });
      referral = await this.referralRepo.save(referral);
    }

    return referral;
  }

  /**
   * Get referral by code
   */
  async getReferralByCode(code: string): Promise<Referral | null> {
    return this.referralRepo.findOne({
      where: { referralCode: code.toUpperCase() },
    });
  }

  /**
   * Apply a referral code for a new user
   */
  async applyReferralCode(userId: string, code: string): Promise<{
    success: boolean;
    coinsAwarded: number;
    message: string;
  }> {
    const normalizedCode = code.toUpperCase().trim();

    // Find the referral record
    const referral = await this.getReferralByCode(normalizedCode);
    if (!referral) {
      throw new NotFoundException('Invalid referral code');
    }

    // Cannot refer yourself
    if (referral.referrerId === userId) {
      throw new BadRequestException('You cannot use your own referral code');
    }

    // Check if user already used a referral code
    const existingSuccess = await this.successRepo.findOne({
      where: { referredUserId: userId },
    });
    if (existingSuccess) {
      throw new ConflictException('You have already used a referral code');
    }

    // Get the referrer's current tier for bonus calculation
    const tier = this.getTierForReferralCount(referral.totalReferrals);

    // Create referral success record
    const success = this.successRepo.create({
      referralId: referral.id,
      referredUserId: userId,
      referrerCoinsRewarded: tier.bonusPerReferral,
      referredCoinsRewarded: REFERRED_USER_BONUS,
      rewardClaimed: true, // Immediate reward
      isQualified: true, // Immediately qualified on signup
      qualifiedAt: new Date(),
    });
    await this.successRepo.save(success);

    // Update referral stats
    const newTotalReferrals = referral.totalReferrals + 1;
    const newTier = this.getTierForReferralCount(newTotalReferrals);
    let totalCoinsThisReferral = tier.bonusPerReferral;

    // Check for tier milestone bonus
    if (newTier.tier > referral.currentTier) {
      totalCoinsThisReferral += newTier.milestoneBonus;
    }

    referral.totalReferrals = newTotalReferrals;
    referral.totalCoinsEarned += totalCoinsThisReferral;
    referral.currentTier = newTier.tier;
    await this.referralRepo.save(referral);

    // Award coins to both users
    await this.walletService.rewardCoins(referral.referrerId, totalCoinsThisReferral, 'referral');
    await this.walletService.rewardCoins(userId, REFERRED_USER_BONUS, 'referral_bonus');

    // Send real-time notification to referrer via Supabase
    try {
      // Get referred user's username for the notification
      const referredUser = await this.usersService.findById(userId);
      const referredUsername = referredUser?.username || 'Someone';

      // Notify about new referral
      await this.supabaseService.notifyNewReferral(
        referral.referrerId,
        referredUsername,
        tier.bonusPerReferral,
      );

      // If tier milestone was reached, send milestone notification
      if (newTier.tier > tier.tier) {
        await this.supabaseService.notifyMilestoneReached(
          referral.referrerId,
          newTier.name,
          newTier.milestoneBonus,
        );
      }
    } catch (error) {
      // Don't fail the referral if notification fails
      console.error('Failed to send referral notification:', error);
    }

    return {
      success: true,
      coinsAwarded: REFERRED_USER_BONUS,
      message: `You received ${REFERRED_USER_BONUS} coins as a welcome bonus!`,
    };
  }

  /**
   * Get referral stats for a user
   */
  async getReferralStats(userId: string): Promise<ReferralStatsDto> {
    const referral = await this.getOrCreateReferral(userId);

    // Count qualified vs pending
    const [qualified, pending] = await Promise.all([
      this.successRepo.count({ where: { referralId: referral.id, isQualified: true } }),
      this.successRepo.count({ where: { referralId: referral.id, isQualified: false } }),
    ]);

    const currentTier = this.getTierForReferralCount(referral.totalReferrals);
    const nextTier = this.getNextTier(currentTier.tier);

    return {
      referralCode: referral.referralCode,
      totalReferrals: referral.totalReferrals,
      qualifiedReferrals: qualified,
      pendingReferrals: pending,
      totalCoinsEarned: referral.totalCoinsEarned,
      currentTier: currentTier.tier,
      nextTierReferrals: nextTier ? nextTier.minReferrals - referral.totalReferrals : 0,
      nextTierBonus: nextTier ? nextTier.milestoneBonus : 0,
    };
  }

  /**
   * Get referral history (list of successful referrals)
   */
  async getReferralHistory(userId: string): Promise<ReferralHistoryItemDto[]> {
    const referral = await this.referralRepo.findOne({
      where: { referrerId: userId },
    });

    if (!referral) {
      return [];
    }

    const successes = await this.successRepo.find({
      where: { referralId: referral.id },
      relations: ['referredUser'],
      order: { createdAt: 'DESC' },
      take: 50, // Limit to last 50
    });

    return successes.map((s) => ({
      id: s.id,
      referredUserUsername: s.referredUser?.username || 'Anonymous',
      referredUserAvatar: s.referredUser?.avatarUrl,
      coinsRewarded: s.referrerCoinsRewarded,
      isQualified: s.isQualified,
      qualifiedAt: s.qualifiedAt,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Get all referral tiers
   */
  getReferralTiers(): ReferralTierDto[] {
    return REFERRAL_TIERS;
  }

  /**
   * Check if user has applied a referral code
   */
  async hasAppliedReferralCode(userId: string): Promise<boolean> {
    const existing = await this.successRepo.findOne({
      where: { referredUserId: userId },
    });
    return !!existing;
  }

  /**
   * Get the referrer info for a user (who referred them)
   */
  async getReferrerInfo(userId: string): Promise<{ referralCode: string; referrerUsername?: string } | null> {
    const success = await this.successRepo.findOne({
      where: { referredUserId: userId },
      relations: ['referral', 'referral.referrer'],
    });

    if (!success) {
      return null;
    }

    return {
      referralCode: success.referral.referralCode,
      referrerUsername: success.referral.referrer?.username,
    };
  }
}
