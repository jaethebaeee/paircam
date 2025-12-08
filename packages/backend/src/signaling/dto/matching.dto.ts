import { IsString, IsNumber, IsOptional, IsArray, IsEnum, Min, Max, IsBoolean } from 'class-validator';

export class UpdateMatchingPreferencesDto {
  @IsOptional()
  @IsEnum(['casual', 'serious', 'language', 'gaming'])
  queueType?: 'casual' | 'serious' | 'language' | 'gaming';

  @IsOptional()
  @IsEnum(['any', 'male', 'female'])
  genderPreference?: 'any' | 'male' | 'female';

  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(100)
  minAge?: number;

  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(100)
  maxAge?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  nativeLanguage?: string;

  @IsOptional()
  @IsString()
  learningLanguage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredMatchTypes?: string[];
}

export class SubmitMatchFeedbackDto {
  @IsString()
  matchId: string;

  @IsString()
  sessionId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;
}

export class BlockUserDto {
  @IsString()
  targetUserId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class MatchHistoryQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

// Response DTOs
export class QueueStatusResponse {
  inQueue: boolean;
  position?: number;
  queueLength: number;
  estimatedWaitTime?: number;
  isPremium: boolean;
  queueType?: string;
}

export class QueueStatsResponse {
  totalInQueue: number;
  averageWaitTime: number;
  regionDistribution: Record<string, number>;
  queueTypeDistribution: Record<string, number>;
  premiumCount: number;
  averageReputation: number;
  performanceMetrics: {
    totalRuns: number;
    avgDuration: number;
    avgComparisons: number;
    avgUsers: number;
    efficiency: string;
  };
}

export class ReputationResponse {
  rating: number;
  totalRatings: number;
  skipRate: number;
  reportCount: number;
  averageCallDuration: number;
  lastUpdated: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export class MatchHistoryItem {
  matchId: string;
  sessionId: string;
  peerId: string;
  timestamp: number;
  duration?: number;
  rating?: number;
  tags?: string[];
  compatibilityScore?: number;
}

export class MatchStatisticsResponse {
  totalMatches: number;
  averageCallDuration: number;
  averageRating: number;
  totalCallTime: number;
  matchesThisWeek: number;
  longestCall: number;
  ratingDistribution: Record<number, number>;
  topInterests: string[];
}

export class BlockedUserResponse {
  userId: string;
  blockedAt: number;
  reason?: string;
}

export class PreferencesResponse {
  queueType: string;
  genderPreference: string;
  minAge?: number;
  maxAge?: number;
  interests: string[];
  nativeLanguage?: string;
  learningLanguage?: string;
  preferredMatchTypes: string[];
}
