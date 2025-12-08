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
import { MatchOptimizationService, MatchFeaturesSimple, ABTestConfig } from './match-optimization.service';
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
    private readonly optimizationService: MatchOptimizationService,
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

  // ============================================
  // ADMIN/ANALYTICS ENDPOINTS
  // ============================================

  /**
   * GET /matching/analytics/overview
   * Get comprehensive matching analytics (for admin dashboard)
   */
  @Get('analytics/overview')
  async getMatchingAnalytics() {
    const queueStats = await this.matchmakingService.getExtendedQueueStats();
    const performanceStats = await this.matchmakingService.getPerformanceStats();

    // Get counters from Redis
    const totalSessions = await this.redisService.getCounter('sessions:created');
    const totalRuns = await this.redisService.getCounter('matchmaking:runs');
    const totalComparisons = await this.redisService.getCounter('matchmaking:comparisons');
    const comparisonsSaved = await this.redisService.getCounter('matchmaking:comparisons_saved');

    return {
      queue: {
        currentLength: queueStats.queueLength,
        averageWaitTime: Math.round(queueStats.averageWaitTime / 1000),
        regionDistribution: queueStats.regionDistribution,
        queueTypeDistribution: queueStats.queueTypeDistribution,
        premiumUsersInQueue: queueStats.premiumCount,
        averageReputation: queueStats.averageReputation,
      },
      performance: {
        ...performanceStats,
        totalMatchingRuns: totalRuns,
        totalComparisons,
        comparisonsSaved,
        optimizationRate: comparisonsSaved > 0
          ? `${((comparisonsSaved / (totalComparisons + comparisonsSaved)) * 100).toFixed(1)}%`
          : 'N/A',
      },
      sessions: {
        totalCreated: totalSessions,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * GET /matching/analytics/regions
   * Get regional breakdown of sessions
   */
  @Get('analytics/regions')
  async getRegionalAnalytics() {
    const regions = ['us-east', 'us-west', 'europe', 'asia', 'global'];
    const regionStats: Record<string, number> = {};

    for (const region of regions) {
      regionStats[region] = await this.redisService.getCounter(`sessions:region:${region}`);
    }

    const total = Object.values(regionStats).reduce((a, b) => a + b, 0);

    return {
      regions: regionStats,
      total,
      distribution: Object.fromEntries(
        Object.entries(regionStats).map(([region, count]) => [
          region,
          total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0%',
        ]),
      ),
    };
  }

  /**
   * GET /matching/health
   * Health check for matching system
   */
  @Get('health')
  async getMatchingHealth() {
    const queueLength = await this.redisService.getQueueLength();
    const pendingMatches = await this.redisService.getPendingMatches();

    // Check if queue processing is healthy
    const lastRunKey = 'matchmaking:last_run';
    const lastRunStr = await this.redisService.getClient().get(lastRunKey);
    const lastRun = lastRunStr ? parseInt(lastRunStr, 10) : 0;
    const timeSinceLastRun = Date.now() - lastRun;

    // Consider unhealthy if no processing in last 30 seconds and queue has users
    const isHealthy = queueLength < 2 || timeSinceLastRun < 30000;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      checks: {
        queueLength,
        pendingMatchesCount: pendingMatches.length,
        timeSinceLastRun: `${Math.round(timeSinceLastRun / 1000)}s`,
        isProcessing: timeSinceLastRun < 10000,
      },
      timestamp: Date.now(),
    };
  }

  // ============================================
  // OPTIMIZATION ENDPOINTS
  // ============================================

  /**
   * GET /matching/optimization/weights
   * Get current matching algorithm weights (learned from feedback)
   */
  @Get('optimization/weights')
  async getOptimizationWeights() {
    const weights = await this.optimizationService.getCurrentWeights();
    const totalOutcomes = await this.redisService.getClient().lLen('match_outcomes');

    return {
      weights,
      totalOutcomesRecorded: totalOutcomes,
      lastUpdated: Date.now(),
      description: {
        interestSimilarity: 'Weight for shared interests between users',
        languageMatch: 'Weight for language compatibility',
        regionProximity: 'Weight for geographic proximity',
        reputationBalance: 'Weight for balanced reputation scores',
        premiumBonus: 'Bonus weight for premium user matches',
        activityLevel: 'Weight for similar activity patterns',
        ageCompatibility: 'Weight for age range preferences',
      },
    };
  }

  /**
   * GET /matching/optimization/insights
   * Get optimization insights and recommendations
   */
  @Get('optimization/insights')
  async getOptimizationInsights() {
    const weights = await this.optimizationService.getCurrentWeights();
    const totalOutcomes = await this.redisService.getClient().lLen('matching:outcomes');

    // Find top performing factors
    const weightEntries = Object.entries(weights) as [string, number][];
    const sortedWeights = weightEntries.sort((a, b) => b[1] - a[1]);
    const topFactors = sortedWeights.slice(0, 3).map(([key]) => key);
    const lowFactors = sortedWeights.slice(-2).map(([key]) => key);

    return {
      summary: {
        totalOutcomesAnalyzed: totalOutcomes,
        confidenceLevel: totalOutcomes > 100 ? 'high' : totalOutcomes > 20 ? 'medium' : 'low',
      },
      insights: {
        topPerformingFactors: topFactors,
        underperformingFactors: lowFactors,
        recommendations: [
          totalOutcomes < 50
            ? 'Collect more feedback data to improve predictions'
            : 'Weights are stabilizing based on user feedback',
          (weights as Record<string, number>).interestSimilarity > 0.2
            ? 'Interest matching is highly effective for this userbase'
            : 'Consider promoting interest-based matching features',
        ],
      },
      weights,
    };
  }

  /**
   * POST /matching/optimization/outcome
   * Record a match outcome for weight learning (typically called internally)
   */
  @Post('optimization/outcome')
  async recordMatchOutcomeEndpoint(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      matchId: string;
      partnerId: string;
      callDuration: number;
      rating: number;
      features?: MatchFeaturesSimple;
    },
  ) {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Build features from available data if not provided
    const features: MatchFeaturesSimple = body.features || {
      interestSimilarity: 0.5,
      languageMatch: 1.0,
      regionProximity: 0.8,
      reputationBalance: 0.7,
      premiumBonus: 0,
      activityLevel: 0.5,
      ageCompatibility: 1.0,
    };

    // Calculate outcome score (0-1 based on rating and duration)
    const durationScore = Math.min(1, body.callDuration / 300); // 5min = max duration score
    const ratingScore = (body.rating - 1) / 4; // Normalize 1-5 to 0-1
    const outcomeScore = durationScore * 0.4 + ratingScore * 0.6;

    await this.optimizationService.recordMatchOutcomeSimple(
      body.matchId,
      features,
      outcomeScore,
      body.callDuration,
      body.rating,
    );

    return {
      success: true,
      outcomeScore,
      message: 'Match outcome recorded for weight learning',
    };
  }

  /**
   * GET /matching/optimization/predict
   * Preview match quality prediction for given features
   */
  @Get('optimization/predict')
  async predictMatchQualityEndpoint(
    @Query('interestSimilarity') interestSimilarity?: string,
    @Query('languageMatch') languageMatch?: string,
    @Query('regionProximity') regionProximity?: string,
  ) {
    const features: MatchFeaturesSimple = {
      interestSimilarity: parseFloat(interestSimilarity || '0.5'),
      languageMatch: parseFloat(languageMatch || '1.0'),
      regionProximity: parseFloat(regionProximity || '0.5'),
      reputationBalance: 0.7,
      premiumBonus: 0,
      activityLevel: 0.5,
      ageCompatibility: 1.0,
    };

    const prediction = await this.optimizationService.predictMatchQualitySimple(features);

    return {
      features,
      prediction: {
        score: prediction.score,
        confidence: prediction.confidence,
        qualityTier:
          prediction.score >= 0.8
            ? 'excellent'
            : prediction.score >= 0.6
              ? 'good'
              : prediction.score >= 0.4
                ? 'fair'
                : 'poor',
      },
    };
  }

  // ============================================
  // A/B TESTING ENDPOINTS
  // ============================================

  /**
   * GET /matching/abtest/:testId/variant
   * Get user's assigned variant for an A/B test
   */
  @Get('abtest/:testId/variant')
  async getABTestVariant(
    @Req() req: AuthenticatedRequest,
    @Param('testId') testId: string,
  ) {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const variant = await this.optimizationService.getABTestVariant(user.id, testId);

    if (!variant) {
      throw new HttpException('A/B test not found or inactive', HttpStatus.NOT_FOUND);
    }

    return {
      testId,
      variant,
      userId: user.id,
    };
  }

  /**
   * GET /matching/abtest/active
   * Get all active A/B tests
   */
  @Get('abtest/active')
  async getActiveABTests() {
    const testsKey = 'abtest:active';
    const testIds = await this.redisService.getClient().sMembers(testsKey);

    const tests = await Promise.all(
      testIds.map(async (testId) => {
        const configStr = await this.redisService.getClient().get(`abtest:config:${testId}`);
        if (!configStr) return null;

        try {
          const config = JSON.parse(configStr);
          return {
            testId,
            ...config,
          };
        } catch {
          return null;
        }
      }),
    );

    return {
      activeTests: tests.filter(Boolean),
      count: tests.filter(Boolean).length,
    };
  }

  /**
   * POST /matching/abtest
   * Create a new A/B test (admin endpoint)
   */
  @Post('abtest')
  async createABTestEndpoint(
    @Body()
    body: {
      testId: string;
      variants: string[];
      weights?: number[];
      description?: string;
    },
  ): Promise<{ success: boolean; config: ABTestConfig; message: string }> {
    if (!body.testId || !body.variants || body.variants.length < 2) {
      throw new HttpException(
        'testId and at least 2 variants are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const weights = body.weights || body.variants.map(() => 1 / body.variants.length);

    if (weights.length !== body.variants.length) {
      throw new HttpException(
        'weights array must match variants array length',
        HttpStatus.BAD_REQUEST,
      );
    }

    const config = await this.optimizationService.createABTest(
      body.testId,
      body.variants,
      weights,
    );

    this.logger.log('A/B test created', { testId: body.testId, variants: body.variants });

    return {
      success: true,
      config,
      message: `A/B test "${body.testId}" created with ${body.variants.length} variants`,
    };
  }

  /**
   * POST /matching/abtest/:testId/outcome
   * Record an outcome for A/B test analysis
   */
  @Post('abtest/:testId/outcome')
  async recordABTestOutcomeEndpoint(
    @Req() req: AuthenticatedRequest,
    @Param('testId') testId: string,
    @Body() body: { metric: string; value: number },
  ) {
    const deviceId = req.user.deviceId;
    const user = await this.usersService.findByDeviceId(deviceId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const variant = await this.optimizationService.getABTestVariant(user.id, testId);

    if (!variant) {
      throw new HttpException('User not assigned to this test', HttpStatus.NOT_FOUND);
    }

    await this.optimizationService.recordABTestOutcome(
      testId,
      variant,
      body.metric,
      body.value,
    );

    return {
      success: true,
      testId,
      variant,
      metric: body.metric,
      value: body.value,
    };
  }

  /**
   * GET /matching/abtest/:testId/results
   * Get A/B test results summary
   */
  @Get('abtest/:testId/results')
  async getABTestResults(@Param('testId') testId: string) {
    const configStr = await this.redisService.getClient().get(`abtest:config:${testId}`);

    if (!configStr) {
      throw new HttpException('A/B test not found', HttpStatus.NOT_FOUND);
    }

    const config = JSON.parse(configStr);
    const results: Record<
      string,
      { sampleSize: number; metrics: Record<string, { sum: number; count: number; avg: number }> }
    > = {};

    for (const variant of config.variants) {
      const outcomeKey = `abtest:outcomes:${testId}:${variant}`;
      const outcomes = await this.redisService.getClient().lRange(outcomeKey, 0, -1);

      const metrics: Record<string, { sum: number; count: number; avg: number }> = {};

      for (const outcomeStr of outcomes) {
        try {
          const outcome = JSON.parse(outcomeStr);
          if (!metrics[outcome.metric]) {
            metrics[outcome.metric] = { sum: 0, count: 0, avg: 0 };
          }
          metrics[outcome.metric].sum += outcome.value;
          metrics[outcome.metric].count++;
        } catch {
          continue;
        }
      }

      // Calculate averages
      for (const metric of Object.keys(metrics)) {
        metrics[metric].avg =
          metrics[metric].count > 0 ? metrics[metric].sum / metrics[metric].count : 0;
      }

      results[variant] = {
        sampleSize: outcomes.length,
        metrics,
      };
    }

    return {
      testId,
      config,
      results,
      summary: {
        totalSamples: Object.values(results).reduce((sum, r) => sum + r.sampleSize, 0),
        variants: Object.keys(results),
      },
    };
  }

  // ============================================
  // INTEREST SIMILARITY ENDPOINTS
  // ============================================

  /**
   * GET /matching/interests/similarity
   * Calculate interest similarity between two interest sets
   */
  @Get('interests/similarity')
  async calculateInterestSimilarity(
    @Query('interests1') interests1: string,
    @Query('interests2') interests2: string,
  ) {
    if (!interests1 || !interests2) {
      throw new HttpException('Both interests1 and interests2 are required', HttpStatus.BAD_REQUEST);
    }

    const list1 = interests1.split(',').map((s) => s.trim().toLowerCase());
    const list2 = interests2.split(',').map((s) => s.trim().toLowerCase());

    const similarity = this.optimizationService.calculateInterestSimilarity(list1, list2);

    return {
      interests1: list1,
      interests2: list2,
      similarity,
      interpretation:
        similarity >= 0.8
          ? 'Very high compatibility'
          : similarity >= 0.5
            ? 'Good compatibility'
            : similarity >= 0.3
              ? 'Some shared interests'
              : 'Different interests',
    };
  }

  /**
   * GET /matching/interests/clusters
   * Get available interest clusters for semantic matching
   */
  @Get('interests/clusters')
  async getInterestClusters() {
    return {
      clusters: {
        technology: ['gaming', 'programming', 'tech', 'computers', 'esports', 'coding', 'ai', 'crypto'],
        creative: ['music', 'art', 'photography', 'writing', 'design', 'film', 'dance', 'fashion'],
        sports: ['sports', 'fitness', 'football', 'basketball', 'soccer', 'running', 'gym', 'yoga'],
        entertainment: ['movies', 'tv', 'anime', 'reading', 'comics', 'podcasts', 'streaming'],
        lifestyle: ['cooking', 'travel', 'food', 'pets', 'nature', 'gardening', 'diy'],
        social: ['languages', 'culture', 'politics', 'philosophy', 'psychology', 'history'],
        business: ['entrepreneurship', 'investing', 'marketing', 'finance', 'startups'],
      },
      description:
        'Interests in the same cluster are considered semantically similar for matching purposes',
    };
  }

  // ============================================
  // RATE LIMITING HELPER
  // ============================================

  /**
   * Check rate limit for an endpoint
   */
  private async checkRateLimit(
    deviceId: string,
    endpoint: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const key = `ratelimit:matching:${endpoint}:${deviceId}`;
    const count = await this.redisService.incrementRateLimit(key, windowSeconds);
    return count <= maxRequests;
  }
}
