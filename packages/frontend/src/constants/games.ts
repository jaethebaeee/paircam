// Game-related constants

export const GAME_CONFIG = {
  TRIVIA: {
    TOTAL_QUESTIONS: 10,
    TIME_PER_QUESTION: 30, // seconds
    POINTS_PER_CORRECT: 10,
    DIFFICULTIES: ['easy', 'medium', 'hard'] as const,
  },
  CATEGORIES: [
    { id: '9', name: 'General Knowledge' },
    { id: '10', name: 'Entertainment: Books' },
    { id: '11', name: 'Entertainment: Film' },
    { id: '12', name: 'Entertainment: Music' },
    { id: '13', name: 'Entertainment: Musicals & Theatres' },
    { id: '14', name: 'Entertainment: Television' },
    { id: '15', name: 'Entertainment: Video Games' },
    { id: '16', name: 'Entertainment: Board Games' },
    { id: '17', name: 'Science & Nature' },
    { id: '18', name: 'Science: Computers' },
    { id: '19', name: 'Science: Mathematics' },
    { id: '20', name: 'Mythology' },
    { id: '21', name: 'Sports' },
    { id: '22', name: 'Geography' },
    { id: '23', name: 'History' },
    { id: '24', name: 'Politics' },
    { id: '25', name: 'Art' },
    { id: '26', name: 'Celebrities' },
    { id: '27', name: 'Animals' },
    { id: '28', name: 'Vehicles' },
  ],
};

export const DIFFICULTY_COLORS = {
  easy: '#10b981', // emerald-500
  medium: '#f59e0b', // amber-500
  hard: '#ef4444', // red-500
};

export const DIFFICULTY_LABELS = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const GAME_STATUS = {
  WAITING: 'waiting',
  STARTING: 'starting',
  IN_PROGRESS: 'in_progress',
  FINISHED: 'finished',
  ABANDONED: 'abandoned',
} as const;

export const SOCKET_EVENTS = {
  // Emit events (client -> server)
  START_GAME: 'start-game',
  SUBMIT_ANSWER: 'submit-answer',
  ABANDON_GAME: 'abandon-game',

  // Listen events (server -> client)
  GAME_STARTED: 'game-started',
  NEW_QUESTION: 'new-question',
  SCORE_UPDATE: 'score-update',
  GAME_ENDED: 'game-ended',
  GAME_ABANDONED: 'game-abandoned',
  ERROR: 'error',
} as const;
