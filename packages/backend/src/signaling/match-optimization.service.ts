import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../services/logger.service';

/**
 * Match Optimization Service
 *
 * Provides ML-ready features and dynamic weight optimization for the matching system:
 * 1. Dynamic weight learning from user feedback
 * 2. Interest similarity scoring
 * 3. Match quality prediction
 * 4. A/B testing infrastructure
 */

// Default scoring weights (will be dynamically adjusted)
export const DEFAULT_WEIGHTS = {
  region: 20,
  language: 15,
  reputation: 25,
  interests: 20,
  age: 15,
  waitTime: 15,
  premium: 15,
  matchType: 5,
};

// Interest clusters for semantic similarity
const INTEREST_CLUSTERS: Record<string, string[]> = {
  gaming: ['gaming', 'esports', 'streaming', 'twitch', 'youtube-gaming', 'pc-gaming', 'console', 'mobile-gaming'],
  music: ['music', 'singing', 'instruments', 'concerts', 'dj', 'production', 'spotify', 'genres'],
  fitness: ['fitness', 'gym', 'yoga', 'running', 'sports', 'basketball', 'soccer', 'swimming', 'martial-arts'],
  tech: ['tech', 'coding', 'programming', 'software', 'ai', 'startups', 'crypto', 'web3'],
  creative: ['art', 'design', 'photography', 'writing', 'filmmaking', 'animation', 'crafts'],
  entertainment: ['movies', 'tv-shows', 'anime', 'books', 'podcasts', 'comedy', 'theater'],
  lifestyle: ['travel', 'food', 'cooking', 'fashion', 'pets', 'gardening', 'diy'],
  social: ['socializing', 'networking', 'dating', 'friendship', 'community', 'volunteering'],
};

// Match outcome types for learning
export type MatchOutcome = 'excellent' | 'good' | 'neutral' | 'poor' | 'skipped';

interface MatchFeatures {
  regionMatch: boolean;
  languageMatch: boolean;
  ageDiff: number;
  reputationDiff: number;
  commonInterests: number;
  interestSimilarity: number;
  waitTimeAvg: number;
  isPremiumMatch: boolean;
  hourOfDay: number;
  dayOfWeek: number;
}

interface WeightConfig {
  weights: typeof DEFAULT_WEIGHTS;
  version: number;
  lastUpdated: number;
  sampleSize: number;
}

export interface ABTestConfig {
  testId: string;
  variants: string[];
  weights: number[];
  isActive: boolean;
  startedAt: number;
}

export interface MatchFeaturesSimple {
  interestSimilarity: number;
  languageMatch: number;
  regionProximity: number;
  reputationBalance: number;
  premiumBonus: number;
  activityLevel: number;
  ageCompatibility: number;
}

@Injectable()
export class MatchOptimizationService implements OnModuleInit {
  private currentWeights: typeof DEFAULT_WEIGHTS = { ...DEFAULT_WEIGHTS };
  private interestEmbeddings: Map<string, number[]> = new Map();

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    // Load learned weights from Redis
    await this.loadWeights();
    // Build interest embeddings
    this.buildInterestEmbeddings();
    // Start periodic weight optimization
    this.startWeightOptimization();
    this.logger.log('MatchOptimizationService initialized');
  }

  // ============================================
  // DYNAMIC WEIGHT LEARNING
  // ============================================

  /**
   * Load learned weights from Redis
   */
  private async loadWeights(): Promise<void> {
    try {
      const weightsData = await this.redisService.getClient().get('matching:weights');
      if (weightsData) {
        const config: WeightConfig = JSON.parse(weightsData);
        this.currentWeights = config.weights;
        this.logger.log('Loaded learned weights', {
          version: config.version,
          sampleSize: config.sampleSize,
        });
      }
    } catch (error) {
      this.logger.warn('Failed to load weights, using defaults', { error });
    }
  }

  /**
   * Get current scoring weights
   */
  getWeights(): typeof DEFAULT_WEIGHTS {
    return { ...this.currentWeights };
  }

  /**
   * Get current weights as a simple object for API responses
   */
  async getCurrentWeights(): Promise<Record<string, number>> {
    return {
      interestSimilarity: this.currentWeights.interests / 100,
      languageMatch: this.currentWeights.language / 100,
      regionProximity: this.currentWeights.region / 100,
      reputationBalance: this.currentWeights.reputation / 100,
      premiumBonus: this.currentWeights.premium / 100,
      activityLevel: this.currentWeights.waitTime / 100,
      ageCompatibility: this.currentWeights.age / 100,
    };
  }

  /**
   * Record match outcome for weight learning
   */
  async recordMatchOutcome(
    matchId: string,
    features: MatchFeatures,
    outcome: MatchOutcome,
    callDuration: number,
    rating?: number,
  ): Promise<void> {
    const outcomeScore = this.outcomeToScore(outcome, callDuration, rating);

    const record = {
      matchId,
      features,
      outcome,
      outcomeScore,
      callDuration,
      rating,
      timestamp: Date.now(),
    };

    // Store in Redis list for batch processing
    await this.redisService.getClient().lPush(
      'matching:outcomes',
      JSON.stringify(record),
    );
    // Keep last 10k outcomes
    await this.redisService.getClient().lTrim('matching:outcomes', 0, 9999);

    this.logger.debug('Match outcome recorded', { matchId, outcome, outcomeScore });
  }

  /**
   * Convert outcome to numeric score (0-100)
   */
  private outcomeToScore(
    outcome: MatchOutcome,
    callDuration: number,
    rating?: number,
  ): number {
    let score = 0;

    // Base score from outcome type
    switch (outcome) {
      case 'excellent': score = 90; break;
      case 'good': score = 70; break;
      case 'neutral': score = 50; break;
      case 'poor': score = 30; break;
      case 'skipped': score = 10; break;
    }

    // Adjust based on call duration
    if (callDuration > 300) score += 10; // 5+ minutes
    else if (callDuration > 120) score += 5; // 2+ minutes
    else if (callDuration < 30) score -= 10; // < 30 seconds

    // Adjust based on rating if available
    if (rating) {
      score = Math.round((score + (rating - 1) * 20) / 2); // Average with rating
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Start periodic weight optimization (every hour)
   */
  private startWeightOptimization(): void {
    setInterval(async () => {
      try {
        await this.optimizeWeights();
      } catch (error) {
        this.logger.error('Weight optimization failed', error);
      }
    }, 3600000); // Every hour
  }

  /**
   * Optimize weights based on recorded outcomes
   * Uses simple gradient descent on feature correlations
   */
  async optimizeWeights(): Promise<void> {
    const outcomes = await this.redisService.getClient().lRange('matching:outcomes', 0, 999);
    if (outcomes.length < 100) {
      this.logger.debug('Not enough data for weight optimization', { count: outcomes.length });
      return;
    }

    const records = outcomes.map(o => JSON.parse(o));

    // Calculate feature-outcome correlations
    const correlations = this.calculateCorrelations(records);

    // Adjust weights based on correlations
    const learningRate = 0.1;
    const newWeights = { ...this.currentWeights };

    if (correlations.region > 0.1) newWeights.region += learningRate * 5;
    if (correlations.region < -0.1) newWeights.region -= learningRate * 5;

    if (correlations.language > 0.1) newWeights.language += learningRate * 5;
    if (correlations.interests > 0.1) newWeights.interests += learningRate * 5;
    if (correlations.age < 0.1) newWeights.age += learningRate * 3;

    // Ensure weights stay in reasonable bounds
    Object.keys(newWeights).forEach(key => {
      newWeights[key as keyof typeof newWeights] = Math.max(
        5,
        Math.min(30, newWeights[key as keyof typeof newWeights]),
      );
    });

    // Save new weights
    const weightConfig: WeightConfig = {
      weights: newWeights,
      version: (await this.getWeightVersion()) + 1,
      lastUpdated: Date.now(),
      sampleSize: records.length,
    };

    await this.redisService.getClient().set(
      'matching:weights',
      JSON.stringify(weightConfig),
    );

    this.currentWeights = newWeights;
    this.logger.log('Weights optimized', { correlations, newWeights });
  }

  private async getWeightVersion(): Promise<number> {
    const data = await this.redisService.getClient().get('matching:weights');
    if (data) {
      const config: WeightConfig = JSON.parse(data);
      return config.version;
    }
    return 0;
  }

  /**
   * Calculate correlations between features and outcomes
   */
  private calculateCorrelations(
    records: Array<{ features: MatchFeatures; outcomeScore: number }>,
  ): Record<string, number> {
    const n = records.length;
    const avgOutcome = records.reduce((sum, r) => sum + r.outcomeScore, 0) / n;

    const correlations: Record<string, number> = {};

    // Region correlation
    const regionMatches = records.filter(r => r.features.regionMatch);
    const regionAvg = regionMatches.length > 0
      ? regionMatches.reduce((sum, r) => sum + r.outcomeScore, 0) / regionMatches.length
      : avgOutcome;
    correlations.region = (regionAvg - avgOutcome) / 100;

    // Language correlation
    const langMatches = records.filter(r => r.features.languageMatch);
    const langAvg = langMatches.length > 0
      ? langMatches.reduce((sum, r) => sum + r.outcomeScore, 0) / langMatches.length
      : avgOutcome;
    correlations.language = (langAvg - avgOutcome) / 100;

    // Interests correlation (average of common interests vs outcome)
    const avgInterests = records.reduce((sum, r) => sum + r.features.commonInterests, 0) / n;
    const interestCorr = records.reduce((sum, r) => {
      const interestDev = r.features.commonInterests - avgInterests;
      const outcomeDev = r.outcomeScore - avgOutcome;
      return sum + interestDev * outcomeDev;
    }, 0) / n;
    correlations.interests = interestCorr / 1000; // Normalize

    // Age correlation (negative means closer ages are better)
    const avgAgeDiff = records.reduce((sum, r) => sum + r.features.ageDiff, 0) / n;
    const ageCorr = records.reduce((sum, r) => {
      const ageDev = r.features.ageDiff - avgAgeDiff;
      const outcomeDev = r.outcomeScore - avgOutcome;
      return sum + ageDev * outcomeDev;
    }, 0) / n;
    correlations.age = -ageCorr / 1000; // Negative correlation is good

    return correlations;
  }

  // ============================================
  // INTEREST SIMILARITY
  // ============================================

  /**
   * Build interest embeddings for semantic similarity
   */
  private buildInterestEmbeddings(): void {
    // Create simple embeddings based on cluster membership
    const allInterests = new Set<string>();
    Object.values(INTEREST_CLUSTERS).forEach(cluster => {
      cluster.forEach(interest => allInterests.add(interest));
    });

    const clusterIds = Object.keys(INTEREST_CLUSTERS);

    allInterests.forEach(interest => {
      const embedding = new Array(clusterIds.length).fill(0);
      clusterIds.forEach((clusterId, idx) => {
        if (INTEREST_CLUSTERS[clusterId].includes(interest)) {
          embedding[idx] = 1;
        }
      });
      this.interestEmbeddings.set(interest, embedding);
    });

    this.logger.log('Interest embeddings built', { count: allInterests.size });
  }

  /**
   * Calculate semantic similarity between two interest lists
   * Returns 0-1 score
   */
  calculateInterestSimilarity(interests1: string[], interests2: string[]): number {
    if (!interests1.length || !interests2.length) return 0;

    // Get embeddings for each interest
    const getClusterIds = (interests: string[]): Set<string> => {
      const clusters = new Set<string>();
      interests.forEach(interest => {
        const normalizedInterest = interest.toLowerCase().replace(/[^a-z-]/g, '');
        Object.entries(INTEREST_CLUSTERS).forEach(([clusterId, clusterInterests]) => {
          if (clusterInterests.some(ci => ci.includes(normalizedInterest) || normalizedInterest.includes(ci))) {
            clusters.add(clusterId);
          }
        });
      });
      return clusters;
    };

    const clusters1 = getClusterIds(interests1);
    const clusters2 = getClusterIds(interests2);

    // Jaccard similarity on clusters
    const intersection = [...clusters1].filter(c => clusters2.has(c)).length;
    const union = new Set([...clusters1, ...clusters2]).size;

    if (union === 0) return 0;

    const clusterSimilarity = intersection / union;

    // Also check exact matches
    const exactMatches = interests1.filter(i1 =>
      interests2.some(i2 => i1.toLowerCase() === i2.toLowerCase()),
    ).length;
    const exactSimilarity = exactMatches / Math.max(interests1.length, interests2.length);

    // Combine both (weighted average)
    return clusterSimilarity * 0.4 + exactSimilarity * 0.6;
  }

  /**
   * Get related interests for a given interest
   */
  getRelatedInterests(interest: string): string[] {
    const normalizedInterest = interest.toLowerCase();
    const related: string[] = [];

    Object.entries(INTEREST_CLUSTERS).forEach(([, clusterInterests]) => {
      if (clusterInterests.some(ci => ci.includes(normalizedInterest) || normalizedInterest.includes(ci))) {
        related.push(...clusterInterests);
      }
    });

    return [...new Set(related)].filter(r => r !== normalizedInterest);
  }

  // ============================================
  // MATCH QUALITY PREDICTION
  // ============================================

  /**
   * Predict match quality before creating the match
   * Returns score (0-100) and confidence (0-1)
   */
  async predictMatchQuality(
    features: MatchFeatures,
  ): Promise<{ score: number; confidence: number }> {
    // Calculate weighted score based on current weights
    let score = 0;
    const weights = this.getWeights();

    // Region score
    if (features.regionMatch) {
      score += weights.region;
    } else {
      score += weights.region * 0.3; // Partial credit for global
    }

    // Language score
    if (features.languageMatch) {
      score += weights.language;
    }

    // Reputation score (similarity is good)
    const repScore = Math.max(0, weights.reputation - features.reputationDiff * 2);
    score += repScore;

    // Interest score (both exact matches and similarity)
    const exactInterestScore = Math.min(features.commonInterests * 7, weights.interests);
    const similarityBonus = features.interestSimilarity * 5;
    score += exactInterestScore + similarityBonus;

    // Age score (closer is better)
    const ageScore = features.ageDiff <= 2 ? weights.age :
                     features.ageDiff <= 5 ? weights.age * 0.7 :
                     features.ageDiff <= 10 ? weights.age * 0.3 : 0;
    score += ageScore;

    // Wait time score
    const waitScore = Math.min(features.waitTimeAvg / 60, 1) * weights.waitTime;
    score += waitScore;

    // Premium bonus
    if (features.isPremiumMatch) {
      score += weights.premium;
    }

    // Normalize to 0-100
    const maxPossible = Object.values(weights).reduce((a, b) => a + b, 0);
    const normalizedScore = Math.round((score / maxPossible) * 100);

    // Calculate confidence based on feature completeness
    let confidence = 1.0;
    if (!features.regionMatch) confidence *= 0.9;
    if (features.commonInterests === 0 && features.interestSimilarity < 0.2) confidence *= 0.7;
    if (features.reputationDiff > 30) confidence *= 0.8;

    // Temporal confidence (more data at certain times = more confident)
    const peakHours = [18, 19, 20, 21, 22]; // Evening hours
    if (!peakHours.includes(features.hourOfDay)) confidence *= 0.9;

    return {
      score: Math.max(0, Math.min(100, normalizedScore)),
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Predict match quality from simple feature set (for REST API)
   */
  async predictMatchQualitySimple(
    features: MatchFeaturesSimple,
  ): Promise<{ score: number; confidence: number }> {
    const weights = await this.getCurrentWeights();

    // Calculate weighted score
    let score = 0;
    let totalWeight = 0;

    score += features.interestSimilarity * weights.interestSimilarity * 100;
    totalWeight += weights.interestSimilarity;

    score += features.languageMatch * weights.languageMatch * 100;
    totalWeight += weights.languageMatch;

    score += features.regionProximity * weights.regionProximity * 100;
    totalWeight += weights.regionProximity;

    score += features.reputationBalance * weights.reputationBalance * 100;
    totalWeight += weights.reputationBalance;

    score += features.premiumBonus * weights.premiumBonus * 100;
    totalWeight += weights.premiumBonus;

    score += features.activityLevel * weights.activityLevel * 100;
    totalWeight += weights.activityLevel;

    score += features.ageCompatibility * weights.ageCompatibility * 100;
    totalWeight += weights.ageCompatibility;

    // Normalize
    const normalizedScore = totalWeight > 0 ? score / (totalWeight * 100) : 0.5;

    // Calculate confidence based on feature quality
    let confidence = 0.7; // Base confidence
    if (features.interestSimilarity > 0.5) confidence += 0.1;
    if (features.languageMatch > 0.5) confidence += 0.1;
    if (features.regionProximity > 0.5) confidence += 0.1;

    return {
      score: Math.round(normalizedScore * 100) / 100,
      confidence: Math.min(1, Math.round(confidence * 100) / 100),
    };
  }

  /**
   * Record match outcome from REST API (simpler interface)
   */
  async recordMatchOutcomeSimple(
    matchId: string,
    features: MatchFeaturesSimple,
    outcomeScore: number,
    callDuration: number,
    rating?: number,
  ): Promise<void> {
    // Convert to internal format
    const internalFeatures: MatchFeatures = {
      regionMatch: features.regionProximity > 0.5,
      languageMatch: features.languageMatch > 0.5,
      ageDiff: Math.round((1 - features.ageCompatibility) * 20), // Convert back to years
      reputationDiff: Math.round((1 - features.reputationBalance) * 50),
      commonInterests: Math.round(features.interestSimilarity * 5),
      interestSimilarity: features.interestSimilarity,
      waitTimeAvg: features.activityLevel * 120, // Convert to seconds
      isPremiumMatch: features.premiumBonus > 0.5,
      hourOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
    };

    // Convert score to outcome
    let outcome: MatchOutcome;
    if (outcomeScore >= 0.8) outcome = 'excellent';
    else if (outcomeScore >= 0.6) outcome = 'good';
    else if (outcomeScore >= 0.4) outcome = 'neutral';
    else if (outcomeScore >= 0.2) outcome = 'poor';
    else outcome = 'skipped';

    await this.recordMatchOutcome(matchId, internalFeatures, outcome, callDuration, rating);
  }

  /**
   * Extract features from two queue users for prediction
   */
  extractFeatures(
    user1: { region: string; language: string; age?: number; reputation?: number; interests?: string[]; isPremium: boolean; timestamp: number },
    user2: { region: string; language: string; age?: number; reputation?: number; interests?: string[]; isPremium: boolean; timestamp: number },
  ): MatchFeatures {
    const now = Date.now();

    return {
      regionMatch: user1.region === user2.region || user1.region === 'global' || user2.region === 'global',
      languageMatch: user1.language === user2.language,
      ageDiff: user1.age && user2.age ? Math.abs(user1.age - user2.age) : 10,
      reputationDiff: Math.abs((user1.reputation || 70) - (user2.reputation || 70)),
      commonInterests: (user1.interests || []).filter(i =>
        (user2.interests || []).includes(i),
      ).length,
      interestSimilarity: this.calculateInterestSimilarity(
        user1.interests || [],
        user2.interests || [],
      ),
      waitTimeAvg: ((now - user1.timestamp) + (now - user2.timestamp)) / 2000, // seconds
      isPremiumMatch: user1.isPremium && user2.isPremium,
      hourOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
    };
  }

  // ============================================
  // A/B TESTING INFRASTRUCTURE
  // ============================================

  /**
   * Get A/B test variant for a user
   */
  async getABTestVariant(userId: string, testId: string): Promise<string | null> {
    const testConfig = await this.getABTestConfig(testId);
    if (!testConfig || !testConfig.isActive) return null;

    // Check if user already assigned
    const assignedVariant = await this.redisService.getClient().hGet(
      `ab:assignments:${testId}`,
      userId,
    );
    if (assignedVariant) return assignedVariant;

    // Assign based on weights
    const variant = this.selectVariant(testConfig.variants, testConfig.weights);

    // Store assignment
    await this.redisService.getClient().hSet(
      `ab:assignments:${testId}`,
      userId,
      variant,
    );

    return variant;
  }

  private selectVariant(variants: string[], weights: number[]): string {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < variants.length; i++) {
      random -= weights[i];
      if (random <= 0) return variants[i];
    }

    return variants[variants.length - 1];
  }

  async getABTestConfig(testId: string): Promise<ABTestConfig | null> {
    const data = await this.redisService.getClient().get(`ab:tests:${testId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Create a new A/B test
   */
  async createABTest(
    testId: string,
    variants: string[],
    weights?: number[],
  ): Promise<ABTestConfig> {
    const config: ABTestConfig = {
      testId,
      variants,
      weights: weights || variants.map(() => 1), // Equal weights by default
      isActive: true,
      startedAt: Date.now(),
    };

    await this.redisService.getClient().set(
      `ab:tests:${testId}`,
      JSON.stringify(config),
    );

    this.logger.log('A/B test created', { testId, variants });
    return config;
  }

  /**
   * Record A/B test outcome
   */
  async recordABTestOutcome(
    testId: string,
    variant: string,
    metric: string,
    value: number,
  ): Promise<void> {
    const key = `ab:metrics:${testId}:${variant}:${metric}`;

    await this.redisService.getClient().lPush(key, value.toString());
    await this.redisService.getClient().lTrim(key, 0, 9999);
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string): Promise<Record<string, Record<string, { mean: number; count: number }>>> {
    const config = await this.getABTestConfig(testId);
    if (!config) return {};

    const results: Record<string, Record<string, { mean: number; count: number }>> = {};
    const metrics = ['match_quality', 'call_duration', 'skip_rate'];

    for (const variant of config.variants) {
      results[variant] = {};

      for (const metric of metrics) {
        const key = `ab:metrics:${testId}:${variant}:${metric}`;
        const values = await this.redisService.getClient().lRange(key, 0, -1);

        if (values.length > 0) {
          const nums = values.map(v => parseFloat(v));
          results[variant][metric] = {
            mean: nums.reduce((a, b) => a + b, 0) / nums.length,
            count: nums.length,
          };
        }
      }
    }

    return results;
  }

  // ============================================
  // ANALYTICS & INSIGHTS
  // ============================================

  /**
   * Get optimization insights
   */
  async getOptimizationInsights(): Promise<{
    currentWeights: typeof DEFAULT_WEIGHTS;
    defaultWeights: typeof DEFAULT_WEIGHTS;
    weightChanges: Record<string, number>;
    topInterestClusters: string[];
    recentOutcomeStats: { avgScore: number; sampleSize: number };
  }> {
    const outcomes = await this.redisService.getClient().lRange('matching:outcomes', 0, 999);
    const records = outcomes.map(o => JSON.parse(o));

    const weightChanges: Record<string, number> = {};
    Object.keys(DEFAULT_WEIGHTS).forEach(key => {
      weightChanges[key] = this.currentWeights[key as keyof typeof DEFAULT_WEIGHTS] -
                          DEFAULT_WEIGHTS[key as keyof typeof DEFAULT_WEIGHTS];
    });

    return {
      currentWeights: this.currentWeights,
      defaultWeights: DEFAULT_WEIGHTS,
      weightChanges,
      topInterestClusters: Object.keys(INTEREST_CLUSTERS).slice(0, 5),
      recentOutcomeStats: {
        avgScore: records.length > 0
          ? records.reduce((sum, r) => sum + r.outcomeScore, 0) / records.length
          : 0,
        sampleSize: records.length,
      },
    };
  }
}
