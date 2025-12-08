import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Query,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GameService, WalletService, GiftService, MissionService, LeaderboardService, type LeaderboardEntry } from './services';
import { StartGameDto, GameMoveDto, SendGiftDto, GetLeaderboardDto } from './dtos';

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(
    private gameService: GameService,
    private walletService: WalletService,
    private giftService: GiftService,
    private missionService: MissionService,
    private leaderboardService: LeaderboardService,
  ) {}

  /**
   * START GAME
   */
  @Post('start')
  async startGame(
    @Req() req: { user: { id: string } },
    @Body() dto: { gameType: string; peerId: string; sessionId: string },
  ) {
    if (!['tic-tac-toe', 'trivia', 'truth-dare', '20-questions'].includes(dto.gameType)) {
      throw new BadRequestException('Invalid game type');
    }

    const game = await this.gameService.startGame(
      dto.sessionId,
      req.user.id,
      dto.peerId,
      dto.gameType as any,
    );

    return {
      gameId: game.id,
      gameType: game.type,
      reward: this.gameService.getGameReward(game.type),
    };
  }

  /**
   * MAKE MOVE
   */
  @Post(':gameId/move')
  async makeMove(
    @Req() req: { user: { id: string } },
    @Param('gameId') gameId: string,
    @Body() dto: GameMoveDto,
  ) {
    const game = await this.gameService.makeMove(gameId, req.user.id, dto.move);

    return {
      gameId: game.id,
      status: game.status,
      state: game.state,
      winner: game.winnerId,
      reward: game.winnerId ? this.gameService.getGameReward(game.type) : 0,
    };
  }

  /**
   * DECLINE GAME
   */
  @Post(':gameId/decline')
  async declineGame(
    @Req() req: { user: { id: string } },
    @Param('gameId') gameId: string,
  ) {
    const game = await this.gameService.declineGame(gameId);

    return {
      gameId: game.id,
      status: game.status,
    };
  }

  /**
   * GET GAME
   */
  @Get(':gameId')
  async getGame(@Param('gameId') gameId: string) {
    const game = await this.gameService.getGame(gameId);

    return {
      id: game.id,
      type: game.type,
      status: game.status,
      state: game.state,
      winner: game.winnerId,
      player1Score: game.player1Score,
      player2Score: game.player2Score,
    };
  }

  /**
   * GET USER GAME HISTORY
   */
  @Get('history/me')
  async getMyGameHistory(
    @Req() req: { user: { id: string } },
    @Query('limit') limit: string = '10',
  ) {
    const games = await this.gameService.getUserGameHistory(req.user.id, parseInt(limit));

    return {
      total: games.length,
      games: games.map(g => ({
        id: g.id,
        type: g.type,
        status: g.status,
        winner: g.winnerId,
        opponent: g.player1Id === req.user.id ? g.player2?.username : g.player1?.username,
        createdAt: g.createdAt,
      })),
    };
  }

  // ==================== WALLET ENDPOINTS ====================

  /**
   * GET WALLET
   */
  @Get('wallet/me')
  async getMyWallet(@Req() req: { user: { id: string } }) {
    const wallet = await this.walletService.getOrCreateWallet(req.user.id);

    return {
      coinsBalance: wallet.coinsBalance,
      gemsBalance: wallet.gemsBalance,
      totalCoinsEarned: wallet.totalCoinsEarned,
      totalCoinsSpent: wallet.totalCoinsSpent,
      currentStreak: wallet.currentStreak,
    };
  }

  /**
   * WALLET STATS
   */
  @Get('wallet/stats/me')
  async getWalletStats(@Req() req: { user: { id: string } }) {
    return this.walletService.getWalletStats(req.user.id);
  }

  // ==================== GIFT ENDPOINTS ====================

  /**
   * GET ALL GIFTS
   */
  @Get('gifts/catalog')
  async getGiftCatalog() {
    const gifts = await this.giftService.getAllGifts();

    return {
      gifts: gifts.map(g => ({
        id: g.id,
        name: g.name,
        costCoins: g.costCoins,
        imageUrl: g.imageUrl,
        rarity: g.rarity,
      })),
    };
  }

  /**
   * SEND GIFT
   */
  @Post('gifts/send')
  async sendGift(
    @Req() req: { user: { id: string } },
    @Body() dto: { giftId: string; toUserId: string; sessionId?: string },
  ) {
    const transaction = await this.giftService.sendGift(
      req.user.id,
      dto.toUserId,
      dto.giftId,
      dto.sessionId,
    );

    const wallet = await this.walletService.getWallet(req.user.id);

    return {
      transactionId: transaction.id,
      giftName: transaction.gift.name,
      coinsSpent: transaction.costCoins,
      newBalance: wallet.coinsBalance,
    };
  }

  /**
   * GET GIFTS RECEIVED
   */
  @Get('gifts/received')
  async getGiftsReceived(@Req() req: { user: { id: string } }) {
    const transactions = await this.giftService.getGiftsReceived(req.user.id);

    return {
      total: transactions.length,
      gifts: transactions.map(t => ({
        id: t.id,
        from: t.fromUser?.username,
        giftName: t.gift.name,
        rarity: t.gift.rarity,
        receivedAt: t.sentAt,
      })),
    };
  }

  /**
   * GET GIFT STATS
   */
  @Get('gifts/stats/me')
  async getGiftStats(@Req() req: { user: { id: string } }) {
    return this.giftService.getGiftStats(req.user.id);
  }

  // ==================== MISSION ENDPOINTS ====================

  /**
   * GET TODAY'S MISSIONS
   */
  @Get('missions/today')
  async getTodaysMissions(@Req() req: { user: { id: string } }) {
    const missions = await this.missionService.getTodaysMissions(req.user.id);

    return {
      missions: missions.map(m => ({
        id: m.id,
        type: m.missionType,
        target: m.target,
        progress: m.progress,
        coinsReward: m.coinsReward,
        completed: !!m.completedAt,
        expiresAt: m.expiresAt,
      })),
    };
  }

  /**
   * CLAIM MISSION REWARD
   */
  @Post('missions/:missionId/claim')
  async claimMissionReward(
    @Req() req: { user: { id: string } },
    @Param('missionId') missionId: string,
  ) {
    const mission = await this.missionService.claimReward(req.user.id, missionId);

    return {
      missionId: mission.id,
      coinsRewarded: mission.coinsReward,
    };
  }

  // ==================== LEADERBOARD ENDPOINTS ====================

  /**
   * GET WEEKLY LEADERBOARD
   */
  @Get('leaderboard/weekly')
  async getWeeklyLeaderboard(@Query('limit') limit: string = '100'): Promise<{ leaderboard: LeaderboardEntry[] }> {
    const leaderboard = await this.leaderboardService.getWeeklyLeaderboard(parseInt(limit));

    return { leaderboard };
  }

  /**
   * GET ALL-TIME LEADERBOARD
   */
  @Get('leaderboard/all-time')
  async getAllTimeLeaderboard(@Query('limit') limit: string = '100'): Promise<{ leaderboard: LeaderboardEntry[] }> {
    const leaderboard = await this.leaderboardService.getAllTimeLeaderboard(parseInt(limit));

    return { leaderboard };
  }

  /**
   * GET MY LEADERBOARD RANK
   */
  @Get('leaderboard/rank/me')
  async getMyLeaderboardRank(
    @Req() req: { user: { id: string } },
    @Query('period') period: 'weekly' | 'all-time' = 'weekly',
  ) {
    const rank = await this.leaderboardService.getUserLeaderboardRank(req.user.id, period);

    return {
      period,
      rank: rank?.rank || null,
      pointsToNext: rank?.pointsToNext || 0,
    };
  }

  /**
   * GET GAME STATS
   */
  @Get('stats/me')
  async getMyGameStats(@Req() req: { user: { id: string } }) {
    return this.leaderboardService.getUserGameStats(req.user.id);
  }
}
