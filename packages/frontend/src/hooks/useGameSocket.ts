import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameSession, TriviaQuestion, SubmitAnswerPayload, Difficulty, GameResult } from '../types/games';
import { SOCKET_EVENTS } from '../constants/games';

export interface UseGameSocketOptions {
  socket: Socket | null;
  sessionId: string;
  onGameStarted?: (data: GameSession) => void;
  onNewQuestion?: (data: TriviaQuestion) => void;
  onScoreUpdate?: (data: { player_id: string; score: number; correct: boolean; player_name?: string }) => void;
  onGameEnded?: (data: GameResult) => void;
  onGameAbandoned?: (data: { session_id: string; abandoned_by: string }) => void;
  onError?: (error: string) => void;
}

export interface UseGameSocketReturn {
  gameStarted: boolean;
  currentQuestion: TriviaQuestion | null;
  gameResult: GameResult | null;
  gameError: string | null;
  startGame: (difficulty: Difficulty, gameType: string) => void;
  submitAnswer: (payload: SubmitAnswerPayload) => void;
  abandonGame: () => void;
  clearGameState: () => void;
}

export function useGameSocket(options: UseGameSocketOptions): UseGameSocketReturn {
  const { socket, sessionId, onGameStarted, onNewQuestion, onScoreUpdate, onGameEnded, onGameAbandoned, onError } = options;
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);

  const callbacksRef = useRef({ onGameStarted, onNewQuestion, onScoreUpdate, onGameEnded, onGameAbandoned, onError });
  callbacksRef.current = { onGameStarted, onNewQuestion, onScoreUpdate, onGameEnded, onGameAbandoned, onError };

  useEffect(() => {
    if (!socket || !sessionId) return;

    // Game started event
    const handleGameStarted = (data: GameSession) => {
      console.log('Game started:', data);
      setGameStarted(true);
      setGameError(null);
      callbacksRef.current.onGameStarted?.(data);
    };

    // New question event
    const handleNewQuestion = (data: TriviaQuestion) => {
      console.log('New question received:', data);
      setCurrentQuestion(data);
      callbacksRef.current.onNewQuestion?.(data);
    };

    // Score update event
    const handleScoreUpdate = (data: { player_id: string; score: number; correct: boolean; player_name?: string }) => {
      console.log('Score updated:', data);
      callbacksRef.current.onScoreUpdate?.(data);
    };

    // Game ended event
    const handleGameEnded = (data: GameResult) => {
      console.log('Game ended:', data);
      setGameStarted(false);
      setCurrentQuestion(null);
      setGameResult(data);
      callbacksRef.current.onGameEnded?.(data);
    };

    // Game abandoned event
    const handleGameAbandoned = (data: { session_id: string; abandoned_by: string }) => {
      console.log('Game abandoned:', data);
      setGameStarted(false);
      setCurrentQuestion(null);
      callbacksRef.current.onGameAbandoned?.(data);
    };

    // Error event
    const handleError = (error: any) => {
      const errorMessage = error?.message || 'Game error occurred';
      console.error('Game error:', errorMessage);
      setGameError(errorMessage);
      callbacksRef.current.onError?.(errorMessage);
    };

    // Register listeners
    socket.on(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
    socket.on(SOCKET_EVENTS.NEW_QUESTION, handleNewQuestion);
    socket.on(SOCKET_EVENTS.SCORE_UPDATE, handleScoreUpdate);
    socket.on(SOCKET_EVENTS.GAME_ENDED, handleGameEnded);
    socket.on(SOCKET_EVENTS.GAME_ABANDONED, handleGameAbandoned);
    socket.on(SOCKET_EVENTS.ERROR, handleError);

    return () => {
      socket.off(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
      socket.off(SOCKET_EVENTS.NEW_QUESTION, handleNewQuestion);
      socket.off(SOCKET_EVENTS.SCORE_UPDATE, handleScoreUpdate);
      socket.off(SOCKET_EVENTS.GAME_ENDED, handleGameEnded);
      socket.off(SOCKET_EVENTS.GAME_ABANDONED, handleGameAbandoned);
      socket.off(SOCKET_EVENTS.ERROR, handleError);
    };
  }, [socket, sessionId]);

  const startGame = useCallback(
    (difficulty: Difficulty, gameType: string) => {
      if (!socket?.connected || !sessionId) {
        console.warn('Cannot start game: socket not connected or no sessionId');
        return;
      }
      console.log('Starting game:', { sessionId, difficulty, gameType });
      socket.emit(SOCKET_EVENTS.START_GAME, {
        session_id: sessionId,
        difficulty,
        game_type: gameType,
      });
    },
    [socket, sessionId]
  );

  const submitAnswer = useCallback(
    (payload: SubmitAnswerPayload) => {
      if (!socket?.connected) {
        console.warn('Cannot submit answer: socket not connected');
        return;
      }
      console.log('Submitting answer:', payload);
      socket.emit(SOCKET_EVENTS.SUBMIT_ANSWER, payload);
    },
    [socket]
  );

  const abandonGame = useCallback(() => {
    if (!socket?.connected || !sessionId) {
      console.warn('Cannot abandon game: socket not connected or no sessionId');
      return;
    }
    console.log('Abandoning game:', sessionId);
    socket.emit(SOCKET_EVENTS.ABANDON_GAME, { session_id: sessionId });
    setGameStarted(false);
    setCurrentQuestion(null);
  }, [socket, sessionId]);

  const clearGameState = useCallback(() => {
    setGameStarted(false);
    setCurrentQuestion(null);
    setGameResult(null);
    setGameError(null);
  }, []);

  return {
    gameStarted,
    currentQuestion,
    gameResult,
    gameError,
    startGame,
    submitAnswer,
    abandonGame,
    clearGameState,
  };
}
