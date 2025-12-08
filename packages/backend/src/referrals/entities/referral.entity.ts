import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The user who owns this referral code
  @Column({ name: 'referrer_id' })
  @Index()
  referrerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrer_id' })
  referrer: User;

  // Unique referral code (e.g., "PAIRCAM-ABC123")
  @Column({ unique: true, name: 'referral_code', length: 20 })
  @Index()
  referralCode: string;

  // Stats
  @Column({ default: 0, name: 'total_referrals' })
  totalReferrals: number;

  @Column({ default: 0, name: 'total_coins_earned' })
  totalCoinsEarned: number;

  // Referral tier for milestone rewards
  @Column({ default: 1, name: 'current_tier' })
  currentTier: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationship to successful referrals
  @OneToMany(() => ReferralSuccess, (success) => success.referral)
  successfulReferrals: ReferralSuccess[];
}

@Entity('referral_successes')
export class ReferralSuccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The referral code record used
  @Column({ name: 'referral_id' })
  referralId: string;

  @ManyToOne(() => Referral, (referral) => referral.successfulReferrals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referral_id' })
  referral: Referral;

  // The user who was referred (unique constraint prevents race condition)
  @Column({ name: 'referred_user_id', unique: true })
  @Index()
  referredUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referred_user_id' })
  referredUser: User;

  // Rewards given
  @Column({ default: 0, name: 'referrer_coins_rewarded' })
  referrerCoinsRewarded: number;

  @Column({ default: 0, name: 'referred_coins_rewarded' })
  referredCoinsRewarded: number;

  // Whether rewards have been claimed (for qualified referrals)
  @Column({ default: false, name: 'reward_claimed' })
  rewardClaimed: boolean;

  // Optional: Track if referred user qualifies (e.g., completed first match)
  @Column({ default: false, name: 'is_qualified' })
  isQualified: boolean;

  @Column({ nullable: true, type: 'timestamp', name: 'qualified_at' })
  qualifiedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
