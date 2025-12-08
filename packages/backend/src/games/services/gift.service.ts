import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GiftCatalog, GiftTransaction } from '../entities';
import { WalletService } from './wallet.service';

@Injectable()
export class GiftService {
  constructor(
    @InjectRepository(GiftCatalog) private giftCatalogRepo: Repository<GiftCatalog>,
    @InjectRepository(GiftTransaction) private transactionRepo: Repository<GiftTransaction>,
    private walletService: WalletService,
  ) {}

  /**
   * INITIALIZE GIFT CATALOG
   */
  async initializeGiftCatalog(): Promise<void> {
    const count = await this.giftCatalogRepo.count();

    if (count > 0) return; // Already initialized

    const gifts: { name: string; costCoins: number; imageUrl: string; rarity: 'common' | 'rare' | 'epic' | 'legendary' }[] = [
      {
        name: 'Rose',
        costCoins: 20,
        imageUrl: 'https://cdn.example.com/rose.png',
        rarity: 'common',
      },
      {
        name: 'Heart',
        costCoins: 35,
        imageUrl: 'https://cdn.example.com/heart.png',
        rarity: 'common',
      },
      {
        name: 'Diamond Ring',
        costCoins: 75,
        imageUrl: 'https://cdn.example.com/ring.png',
        rarity: 'rare',
      },
      {
        name: 'Bouquet',
        costCoins: 50,
        imageUrl: 'https://cdn.example.com/bouquet.png',
        rarity: 'rare',
      },
      {
        name: 'Jet Ski',
        costCoins: 500,
        imageUrl: 'https://cdn.example.com/jetski.png',
        rarity: 'epic',
      },
      {
        name: 'Luxury Car',
        costCoins: 1000,
        imageUrl: 'https://cdn.example.com/car.png',
        rarity: 'legendary',
      },
    ];

    for (const gift of gifts) {
      await this.giftCatalogRepo.save(gift);
    }
  }

  /**
   * GET ALL GIFTS
   */
  async getAllGifts(): Promise<GiftCatalog[]> {
    return this.giftCatalogRepo.find({
      where: { active: true },
      order: { costCoins: 'ASC' },
    });
  }

  /**
   * GET GIFT BY ID
   */
  async getGift(giftId: string): Promise<GiftCatalog> {
    const gift = await this.giftCatalogRepo.findOne({
      where: { id: giftId },
    });

    if (!gift) {
      throw new NotFoundException(`Gift ${giftId} not found`);
    }

    return gift;
  }

  /**
   * SEND GIFT
   */
  async sendGift(
    fromUserId: string,
    toUserId: string,
    giftId: string,
    sessionId?: string,
  ): Promise<GiftTransaction> {
    const gift = await this.getGift(giftId);

    // Check if sender has enough coins
    const wallet = await this.walletService.getWallet(fromUserId);

    if (wallet.coinsBalance < gift.costCoins) {
      throw new BadRequestException(
        `Insufficient coins. Need ${gift.costCoins}, have ${wallet.coinsBalance}`,
      );
    }

    // Deduct coins from sender
    await this.walletService.spendCoins(fromUserId, gift.costCoins);

    // Create transaction
    const transaction = this.transactionRepo.create({
      fromUserId,
      toUserId,
      giftId,
      sessionId,
      costCoins: gift.costCoins,
    });

    return this.transactionRepo.save(transaction);
  }

  /**
   * GET GIFTS RECEIVED BY USER
   */
  async getGiftsReceived(userId: string, limit: number = 20) {
    return this.transactionRepo.find({
      where: { toUserId: userId },
      relations: ['gift', 'fromUser'],
      order: { sentAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * GET GIFTS SENT BY USER
   */
  async getGiftsSent(userId: string, limit: number = 20) {
    return this.transactionRepo.find({
      where: { fromUserId: userId },
      relations: ['gift', 'toUser'],
      order: { sentAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * GET GIFT COUNT BY RARITY (for user stats)
   */
  async getGiftStats(userId: string) {
    const gifts = await this.getGiftsReceived(userId, 1000);

    const stats = {
      total: gifts.length,
      byRarity: {
        common: 0,
        rare: 0,
        epic: 0,
        legendary: 0,
      },
    };

    for (const gift of gifts) {
      stats.byRarity[gift.gift.rarity]++;
    }

    return stats;
  }
}
