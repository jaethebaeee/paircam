import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../services/logger.service';

export interface MatchQualityMetrics {
  matchId: string;
  sessionId: string;
  user1Id: string;
  user2Id: string;
  
  // Match details
  compatibilityScore: number;
  region: string;
  queueType: string;
  commonInterests: string[];
  
  // Timing metrics
  matchCreatedAt: number;
  connectionEstablishedAt?: number;
  callEndedAt?: number;
  
  // Quality indicators
  wasSkipped: boolean;
  callDuration: number; // seconds
  connectionTime: number; // milliseconds (time to establish WebRTC)
  
  // Technical metrics
  iceConnectionState?: 'connected' | 'failed' | 'disconnected';
  signalLatency?: number; // milliseconds
  
  // Outcome
  matchQualityScore: number; // 0-100 calculated based on outcomes
}

export interface MatchAnalytics {
  totalMatches: number;
  successfulConnections: number;
  failedConnections: number;
  averageConnectionTime: number;
  averageCallDuration: number;
  skipRate: number;
  averageMatchQuality: number;
  
  // By region
  regionalStats: Record<string, {
    totalMatches: number;
    avgCallDuration: number;
    avgConnectionTime: number;
    skipRate: number;
  }>;
  
  // By queue type
  queueTypeStats: Record<string, {
    totalMatches: number;
    avgCallDuration: number;
    skipRate: number;
  }>;
  
  // Interest effectiveness
  interestStats: Record<string, {
    matchCount: number;
    avgCallDuration: number;
    skipRate: number;
  }>;
}

@Injectable()
export class MatchAnalyticsService {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Track when a match is created
   */
  async trackMatchCreated(data: {
    matchId: string;
    sessionId: string;
    user1Id: string;
    user2Id: string;
    compatibilityScore: number;
    region: string;
    queueType: string;
    commonInterests: string[];
  }): Promise<void> {
    try {
      const matchData: Partial<MatchQualityMetrics> = {
        ...data,
        matchCreatedAt: Date.now(),
        wasSkipped: false,
        callDuration: 0,
        connectionTime: 0,
        matchQualityScore: 0,
      };

      // Store match data in Redis with 24 hour TTL
      await this.redisService.getClient().setEx(
        `match:${data.matchId}`,
        86400,
        JSON.stringify(matchData)
      );

      // Increment counters
      await this.redisService.incrementCounter('analytics:matches:total');
      await this.redisService.incrementCounter(`analytics:matches:region:${data.region}`);
      await this.redisService.incrementCounter(`analytics:matches:queue:${data.queueType}`);
      
      // Track interest combinations
      for (const interest of data.commonInterests) {
        await this.redisService.incrementCounter(`analytics:interest:${interest}:matches`);
      }

      this.logger.debug('Match created tracked', { matchId: data.matchId, score: data.compatibilityScore });
    } catch (error) {
      this.logger.error('Failed to track match creation', error.stack);
    }
  }

  /**
   * Track when WebRTC connection is established
   */
  async trackConnectionEstablished(data: {
    matchId: string;
    sessionId: string;
    connectionTime: number; // milliseconds
  }): Promise<void> {
    try {
      const matchData = await this.getMatchData(data.matchId);
      if (!matchData) return;

      matchData.connectionEstablishedAt = Date.now();
      matchData.connectionTime = data.connectionTime;
      matchData.iceConnectionState = 'connected';

      await this.updateMatchData(data.matchId, matchData);

      // Increment success counter
      await this.redisService.incrementCounter('analytics:connections:successful');
      
      // Track connection time for region
      await this.redisService.getClient().lPush(
        `analytics:connectionTime:${matchData.region}`,
        data.connectionTime.toString()
      );
      await this.redisService.getClient().lTrim(`analytics:connectionTime:${matchData.region}`, 0, 999); // Keep last 1000

      this.logger.debug('Connection established tracked', { matchId: data.matchId, time: data.connectionTime });
    } catch (error) {
      this.logger.error('Failed to track connection', error.stack);
    }
  }

  /**
   * Track when connection fails
   */
  async trackConnectionFailed(data: {
    matchId: string;
    sessionId: string;
    reason?: string;
  }): Promise<void> {
    try {
      const matchData = await this.getMatchData(data.matchId);
      if (!matchData) return;

      matchData.iceConnectionState = 'failed';
      await this.updateMatchData(data.matchId, matchData);

      // Increment failure counter
      await this.redisService.incrementCounter('analytics:connections:failed');
      await this.redisService.incrementCounter(`analytics:connections:failed:${matchData.region}`);

      this.logger.warn('Connection failed tracked', { matchId: data.matchId, reason: data.reason });
    } catch (error) {
      this.logger.error('Failed to track connection failure', error.stack);
    }
  }

  /**
   * Track when call ends
   */
  async trackCallEnded(data: {
    matchId: string;
    sessionId: string;
    wasSkipped: boolean;
    callDuration: number; // seconds
  }): Promise<void> {
    try {
      const matchData = await this.getMatchData(data.matchId);
      if (!matchData) return;

      matchData.callEndedAt = Date.now();
      matchData.wasSkipped = data.wasSkipped;
      matchData.callDuration = data.callDuration;

      // Calculate match quality score (0-100)
      matchData.matchQualityScore = this.calculateMatchQualityScore(matchData);

      await this.updateMatchData(data.matchId, matchData);

      // Update aggregated stats
      if (data.wasSkipped) {
        await this.redisService.incrementCounter('analytics:calls:skipped');
        await this.redisService.incrementCounter(`analytics:calls:skipped:${matchData.queueType}`);
      } else {
        await this.redisService.incrementCounter('analytics:calls:completed');
      }

      // Track call duration by region
      await this.redisService.getClient().lPush(
        `analytics:callDuration:${matchData.region}`,
        data.callDuration.toString()
      );
      await this.redisService.getClient().lTrim(`analytics:callDuration:${matchData.region}`, 0, 999);

      // Track interest effectiveness
      for (const interest of matchData.commonInterests || []) {
        await this.redisService.getClient().lPush(
          `analytics:interest:${interest}:durations`,
          data.callDuration.toString()
        );
        await this.redisService.getClient().lTrim(`analytics:interest:${interest}:durations`, 0, 999);
        
        if (data.wasSkipped) {
          await this.redisService.incrementCounter(`analytics:interest:${interest}:skips`);
        }
      }

      this.logger.debug('Call ended tracked', {
        matchId: data.matchId,
        duration: data.callDuration,
        skipped: data.wasSkipped,
        qualityScore: matchData.matchQualityScore,
      });
    } catch (error) {
      this.logger.error('Failed to track call end', error.stack);
    }
  }

  /**
   * Calculate match quality score based on outcomes
   */
  private calculateMatchQualityScore(match: Partial<MatchQualityMetrics>): number {
    let score = 0;

    // Connection success (30 points)
    if (match.iceConnectionState === 'connected') {
      score += 30;
      
      // Fast connection bonus (10 points)
      if (match.connectionTime && match.connectionTime < 3000) {
        score += 10;
      } else if (match.connectionTime && match.connectionTime < 5000) {
        score += 5;
      }
    }

    // Call duration (40 points)
    if (match.callDuration) {
      if (match.callDuration > 300) score += 40; // 5+ minutes = excellent
      else if (match.callDuration > 120) score += 30; // 2+ minutes = good
      else if (match.callDuration > 60) score += 20; // 1+ minute = okay
      else if (match.callDuration > 30) score += 10; // 30+ seconds = poor
    }

    // Not skipped bonus (20 points)
    if (!match.wasSkipped) {
      score += 20;
    }

    return Math.min(100, score);
  }

  /**
   * Get comprehensive analytics
   */
  async getAnalytics(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<MatchAnalytics> {
    try {
      // Get basic counters
      const totalMatches = await this.redisService.getCounter('analytics:matches:total');
      const successfulConnections = await this.redisService.getCounter('analytics:connections:successful');
      const failedConnections = await this.redisService.getCounter('analytics:connections:failed');
      const skippedCalls = await this.redisService.getCounter('analytics:calls:skipped');
      const completedCalls = await this.redisService.getCounter('analytics:calls:completed');

      // Calculate rates
      const skipRate = totalMatches > 0 ? (skippedCalls / totalMatches) * 100 : 0;

      // Get regional stats
      const regions = ['global', 'us-east', 'us-west', 'europe', 'asia'];
      const regionalStats: Record<string, any> = {};

      for (const region of regions) {
        const regionMatches = await this.redisService.getCounter(`analytics:matches:region:${region}`);
        
        if (regionMatches > 0) {
          // Get average connection time
          const connectionTimes = await this.redisService.getClient().lRange(
            `analytics:connectionTime:${region}`,
            0,
            999
          );
          const avgConnectionTime = connectionTimes.length > 0
            ? connectionTimes.reduce((sum, t) => sum + parseInt(t), 0) / connectionTimes.length
            : 0;

          // Get average call duration
          const callDurations = await this.redisService.getClient().lRange(
            `analytics:callDuration:${region}`,
            0,
            999
          );
          const avgCallDuration = callDurations.length > 0
            ? callDurations.reduce((sum, d) => sum + parseInt(d), 0) / callDurations.length
            : 0;

          const regionSkips = await this.redisService.getCounter(`analytics:calls:skipped:${region}`);
          const regionSkipRate = regionMatches > 0 ? (regionSkips / regionMatches) * 100 : 0;

          regionalStats[region] = {
            totalMatches: regionMatches,
            avgCallDuration: Math.round(avgCallDuration),
            avgConnectionTime: Math.round(avgConnectionTime),
            skipRate: Math.round(regionSkipRate * 10) / 10,
          };
        }
      }

      // Get queue type stats
      const queueTypes = ['casual', 'serious', 'language', 'gaming'];
      const queueTypeStats: Record<string, any> = {};

      for (const queueType of queueTypes) {
        const queueMatches = await this.redisService.getCounter(`analytics:matches:queue:${queueType}`);
        
        if (queueMatches > 0) {
          const queueSkips = await this.redisService.getCounter(`analytics:calls:skipped:${queueType}`);
          const queueSkipRate = queueMatches > 0 ? (queueSkips / queueMatches) * 100 : 0;

          // Get average call duration per queue
          const queueDurations = await this.redisService.getClient().lRange(
            `analytics:callDuration:queue:${queueType}`,
            0,
            999
          );
          const avgQueueDuration = queueDurations.length > 0
            ? queueDurations.reduce((sum, d) => sum + parseInt(d), 0) / queueDurations.length
            : 0;

          queueTypeStats[queueType] = {
            totalMatches: queueMatches,
            avgCallDuration: Math.round(avgQueueDuration),
            skipRate: Math.round(queueSkipRate * 10) / 10,
          };
        }
      }

      // Get interest effectiveness stats
      const interests = ['gaming', 'music', 'movies', 'sports', 'coding'];
      const interestStats: Record<string, any> = {};

      for (const interest of interests) {
        const interestMatches = await this.redisService.getCounter(`analytics:interest:${interest}:matches`);
        
        if (interestMatches > 0) {
          const durations = await this.redisService.getClient().lRange(
            `analytics:interest:${interest}:durations`,
            0,
            999
          );
          const avgDuration = durations.length > 0
            ? durations.reduce((sum, d) => sum + parseInt(d), 0) / durations.length
            : 0;

          const interestSkips = await this.redisService.getCounter(`analytics:interest:${interest}:skips`);
          const interestSkipRate = interestMatches > 0 ? (interestSkips / interestMatches) * 100 : 0;

          interestStats[interest] = {
            matchCount: interestMatches,
            avgCallDuration: Math.round(avgDuration),
            skipRate: Math.round(interestSkipRate * 10) / 10,
          };
        }
      }

      // Calculate global averages from all regions
      let totalConnectionTime = 0;
      let connectionTimeCount = 0;
      let totalCallDuration = 0;
      let callDurationCount = 0;

      for (const region of regions) {
        const connectionTimes = await this.redisService.getClient().lRange(
          `analytics:connectionTime:${region}`,
          0,
          999
        );
        if (connectionTimes.length > 0) {
          totalConnectionTime += connectionTimes.reduce((sum, t) => sum + parseInt(t), 0);
          connectionTimeCount += connectionTimes.length;
        }

        const callDurations = await this.redisService.getClient().lRange(
          `analytics:callDuration:${region}`,
          0,
          999
        );
        if (callDurations.length > 0) {
          totalCallDuration += callDurations.reduce((sum, d) => sum + parseInt(d), 0);
          callDurationCount += callDurations.length;
        }
      }

      const averageConnectionTime = connectionTimeCount > 0
        ? Math.round(totalConnectionTime / connectionTimeCount)
        : 0;
      const averageCallDuration = callDurationCount > 0
        ? Math.round(totalCallDuration / callDurationCount)
        : 0;

      // Calculate average match quality from recent matches
      const recentMatchKeys = await this.redisService.getClient().keys('match:*');
      let totalQualityScore = 0;
      let qualityScoreCount = 0;

      // Sample up to 100 recent matches for quality calculation
      const sampleKeys = recentMatchKeys.slice(0, 100);
      for (const key of sampleKeys) {
        const matchData = await this.redisService.getClient().get(key);
        if (matchData) {
          const match = JSON.parse(matchData);
          if (match.matchQualityScore && match.matchQualityScore > 0) {
            totalQualityScore += match.matchQualityScore;
            qualityScoreCount++;
          }
        }
      }

      const averageMatchQuality = qualityScoreCount > 0
        ? Math.round(totalQualityScore / qualityScoreCount)
        : 0;

      return {
        totalMatches,
        successfulConnections,
        failedConnections,
        averageConnectionTime,
        averageCallDuration,
        skipRate: Math.round(skipRate * 10) / 10,
        averageMatchQuality,
        regionalStats,
        queueTypeStats,
        interestStats,
      };
    } catch (error) {
      this.logger.error('Failed to get analytics', error.stack);
      throw error;
    }
  }

  /**
   * Helper: Get match data from Redis
   */
  private async getMatchData(matchId: string): Promise<Partial<MatchQualityMetrics> | null> {
    try {
      const data = await this.redisService.getClient().get(`match:${matchId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Failed to get match data for ${matchId}`, error.stack);
      return null;
    }
  }

  /**
   * Helper: Update match data in Redis
   */
  private async updateMatchData(matchId: string, data: Partial<MatchQualityMetrics>): Promise<void> {
    try {
      await this.redisService.getClient().setEx(
        `match:${matchId}`,
        86400,
        JSON.stringify(data)
      );
    } catch (error) {
      this.logger.error(`Failed to update match data for ${matchId}`, error.stack);
    }
  }
}

