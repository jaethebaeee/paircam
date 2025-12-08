/**
 * Game Types and Interfaces
 */

export interface TriviaQuestion {
  id: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  type: string;
  category?: string;
}

export interface GameUserAnswer {
  questionNumber: number;
  answer: string;
  correct: boolean;
  timeSpent: number;
}

export interface GameUserResults {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  answers: GameUserAnswer[];
}

export interface GameConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  questionCount: number;
  timePerQuestion: number;
}

export interface StartGamePayload {
  sessionId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
}

export interface SubmitAnswerPayload {
  gameSessionId: string;
  sessionId: string;
  questionNumber: number;
  answer: string;
  timeSpent: number;
}

export interface GameStartedEvent {
  gameSessionId: string;
  totalQuestions: number;
  timePerQuestion: number;
}

export interface NewQuestionEvent {
  questionNumber: number;
  totalQuestions?: number;
  question: string;
  options: string[];
  timeLimit: number;
}

export interface ScoreUpdateEvent {
  user1Score: number;
  user2Score: number;
}

export interface GameEndedEvent {
  winnerId: string;
  user1Score: number;
  user2Score: number;
}

export interface QuestionResponse {
  correct_answer: string;
  incorrect_answers: string[];
  question: string;
  difficulty: string;
  category: string;
  type: string;
}

export interface OpenTriviaDbResponse {
  response_code: number;
  results: QuestionResponse[];
}
