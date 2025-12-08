import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ReferralService } from '../referral.service';
import { Referral, ReferralSuccess } from '../entities';
import { WalletService } from '../../games/services/wallet.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { UsersService } from '../../users/users.service';

describe('ReferralService', () => {
  let service: ReferralService;
  let referralRepo: jest.Mocked<Repository<Referral>>;
  let successRepo: jest.Mocked<Repository<ReferralSuccess>>;
  let walletService: jest.Mocked<WalletService>;
  let supabaseService: jest.Mocked<SupabaseService>;
  let usersService: jest.Mocked<UsersService>;

  const mockReferral = {
    id: 'referral-123',
    referrerId: 'user-123',
    referralCode: 'PAIRAB1234',
    totalReferrals: 0,
    totalCoinsEarned: 0,
    currentTier: 1,
    referrer: null,
    successfulReferrals: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Referral;

  const mockReferralSuccess = {
    id: 'success-123',
    referralId: 'referral-123',
    referredUserId: 'new-user-456',
    referrerCoinsRewarded: 100,
    referredCoinsRewarded: 150,
    isQualified: true,
    qualifiedAt: new Date(),
    rewardClaimed: true,
    referral: mockReferral,
    referredUser: null,
    createdAt: new Date(),
  } as unknown as ReferralSuccess;

  beforeEach(async () => {
    const mockReferralRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    const mockSuccessRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    const mockWalletService = {
      rewardCoins: jest.fn(),
    };

    const mockSupabaseService = {
      notifyNewReferral: jest.fn(),
      notifyMilestoneReached: jest.fn(),
    };

    const mockUsersService = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        {
          provide: getRepositoryToken(Referral),
          useValue: mockReferralRepo,
        },
        {
          provide: getRepositoryToken(ReferralSuccess),
          useValue: mockSuccessRepo,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
    referralRepo = module.get(getRepositoryToken(Referral));
    successRepo = module.get(getRepositoryToken(ReferralSuccess));
    walletService = module.get(WalletService);
    supabaseService = module.get(SupabaseService);
    usersService = module.get(UsersService);
  });

  describe('getOrCreateReferral', () => {
    it('should return existing referral if found', async () => {
      referralRepo.findOne.mockResolvedValue(mockReferral);

      const result = await service.getOrCreateReferral('user-123');

      expect(result).toEqual(mockReferral);
      expect(referralRepo.findOne).toHaveBeenCalledWith({
        where: { referrerId: 'user-123' },
      });
      expect(referralRepo.create).not.toHaveBeenCalled();
    });

    it('should create new referral with unique code if not found', async () => {
      const newReferral = { ...mockReferral, id: 'new-referral-id' };
      referralRepo.findOne
        .mockResolvedValueOnce(null) // First call - no existing referral
        .mockResolvedValueOnce(null); // Second call - code is unique
      referralRepo.create.mockReturnValue(newReferral);
      referralRepo.save.mockResolvedValue(newReferral);

      const result = await service.getOrCreateReferral('user-123');

      expect(result).toEqual(newReferral);
      expect(referralRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referrerId: 'user-123',
          totalReferrals: 0,
          totalCoinsEarned: 0,
          currentTier: 1,
        }),
      );
      expect(referralRepo.save).toHaveBeenCalled();
    });

    it('should generate new code if initial code already exists', async () => {
      const existingCodeReferral = { ...mockReferral, referralCode: 'PAIREXIST1' };
      const newReferral = { ...mockReferral, id: 'new-referral-id' };

      referralRepo.findOne
        .mockResolvedValueOnce(null) // No existing referral for user
        .mockResolvedValueOnce(existingCodeReferral) // First code exists
        .mockResolvedValueOnce(null); // Second code is unique
      referralRepo.create.mockReturnValue(newReferral);
      referralRepo.save.mockResolvedValue(newReferral);

      const result = await service.getOrCreateReferral('user-123');

      expect(result).toEqual(newReferral);
      expect(referralRepo.findOne).toHaveBeenCalledTimes(3);
    });

    it('should throw error if unable to generate unique code after 10 attempts', async () => {
      const existingCodeReferral = { ...mockReferral };

      // First call returns null (no existing referral), all subsequent return existing code
      referralRepo.findOne.mockResolvedValue(null);
      referralRepo.findOne
        .mockResolvedValueOnce(null) // No existing referral for user
        .mockResolvedValue(existingCodeReferral); // All codes exist

      await expect(service.getOrCreateReferral('user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getReferralByCode', () => {
    it('should return referral by code (case insensitive)', async () => {
      referralRepo.findOne.mockResolvedValue(mockReferral);

      const result = await service.getReferralByCode('pairab1234');

      expect(result).toEqual(mockReferral);
      expect(referralRepo.findOne).toHaveBeenCalledWith({
        where: { referralCode: 'PAIRAB1234' },
      });
    });

    it('should return null if code not found', async () => {
      referralRepo.findOne.mockResolvedValue(null);

      const result = await service.getReferralByCode('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('applyReferralCode', () => {
    it('should successfully apply referral code for new user', async () => {
      referralRepo.findOne.mockResolvedValue(mockReferral);
      successRepo.findOne.mockResolvedValue(null);
      successRepo.create.mockReturnValue(mockReferralSuccess);
      successRepo.save.mockResolvedValue(mockReferralSuccess);
      referralRepo.save.mockResolvedValue(mockReferral);
      walletService.rewardCoins.mockResolvedValue({} as any);
      usersService.findById.mockResolvedValue({ username: 'NewUser' } as any);
      supabaseService.notifyNewReferral.mockResolvedValue(true as any);

      const result = await service.applyReferralCode('new-user-456', 'PAIRAB1234');

      expect(result.success).toBe(true);
      expect(result.coinsAwarded).toBe(150);
      expect(walletService.rewardCoins).toHaveBeenCalledTimes(2);
      expect(walletService.rewardCoins).toHaveBeenCalledWith(
        'user-123',
        100,
        'referral',
      );
      expect(walletService.rewardCoins).toHaveBeenCalledWith(
        'new-user-456',
        150,
        'referral_bonus',
      );
    });

    it('should throw NotFoundException for invalid code', async () => {
      referralRepo.findOne.mockResolvedValue(null);

      await expect(
        service.applyReferralCode('new-user-456', 'INVALID'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when using own referral code', async () => {
      referralRepo.findOne.mockResolvedValue(mockReferral);

      await expect(
        service.applyReferralCode('user-123', 'PAIRAB1234'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user already used a code', async () => {
      referralRepo.findOne.mockResolvedValue(mockReferral);
      successRepo.findOne.mockResolvedValue(mockReferralSuccess);

      await expect(
        service.applyReferralCode('new-user-456', 'PAIRAB1234'),
      ).rejects.toThrow(ConflictException);
    });

    it('should award milestone bonus when tier is reached', async () => {
      const referralWith4 = { ...mockReferral, totalReferrals: 4 } as unknown as Referral;
      referralRepo.findOne.mockResolvedValue(referralWith4);
      successRepo.findOne.mockResolvedValue(null);
      successRepo.create.mockReturnValue(mockReferralSuccess);
      successRepo.save.mockResolvedValue(mockReferralSuccess);
      referralRepo.save.mockResolvedValue({ ...referralWith4, totalReferrals: 5 } as any);
      walletService.rewardCoins.mockResolvedValue({} as any);
      usersService.findById.mockResolvedValue({ username: 'NewUser' } as any);
      supabaseService.notifyNewReferral.mockResolvedValue(true as any);
      supabaseService.notifyMilestoneReached.mockResolvedValue(true as any);

      await service.applyReferralCode('new-user-456', 'PAIRAB1234');

      // Should award base bonus (100) + milestone bonus (250) = 350
      expect(walletService.rewardCoins).toHaveBeenCalledWith(
        'user-123',
        350,
        'referral',
      );
      expect(supabaseService.notifyMilestoneReached).toHaveBeenCalledWith(
        'user-123',
        'Bronze',
        250,
      );
    });

    it('should not fail if notification fails', async () => {
      referralRepo.findOne.mockResolvedValue(mockReferral);
      successRepo.findOne.mockResolvedValue(null);
      successRepo.create.mockReturnValue(mockReferralSuccess);
      successRepo.save.mockResolvedValue(mockReferralSuccess);
      referralRepo.save.mockResolvedValue(mockReferral);
      walletService.rewardCoins.mockResolvedValue({} as any);
      usersService.findById.mockResolvedValue({ username: 'NewUser' } as any);
      supabaseService.notifyNewReferral.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await service.applyReferralCode('new-user-456', 'PAIRAB1234');

      expect(result.success).toBe(true);
    });
  });

  describe('getReferralStats', () => {
    it('should return stats for existing referral', async () => {
      // Use a fresh copy to avoid mutation from other tests
      const freshReferral = { ...mockReferral, totalReferrals: 0 } as unknown as Referral;
      referralRepo.findOne.mockResolvedValue(freshReferral);
      successRepo.count
        .mockResolvedValueOnce(5) // qualified
        .mockResolvedValueOnce(2); // pending

      const result = await service.getReferralStats('user-123');

      expect(result.referralCode).toBe('PAIRAB1234');
      expect(result.totalReferrals).toBe(0);
      expect(result.qualifiedReferrals).toBe(5);
      expect(result.pendingReferrals).toBe(2);
      expect(result.currentTier).toBe(1);
    });

    it('should create referral if not exists and return stats', async () => {
      referralRepo.findOne
        .mockResolvedValueOnce(null) // First call in getOrCreateReferral
        .mockResolvedValueOnce(null); // Code check
      referralRepo.create.mockReturnValue(mockReferral);
      referralRepo.save.mockResolvedValue(mockReferral);
      successRepo.count.mockResolvedValue(0);

      const result = await service.getReferralStats('user-123');

      expect(result).toBeDefined();
      expect(referralRepo.create).toHaveBeenCalled();
    });

    it('should calculate next tier correctly', async () => {
      const referralWith3 = { ...mockReferral, totalReferrals: 3 } as unknown as Referral;
      referralRepo.findOne.mockResolvedValue(referralWith3);
      successRepo.count.mockResolvedValue(0);

      const result = await service.getReferralStats('user-123');

      expect(result.currentTier).toBe(1);
      expect(result.nextTierReferrals).toBe(2); // Need 5 for Bronze, have 3
      expect(result.nextTierBonus).toBe(250); // Bronze milestone
    });

    it('should return 0 for next tier when at max tier', async () => {
      const diamondReferral = { ...mockReferral, totalReferrals: 100, currentTier: 6 } as unknown as Referral;
      referralRepo.findOne.mockResolvedValue(diamondReferral);
      successRepo.count.mockResolvedValue(0);

      const result = await service.getReferralStats('user-123');

      expect(result.currentTier).toBe(6);
      expect(result.nextTierReferrals).toBe(0);
      expect(result.nextTierBonus).toBe(0);
    });
  });

  describe('getReferralHistory', () => {
    it('should return empty array if no referral exists', async () => {
      referralRepo.findOne.mockResolvedValue(null);

      const result = await service.getReferralHistory('user-123');

      expect(result).toEqual([]);
    });

    it('should return formatted history items', async () => {
      const successWithUser = {
        ...mockReferralSuccess,
        referredUser: { username: 'TestUser', avatarUrl: 'https://example.com/avatar.jpg' },
      } as unknown as ReferralSuccess;
      referralRepo.findOne.mockResolvedValue(mockReferral);
      successRepo.find.mockResolvedValue([successWithUser]);

      const result = await service.getReferralHistory('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].referredUserUsername).toBe('TestUser');
      expect(result[0].referredUserAvatar).toBe('https://example.com/avatar.jpg');
      expect(result[0].coinsRewarded).toBe(100);
    });

    it('should default to Anonymous if user has no username', async () => {
      const successNoUsername = {
        ...mockReferralSuccess,
        referredUser: { username: undefined },
      } as unknown as ReferralSuccess;
      referralRepo.findOne.mockResolvedValue(mockReferral);
      successRepo.find.mockResolvedValue([successNoUsername]);

      const result = await service.getReferralHistory('user-123');

      expect(result[0].referredUserUsername).toBe('Anonymous');
    });
  });

  describe('getReferralTiers', () => {
    it('should return all tier definitions', () => {
      const tiers = service.getReferralTiers();

      expect(tiers).toHaveLength(6);
      expect(tiers[0].name).toBe('Starter');
      expect(tiers[5].name).toBe('Diamond');
      expect(tiers[5].bonusPerReferral).toBe(350);
    });
  });

  describe('hasAppliedReferralCode', () => {
    it('should return true if user has used a code', async () => {
      successRepo.findOne.mockResolvedValue(mockReferralSuccess);

      const result = await service.hasAppliedReferralCode('new-user-456');

      expect(result).toBe(true);
    });

    it('should return false if user has not used a code', async () => {
      successRepo.findOne.mockResolvedValue(null);

      const result = await service.hasAppliedReferralCode('new-user-456');

      expect(result).toBe(false);
    });
  });

  describe('getReferrerInfo', () => {
    it('should return referrer info if user was referred', async () => {
      const successWithReferral = {
        ...mockReferralSuccess,
        referral: {
          ...mockReferral,
          referrer: { username: 'ReferrerUser' },
        },
      } as unknown as ReferralSuccess;
      successRepo.findOne.mockResolvedValue(successWithReferral);

      const result = await service.getReferrerInfo('new-user-456');

      expect(result).not.toBeNull();
      expect(result?.referralCode).toBe('PAIRAB1234');
      expect(result?.referrerUsername).toBe('ReferrerUser');
    });

    it('should return null if user was not referred', async () => {
      successRepo.findOne.mockResolvedValue(null);

      const result = await service.getReferrerInfo('new-user-456');

      expect(result).toBeNull();
    });
  });

  describe('tier calculation', () => {
    it('should correctly identify Starter tier (0-4 referrals)', async () => {
      const referral = { ...mockReferral, totalReferrals: 4 } as unknown as Referral;
      referralRepo.findOne.mockResolvedValue(referral);
      successRepo.count.mockResolvedValue(0);

      const result = await service.getReferralStats('user-123');

      expect(result.currentTier).toBe(1);
    });

    it('should correctly identify Bronze tier (5-14 referrals)', async () => {
      const referral = { ...mockReferral, totalReferrals: 10 } as unknown as Referral;
      referralRepo.findOne.mockResolvedValue(referral);
      successRepo.count.mockResolvedValue(0);

      const result = await service.getReferralStats('user-123');

      expect(result.currentTier).toBe(2);
    });

    it('should correctly identify Silver tier (15-29 referrals)', async () => {
      const referral = { ...mockReferral, totalReferrals: 20 } as unknown as Referral;
      referralRepo.findOne.mockResolvedValue(referral);
      successRepo.count.mockResolvedValue(0);

      const result = await service.getReferralStats('user-123');

      expect(result.currentTier).toBe(3);
    });

    it('should correctly identify Gold tier (30-49 referrals)', async () => {
      const referral = { ...mockReferral, totalReferrals: 35 } as unknown as Referral;
      referralRepo.findOne.mockResolvedValue(referral);
      successRepo.count.mockResolvedValue(0);

      const result = await service.getReferralStats('user-123');

      expect(result.currentTier).toBe(4);
    });

    it('should correctly identify Platinum tier (50-99 referrals)', async () => {
      const referral = { ...mockReferral, totalReferrals: 75 } as unknown as Referral;
      referralRepo.findOne.mockResolvedValue(referral);
      successRepo.count.mockResolvedValue(0);

      const result = await service.getReferralStats('user-123');

      expect(result.currentTier).toBe(5);
    });

    it('should correctly identify Diamond tier (100+ referrals)', async () => {
      const referral = { ...mockReferral, totalReferrals: 150 } as unknown as Referral;
      referralRepo.findOne.mockResolvedValue(referral);
      successRepo.count.mockResolvedValue(0);

      const result = await service.getReferralStats('user-123');

      expect(result.currentTier).toBe(6);
    });
  });
});
