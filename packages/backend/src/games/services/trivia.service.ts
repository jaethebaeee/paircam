import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSession } from '../entities/game-session.entity';
import { OpenTriviaDatabaseService } from './open-trivia-db.service';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import { LoggerService } from '../../services/logger.service';
import {
  TriviaQuestion,
  GameUserAnswer,
  GameUserResults,
  GameConfig,
} from '../types/game.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TriviaService {
  private readonly GAME_TTL = 3600; // 1 hour
  private readonly QUESTIONS_PER_GAME = 10;
  private readonly DEFAULT_TIME_PER_QUESTION = 15; // seconds

  constructor(
    @InjectRepository(GameSession)
    private readonly gameSessionRepository: Repository<GameSession>,
    private readonly openTriviaDb: OpenTriviaDatabaseService,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Start a new trivia game between two users in a session
   */
  async startGame(sessionId: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<{
    gameSessionId: string;
    firstQuestion: TriviaQuestion;
    totalQuestions: number;
    timePerQuestion: number;
  }> {
    // Get session data from Redis
    const session = await this.redisService.getSession<{ peers: string[] }>(sessionId);
    if (!session || !session.peers || session.peers.length !== 2) {
      throw new NotFoundException('Session not found or invalid');
    }

    const [user1Id, user2Id] = session.peers;

    // Fetch questions from Open Trivia DB
    const questions = await this.openTriviaDb.getQuestions({
      amount: this.QUESTIONS_PER_GAME,
      difficulty,
      type: 'multiple',
    });

    if (questions.length === 0) {
      throw new BadRequestException('Failed to load trivia questions');
    }

    // Create game session in database
    const gameConfig: GameConfig = {
      difficulty,
      questionCount: this.QUESTIONS_PER_GAME,
      timePerQuestion: this.DEFAULT_TIME_PER_QUESTION,
    };

    const gameSession = this.gameSessionRepository.create({
      sessionId,
      user1Id,
      user2Id,
      gameConfig,
      startedAt: new Date(),
    });

    const savedGameSession = await this.gameSessionRepository.save(gameSession);

    // Store questions in Redis (shared state)
    const questionsKey = `game:${savedGameSession.id}:questions`;
    await this.redisService.getClient().setEx(
      questionsKey,
      this.GAME_TTL,
      JSON.stringify(questions),
    );

    // Initialize answer storage for both users
    const answers1Key = `game:${savedGameSession.id}:answers:${user1Id}`;
    const answers2Key = `game:${savedGameSession.id}:answers:${user2Id}`;

    await this.redisService.getClient().setEx(
      answers1Key,
      this.GAME_TTL,
      JSON.stringify([]),
    );

    await this.redisService.getClient().setEx(
      answers2Key,
      this.GAME_TTL,
      JSON.stringify([]),
    );

    // Store game metadata (including passed timePerQuestion for consistency)
    await this.redisService.getClient().setEx(
      `game:${savedGameSession.id}:metadata`,
      this.GAME_TTL,
      JSON.stringify({
        user1Id,
        user2Id,
        startedAt: new Date(),
        questionCount: this.QUESTIONS_PER_GAME,
        timePerQuestion: this.DEFAULT_TIME_PER_QUESTION,
      }),
    );

    this.logger.debug('Game started', {
      gameSessionId: savedGameSession.id,
      sessionId,
      user1Id,
      user2Id,
      difficulty,
      questionCount: questions.length,
    });

    return {
      gameSessionId: savedGameSession.id,
      firstQuestion: questions[0],
      totalQuestions: questions.length,
      timePerQuestion: this.DEFAULT_TIME_PER_QUESTION,
    };
  }

  /**
   * Check if both users have answered all questions (game is complete)
   */
  private async isGameComplete(gameSessionId: string): Promise<boolean> {
    const gameSession = await this.gameSessionRepository.findOne({
      where: { id: gameSessionId },
    });

    if (!gameSession) {
      return false;
    }

    const user1Answers = await this.getAnswers(gameSessionId, gameSession.user1Id);
    const user2Answers = await this.getAnswers(gameSessionId, gameSession.user2Id);

    return (
      user1Answers.length === this.QUESTIONS_PER_GAME &&
      user2Answers.length === this.QUESTIONS_PER_GAME
    );
  }

  /**
   * Submit an answer to a trivia question
   */
  async submitAnswer(data: {
    gameSessionId: string;
    userId: string;
    questionNumber: number;
    answer: string;
    timeSpent: number;
  }): Promise<{
    correctAnswer: string;
    isCorrect: boolean;
    user1Score: number;
    user2Score: number;
    user1CorrectAnswers: number;
    user2CorrectAnswers: number;
    nextQuestion: TriviaQuestion | null;
    gameComplete: boolean;
  }> {
    const gameSession = await this.gameSessionRepository.findOne({
      where: { id: data.gameSessionId },
    });

    if (!gameSession) {
      throw new NotFoundException('Game not found');
    }

    // Get questions
    const questionsKey = `game:${data.gameSessionId}:questions`;
    const questionsStr = await this.redisService.getClient().get(questionsKey);

    if (!questionsStr) {
      throw new NotFoundException('Game questions not found in cache');
    }

    const questions: TriviaQuestion[] = JSON.parse(questionsStr);
    const question = questions[data.questionNumber - 1];

    if (!question) {
      throw new BadRequestException(`Question ${data.questionNumber} not found`);
    }

    // Validate answer
    const isCorrect = this.validateAnswer(data.answer, question.correct_answer);

    // Store answer
    const answersKey = `game:${data.gameSessionId}:answers:${data.userId}`;
    const answersStr = await this.redisService.getClient().get(answersKey);
    const answers: GameUserAnswer[] = answersStr ? JSON.parse(answersStr) : [];

    answers.push({
      questionNumber: data.questionNumber,
      answer: data.answer,
      correct: isCorrect,
      timeSpent: data.timeSpent,
    });

    await this.redisService.getClient().setEx(
      answersKey,
      this.GAME_TTL,
      JSON.stringify(answers),
    );

    // Calculate scores and track correct answers
    const user1Answers = await this.getAnswers(data.gameSessionId, gameSession.user1Id);
    const user2Answers = await this.getAnswers(data.gameSessionId, gameSession.user2Id);

    const user1Score = this.calculateScoreFromAnswers(user1Answers, gameSession.user1Id);
    const user2Score = this.calculateScoreFromAnswers(user2Answers, gameSession.user2Id);

    const user1CorrectAnswers = user1Answers.filter(a => a.correct).length;
    const user2CorrectAnswers = user2Answers.filter(a => a.correct).length;

    // Get next question or null if current user answered all their questions
    const nextQuestion = data.questionNumber < questions.length
      ? questions[data.questionNumber]
      : null;

    // Check if game is actually complete (both users answered all questions)
    const gameComplete = await this.isGameComplete(data.gameSessionId);

    this.logger.debug('Answer submitted', {
      gameSessionId: data.gameSessionId,
      userId: data.userId,
      questionNumber: data.questionNumber,
      isCorrect,
      user1Score,
      user2Score,
      user1CorrectAnswers,
      user2CorrectAnswers,
      gameComplete,
    });

    return {
      correctAnswer: question.correct_answer,
      isCorrect,
      user1Score,
      user2Score,
      user1CorrectAnswers,
      user2CorrectAnswers,
      nextQuestion,
      gameComplete,
    };
  }

  /**
   * Complete a game and save results to database
   * NOTE: Winner determination is deferred to GamesGateway after applying premium multipliers
   */
  async completeGame(gameSessionId: string): Promise<{
    user1Score: number;
    user2Score: number;
  }> {
    const gameSession = await this.gameSessionRepository.findOne({
      where: { id: gameSessionId },
    });

    if (!gameSession) {
      throw new NotFoundException('Game not found');
    }

    if (gameSession.completedAt) {
      throw new BadRequestException('Game is already completed');
    }

    // Get answers for both users
    const user1Answers = await this.getAnswers(gameSessionId, gameSession.user1Id);
    const user2Answers = await this.getAnswers(gameSessionId, gameSession.user2Id);

    // Calculate final scores (base scores, without premium multipliers)
    const user1Score = this.calculateScoreFromAnswers(user1Answers, gameSession.user1Id);
    const user2Score = this.calculateScoreFromAnswers(user2Answers, gameSession.user2Id);

    // Store game results with base scores
    // NOTE: Winner determination is deferred to GamesGateway after applying premium multipliers
    gameSession.user1Results = {
      score: user1Score,
      correctAnswers: user1Answers.filter(a => a.correct).length,
      totalQuestions: user1Answers.length,
      answers: user1Answers,
    };

    gameSession.user2Results = {
      score: user2Score,
      correctAnswers: user2Answers.filter(a => a.correct).length,
      totalQuestions: user2Answers.length,
      answers: user2Answers,
    };

    // DO NOT set winnerId here - it will be determined in GamesGateway after premium calculations
    gameSession.completedAt = new Date();
    gameSession.durationSeconds = Math.round(
      (gameSession.completedAt.getTime() - gameSession.startedAt.getTime()) / 1000,
    );

    await this.gameSessionRepository.save(gameSession);

    // Cleanup Redis
    await this.cleanupGameRedis(gameSessionId);

    this.logger.debug('Game completed with base scores', {
      gameSessionId,
      user1Score,
      user2Score,
      user1Answers: user1Answers.length,
      user2Answers: user2Answers.length,
      durationSeconds: gameSession.durationSeconds,
    });

    // Return base scores - winner determination happens in GamesGateway after premium multipliers
    return {
      user1Score,
      user2Score,
    };
  }

  /**
   * Abandon a game if a user disconnects
   */
  async abandonGame(gameSessionId: string, userId: string): Promise<void> {
    const gameSession = await this.gameSessionRepository.findOne({
      where: { id: gameSessionId },
    });

    if (!gameSession) {
      return; // Game already cleaned up
    }

    if (gameSession.completedAt) {
      return; // Game already completed
    }

    gameSession.abandonedBy = userId;
    gameSession.completedAt = new Date();
    gameSession.durationSeconds = Math.round(
      (gameSession.completedAt.getTime() - gameSession.startedAt.getTime()) / 1000,
    );

    await this.gameSessionRepository.save(gameSession);
    await this.cleanupGameRedis(gameSessionId);

    this.logger.debug('Game abandoned', {
      gameSessionId,
      userId,
    });
  }

  /**
   * Get answers for a user in a game
   */
  private async getAnswers(gameSessionId: string, userId: string): Promise<GameUserAnswer[]> {
    const answersKey = `game:${gameSessionId}:answers:${userId}`;
    const answersStr = await this.redisService.getClient().get(answersKey);
    return answersStr ? JSON.parse(answersStr) : [];
  }

  /**
   * Get game metadata (used for retrieving stored timePerQuestion)
   */
  async getGameMetadata(gameSessionId: string): Promise<{
    user1Id: string;
    user2Id: string;
    startedAt: Date;
    questionCount: number;
    timePerQuestion: number;
  } | null> {
    const metadataKey = `game:${gameSessionId}:metadata`;
    const metadataStr = await this.redisService.getClient().get(metadataKey);
    return metadataStr ? JSON.parse(metadataStr) : null;
  }

  /**
   * Calculate current score for a user (correct answers * 10 points each)
   * Used during the game to show live scores
   */
  private async calculateScore(gameSessionId: string, userId: string): Promise<number> {
    const answers = await this.getAnswers(gameSessionId, userId);
    return this.calculateScoreFromAnswers(answers, userId);
  }

  /**
   * Calculate score from answer array
   * Each correct answer = 10 points
   */
  private calculateScoreFromAnswers(answers: GameUserAnswer[], userId: string): number {
    // Base: 10 points per correct answer
    const correctCount = answers.filter(a => a.correct).length;
    let score = correctCount * 10;

    // Future: Premium bonus (will be added when integrating premium checks)
    // const isPremium = await this.usersService.isPremium(userId);
    // if (isPremium) {
    //   score += 5; // 5 bonus points for premium users
    // }

    return score;
  }

  /**
   * Validate user answer against correct answer
   * Case-insensitive comparison with HTML decoding
   */
  private validateAnswer(userAnswer: string, correctAnswer: string): boolean {
    const userAnswerNorm = userAnswer.toLowerCase().trim();
    const correctAnswerNorm = this.decodeHtml(correctAnswer).toLowerCase().trim();

    return userAnswerNorm === correctAnswerNorm;
  }

  /**
   * Decode HTML entities
   * Matches the OpenTriviaDatabaseService implementation
   */
  private decodeHtml(html: string): string {
    if (!html) return '';

    const entities: Record<string, string> = {
      '&quot;': '"',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&apos;': "'",
      '&#039;': "'",
      '&nbsp;': ' ',
    };

    let decoded = html;
    for (const [entity, char] of Object.entries(entities)) {
      decoded = decoded.replace(new RegExp(entity, 'g'), char);
    }

    return decoded;
  }

  /**
   * Clean up Redis cache for a completed game
   */
  private async cleanupGameRedis(gameSessionId: string): Promise<void> {
    const gameSession = await this.gameSessionRepository.findOne({
      where: { id: gameSessionId },
    });

    if (!gameSession) return;

    const keysToDelete = [
      `game:${gameSessionId}:questions`,
      `game:${gameSessionId}:answers:${gameSession.user1Id}`,
      `game:${gameSessionId}:answers:${gameSession.user2Id}`,
      `game:${gameSessionId}:metadata`,
    ];

    for (const key of keysToDelete) {
      await this.redisService.getClient().del(key);
    }

    this.logger.debug('Game Redis cache cleaned up', { gameSessionId });
  }

  /**
   * Get game session details
   */
  async getGameSession(gameSessionId: string): Promise<GameSession> {
    const gameSession = await this.gameSessionRepository.findOne({
      where: { id: gameSessionId },
    });

    if (!gameSession) {
      throw new NotFoundException('Game not found');
    }

    return gameSession;
  }

  /**
   * Save game session updates
   * Used to update scores and winner after premium multipliers applied
   */
  async saveGameSession(gameSession: GameSession): Promise<GameSession> {
    return await this.gameSessionRepository.save(gameSession);
  }
}
