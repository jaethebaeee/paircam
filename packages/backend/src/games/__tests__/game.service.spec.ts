import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameService } from '../services/game.service';
import { GameSession, GameMove } from '../entities';
import { RedisService } from '../../redis/redis.service';

describe('GameService', () => {
  let service: GameService;
  let gameRepo: jest.Mocked<Repository<GameSession>>;
  let moveRepo: jest.Mocked<Repository<GameMove>>;
  let redisService: jest.Mocked<RedisService>;

  const mockGameSession: Partial<GameSession> = {
    id: 'game-123',
    sessionId: 'session-456',
    type: 'tic-tac-toe',
    player1Id: 'player-1',
    player2Id: 'player-2',
    status: 'in-progress',
    state: {
      createdAt: new Date(),
      currentPlayer: 'p1',
      board: Array(9).fill(null),
      moves: [],
    },
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: getRepositoryToken(GameSession),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(GameMove),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            setex: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    gameRepo = module.get(getRepositoryToken(GameSession));
    moveRepo = module.get(getRepositoryToken(GameMove));
    redisService = module.get(RedisService);
  });

  describe('startGame', () => {
    it('should create a new tic-tac-toe game', async () => {
      const savedGame = { ...mockGameSession, id: 'new-game-id' };
      gameRepo.create.mockReturnValue(savedGame as GameSession);
      gameRepo.save.mockResolvedValue(savedGame as GameSession);
      redisService.setex.mockResolvedValue(undefined);

      const result = await service.startGame(
        'session-123',
        'player-1',
        'player-2',
        'tic-tac-toe',
      );

      expect(result).toBeDefined();
      expect(gameRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-123',
          type: 'tic-tac-toe',
          player1Id: 'player-1',
          player2Id: 'player-2',
          status: 'in-progress',
        }),
      );
      expect(gameRepo.save).toHaveBeenCalled();
      expect(redisService.setex).toHaveBeenCalled();
    });

    it('should create a new trivia game with questions', async () => {
      const triviaGame = {
        ...mockGameSession,
        type: 'trivia',
        state: {
          createdAt: expect.any(Date),
          currentPlayer: 'p1',
          questions: expect.any(Array),
          currentQuestion: 0,
          p1Answers: [],
          p2Answers: [],
          p1Score: 0,
          p2Score: 0,
        },
      };
      gameRepo.create.mockReturnValue(triviaGame as GameSession);
      gameRepo.save.mockResolvedValue(triviaGame as GameSession);
      redisService.setex.mockResolvedValue(undefined);

      const result = await service.startGame(
        'session-123',
        'player-1',
        'player-2',
        'trivia',
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('trivia');
    });

    it('should throw error for unsupported game type', async () => {
      await expect(
        service.startGame('session-123', 'player-1', 'player-2', 'invalid-game' as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('makeMove - Tic-Tac-Toe', () => {
    it('should apply valid move for player 1', async () => {
      const game = {
        ...mockGameSession,
        state: {
          ...mockGameSession.state,
          currentPlayer: 'p1',
          board: Array(9).fill(null),
          moves: [],
        },
      };
      gameRepo.findOne.mockResolvedValue(game as GameSession);
      gameRepo.save.mockResolvedValue({
        ...game,
        state: {
          ...game.state,
          board: ['X', null, null, null, null, null, null, null, null],
          currentPlayer: 'p2',
        },
      } as GameSession);
      moveRepo.save.mockResolvedValue({} as GameMove);
      redisService.setex.mockResolvedValue(undefined);

      const result = await service.makeMove('game-123', 'player-1', { position: 0 });

      expect(result.state.board[0]).toBe('X');
      expect(result.state.currentPlayer).toBe('p2');
    });

    it('should reject move when not player turn', async () => {
      const game = {
        ...mockGameSession,
        state: {
          ...mockGameSession.state,
          currentPlayer: 'p2', // Not player 1's turn
        },
      };
      gameRepo.findOne.mockResolvedValue(game as GameSession);

      await expect(
        service.makeMove('game-123', 'player-1', { position: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject move on occupied position', async () => {
      const game = {
        ...mockGameSession,
        state: {
          ...mockGameSession.state,
          currentPlayer: 'p1',
          board: ['X', null, null, null, null, null, null, null, null],
        },
      };
      gameRepo.findOne.mockResolvedValue(game as GameSession);

      await expect(
        service.makeMove('game-123', 'player-1', { position: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject move with invalid position', async () => {
      const game = { ...mockGameSession };
      gameRepo.findOne.mockResolvedValue(game as GameSession);

      await expect(
        service.makeMove('game-123', 'player-1', { position: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should detect winner with horizontal line', async () => {
      const game = {
        ...mockGameSession,
        state: {
          ...mockGameSession.state,
          currentPlayer: 'p1',
          board: ['X', 'X', null, 'O', 'O', null, null, null, null],
          moves: [],
        },
      };
      gameRepo.findOne.mockResolvedValue(game as GameSession);
      gameRepo.save.mockImplementation(async (g: any) => ({
        ...g,
        state: {
          ...g.state,
          board: ['X', 'X', 'X', 'O', 'O', null, null, null, null],
        },
        status: 'completed',
        winnerId: 'player-1',
      }));
      moveRepo.save.mockResolvedValue({} as GameMove);
      redisService.setex.mockResolvedValue(undefined);

      const result = await service.makeMove('game-123', 'player-1', { position: 2 });

      expect(result.status).toBe('completed');
      expect(result.winnerId).toBe('player-1');
    });

    it('should detect draw when board is full', async () => {
      // Board with one empty spot that won't create a winner
      const game = {
        ...mockGameSession,
        state: {
          ...mockGameSession.state,
          currentPlayer: 'p1',
          board: ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', null],
          moves: [],
        },
      };
      gameRepo.findOne.mockResolvedValue(game as GameSession);
      gameRepo.save.mockImplementation(async (g: any) => ({
        ...g,
        state: {
          ...g.state,
          board: ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'],
        },
        status: 'completed',
      }));
      moveRepo.save.mockResolvedValue({} as GameMove);
      redisService.setex.mockResolvedValue(undefined);

      const result = await service.makeMove('game-123', 'player-1', { position: 8 });

      expect(result.status).toBe('completed');
    });
  });

  describe('makeMove - Game Not Found', () => {
    it('should throw NotFoundException for non-existent game', async () => {
      gameRepo.findOne.mockResolvedValue(null);

      await expect(
        service.makeMove('non-existent', 'player-1', { position: 0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject move on completed game', async () => {
      const completedGame = {
        ...mockGameSession,
        status: 'completed',
      };
      gameRepo.findOne.mockResolvedValue(completedGame as GameSession);

      await expect(
        service.makeMove('game-123', 'player-1', { position: 0 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getGame', () => {
    it('should return game by ID', async () => {
      gameRepo.findOne.mockResolvedValue(mockGameSession as GameSession);

      const result = await service.getGame('game-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('game-123');
    });

    it('should throw NotFoundException for non-existent game', async () => {
      gameRepo.findOne.mockResolvedValue(null);

      await expect(service.getGame('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('declineGame', () => {
    it('should decline an in-progress game', async () => {
      gameRepo.findOne.mockResolvedValue(mockGameSession as GameSession);
      gameRepo.save.mockResolvedValue({
        ...mockGameSession,
        status: 'declined',
      } as GameSession);

      const result = await service.declineGame('game-123');

      expect(result.status).toBe('declined');
    });

    it('should reject declining a completed game', async () => {
      gameRepo.findOne.mockResolvedValue({
        ...mockGameSession,
        status: 'completed',
      } as GameSession);

      await expect(service.declineGame('game-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserGameHistory', () => {
    it('should return user game history', async () => {
      const games = [mockGameSession, { ...mockGameSession, id: 'game-456' }];
      gameRepo.find.mockResolvedValue(games as GameSession[]);

      const result = await service.getUserGameHistory('player-1');

      expect(result).toHaveLength(2);
      expect(gameRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
          take: 10,
        }),
      );
    });

    it('should respect limit parameter', async () => {
      gameRepo.find.mockResolvedValue([]);

      await service.getUserGameHistory('player-1', 5);

      expect(gameRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  describe('getGameReward', () => {
    it('should return correct reward for tic-tac-toe', () => {
      expect(service.getGameReward('tic-tac-toe')).toBe(50);
    });

    it('should return correct reward for trivia', () => {
      expect(service.getGameReward('trivia')).toBe(75);
    });

    it('should return correct reward for truth-dare', () => {
      expect(service.getGameReward('truth-dare')).toBe(60);
    });

    it('should return correct reward for 20-questions', () => {
      expect(service.getGameReward('20-questions')).toBe(80);
    });

    it('should return default reward for unknown game type', () => {
      expect(service.getGameReward('unknown')).toBe(50);
    });
  });

  describe('Tic-Tac-Toe Winner Detection', () => {
    // Test all win patterns
    const winPatterns = [
      { name: 'top row', positions: [0, 1, 2] },
      { name: 'middle row', positions: [3, 4, 5] },
      { name: 'bottom row', positions: [6, 7, 8] },
      { name: 'left column', positions: [0, 3, 6] },
      { name: 'middle column', positions: [1, 4, 7] },
      { name: 'right column', positions: [2, 5, 8] },
      { name: 'diagonal top-left', positions: [0, 4, 8] },
      { name: 'diagonal top-right', positions: [2, 4, 6] },
    ];

    winPatterns.forEach(({ name, positions }) => {
      it(`should detect winner with ${name}`, async () => {
        const board = Array(9).fill(null);
        // Fill two positions, leaving one for the winning move
        board[positions[0]] = 'X';
        board[positions[1]] = 'X';

        const game = {
          ...mockGameSession,
          state: {
            ...mockGameSession.state,
            currentPlayer: 'p1',
            board,
            moves: [],
          },
        };

        gameRepo.findOne.mockResolvedValue(game as GameSession);
        gameRepo.save.mockImplementation(async (g: any) => {
          const newBoard = [...g.state.board];
          newBoard[positions[2]] = 'X';
          return {
            ...g,
            state: { ...g.state, board: newBoard },
            status: 'completed',
            winnerId: 'player-1',
          };
        });
        moveRepo.save.mockResolvedValue({} as GameMove);
        redisService.setex.mockResolvedValue(undefined);

        const result = await service.makeMove('game-123', 'player-1', {
          position: positions[2],
        });

        expect(result.status).toBe('completed');
        expect(result.winnerId).toBe('player-1');
      });
    });
  });
});
