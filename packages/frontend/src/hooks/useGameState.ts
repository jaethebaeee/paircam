import { useCallback, useEffect, useState } from 'react';
import { TriviaQuestion } from '../types/games';
import { GAME_CONFIG } from '../constants/games';

export interface GameAnswer {
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  response_time: number;
}

export interface UseGameStateReturn {
  currentScore: number;
  currentStreak: number;
  currentAccuracy: number;
  answers: GameAnswer[];
  questionStartTime: number | null;
  timeRemaining: number;
  addAnswer: (answer: GameAnswer) => void;
  getResponseTime: () => number;
  resetGame: () => void;
  calculateAccuracy: () => number;
}

export function useGameState(isGameActive: boolean, currentQuestion: TriviaQuestion | null): UseGameStateReturn {
  const [currentScore, setCurrentScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [answers, setAnswers] = useState<GameAnswer[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(GAME_CONFIG.TRIVIA.TIME_PER_QUESTION);

  // Set question start time when new question arrives
  useEffect(() => {
    if (currentQuestion) {
      setQuestionStartTime(Date.now());
      setTimeRemaining(GAME_CONFIG.TRIVIA.TIME_PER_QUESTION);
    }
  }, [currentQuestion?.question_id]);

  // Timer countdown
  useEffect(() => {
    if (!isGameActive || !questionStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      const remaining = Math.max(0, GAME_CONFIG.TRIVIA.TIME_PER_QUESTION - elapsed);
      setTimeRemaining(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [isGameActive, questionStartTime]);

  const getResponseTime = useCallback(() => {
    if (!questionStartTime) return 0;
    return Math.floor((Date.now() - questionStartTime) / 1000);
  }, [questionStartTime]);

  const addAnswer = useCallback((answer: GameAnswer) => {
    setAnswers(prev => [...prev, answer]);

    // Update score and streak
    if (answer.is_correct) {
      setCurrentScore(prev => prev + GAME_CONFIG.TRIVIA.POINTS_PER_CORRECT);
      setCurrentStreak(prev => prev + 1);
    } else {
      setCurrentStreak(0);
    }
  }, []);

  const calculateAccuracy = useCallback(() => {
    if (answers.length === 0) return 0;
    const correct = answers.filter(a => a.is_correct).length;
    return Math.round((correct / answers.length) * 100);
  }, [answers]);

  const resetGame = useCallback(() => {
    setCurrentScore(0);
    setCurrentStreak(0);
    setAnswers([]);
    setQuestionStartTime(null);
    setTimeRemaining(GAME_CONFIG.TRIVIA.TIME_PER_QUESTION);
  }, []);

  return {
    currentScore,
    currentStreak,
    currentAccuracy: calculateAccuracy(),
    answers,
    questionStartTime,
    timeRemaining,
    addAnswer,
    getResponseTime,
    resetGame,
    calculateAccuracy,
  };
}
