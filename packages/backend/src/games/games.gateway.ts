import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BadRequestException } from '@nestjs/common';
import { LoggerService } from '../services/logger.service';
import {
  GameService,
  WalletService,
  GiftService,
  MissionService,
  LeaderboardService,
} from './services';
import { JwtService } from '@nestjs/jwt';
// Analytics tracking (optional - implement when amplitude is configured)

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  },
  namespace: '/games',
})
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clientToUser = new Map<string, string>();

  constructor(
    private gameService: GameService,
    private walletService: WalletService,
    private giftService: GiftService,
    private missionService: MissionService,
    private leaderboardService: LeaderboardService,
    private jwtService: JwtService,
    private logger: LoggerService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      this.clientToUser.set(client.id, decoded.sub);
      this.logger.log(`🎮 Game client connected: ${client.id} (user: ${decoded.sub})`);
    } catch (error) {
      this.logger.error('Game connection auth failed:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.clientToUser.delete(client.id);
    this.logger.log(`🎮 Game client disconnected: ${client.id}`);
  }

  /**
   * START GAME
   * Client emits: 'game-start' with gameType, peerId, sessionId
   */
  @SubscribeMessage('game-start')
  async handleGameStart(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      gameType: 'tic-tac-toe' | 'trivia' | 'truth-dare' | '20-questions';
      peerId: string;
      sessionId: string;
    },
  ) {
    try {
      const userId = this.clientToUser.get(client.id);
      if (!userId) throw new BadRequestException('Not authenticated');

      // Validate game type
      if (!['tic-tac-toe', 'trivia', 'truth-dare', '20-questions'].includes(data.gameType)) {
        throw new BadRequestException('Invalid game type');
      }

      // Create game
      const game = await this.gameService.startGame(
        data.sessionId,
        userId,
        data.peerId,
        data.gameType,
      );

      // Notify both players
      this.server.to(data.sessionId).emit('game-invite', {
        gameId: game.id,
        gameType: game.type,
        fromUser: userId,
        reward: this.gameService.getGameReward(game.type),
      });

      // TODO: Track analytics (amplitude.track when configured)

      return {
        success: true,
        gameId: game.id,
        gameType: game.type,
      };
    } catch (error) {
      this.logger.error('Game start error:', error.message);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * ACCEPT GAME
   * Client emits: 'game-accept' with gameId
   */
  @SubscribeMessage('game-accept')
  async handleGameAccept(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; sessionId: string },
  ) {
    try {
      const game = await this.gameService.getGame(data.gameId);

      // Emit to both players that game is starting
      this.server.to(data.sessionId).emit('game-accepted', {
        gameId: game.id,
        state: game.state,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Game accept error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * MAKE GAME MOVE
   * Client emits: 'game-move' with gameId and move data
   */
  @SubscribeMessage('game-move')
  async handleGameMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; move: any; sessionId: string },
  ) {
    try {
      const userId = this.clientToUser.get(client.id);
      if (!userId) throw new BadRequestException('Not authenticated');

      // Apply move
      const updatedGame = await this.gameService.makeMove(
        data.gameId,
        userId,
        data.move,
      );

      // Broadcast game state to both players
      this.server.to(data.sessionId).emit('game-state-update', {
        gameId: data.gameId,
        state: updatedGame.state,
        status: updatedGame.status,
      });

      // If game ended, handle completion
      if (updatedGame.status === 'completed') {
        const winnerId = updatedGame.winnerId;
        const reward = this.gameService.getGameReward(updatedGame.type);

        // Reward winner with coins
        if (winnerId) {
          const wallet = await this.walletService.rewardCoins(
            winnerId,
            reward,
            `${updatedGame.type}-win`,
          );

          // Update mission progress
          await this.missionService.updateProgress(winnerId, 'game_wins', 1);

          // Update leaderboard
          await this.leaderboardService.updateLeaderboard(winnerId, updatedGame.type);

          // Notify winner
          this.server.to(data.sessionId).emit('game-end', {
            gameId: data.gameId,
            winner: winnerId,
            loser: winnerId === updatedGame.player1Id ? updatedGame.player2Id : updatedGame.player1Id,
            reward,
            newBalance: wallet.coinsBalance,
          });

          // TODO: Track analytics (amplitude.track when configured)
        }
      }

      return { success: true, status: updatedGame.status };
    } catch (error) {
      this.logger.error('Game move error:', error.message);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * DECLINE GAME
   * Client emits: 'game-decline' with gameId
   */
  @SubscribeMessage('game-decline')
  async handleGameDecline(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    try {
      await this.gameService.declineGame(data.gameId);

      return { success: true };
    } catch (error) {
      this.logger.error('Game decline error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * SEND GIFT
   * Client emits: 'send-gift' with giftId, toUserId, sessionId
   */
  @SubscribeMessage('send-gift')
  async handleSendGift(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { giftId: string; toUserId: string; sessionId: string },
  ) {
    try {
      const userId = this.clientToUser.get(client.id);
      if (!userId) throw new BadRequestException('Not authenticated');

      // Send gift (deducts coins)
      const transaction = await this.giftService.sendGift(
        userId,
        data.toUserId,
        data.giftId,
        data.sessionId,
      );

      const wallet = await this.walletService.getWallet(userId);

      // Notify both players
      this.server.to(data.sessionId).emit('gift-sent', {
        fromUser: userId,
        toUser: data.toUserId,
        giftName: transaction.gift.name,
        giftRarity: transaction.gift.rarity,
        coinsSpent: transaction.costCoins,
        newBalance: wallet.coinsBalance,
      });

      // TODO: Track analytics (amplitude.track when configured)

      return { success: true, newBalance: wallet.coinsBalance };
    } catch (error) {
      this.logger.error('Send gift error:', error.message);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * HELPER: Extract JWT from Socket
   */
  private extractToken(client: Socket): string | null {
    const auth = client.handshake?.auth;
    const token = auth?.token || auth?.Authorization?.replace('Bearer ', '');
    return token || null;
  }
}
