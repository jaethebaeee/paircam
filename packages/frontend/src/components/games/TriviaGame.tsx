import { useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import GameLobby from './GameLobby';
import TriviaQuestion from './TriviaQuestion';
import GameResults from './GameResults';
import { useGameSocket } from '../../hooks/useGameSocket';
import { useGameState } from '../../hooks/useGameState';
import { Difficulty } from '../../types/games';
import { GAME_CONFIG } from '../../constants/games';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface TriviaGameProps {
  socket: Socket | null;
  sessionId: string;
  peerId: string;
  onClose: () => void;
  isVisible: boolean;
}

type GamePhase = 'lobby' | 'playing' | 'results' | 'closed';

export default function TriviaGame({ socket, sessionId, peerId: _peerId, onClose, isVisible }: TriviaGameProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [isCurrentPlayerWinner, setIsCurrentPlayerWinner] = useState(false);

  // Game socket hook
  const gameSocket = useGameSocket({
    socket,
    sessionId,
    onGameStarted: (_data) => {
      console.log('Game started, waiting for first question');
      setGamePhase('playing');
      setCurrentQuestionNumber(1);
    },
    onNewQuestion: (question) => {
      console.log('New question received:', question);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setIsSubmittingAnswer(false);
    },
    onGameEnded: (result) => {
      console.log('Game ended:', result);
      setIsCurrentPlayerWinner(result.winner_id === sessionId);
      setGamePhase('results');
    },
    onScoreUpdate: (scoreData) => {
      console.log('Score updated:', scoreData);
    },
    onError: (error) => {
      console.error('Game error:', error);
    },
  });

  // Game state hook
  const gameState = useGameState(gameSocket.gameStarted, gameSocket.currentQuestion);

  // Handle difficulty selection
  const handleSelectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      console.log('Starting game with difficulty:', difficulty);
      gameSocket.startGame(difficulty, 'trivia');
    },
    [gameSocket]
  );

  // Handle answer selection
  const handleAnswerSelect = useCallback((answer: string) => {
    setSelectedAnswer(answer);
  }, []);

  // Handle answer submission
  const handleSubmitAnswer = useCallback(async () => {
    if (!selectedAnswer || !gameSocket.currentQuestion || isAnswerSubmitted) {
      return;
    }

    setIsSubmittingAnswer(true);
    setIsAnswerSubmitted(true);

    // Add to local game state
    const responseTime = gameState.getResponseTime();
    const isCorrect = selectedAnswer === gameSocket.currentQuestion.correct_answer;

    gameState.addAnswer({
      question_id: gameSocket.currentQuestion.question_id,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      response_time: responseTime,
    });

    // Emit to server
    gameSocket.submitAnswer({
      session_id: sessionId,
      question_id: gameSocket.currentQuestion.question_id,
      answer: selectedAnswer,
      response_time: responseTime,
    });

    // Wait 2 seconds before moving to next question
    setTimeout(() => {
      setIsSubmittingAnswer(false);
      // Reset for next question (server will send new question via onNewQuestion)
    }, 2000);
  }, [selectedAnswer, gameSocket.currentQuestion, isAnswerSubmitted, gameState, sessionId, gameSocket]);

  // Handle game close
  const handleClose = useCallback(() => {
    if (gamePhase === 'playing') {
      gameSocket.abandonGame();
    }
    gameState.resetGame();
    gameSocket.clearGameState();
    setGamePhase('lobby');
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setCurrentQuestionNumber(0);
    onClose();
  }, [gamePhase, gameSocket, gameState, onClose]);

  if (!isVisible) return null;

  // Lobby phase
  if (gamePhase === 'lobby') {
    return (
      <GameLobby
        onSelectDifficulty={handleSelectDifficulty}
        onClose={handleClose}
      />
    );
  }

  // Results phase
  if (gamePhase === 'results' && gameSocket.gameResult) {
    return (
      <GameResults
        result={gameSocket.gameResult}
        isCurrentPlayerWinner={isCurrentPlayerWinner}
        onClose={() => {
          gameState.resetGame();
          gameSocket.clearGameState();
          setGamePhase('lobby');
          setSelectedAnswer(null);
          setIsAnswerSubmitted(false);
          setCurrentQuestionNumber(0);
        }}
      />
    );
  }

  // Playing phase
  if (gamePhase === 'playing' && gameSocket.currentQuestion) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
              <div className="flex-grow">
                <h2 className="text-white font-bold text-lg">Trivia Battle</h2>
              </div>
              {/* Score display */}
              <div className="flex items-center gap-4">
                <div className="bg-white/20 px-4 py-2 rounded-full">
                  <p className="text-white text-sm font-medium">
                    Your Score: <span className="font-bold text-lg">{gameState.currentScore}</span>
                  </p>
                </div>
                {gameState.currentStreak > 0 && (
                  <div className="bg-yellow-400/20 px-4 py-2 rounded-full">
                    <p className="text-yellow-100 text-sm font-medium">
                      🔥 Streak: {gameState.currentStreak}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {gameSocket.gameError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-800">{gameSocket.gameError}</p>
              </div>
            )}

            <TriviaQuestion
              question={gameSocket.currentQuestion}
              questionNumber={currentQuestionNumber}
              totalQuestions={GAME_CONFIG.TRIVIA.TOTAL_QUESTIONS}
              timeRemaining={gameState.timeRemaining}
              maxTime={GAME_CONFIG.TRIVIA.TIME_PER_QUESTION}
              onAnswerSelect={handleAnswerSelect}
              selectedAnswer={selectedAnswer}
              isAnswered={isAnswerSubmitted}
              isLoading={isSubmittingAnswer}
            />

            {selectedAnswer && !isAnswerSubmitted && (
              <div className="mt-4">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={isSubmittingAnswer}
                  className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmittingAnswer ? 'Submitting...' : 'Submit Answer'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
