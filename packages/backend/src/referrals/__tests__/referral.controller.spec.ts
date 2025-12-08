import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ReferralController } from '../referral.controller';
import { ReferralService } from '../referral.service';
import { UsersService } from '../../users/users.service';

describe('ReferralController', () => {
  let controller: ReferralController;
  let referralService: jest.Mocked<ReferralService>;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: 'user-123',
    deviceId: 'device-456',
    username: 'TestUser',
  };

  const mockReq = {
    user: { deviceId: 'device-456' },
  };

  const mockStats = {
    referralCode: 'PAIRAB1234',
    totalReferrals: 10,
    qualifiedReferrals: 8,
    pendingReferrals: 2,
    totalCoinsEarned: 1000,
    currentTier: 2,
    nextTierReferrals: 5,
    nextTierBonus: 500,
  };

  const mockTiers = [
    { tier: 1, name: 'Starter', minReferrals: 0, bonusPerReferral: 100, milestoneBonus: 0 },
    { tier: 2, name: 'Bronze', minReferrals: 5, bonusPerReferral: 125, milestoneBonus: 250 },
  ];

  const mockHistory = [
    {
      id: 'success-123',
      referredUserUsername: 'NewUser',
      referredUserAvatar: 'https://example.com/avatar.jpg',
      coinsRewarded: 100,
      isQualified: true,
      qualifiedAt: new Date(),
      createdAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const mockReferralService = {
      getReferralStats: jest.fn(),
      getReferralHistory: jest.fn(),
      getReferralTiers: jest.fn(),
      hasAppliedReferralCode: jest.fn(),
      getReferrerInfo: jest.fn(),
      applyReferralCode: jest.fn(),
      getReferralByCode: jest.fn(),
    };

    const mockUsersService = {
      findOrCreate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralController],
      providers: [
        {
          provide: ReferralService,
          useValue: mockReferralService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<ReferralController>(ReferralController);
    referralService = module.get(ReferralService);
    usersService = module.get(UsersService);
  });

  describe('getMyReferralStats', () => {
    it('should return referral stats for authenticated user', async () => {
      usersService.findOrCreate.mockResolvedValue(mockUser as any);
      referralService.getReferralStats.mockResolvedValue(mockStats);

      const result = await controller.getMyReferralStats(mockReq);

      expect(result).toEqual(mockStats);
      expect(usersService.findOrCreate).toHaveBeenCalledWith('device-456');
      expect(referralService.getReferralStats).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getMyReferralHistory', () => {
    it('should return referral history for authenticated user', async () => {
      usersService.findOrCreate.mockResolvedValue(mockUser as any);
      referralService.getReferralHistory.mockResolvedValue(mockHistory);

      const result = await controller.getMyReferralHistory(mockReq);

      expect(result).toEqual({ history: mockHistory });
      expect(referralService.getReferralHistory).toHaveBeenCalledWith('user-123');
    });

    it('should return empty history array if no referrals', async () => {
      usersService.findOrCreate.mockResolvedValue(mockUser as any);
      referralService.getReferralHistory.mockResolvedValue([]);

      const result = await controller.getMyReferralHistory(mockReq);

      expect(result).toEqual({ history: [] });
    });
  });

  describe('getReferralTiers', () => {
    it('should return all referral tiers', async () => {
      referralService.getReferralTiers.mockReturnValue(mockTiers);

      const result = await controller.getReferralTiers();

      expect(result).toEqual({ tiers: mockTiers });
      expect(referralService.getReferralTiers).toHaveBeenCalled();
    });
  });

  describe('getReferralStatus', () => {
    it('should return status when user has not applied code', async () => {
      usersService.findOrCreate.mockResolvedValue(mockUser as any);
      referralService.hasAppliedReferralCode.mockResolvedValue(false);
      referralService.getReferrerInfo.mockResolvedValue(null);

      const result = await controller.getReferralStatus(mockReq);

      expect(result).toEqual({
        hasAppliedReferralCode: false,
        referrerInfo: null,
      });
    });

    it('should return status with referrer info when user has applied code', async () => {
      const referrerInfo = {
        referralCode: 'PAIRXYZ123',
        referrerUsername: 'ReferrerUser',
      };

      usersService.findOrCreate.mockResolvedValue(mockUser as any);
      referralService.hasAppliedReferralCode.mockResolvedValue(true);
      referralService.getReferrerInfo.mockResolvedValue(referrerInfo);

      const result = await controller.getReferralStatus(mockReq);

      expect(result).toEqual({
        hasAppliedReferralCode: true,
        referrerInfo,
      });
    });
  });

  describe('applyReferralCode', () => {
    it('should successfully apply valid referral code', async () => {
      const applyResult = {
        success: true,
        coinsAwarded: 150,
        message: 'You received 150 coins as a welcome bonus!',
      };

      usersService.findOrCreate.mockResolvedValue(mockUser as any);
      referralService.applyReferralCode.mockResolvedValue(applyResult);

      const result = await controller.applyReferralCode(mockReq, {
        referralCode: 'PAIRXYZ123',
      });

      expect(result).toEqual(applyResult);
      expect(referralService.applyReferralCode).toHaveBeenCalledWith(
        'user-123',
        'PAIRXYZ123',
      );
    });

    it('should throw BadRequestException for code shorter than 6 chars', async () => {
      usersService.findOrCreate.mockResolvedValue(mockUser as any);

      await expect(
        controller.applyReferralCode(mockReq, { referralCode: 'SHORT' }),
      ).rejects.toThrow(BadRequestException);

      expect(referralService.applyReferralCode).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty code', async () => {
      usersService.findOrCreate.mockResolvedValue(mockUser as any);

      await expect(
        controller.applyReferralCode(mockReq, { referralCode: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for whitespace-only code', async () => {
      usersService.findOrCreate.mockResolvedValue(mockUser as any);

      await expect(
        controller.applyReferralCode(mockReq, { referralCode: '     ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate service errors', async () => {
      usersService.findOrCreate.mockResolvedValue(mockUser as any);
      referralService.applyReferralCode.mockRejectedValue(
        new BadRequestException('You cannot use your own referral code'),
      );

      await expect(
        controller.applyReferralCode(mockReq, { referralCode: 'PAIRAB1234' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateReferralCode', () => {
    it('should return valid for existing code', async () => {
      referralService.getReferralByCode.mockResolvedValue({
        id: 'referral-123',
        referralCode: 'PAIRXYZ123',
      } as any);

      const result = await controller.validateReferralCode({
        referralCode: 'PAIRXYZ123',
      });

      expect(result).toEqual({
        valid: true,
        message: 'Valid referral code',
      });
    });

    it('should return invalid for non-existing code', async () => {
      referralService.getReferralByCode.mockResolvedValue(null);

      const result = await controller.validateReferralCode({
        referralCode: 'NONEXISTENT',
      });

      expect(result).toEqual({
        valid: false,
        message: 'Invalid referral code',
      });
    });

    it('should work without authentication (public endpoint)', async () => {
      referralService.getReferralByCode.mockResolvedValue(null);

      // This test verifies the endpoint doesn't require user lookup
      const result = await controller.validateReferralCode({
        referralCode: 'ANYCODE123',
      });

      expect(usersService.findOrCreate).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
