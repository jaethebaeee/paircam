/**
 * Admin Analytics Response DTOs
 */

export class GameAnalyticsDto {
  totalGames: number;
  completedGames: number;
  abandonedGames: number;
  averageGameDuration: number;
  averageScore: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  totalGamesDatabase: number;
  completedGamesDatabase: number;
}

export class UserAnalyticsDto {
  total: number;
  premium: number;
  free: number;
  conversionRate: number;
}

export class OverallAnalyticsResponseDto {
  timeRange: '1h' | '24h' | '7d';
  metrics: GameAnalyticsDto;
  users: UserAnalyticsDto;
  timestamp: Date;
}

export class LeaderboardUserDto {
  userId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalScore: number;
  averageScore: number;
  winRate: number;
}

export class LeaderboardResponseDto {
  sortBy: 'wins' | 'score' | 'gamesPlayed';
  limit: number;
  leaderboard: LeaderboardUserDto[];
  timestamp: Date;
}

export class UserGameStatsDto {
  user: {
    id: string;
    deviceId: string;
    isPremium: boolean;
    createdAt: Date;
  };
  gameStats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    totalScore: number;
    averageScore: number;
    totalCorrectAnswers: number;
    totalQuestions: number;
    accuracy: number;
  };
  premiumStatus: {
    isPremium: boolean;
    gamesRemainingToday: number;
    dailyLimit: number;
  };
  analyticsStats: {
    gamesPlayed: number;
    wins: number;
    correctAnswers: number;
    incorrectAnswers: number;
    averageScore: number;
    averageResponseTime: number;
  };
  timestamp: Date;
}

export class DifficultyStatsDto {
  easy: {
    total: number;
    completed: number;
    avgDuration: number;
    avgScore: number;
  };
  medium: {
    total: number;
    completed: number;
    avgDuration: number;
    avgScore: number;
  };
  hard: {
    total: number;
    completed: number;
    avgDuration: number;
    avgScore: number;
  };
}

export class DifficultyStatsResponseDto {
  difficultyStats: DifficultyStatsDto;
  timestamp: Date;
}

export class PremiumMetricsDto {
  users: {
    total: number;
    premium: number;
    free: number;
    conversionRate: number;
  };
  games: {
    total: number;
    playedByPremium: number;
    playedByFree: number;
    premiumEngagementRatio: number;
  };
  averageGamesPerUser: {
    premium: number;
    free: number;
  };
  timestamp: Date;
}

export class FeatureComparisonDto {
  feature: string;
  free: string;
  premium: string;
}

export class FeatureComparisonResponseDto {
  features: FeatureComparisonDto[];
  timestamp: Date;
}
