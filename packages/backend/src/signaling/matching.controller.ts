import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MatchmakingService } from './matchmaking.service';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { MatchAnalyticsService } from '../analytics/match-analytics.service';
import { LoggerService } from '../services/logger.service';
import {
  UpdateMatchingPreferencesDto,
  SubmitMatchFeedbackDto,
  BlockUserDto,
  QueueStatusResponse,
  QueueStatsResponse,
  ReputationResponse,
  MatchStatisticsResponse,
  PreferencesResponse,
  BlockedUserResponse,
} from './dto/matching.dto';

interface AuthenticatedRequest {
  user: {
    deviceId: string;
    userId?: string;
  };
}

@Controller('matching')
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly analyticsService: MatchAnalyticsService,
    private readonly logger: LoggerService,
  ) {}

  // ============================================
  // QUEUE ENDPOINTS
  // ============================================

  /**
   * GET /matching/queue/status
   * Get current user's queue status
   */
  @Get('queue/status')
  async getQueueStatus(@Req() req: AuthenticatedRequest): Promise<QueueStatusResponse> {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const isPremium = await this.usersService.isPremium(user.id);
    const queueStats = await this.matchmakingService.getQueueStats();

    // Check if user is in queue
    const queueItems = await this.redisService.getClient().lRange('matchmaking:queue', 0, -1);
    let inQueue = false;
    let position = 0;
    let queueType: string | undefined;

    for (let i = 0; i < queueItems.length; i++) {
      const item = JSON.parse(queueItems[i]);
      if (item.userId === user.id || item.deviceId === deviceId) {
        inQueue = true;
        position = queueItems.length - i; // Position from front
        queueType = item.queueType;
        break;
      }
    }

    // Estimate wait time based on queue length and average match rate
    const estimatedWaitTime = inQueue
      ? Math.round((position / 2) * 5) // ~5 seconds per position (2 users per match)
      : undefined;

    return {
      inQueue,
      position: inQueue ? position : undefined,
      queueLength: queueStats.queueLength,
      estimatedWaitTime,
      isPremium,
      queueType,
    };
  }

  /**
   * GET /matching/queue/stats
   * Get comprehensive queue statistics (for admins/analytics dashboard)
   */
  @Get('queue/stats')
  async getQueueStats(): Promise<QueueStatsResponse> {
    const extendedStats = await this.matchmakingService.getExtendedQueueStats();
    const performanceStats = await this.matchmakingService.getPerformanceStats();

    return {
      totalInQueue: extendedStats.queueLength,
      averageWaitTime: Math.round(extendedStats.averageWaitTime / 1000), // Convert to seconds
      regionDistribution: extendedStats.regionDistribution,
      queueTypeDistribution: extendedStats.queueTypeDistribution,
      premiumCount: extendedStats.premiumCount,
      averageReputation: extendedStats.averageReputation,
      performanceMetrics: performanceStats,
    };
  }

  // ============================================
  // USER REPUTATION ENDPOINTS
  // ============================================

  /**
   * GET /matching/reputation
   * Get current user's reputation score
   */
  @Get('reputation')
  async getReputation(@Req() req: AuthenticatedRequest): Promise<ReputationResponse> {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const reputation = await this.redisService.getUserReputation(user.id);

    // Calculate tier based on rating
    let tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    if (reputation.rating >= 90) tier = 'platinum';
    else if (reputation.rating >= 75) tier = 'gold';
    else if (reputation.rating >= 50) tier = 'silver';
    else tier = 'bronze';

    return {
      ...reputation,
      tier,
    };
  }

  // ============================================
  // MATCH HISTORY ENDPOINTS
  // ============================================

  /**
   * GET /matching/history
   * Get user's match history
   */
  @Get('history')
  async getMatchHistory(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const limitNum = Math.min(parseInt(limit || '20', 10), 50);
    const offsetNum = parseInt(offset || '0', 10);

    // Get match feedback (which contains match history)
    const feedback = await this.redisService.getUserMatchFeedback(user.id, limitNum + offsetNum);
    const paginatedFeedback = feedback.slice(offsetNum, offsetNum + limitNum);

    return {
      matches: paginatedFeedback.map(f => ({
        matchId: f.matchId,
        timestamp: f.timestamp,
        duration: f.duration,
        rating: f.rating,
        tags: f.tags,
      })),
      total: feedback.length,
      limit: limitNum,
      offset: offsetNum,
    };
  }

  /**
   * GET /matching/statistics
   * Get user's match statistics
   */
  @Get('statistics')
  async getMatchStatistics(@Req() req: AuthenticatedRequest): Promise<MatchStatisticsResponse> {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const feedback = await this.redisService.getUserMatchFeedback(user.id, 50);
    const reputation = await this.redisService.getUserReputation(user.id);

    // Calculate statistics
    const totalMatches = feedback.length;
    const totalCallTime = feedback.reduce((sum, f) => sum + (f.duration || 0), 0);
    const averageCallDuration = totalMatches > 0 ? Math.round(totalCallTime / totalMatches) : 0;

    const ratingsSum = feedback.reduce((sum, f) => sum + (f.rating || 0), 0);
    const averageRating = totalMatches > 0 ? Number((ratingsSum / totalMatches).toFixed(1)) : 0;

    const longestCall = Math.max(...feedback.map(f => f.duration || 0), 0);

    // Calculate matches this week
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const matchesThisWeek = feedback.filter(f => f.timestamp > oneWeekAgo).length;

    // Rating distribution
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedback.forEach(f => {
      if (f.rating >= 1 && f.rating <= 5) {
        ratingDistribution[f.rating]++;
      }
    });

    // Top interests from tags
    const tagCounts: Record<string, number> = {};
    feedback.forEach(f => {
      (f.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const topInterests = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    return {
      totalMatches,
      averageCallDuration,
      averageRating,
      totalCallTime,
      matchesThisWeek,
      longestCall,
      ratingDistribution,
      topInterests,
    };
  }

  // ============================================
  // MATCH FEEDBACK ENDPOINTS
  // ============================================

  /**
   * POST /matching/feedback
   * Submit feedback for a match (alternative to WebSocket)
   */
  @Post('feedback')
  async submitFeedback(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SubmitMatchFeedbackDto,
  ) {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Store feedback
    await this.redisService.storeMatchFeedback(user.id, dto.matchId, {
      rating: dto.rating,
      tags: dto.tags,
      duration: dto.duration || 0,
    });

    // Track in analytics
    await this.analyticsService.trackMatchFeedback({
      matchId: dto.matchId,
      userId: user.id,
      rating: dto.rating,
      tags: dto.tags || [],
      duration: dto.duration || 0,
    });

    this.logger.log('Match feedback submitted via REST', {
      userId: user.id,
      matchId: dto.matchId,
      rating: dto.rating,
    });

    return {
      success: true,
      message: 'Feedback submitted successfully',
    };
  }

  // ============================================
  // PREFERENCES ENDPOINTS
  // ============================================

  /**
   * GET /matching/preferences
   * Get user's matching preferences
   */
  @Get('preferences')
  async getPreferences(@Req() req: AuthenticatedRequest): Promise<PreferencesResponse> {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Get stored preferences from Redis
    const prefsKey = `matching-preferences:${user.id}`;
    const prefsData = await this.redisService.getClient().get(prefsKey);

    const defaultPrefs: PreferencesResponse = {
      queueType: 'casual',
      genderPreference: 'any',
      interests: [],
      preferredMatchTypes: [],
    };

    if (!prefsData) {
      return defaultPrefs;
    }

    try {
      return { ...defaultPrefs, ...JSON.parse(prefsData) };
    } catch {
      return defaultPrefs;
    }
  }

  /**
   * PUT /matching/preferences
   * Update user's matching preferences
   */
  @Put('preferences')
  async updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateMatchingPreferencesDto,
  ): Promise<PreferencesResponse> {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const isPremium = await this.usersService.isPremium(user.id);

    // Validate premium-only features
    if (!isPremium) {
      if (dto.genderPreference && dto.genderPreference !== 'any') {
        throw new HttpException(
          'Gender preference filtering is a premium feature',
          HttpStatus.FORBIDDEN,
        );
      }
      if (dto.minAge || dto.maxAge) {
        throw new HttpException(
          'Age range filtering is a premium feature',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // Validate age range
    if (dto.minAge && dto.maxAge && dto.minAge > dto.maxAge) {
      throw new HttpException(
        'minAge cannot be greater than maxAge',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get existing preferences and merge
    const currentPrefs = await this.getPreferences(req);
    const updatedPrefs: PreferencesResponse = {
      ...currentPrefs,
      ...(dto.queueType && { queueType: dto.queueType }),
      ...(dto.genderPreference && { genderPreference: dto.genderPreference }),
      ...(dto.minAge !== undefined && { minAge: dto.minAge }),
      ...(dto.maxAge !== undefined && { maxAge: dto.maxAge }),
      ...(dto.interests && { interests: dto.interests }),
      ...(dto.nativeLanguage && { nativeLanguage: dto.nativeLanguage }),
      ...(dto.learningLanguage && { learningLanguage: dto.learningLanguage }),
      ...(dto.preferredMatchTypes && { preferredMatchTypes: dto.preferredMatchTypes }),
    };

    // Store in Redis with 90-day TTL
    const prefsKey = `matching-preferences:${user.id}`;
    await this.redisService.getClient().setEx(prefsKey, 86400 * 90, JSON.stringify(updatedPrefs));

    this.logger.log('Matching preferences updated', { userId: user.id, preferences: updatedPrefs });

    return updatedPrefs;
  }

  // ============================================
  // BLOCKED USERS ENDPOINTS
  // ============================================

  /**
   * GET /matching/blocked
   * Get list of blocked users
   */
  @Get('blocked')
  async getBlockedUsers(@Req() req: AuthenticatedRequest): Promise<{ blockedUsers: BlockedUserResponse[] }> {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const blockedKey = `blocked-users:${user.id}`;
    const blockedData = await this.redisService.getClient().hGetAll(blockedKey);

    const blockedUsers: BlockedUserResponse[] = Object.entries(blockedData).map(([userId, data]) => {
      try {
        const parsed = JSON.parse(data);
        return {
          userId,
          blockedAt: parsed.blockedAt,
          reason: parsed.reason,
        };
      } catch {
        return { userId, blockedAt: Date.now() };
      }
    });

    return { blockedUsers };
  }

  /**
   * POST /matching/blocked
   * Block a user
   */
  @Post('blocked')
  async blockUser(
    @Req() req: AuthenticatedRequest,
    @Body() dto: BlockUserDto,
  ) {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.id === dto.targetUserId) {
      throw new HttpException('Cannot block yourself', HttpStatus.BAD_REQUEST);
    }

    const blockedKey = `blocked-users:${user.id}`;
    const blockData = JSON.stringify({
      blockedAt: Date.now(),
      reason: dto.reason,
    });

    await this.redisService.getClient().hSet(blockedKey, dto.targetUserId, blockData);
    await this.redisService.getClient().expire(blockedKey, 86400 * 365); // 1 year TTL

    // Also add to recent matches to prevent immediate rematching
    await this.redisService.addToRecentMatches(user.id, dto.targetUserId, 86400 * 365);

    this.logger.log('User blocked', {
      userId: user.id,
      blockedUserId: dto.targetUserId,
      reason: dto.reason,
    });

    return {
      success: true,
      message: 'User blocked successfully',
    };
  }

  /**
   * DELETE /matching/blocked/:userId
   * Unblock a user
   */
  @Delete('blocked/:userId')
  async unblockUser(
    @Req() req: AuthenticatedRequest,
    @Param('userId') targetUserId: string,
  ) {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const blockedKey = `blocked-users:${user.id}`;
    await this.redisService.getClient().hDel(blockedKey, targetUserId);

    this.logger.log('User unblocked', {
      userId: user.id,
      unblockedUserId: targetUserId,
    });

    return {
      success: true,
      message: 'User unblocked successfully',
    };
  }

  // ============================================
  // RECENT MATCHES ENDPOINTS
  // ============================================

  /**
   * GET /matching/recent
   * Get recent matches (for rematch cooldown info)
   */
  @Get('recent')
  async getRecentMatches(@Req() req: AuthenticatedRequest) {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const isPremium = await this.usersService.isPremium(user.id);
    const recentMatches = await this.redisService.getRecentMatchesWithTimestamp(user.id);

    // Calculate cooldown remaining for each match
    const cooldownMs = isPremium ? 30 * 60 * 1000 : 60 * 60 * 1000; // 30min vs 1hr
    const now = Date.now();

    const matchesWithCooldown = recentMatches.map(match => {
      const elapsed = now - match.timestamp;
      const remaining = Math.max(0, cooldownMs - elapsed);

      return {
        matchedUserId: match.matchedUserId,
        matchedAt: match.timestamp,
        cooldownRemaining: Math.round(remaining / 1000), // seconds
        canRematch: remaining === 0,
      };
    });

    return {
      recentMatches: matchesWithCooldown,
      cooldownDuration: Math.round(cooldownMs / 1000), // seconds
      isPremium,
    };
  }

  /**
   * DELETE /matching/recent
   * Clear recent matches (premium feature - allows immediate rematching)
   */
  @Delete('recent')
  async clearRecentMatches(@Req() req: AuthenticatedRequest) {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const isPremium = await this.usersService.isPremium(user.id);

    if (!isPremium) {
      throw new HttpException(
        'Clearing recent matches is a premium feature',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.redisService.clearRecentMatches(user.id);

    this.logger.log('Recent matches cleared', { userId: user.id });

    return {
      success: true,
      message: 'Recent matches cleared - you can now rematch with anyone',
    };
  }

  // ============================================
  // COMPATIBILITY PREVIEW (DEBUG/TESTING)
  // ============================================

  /**
   * GET /matching/config
   * Get current matching system configuration
   */
  @Get('config')
  async getMatchingConfig() {
    // Import config from matchmaking service
    const { MATCHING_CONFIG } = await import('./matchmaking.service');

    return {
      queueProcessInterval: MATCHING_CONFIG.QUEUE_PROCESS_INTERVAL,
      matchAcceptTimeout: MATCHING_CONFIG.MATCH_ACCEPT_TIMEOUT,
      rematchCooldownFree: MATCHING_CONFIG.REMATCH_COOLDOWN_FREE,
      rematchCooldownPremium: MATCHING_CONFIG.REMATCH_COOLDOWN_PREMIUM,
      defaultAgeRange: MATCHING_CONFIG.DEFAULT_AGE_RANGE,
      premiumAgeRange: MATCHING_CONFIG.PREMIUM_AGE_RANGE,
      premiumPriorityBoost: MATCHING_CONFIG.PREMIUM_PRIORITY_BOOST,
    };
  }
}
