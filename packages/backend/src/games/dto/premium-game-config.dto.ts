export class PremiumGameConfigDto {
  isPremium: boolean;
  timePerQuestion: number;
  scoreMultiplier: number;
  allowedDifficulties: string[];
  gamesPlayedToday: number;
  dailyLimit: number;
  canPlayMore: boolean;
  showAds: boolean;
  gamesRemainingToday: number;
}

export class GameStartResponseDto {
  gameSessionId: string;
  firstQuestion: {
    id: string;
    question: string;
    options: string[];
  };
  totalQuestions: number;
  timePerQuestion: number;
  isPremium: boolean;
  scoreMultiplier: number;
  showAds: boolean;
}

export class GameFeaturesDto {
  showAds: boolean;
  hardDifficultyAvailable: boolean;
  extraTimePerQuestion: number;
  bonusPointsPerAnswer: number;
  scoreMultiplier: number;
  gamesRemainingToday: number;
}
