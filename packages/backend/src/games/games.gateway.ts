import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  WebSocketServer,
  Inject,
  forwardRef,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TriviaService } from './services/trivia.service';
import { GameAnalyticsService } from './services/game-analytics.service';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { LoggerService } from '../services/logger.service';
import { RedisPubSubService } from '../redis/redis-pubsub.service';
import {
  StartGamePayload,
  SubmitAnswerPayload,
  GameStartedEvent,
  NewQuestionEvent,
  ScoreUpdateEvent,
  GameEndedEvent,
} from './types/game.types';

@WebSocketGateway({
  namespace: '/signaling',
})
export class GamesGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track active games per session for cleanup
  private activeGames = new Map<string, string>(); // sessionId -> gameSessionId

  constructor(
    private readonly triviaService: TriviaService,
    private readonly gameAnalytics: GameAnalyticsService,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly redisPubSub: RedisPubSubService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Handle game start request
   * Both users must be connected for game to start
   */
  @SubscribeMessage('start-game')
  async handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StartGamePayload,
  ): Promise<void> {
    try {
      const deviceId = client.data.deviceId;
      if (!deviceId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Validate input
      if (!data.sessionId || !data.difficulty) {
        client.emit('error', { message: 'Missing required fields' });
        return;
      }

      // Start game
      const gameData = await this.triviaService.startGame(data.sessionId, data.difficulty);

      // Store game session ID for cleanup on disconnect
      this.activeGames.set(data.sessionId, gameData.gameSessionId);

      // Get session to find both peers
      const session = await this.redisService.getSession<{ peers: string[] }>(data.sessionId);
      if (!session) {
        client.emit('error', { message: 'Session not found' });
        return;
      }

      // Track analytics
      await this.gameAnalytics.trackGameCreated({
        gameSessionId: gameData.gameSessionId,
        user1Id: session.peers[0],
        user2Id: session.peers[1],
        difficulty: data.difficulty,
        questionCount: gameData.totalQuestions,
      });

      // Send to both users
      const gameStartedEvent: GameStartedEvent = {
        gameSessionId: gameData.gameSessionId,
        totalQuestions: gameData.totalQuestions,
        timePerQuestion: gameData.timePerQuestion,
      };

      const questionEvent: NewQuestionEvent = {
        questionNumber: 1,
        totalQuestions: gameData.totalQuestions,
        question: gameData.firstQuestion.question,
        options: this.shuffleOptions([
          gameData.firstQuestion.correct_answer,
          ...gameData.firstQuestion.incorrect_answers,
        ]),
        timeLimit: gameData.timePerQuestion,
      };

      await this.emitToSessionPeers(data.sessionId, 'game-started', gameStartedEvent);
      await this.emitToSessionPeers(data.sessionId, 'new-question', questionEvent);

      this.logger.debug('Game started and distributed', {
        gameSessionId: gameData.gameSessionId,
        sessionId: data.sessionId,
      });
    } catch (error) {
      this.logger.error('Error starting game', error instanceof Error ? error.message : 'Unknown error');
      client.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to start game',
      });
    }
  }

  /**
   * Handle answer submission
   * Scores are calculated and sent to both users
   */
  @SubscribeMessage('submit-answer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubmitAnswerPayload,
  ): Promise<void> {
    try {
      const deviceId = client.data.deviceId;
      if (!deviceId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Validate input
      if (!data.gameSessionId || !data.sessionId || data.questionNumber < 1 || !data.answer) {
        client.emit('error', { message: 'Missing required fields' });
        return;
      }

      // Get user
      const user = await this.usersService.findOrCreate(deviceId);

      // Submit answer
      const result = await this.triviaService.submitAnswer({
        gameSessionId: data.gameSessionId,
        userId: user.id,
        questionNumber: data.questionNumber,
        answer: data.answer,
        timeSpent: data.timeSpent,
      });

      // Track analytics
      await this.gameAnalytics.trackAnswerSubmitted({
        gameSessionId: data.gameSessionId,
        userId: user.id,
        questionNumber: data.questionNumber,
        correct: result.isCorrect,
        timeSpent: data.timeSpent,
      });

      // Send score update to both
      const scoreUpdateEvent: ScoreUpdateEvent = {
        user1Score: result.user1Score,
        user2Score: result.user2Score,
      };

      await this.emitToSessionPeers(data.sessionId, 'score-update', scoreUpdateEvent);

      // Send next question or game end
      if (result.nextQuestion) {
        const nextQuestionEvent: NewQuestionEvent = {
          questionNumber: data.questionNumber + 1,
          question: result.nextQuestion.question,
          options: this.shuffleOptions([
            result.nextQuestion.correct_answer,
            ...result.nextQuestion.incorrect_answers,
          ]),
          timeLimit: 15,
        };

        await this.emitToSessionPeers(data.sessionId, 'new-question', nextQuestionEvent);
      } else {
        // Game over
        const finalResult = await this.triviaService.completeGame(data.gameSessionId);

        // Track completion
        const gameSession = await this.triviaService.getGameSession(data.gameSessionId);
        await this.gameAnalytics.trackGameCompleted({
          gameSessionId: data.gameSessionId,
          winnerId: finalResult.winnerId,
          user1Id: gameSession.user1Id,
          user1Score: finalResult.user1Score,
          user2Id: gameSession.user2Id,
          user2Score: finalResult.user2Score,
          durationSeconds: gameSession.durationSeconds || 0,
          difficulty: gameSession.gameConfig.difficulty,
        });

        const gameEndedEvent: GameEndedEvent = {
          winnerId: finalResult.winnerId,
          user1Score: finalResult.user1Score,
          user2Score: finalResult.user2Score,
        };

        await this.emitToSessionPeers(data.sessionId, 'game-ended', gameEndedEvent);

        // Clean up active game tracking
        this.activeGames.delete(data.sessionId);
      }
    } catch (error) {
      this.logger.error('Error submitting answer', error instanceof Error ? error.message : 'Unknown error');
      client.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to submit answer',
      });
    }
  }

  /**
   * Handle game abandonment (user manually quits)
   */
  @SubscribeMessage('abandon-game')
  async handleAbandonGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameSessionId: string; sessionId: string },
  ): Promise<void> {
    try {
      const deviceId = client.data.deviceId;
      if (!deviceId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const user = await this.usersService.findOrCreate(deviceId);

      await this.triviaService.abandonGame(data.gameSessionId, user.id);
      await this.gameAnalytics.trackGameAbandoned({
        gameSessionId: data.gameSessionId,
        userId: user.id,
        durationSeconds: 0, // Approximate
      });

      this.activeGames.delete(data.sessionId);

      // Notify peer
      await this.emitToSessionPeers(data.sessionId, 'game-abandoned', {
        userId: user.id,
      });

      this.logger.debug('Game abandoned', {
        gameSessionId: data.gameSessionId,
        userId: user.id,
      });
    } catch (error) {
      this.logger.error('Error abandoning game', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle disconnect
   * Clean up active games if user disconnects mid-game
   */
  async handleDisconnect(client: Socket): Promise<void> {
    const deviceId = client.data.deviceId;
    if (!deviceId) return;

    // Find active games for this device
    for (const [sessionId, gameSessionId] of this.activeGames.entries()) {
      try {
        const user = await this.usersService.findOrCreate(deviceId);
        await this.triviaService.abandonGame(gameSessionId, user.id);
        await this.gameAnalytics.trackGameAbandoned({
          gameSessionId,
          userId: user.id,
          durationSeconds: 0,
        });

        this.activeGames.delete(sessionId);

        this.logger.debug('Game cleaned up on disconnect', {
          gameSessionId,
          userId: user.id,
        });
      } catch (error) {
        this.logger.error('Error cleaning up game on disconnect', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  /**
   * Emit event to both peers in a session
   * Supports both local and distributed (Redis Pub/Sub) delivery
   */
  private async emitToSessionPeers(
    sessionId: string,
    eventName: string,
    data: unknown,
  ): Promise<void> {
    const session = await this.redisService.getSession<{ peers: string[] }>(sessionId);
    if (!session || !session.peers) {
      this.logger.warn('Session not found for peer emission', { sessionId });
      return;
    }

    for (const peerId of session.peers) {
      // Try to emit locally first
      const peerSocket = this.findSocketByDeviceId(peerId);
      if (peerSocket) {
        peerSocket.emit(eventName, data);
      } else {
        // Distributed emission via Redis Pub/Sub
        await this.redisPubSub.publish(`game:${sessionId}:${peerId}`, {
          type: 'game-event',
          eventName,
          data,
        });
      }
    }
  }

  /**
   * Find socket by device ID in connected clients
   * Since both GamesGateway and SignalingGateway use the same /signaling namespace,
   * they share the same Socket.IO server instance and can access sockets directly
   */
  private findSocketByDeviceId(deviceId: string): Socket | null {
    // Note: In production with multiple server instances, this would need to be
    // refactored to use Redis-backed socket discovery. For now, we rely on
    // Redis Pub/Sub for cross-instance communication (see emitToSessionPeers).
    // In a single instance, sockets connected to this instance will be found here.

    // Get all sockets in the /signaling namespace
    const namespace = this.server?.of('/signaling');
    if (!namespace) return null;

    // Iterate through connected sockets to find by deviceId
    for (const [, socket] of namespace.sockets) {
      if (socket.data?.deviceId === deviceId) {
        return socket;
      }
    }

    return null;
  }

  /**
   * Shuffle options array for multiple choice
   */
  private shuffleOptions(options: string[]): string[] {
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
