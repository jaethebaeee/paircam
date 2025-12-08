import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserWallet } from '../entities';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(UserWallet) private walletRepo: Repository<UserWallet>,
  ) {}

  /**
   * GET OR CREATE WALLET
   */
  async getOrCreateWallet(userId: string): Promise<UserWallet> {
    let wallet = await this.walletRepo.findOne({
      where: { userId },
    });

    if (!wallet) {
      wallet = this.walletRepo.create({
        userId,
        coinsBalance: 0,
        gemsBalance: 0,
        totalCoinsEarned: 0,
        totalCoinsSpent: 0,
        currentStreak: 0,
      });
      wallet = await this.walletRepo.save(wallet);
    }

    return wallet;
  }

  /**
   * REWARD COINS (from games, missions, etc.)
   */
  async rewardCoins(
    userId: string,
    amount: number,
    reason: string = 'game_win',
  ): Promise<UserWallet> {
    const wallet = await this.getOrCreateWallet(userId);

    wallet.coinsBalance += amount;
    wallet.totalCoinsEarned += amount;

    return this.walletRepo.save(wallet);
  }

  /**
   * SPEND COINS (for gifts)
   */
  async spendCoins(userId: string, amount: number): Promise<UserWallet> {
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.coinsBalance < amount) {
      throw new BadRequestException('Insufficient coins');
    }

    wallet.coinsBalance -= amount;
    wallet.totalCoinsSpent += amount;

    return this.walletRepo.save(wallet);
  }

  /**
   * GET WALLET
   */
  async getWallet(userId: string): Promise<UserWallet> {
    const wallet = await this.walletRepo.findOne({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet for user ${userId} not found`);
    }

    return wallet;
  }

  /**
   * ADD GEMS (from purchases)
   */
  async addGems(userId: string, amount: number): Promise<UserWallet> {
    const wallet = await this.getOrCreateWallet(userId);

    wallet.gemsBalance += amount;

    return this.walletRepo.save(wallet);
  }

  /**
   * SPEND GEMS (for premium gifts)
   */
  async spendGems(userId: string, amount: number): Promise<UserWallet> {
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.gemsBalance < amount) {
      throw new BadRequestException('Insufficient gems');
    }

    wallet.gemsBalance -= amount;

    return this.walletRepo.save(wallet);
  }

  /**
   * UPDATE STREAK
   */
  async updateStreak(userId: string, newStreak: number): Promise<UserWallet> {
    const wallet = await this.getOrCreateWallet(userId);

    wallet.currentStreak = newStreak;
    wallet.lastMissionCompletion = new Date();

    return this.walletRepo.save(wallet);
  }

  /**
   * GET WALLET STATS
   */
  async getWalletStats(userId: string) {
    const wallet = await this.getWallet(userId);

    return {
      coinsBalance: wallet.coinsBalance,
      gemsBalance: wallet.gemsBalance,
      totalCoinsEarned: wallet.totalCoinsEarned,
      totalCoinsSpent: wallet.totalCoinsSpent,
      currentStreak: wallet.currentStreak,
      lastMissionCompletion: wallet.lastMissionCompletion,
    };
  }
}
