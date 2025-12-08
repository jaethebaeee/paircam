import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSession, GameMove } from '../entities';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(GameSession) private gameRepo: Repository<GameSession>,
    @InjectRepository(GameMove) private moveRepo: Repository<GameMove>,
    private redisService: RedisService,
  ) {}

  /**
   * START GAME - Create new game session
   */
  async startGame(
    sessionId: string,
    userId: string,
    peerId: string,
    gameType: 'tic-tac-toe' | 'trivia' | 'truth-dare' | '20-questions',
  ) {
    const game = this.gameRepo.create({
      sessionId,
      type: gameType,
      player1Id: userId,
      player2Id: peerId,
      state: this.initializeGameState(gameType),
      status: 'in-progress',
    });

    const savedGame = await this.gameRepo.save(game);

    // Cache in Redis for quick access (1 hour TTL)
    await this.redisService.getClient().setEx(
      `game:${savedGame.id}`,
      3600,
      JSON.stringify(savedGame),
    );

    return savedGame;
  }

  /**
   * MAKE MOVE - Handle game move from player
   */
  async makeMove(gameId: string, userId: string, moveData: any) {
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: ['player1', 'player2'],
    });

    if (!game) {
      throw new NotFoundException(`Game ${gameId} not found`);
    }

    if (game.status !== 'in-progress') {
      throw new BadRequestException('Game is not in progress');
    }

    // Validate it's user's turn
    const isPlayer1 = game.player1Id === userId;
    const currentPlayer = game.state.currentPlayer;

    if (
      (isPlayer1 && currentPlayer !== 'p1') ||
      (!isPlayer1 && currentPlayer !== 'p2')
    ) {
      throw new BadRequestException('Not your turn');
    }

    // Apply move based on game type
    let updatedState = game.state;
    let winner: 'p1' | 'p2' | 'draw' | null = null;

    switch (game.type) {
      case 'tic-tac-toe':
        updatedState = this.applyTicTacToeMove(game.state, moveData, isPlayer1);
        winner = this.checkTicTacToeWinner(updatedState);
        break;
      case 'trivia':
        updatedState = this.applyTriviaAnswer(game.state, moveData, isPlayer1);
        winner = this.checkTriviaWinner(updatedState);
        break;
      default:
        throw new BadRequestException(`Unsupported game type: ${game.type}`);
    }

    // Save move to database
    await this.moveRepo.save({
      gameSessionId: gameId,
      playerId: userId,
      move: moveData,
    });

    // Update game state
    game.state = updatedState;

    // Check if game ended
    if (winner && winner !== 'draw') {
      game.status = 'completed';
      game.endedAt = new Date();

      const isWinnerPlayer1 = winner === 'p1';
      game.winnerId = isWinnerPlayer1 ? game.player1Id : game.player2Id;

      if (isWinnerPlayer1) {
        game.player1Score = (game.player1Score || 0) + 1;
      } else {
        game.player2Score = (game.player2Score || 0) + 1;
      }
    } else if (winner === 'draw') {
      game.status = 'completed';
      game.endedAt = new Date();
    }

    const updatedGame = await this.gameRepo.save(game);

    // Update Redis cache
    await this.redisService.getClient().setEx(
      `game:${gameId}`,
      3600,
      JSON.stringify(updatedGame),
    );

    return updatedGame;
  }

  /**
   * TIC-TAC-TOE LOGIC
   */
  private initializeGameState(gameType: string): any {
    const baseState = {
      createdAt: new Date(),
      currentPlayer: 'p1',
    };

    switch (gameType) {
      case 'tic-tac-toe':
        return {
          ...baseState,
          board: Array(9).fill(null),
          moves: [],
        };
      case 'trivia':
        return {
          ...baseState,
          questions: this.generateTriviaQuestions(5),
          currentQuestion: 0,
          p1Answers: [],
          p2Answers: [],
          p1Score: 0,
          p2Score: 0,
        };
      case 'truth-dare':
        return {
          ...baseState,
          round: 1,
          prompts: this.loadTruthDarePrompts(),
        };
      case '20-questions':
        return {
          ...baseState,
          secret: this.pickRandomSecret(),
          questionsAsked: 0,
          maxQuestions: 20,
        };
      default:
        throw new BadRequestException(`Unknown game type: ${gameType}`);
    }
  }

  private applyTicTacToeMove(state: any, moveData: any, isPlayer1: boolean) {
    const position = moveData.position;
    const player = isPlayer1 ? 'X' : 'O';

    // Validate move is legal
    if (state.board[position] !== null) {
      throw new BadRequestException('Invalid move - position occupied');
    }

    if (position < 0 || position > 8) {
      throw new BadRequestException('Invalid position');
    }

    // Apply move
    state.board[position] = player;
    state.moves.push({
      position,
      player,
      timestamp: Date.now(),
    });

    // Switch player
    state.currentPlayer = isPlayer1 ? 'p2' : 'p1';

    return state;
  }

  private checkTicTacToeWinner(state: any): 'p1' | 'p2' | 'draw' | null {
    const board = state.board;
    const winPatterns = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // columns
      [0, 4, 8],
      [2, 4, 6], // diagonals
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] === 'X' ? 'p1' : 'p2';
      }
    }

    // Check for draw
    if (board.every((cell: any) => cell !== null)) {
      return 'draw';
    }

    return null;
  }

  private applyTriviaAnswer(state: any, moveData: any, isPlayer1: boolean) {
    const { answer } = moveData;
    const currentQ = state.questions[state.currentQuestion];

    // Check if answer is correct
    const isCorrect =
      answer.toLowerCase() === currentQ.correctAnswer.toLowerCase();

    if (isCorrect) {
      if (isPlayer1) {
        state.p1Score += 10;
      } else {
        state.p2Score += 10;
      }
    }

    // Track answer
    if (isPlayer1) {
      state.p1Answers.push({
        questionIndex: state.currentQuestion,
        answer,
        isCorrect,
      });
    } else {
      state.p2Answers.push({
        questionIndex: state.currentQuestion,
        answer,
        isCorrect,
      });
    }

    // Move to next question
    state.currentQuestion += 1;
    state.currentPlayer = isPlayer1 ? 'p2' : 'p1';

    return state;
  }

  private checkTriviaWinner(state: any): 'p1' | 'p2' | 'draw' | null {
    const totalQuestions = state.questions.length;

    // Both players answered all questions
    if (
      state.p1Answers.length === totalQuestions &&
      state.p2Answers.length === totalQuestions
    ) {
      if (state.p1Score > state.p2Score) {
        return 'p1';
      } else if (state.p2Score > state.p1Score) {
        return 'p2';
      } else {
        return 'draw';
      }
    }

    return null;
  }

  /**
   * TRIVIA QUESTION GENERATION
   */
  private generateTriviaQuestions(count: number): any[] {
    const triviaBank = [
      {
        question: "What is the capital of France?",
        options: ["Paris", "Lyon", "Marseille", "Nice"],
        correctAnswer: "Paris",
      },
      {
        question: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correctAnswer: "4",
      },
      {
        question: "What is the largest planet in our solar system?",
        options: ["Saturn", "Jupiter", "Neptune", "Uranus"],
        correctAnswer: "Jupiter",
      },
      {
        question: "Who wrote 'Romeo and Juliet'?",
        options: ["Mark Twain", "William Shakespeare", "Jane Austen", "Charles Dickens"],
        correctAnswer: "William Shakespeare",
      },
      {
        question: "What is the smallest country in the world?",
        options: ["Monaco", "Vatican City", "Liechtenstein", "San Marino"],
        correctAnswer: "Vatican City",
      },
    ];

    // Shuffle and return first 'count' items
    return triviaBank.sort(() => Math.random() - 0.5).slice(0, count);
  }

  /**
   * TRUTH OR DARE PROMPTS
   */
  private loadTruthDarePrompts(): any {
    return {
      truth: [
        "What's your most embarrassing moment?",
        "Have you ever lied to a close friend?",
        "What's something you're ashamed of?",
        "If you could change one thing about yourself, what would it be?",
      ],
      dare: [
        "Act like a celebrity",
        "Sing a song",
        "Do your best accent",
        "Tell a joke",
      ],
    };
  }

  /**
   * 20 QUESTIONS - Pick random secret
   */
  private pickRandomSecret(): string {
    const secrets = [
      "apple",
      "elephant",
      "mountain",
      "ocean",
      "sunset",
      "book",
      "guitar",
      "pizza",
      "rainbow",
      "airplane",
    ];
    return secrets[Math.floor(Math.random() * secrets.length)];
  }

  /**
   * GET GAME REWARD - Coins earned for winning
   */
  getGameReward(gameType: string): number {
    const rewards = {
      'tic-tac-toe': 50,
      'trivia': 75,
      'truth-dare': 60,
      '20-questions': 80,
    };
    return rewards[gameType] || 50;
  }

  /**
   * GET GAME BY ID
   */
  async getGame(gameId: string) {
    const game = await this.gameRepo.findOne({
      where: { id: gameId },
      relations: ['player1', 'player2', 'winner'],
    });

    if (!game) {
      throw new NotFoundException(`Game ${gameId} not found`);
    }

    return game;
  }

  /**
   * DECLINE GAME
   */
  async declineGame(gameId: string) {
    const game = await this.getGame(gameId);

    if (game.status !== 'in-progress') {
      throw new BadRequestException('Cannot decline completed game');
    }

    game.status = 'declined';
    return this.gameRepo.save(game);
  }

  /**
   * GET USER'S GAME HISTORY
   */
  async getUserGameHistory(userId: string, limit: number = 10) {
    return this.gameRepo.find({
      where: [{ player1Id: userId }, { player2Id: userId }],
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['player1', 'player2', 'winner'],
    });
  }
}
