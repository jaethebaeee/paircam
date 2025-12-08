import { memo } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { GameResult } from '../../types/games';

interface GameResultsProps {
  result: GameResult;
  isCurrentPlayerWinner: boolean;
  onClose: () => void;
}

function GameResults({ result, isCurrentPlayerWinner, onClose }: GameResultsProps) {
  const gameStats = isCurrentPlayerWinner ? result.player_stats : result.opponent_stats;
  const opponentStats = isCurrentPlayerWinner ? result.opponent_stats : result.player_stats;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scaleIn">
        {/* Header */}
        <div
          className={`bg-gradient-to-r ${isCurrentPlayerWinner ? 'from-green-500 to-emerald-500' : 'from-orange-500 to-red-500'} px-6 py-4 flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <span className="text-2xl">{isCurrentPlayerWinner ? '🏆' : '🎯'}</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">
                {isCurrentPlayerWinner ? 'You Won! 🎉' : 'Game Over'}
              </h2>
              <p className="text-white/80 text-xs">
                {formatDuration(result.duration_seconds)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Score comparison */}
          <div className="space-y-4">
            {/* Your score */}
            <div
              className={`p-5 rounded-xl border-2 ${isCurrentPlayerWinner ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-800">You</span>
                <span className={`text-2xl font-bold ${isCurrentPlayerWinner ? 'text-green-600' : 'text-red-600'}`}>
                  {gameStats.score}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Correct answers:</span>
                  <span className="font-medium">{gameStats.correct_answers}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="font-medium">{gameStats.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg. response time:</span>
                  <span className="font-medium">{gameStats.response_time_avg.toFixed(1)}s</span>
                </div>
              </div>
            </div>

            {/* Opponent score */}
            <div className="p-5 rounded-xl border-2 border-gray-300 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-800">Opponent</span>
                <span className="text-2xl font-bold text-gray-600">{opponentStats.score}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Correct answers:</span>
                  <span className="font-medium">{opponentStats.correct_answers}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="font-medium">{opponentStats.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg. response time:</span>
                  <span className="font-medium">{opponentStats.response_time_avg.toFixed(1)}s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Difficulty badge */}
          <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="text-sm font-medium text-blue-800">
              Difficulty: <strong className="capitalize">{result.difficulty}</strong>
            </span>
          </div>

          {/* Reward message */}
          {isCurrentPlayerWinner && (
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl">
              <p className="text-sm font-medium text-center text-yellow-800">
                🎁 You earned <strong>50 points</strong> and <strong>+5 XP</strong>!
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Play Another Game
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Back to Chat
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 pb-6">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
            <p className="text-xs text-purple-800">
              Great game! Challenge your opponent to a rematch 👊
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(GameResults);
