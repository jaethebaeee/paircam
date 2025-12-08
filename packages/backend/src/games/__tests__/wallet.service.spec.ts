import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletService } from '../services/wallet.service';
import { UserWallet } from '../entities';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: jest.Mocked<Repository<UserWallet>>;

  const mockWallet: Partial<UserWallet> = {
    id: 'wallet-123',
    userId: 'user-456',
    coinsBalance: 100,
    gemsBalance: 50,
    totalCoinsEarned: 200,
    totalCoinsSpent: 100,
    currentStreak: 3,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(UserWallet),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepo = module.get(getRepositoryToken(UserWallet));
  });

  describe('getOrCreateWallet', () => {
    it('should return existing wallet', async () => {
      walletRepo.findOne.mockResolvedValue(mockWallet as UserWallet);

      const result = await service.getOrCreateWallet('user-456');

      expect(result).toEqual(mockWallet);
      expect(walletRepo.create).not.toHaveBeenCalled();
    });

    it('should create new wallet if not exists', async () => {
      const newWallet = {
        id: 'new-wallet-id',
        userId: 'new-user',
        coinsBalance: 0,
        gemsBalance: 0,
        totalCoinsEarned: 0,
        totalCoinsSpent: 0,
        currentStreak: 0,
      };
      walletRepo.findOne.mockResolvedValue(null);
      walletRepo.create.mockReturnValue(newWallet as UserWallet);
      walletRepo.save.mockResolvedValue(newWallet as UserWallet);

      const result = await service.getOrCreateWallet('new-user');

      expect(result.coinsBalance).toBe(0);
      expect(result.gemsBalance).toBe(0);
      expect(walletRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new-user',
          coinsBalance: 0,
          gemsBalance: 0,
        }),
      );
    });
  });

  describe('rewardCoins', () => {
    it('should add coins to wallet', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet } as UserWallet);
      walletRepo.save.mockImplementation(async (w: any) => w);

      const result = await service.rewardCoins('user-456', 50, 'game_win');

      expect(result.coinsBalance).toBe(150); // 100 + 50
      expect(result.totalCoinsEarned).toBe(250); // 200 + 50
    });

    it('should use default reason if not provided', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet } as UserWallet);
      walletRepo.save.mockImplementation(async (w: any) => w);

      const result = await service.rewardCoins('user-456', 25);

      expect(result.coinsBalance).toBe(125);
    });
  });

  describe('spendCoins', () => {
    it('should deduct coins from wallet', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet } as UserWallet);
      walletRepo.save.mockImplementation(async (w: any) => w);

      const result = await service.spendCoins('user-456', 30);

      expect(result.coinsBalance).toBe(70); // 100 - 30
      expect(result.totalCoinsSpent).toBe(130); // 100 + 30
    });

    it('should throw error if insufficient coins', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet } as UserWallet);

      await expect(service.spendCoins('user-456', 200)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow spending exact balance', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet } as UserWallet);
      walletRepo.save.mockImplementation(async (w: any) => w);

      const result = await service.spendCoins('user-456', 100);

      expect(result.coinsBalance).toBe(0);
    });
  });

  describe('getWallet', () => {
    it('should return wallet for user', async () => {
      walletRepo.findOne.mockResolvedValue(mockWallet as UserWallet);

      const result = await service.getWallet('user-456');

      expect(result).toEqual(mockWallet);
    });

    it('should throw NotFoundException if wallet not found', async () => {
      walletRepo.findOne.mockResolvedValue(null);

      await expect(service.getWallet('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addGems', () => {
    it('should add gems to wallet', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet } as UserWallet);
      walletRepo.save.mockImplementation(async (w: any) => w);

      const result = await service.addGems('user-456', 100);

      expect(result.gemsBalance).toBe(150); // 50 + 100
    });

    it('should create wallet if not exists and add gems', async () => {
      const newWallet = {
        userId: 'new-user',
        coinsBalance: 0,
        gemsBalance: 0,
        totalCoinsEarned: 0,
        totalCoinsSpent: 0,
        currentStreak: 0,
      };
      walletRepo.findOne.mockResolvedValue(null);
      walletRepo.create.mockReturnValue(newWallet as UserWallet);
      walletRepo.save.mockImplementation(async (w: any) => w);

      const result = await service.addGems('new-user', 50);

      expect(result.gemsBalance).toBe(50);
    });
  });

  describe('spendGems', () => {
    it('should deduct gems from wallet', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet } as UserWallet);
      walletRepo.save.mockImplementation(async (w: any) => w);

      const result = await service.spendGems('user-456', 20);

      expect(result.gemsBalance).toBe(30); // 50 - 20
    });

    it('should throw error if insufficient gems', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet } as UserWallet);

      await expect(service.spendGems('user-456', 100)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateStreak', () => {
    it('should update streak value', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet } as UserWallet);
      walletRepo.save.mockImplementation(async (w: any) => w);

      const result = await service.updateStreak('user-456', 5);

      expect(result.currentStreak).toBe(5);
      expect(result.lastMissionCompletion).toBeDefined();
    });

    it('should reset streak to 1', async () => {
      walletRepo.findOne.mockResolvedValue({ ...mockWallet } as UserWallet);
      walletRepo.save.mockImplementation(async (w: any) => w);

      const result = await service.updateStreak('user-456', 1);

      expect(result.currentStreak).toBe(1);
    });
  });

  describe('getWalletStats', () => {
    it('should return wallet statistics', async () => {
      walletRepo.findOne.mockResolvedValue(mockWallet as UserWallet);

      const result = await service.getWalletStats('user-456');

      expect(result).toEqual({
        coinsBalance: 100,
        gemsBalance: 50,
        totalCoinsEarned: 200,
        totalCoinsSpent: 100,
        currentStreak: 3,
        lastMissionCompletion: undefined,
      });
    });

    it('should throw if wallet not found', async () => {
      walletRepo.findOne.mockResolvedValue(null);

      await expect(service.getWalletStats('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
