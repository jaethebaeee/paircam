// Game types and interfaces

export type GameType = 'trivia' | 'chess' | 'drawing';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface TriviaQuestion {
  question_id: string;
  question: string;
  category: string;
  difficulty: Difficulty;
  correct_answer: string;
  incorrect_answers: string[];
  all_answers: string[];
}

export interface TriviaAnswer {
  question_id: string;
  answer: string;
  is_correct: boolean;
  timestamp: number;
}

export interface GameSession {
  session_id: string;
  game_type: GameType;
  status: 'started' | 'in_progress' | 'completed' | 'abandoned';
  difficulty: Difficulty;
  current_question_number: number;
  total_questions: number;
  players: GamePlayer[];
  created_at: string;
  updated_at: string;
}

export interface GamePlayer {
  user_id: string;
  peer_id: string;
  username?: string;
  score: number;
  answers: TriviaAnswer[];
  is_winner?: boolean;
}

export interface GameScore {
  current_score: number;
  streak: number;
  accuracy: number;
}

export interface GameResult {
  session_id: string;
  game_type: GameType;
  difficulty: Difficulty;
  duration_seconds: number;
  winner_id: string;
  winner_score: number;
  opponent_score: number;
  questions_answered: number;
  player_stats: GameStats;
  opponent_stats: GameStats;
}

export interface GameStats {
  user_id: string;
  score: number;
  accuracy: number;
  response_time_avg: number;
  correct_answers: number;
  is_winner: boolean;
}

export interface GameEvent {
  type: 'game-started' | 'new-question' | 'score-update' | 'game-ended' | 'game-abandoned';
  data: any;
  timestamp: number;
}

export interface SubmitAnswerPayload {
  session_id: string;
  question_id: string;
  answer: string;
  response_time: number;
}

export interface GameStartPayload {
  difficulty: Difficulty;
  peer_id: string;
  game_type: GameType;
}
