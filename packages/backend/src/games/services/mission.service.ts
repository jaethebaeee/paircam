import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyMission } from '../entities';
import { WalletService } from './wallet.service';
import * as amplitude from '@amplitude/analytics-node';

@Injectable()
export class MissionService {
  constructor(
    @InjectRepository(DailyMission) private missionRepo: Repository<DailyMission>,
    private walletService: WalletService,
  ) {}

  /**
   * GENERATE DAILY MISSIONS FOR USER
   */
  async generateDailyMissions(userId: string): Promise<DailyMission[]> {
    // Check if missions already exist for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingMissions = await this.missionRepo.find({
      where: {
        userId,
        createdAt: (() => {
          const start = new Date(today);
          const end = new Date(today);
          end.setDate(end.getDate() + 1);
          return { $gte: start, $lt: end };
        })(),
      },
    });

    if (existingMissions.length > 0) {
      return existingMissions; // Already have missions for today
    }

    // Generate new missions
    const missions = [
      {
        missionType: 'matches',
        target: 3,
        coinsReward: 50,
      },
      {
        missionType: 'game_wins',
        target: 2,
        coinsReward: 75,
      },
      {
        missionType: 'playtime',
        target: 30, // 30 minutes
        coinsReward: 100,
      },
      {
        missionType: 'gift_sent',
        target: 1,
        coinsReward: 60,
      },
    ];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const createdMissions: DailyMission[] = [];

    for (const m of missions) {
      const mission = this.missionRepo.create({
        userId,
        missionType: m.missionType as any,
        target: m.target,
        progress: 0,
        coinsReward: m.coinsReward,
        expiresAt: tomorrow,
      });

      const saved = await this.missionRepo.save(mission);
      createdMissions.push(saved);
    }

    return createdMissions;
  }

  /**
   * GET TODAY'S MISSIONS
   */
  async getTodaysMissions(userId: string): Promise<DailyMission[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let missions = await this.missionRepo.find({
      where: {
        userId,
        completedAt: null, // Not yet completed
      },
    });

    // Filter for today's missions (not expired)
    missions = missions.filter(m => m.expiresAt > new Date());

    // If no missions, generate them
    if (missions.length === 0) {
      missions = await this.generateDailyMissions(userId);
    }

    return missions;
  }

  /**
   * UPDATE MISSION PROGRESS
   */
  async updateProgress(
    userId: string,
    missionType: string,
    amount: number,
  ): Promise<DailyMission | null> {
    const mission = await this.missionRepo.findOne({
      where: {
        userId,
        missionType: missionType as any,
        completedAt: null, // Not already completed
      },
    });

    if (!mission) {
      return null; // Mission already completed or doesn't exist
    }

    mission.progress += amount;

    // Check if completed
    if (mission.progress >= mission.target) {
      mission.completedAt = new Date();

      // Reward coins
      await this.walletService.rewardCoins(
        userId,
        mission.coinsReward,
        'daily-mission',
      );

      // Update streak
      await this.updateStreak(userId);

      // Track analytics
      amplitude.track({
        userId,
        eventType: 'mission_completed',
        eventProperties: {
          missionType,
          coinsEarned: mission.coinsReward,
        },
      });
    }

    return this.missionRepo.save(mission);
  }

  /**
   * UPDATE STREAK
   */
  async updateStreak(userId: string): Promise<void> {
    const wallet = await this.walletService.getOrCreateWallet(userId);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if user completed any mission yesterday
    const yesterdayMissions = await this.missionRepo.find({
      where: {
        userId,
        createdAt: (() => {
          const start = new Date(yesterday);
          start.setHours(0, 0, 0, 0);
          const end = new Date(yesterday);
          end.setHours(23, 59, 59, 999);
          return { $gte: start, $lt: end };
        })(),
        completedAt: (() => ({
          $ne: null,
        }))(),
      },
    });

    if (yesterdayMissions.length > 0) {
      // Extend streak
      wallet.currentStreak += 1;

      // Milestone rewards
      if (wallet.currentStreak % 7 === 0) {
        await this.walletService.rewardCoins(userId, 200, 'streak-7-days');
      }

      if (wallet.currentStreak % 30 === 0) {
        await this.walletService.rewardCoins(userId, 1000, 'streak-30-days');
      }
    } else {
      // Reset streak if missed a day
      wallet.currentStreak = 1;
    }

    await this.walletService.updateStreak(userId, wallet.currentStreak);
  }

  /**
   * GET MISSION BY ID
   */
  async getMission(missionId: string): Promise<DailyMission> {
    const mission = await this.missionRepo.findOne({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException(`Mission ${missionId} not found`);
    }

    return mission;
  }

  /**
   * CLAIM MISSION REWARD (if missions have a claim action)
   */
  async claimReward(userId: string, missionId: string): Promise<DailyMission> {
    const mission = await this.getMission(missionId);

    if (mission.userId !== userId) {
      throw new NotFoundException('Mission not found');
    }

    if (!mission.completedAt) {
      throw new Error('Mission not completed yet');
    }

    // Reward already given on completion, just return
    return mission;
  }
}
