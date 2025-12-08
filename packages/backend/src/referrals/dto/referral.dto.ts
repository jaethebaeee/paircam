import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ApplyReferralCodeDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(20)
  referralCode: string;
}

export class ReferralStatsDto {
  referralCode: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  totalCoinsEarned: number;
  currentTier: number;
  nextTierReferrals: number;
  nextTierBonus: number;
}

export class ReferralHistoryItemDto {
  id: string;
  referredUserUsername?: string;
  referredUserAvatar?: string;
  coinsRewarded: number;
  isQualified: boolean;
  qualifiedAt?: Date;
  createdAt: Date;
}

export class ReferralTierDto {
  tier: number;
  name: string;
  minReferrals: number;
  bonusPerReferral: number;
  milestoneBonus: number;
}
