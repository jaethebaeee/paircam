export class StartGameDto {
  gameType: 'tic-tac-toe' | 'trivia' | 'truth-dare' | '20-questions';
}

export class GameMoveDto {
  gameId: string;
  move: any; // Move-specific data
}

export class SendGiftDto {
  giftId: string;
  sessionId: string; // Video call session ID
}

export class PurchaseCoinsDto {
  amount: number; // 100, 500, 1000, 2500 coins
  currency: string; // 'usd'
}

export class GetLeaderboardDto {
  period?: 'weekly' | 'all-time' | 'monthly';
  limit?: number; // default 100
}
