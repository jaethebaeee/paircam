import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BlockedUser } from './entities/blocked-user.entity';
import { User } from '../users/entities/user.entity';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../services/logger.service';

export interface BlockedUserInfo {
  id: string;
  blockedId: string;
  blockedUsername?: string;
  reason?: string;
  createdAt: Date;
}

@Injectable()
export class BlockingService {
  // Cache key prefix for blocked users list
  private readonly BLOCKED_CACHE_PREFIX = 'blocked-users:';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @InjectRepository(BlockedUser)
    private readonly blockedUserRepository: Repository<BlockedUser>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Block a user
   */
  async blockUser(
    blockerDeviceId: string,
    blockedDeviceId: string,
    reason?: string,
    sessionId?: string,
  ): Promise<BlockedUser> {
    // Prevent self-blocking
    if (blockerDeviceId === blockedDeviceId) {
      throw new BadRequestException('You cannot block yourself');
    }

    // Find or create blocker user
    let blocker = await this.userRepository.findOne({ where: { deviceId: blockerDeviceId } });
    if (!blocker) {
      throw new NotFoundException('Blocker user not found');
    }

    // Find or create blocked user
    let blocked = await this.userRepository.findOne({ where: { deviceId: blockedDeviceId } });
    if (!blocked) {
      // Create a placeholder user for the blocked device ID
      // This handles the case where the user hasn't fully registered yet
      blocked = this.userRepository.create({
        deviceId: blockedDeviceId,
        isProfileComplete: false,
      });
      await this.userRepository.save(blocked);
    }

    // Check if already blocked
    const existingBlock = await this.blockedUserRepository.findOne({
      where: {
        blockerId: blocker.id,
        blockedId: blocked.id,
      },
    });

    if (existingBlock) {
      throw new ConflictException('User is already blocked');
    }

    // Create the block
    const block = this.blockedUserRepository.create({
      blockerId: blocker.id,
      blockedId: blocked.id,
      reason,
      sessionId,
    });

    await this.blockedUserRepository.save(block);

    // Invalidate cache
    await this.invalidateBlockCache(blocker.id);
    await this.invalidateBlockedByCache(blocked.id);

    this.logger.log('User blocked', {
      blockerId: blocker.id,
      blockedId: blocked.id,
      reason,
    });

    return block;
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerDeviceId: string, blockedDeviceId: string): Promise<void> {
    const blocker = await this.userRepository.findOne({ where: { deviceId: blockerDeviceId } });
    if (!blocker) {
      throw new NotFoundException('Blocker user not found');
    }

    const blocked = await this.userRepository.findOne({ where: { deviceId: blockedDeviceId } });
    if (!blocked) {
      throw new NotFoundException('Blocked user not found');
    }

    const block = await this.blockedUserRepository.findOne({
      where: {
        blockerId: blocker.id,
        blockedId: blocked.id,
      },
    });

    if (!block) {
      throw new NotFoundException('Block not found');
    }

    await this.blockedUserRepository.remove(block);

    // Invalidate cache
    await this.invalidateBlockCache(blocker.id);
    await this.invalidateBlockedByCache(blocked.id);

    this.logger.log('User unblocked', {
      blockerId: blocker.id,
      blockedId: blocked.id,
    });
  }

  /**
   * Get list of users blocked by a user
   */
  async getBlockedUsers(deviceId: string): Promise<BlockedUserInfo[]> {
    const user = await this.userRepository.findOne({ where: { deviceId } });
    if (!user) {
      return [];
    }

    const blocks = await this.blockedUserRepository.find({
      where: { blockerId: user.id },
      relations: ['blocked'],
      order: { createdAt: 'DESC' },
    });

    return blocks.map(block => ({
      id: block.id,
      blockedId: block.blocked.deviceId,
      blockedUsername: block.blocked.username,
      reason: block.reason,
      createdAt: block.createdAt,
    }));
  }

  /**
   * Check if user1 has blocked user2 (by device IDs)
   */
  async isBlocked(blockerDeviceId: string, blockedDeviceId: string): Promise<boolean> {
    const blocker = await this.userRepository.findOne({ where: { deviceId: blockerDeviceId } });
    const blocked = await this.userRepository.findOne({ where: { deviceId: blockedDeviceId } });

    if (!blocker || !blocked) {
      return false;
    }

    const block = await this.blockedUserRepository.findOne({
      where: {
        blockerId: blocker.id,
        blockedId: blocked.id,
      },
    });

    return !!block;
  }

  /**
   * Check if either user has blocked the other (bidirectional check)
   * This is used for matchmaking to prevent matching blocked users
   */
  async areBlocked(deviceId1: string, deviceId2: string): Promise<boolean> {
    // Check cache first
    const cacheKey1 = `${this.BLOCKED_CACHE_PREFIX}${deviceId1}`;
    const cacheKey2 = `${this.BLOCKED_CACHE_PREFIX}${deviceId2}`;

    try {
      const [cached1, cached2] = await Promise.all([
        this.redisService.getClient().get(cacheKey1),
        this.redisService.getClient().get(cacheKey2),
      ]);

      if (cached1 && cached2) {
        const blocked1: string[] = JSON.parse(cached1);
        const blocked2: string[] = JSON.parse(cached2);
        return blocked1.includes(deviceId2) || blocked2.includes(deviceId1);
      }
    } catch (error) {
      this.logger.warn('Cache check failed, falling back to DB', { error: error.message });
    }

    // Fall back to database
    const user1 = await this.userRepository.findOne({ where: { deviceId: deviceId1 } });
    const user2 = await this.userRepository.findOne({ where: { deviceId: deviceId2 } });

    if (!user1 || !user2) {
      return false;
    }

    // Check both directions
    const block = await this.blockedUserRepository.findOne({
      where: [
        { blockerId: user1.id, blockedId: user2.id },
        { blockerId: user2.id, blockedId: user1.id },
      ],
    });

    return !!block;
  }

  /**
   * Get list of device IDs blocked by a user (for matchmaking)
   * Uses Redis cache for performance
   */
  async getBlockedDeviceIds(deviceId: string): Promise<string[]> {
    const cacheKey = `${this.BLOCKED_CACHE_PREFIX}${deviceId}`;

    try {
      const cached = await this.redisService.getClient().get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn('Cache read failed', { error: error.message });
    }

    const user = await this.userRepository.findOne({ where: { deviceId } });
    if (!user) {
      return [];
    }

    // Get users this user has blocked
    const blockedByUser = await this.blockedUserRepository.find({
      where: { blockerId: user.id },
      relations: ['blocked'],
    });

    // Get users who have blocked this user
    const blockedThisUser = await this.blockedUserRepository.find({
      where: { blockedId: user.id },
      relations: ['blocker'],
    });

    // Combine both lists
    const blockedDeviceIds = [
      ...blockedByUser.map(b => b.blocked.deviceId),
      ...blockedThisUser.map(b => b.blocker.deviceId),
    ];

    // Remove duplicates
    const uniqueBlockedIds = [...new Set(blockedDeviceIds)];

    // Cache the result
    try {
      await this.redisService.getClient().setEx(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(uniqueBlockedIds),
      );
    } catch (error) {
      this.logger.warn('Cache write failed', { error: error.message });
    }

    return uniqueBlockedIds;
  }

  /**
   * Get count of users blocked by a user
   */
  async getBlockedCount(deviceId: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { deviceId } });
    if (!user) {
      return 0;
    }

    return this.blockedUserRepository.count({
      where: { blockerId: user.id },
    });
  }

  private async invalidateBlockCache(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        await this.redisService.getClient().del(`${this.BLOCKED_CACHE_PREFIX}${user.deviceId}`);
      }
    } catch (error) {
      this.logger.warn('Failed to invalidate block cache', { error: error.message });
    }
  }

  private async invalidateBlockedByCache(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        await this.redisService.getClient().del(`${this.BLOCKED_CACHE_PREFIX}${user.deviceId}`);
      }
    } catch (error) {
      this.logger.warn('Failed to invalidate blocked-by cache', { error: error.message });
    }
  }

  /**
   * Bulk fetch blocked device IDs for multiple users (optimized for matchmaking)
   * Returns a Map where key = deviceId and value = Set of blocked deviceIds
   */
  async getBlockedDeviceIdsBulk(deviceIds: string[]): Promise<Map<string, Set<string>>> {
    const result = new Map<string, Set<string>>();

    if (deviceIds.length === 0) {
      return result;
    }

    // Initialize empty sets for all deviceIds
    for (const deviceId of deviceIds) {
      result.set(deviceId, new Set());
    }

    try {
      // Try cache first using pipeline
      const pipeline = this.redisService.getClient().multi();
      for (const deviceId of deviceIds) {
        pipeline.get(`${this.BLOCKED_CACHE_PREFIX}${deviceId}`);
      }
      const cachedResults = await pipeline.exec();

      const uncachedDeviceIds: string[] = [];

      for (let i = 0; i < deviceIds.length; i++) {
        const cached = cachedResults[i] as string | null;
        if (cached) {
          try {
            const blockedIds: string[] = JSON.parse(cached);
            result.set(deviceIds[i], new Set(blockedIds));
          } catch {
            uncachedDeviceIds.push(deviceIds[i]);
          }
        } else {
          uncachedDeviceIds.push(deviceIds[i]);
        }
      }

      // For uncached entries, fetch from database
      if (uncachedDeviceIds.length > 0) {
        // Get all users for uncached deviceIds
        const users = await this.userRepository.find({
          where: { deviceId: In(uncachedDeviceIds) },
        });

        if (users.length > 0) {
          const userIds = users.map(u => u.id);
          const deviceIdToUserId = new Map(users.map(u => [u.deviceId, u.id]));
          const userIdToDeviceId = new Map(users.map(u => [u.id, u.deviceId]));

          // Get all blocks where any of these users is blocker or blocked
          const [blockedByUsers, blockedThisUsers] = await Promise.all([
            this.blockedUserRepository.find({
              where: { blockerId: In(userIds) },
              relations: ['blocked'],
            }),
            this.blockedUserRepository.find({
              where: { blockedId: In(userIds) },
              relations: ['blocker'],
            }),
          ]);

          // Build the blocked sets
          for (const block of blockedByUsers) {
            const blockerDeviceId = userIdToDeviceId.get(block.blockerId);
            if (blockerDeviceId) {
              const blockedSet = result.get(blockerDeviceId) || new Set();
              blockedSet.add(block.blocked.deviceId);
              result.set(blockerDeviceId, blockedSet);
            }
          }

          for (const block of blockedThisUsers) {
            const blockedDeviceId = userIdToDeviceId.get(block.blockedId);
            if (blockedDeviceId) {
              const blockedSet = result.get(blockedDeviceId) || new Set();
              blockedSet.add(block.blocker.deviceId);
              result.set(blockedDeviceId, blockedSet);
            }
          }

          // Cache the results
          const cachePipeline = this.redisService.getClient().multi();
          for (const deviceId of uncachedDeviceIds) {
            const blockedSet = result.get(deviceId) || new Set();
            cachePipeline.setEx(
              `${this.BLOCKED_CACHE_PREFIX}${deviceId}`,
              this.CACHE_TTL,
              JSON.stringify([...blockedSet]),
            );
          }
          await cachePipeline.exec();
        }
      }

      this.logger.debug('Bulk fetched blocked device IDs', {
        totalDevices: deviceIds.length,
        fromCache: deviceIds.length - uncachedDeviceIds.length,
        fromDb: uncachedDeviceIds.length,
      });

    } catch (error) {
      this.logger.error('Failed to bulk fetch blocked device IDs', error.stack);
      // Return empty sets on error (fail open for matchmaking)
    }

    return result;
  }
}
