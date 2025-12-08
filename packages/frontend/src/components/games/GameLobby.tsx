import { XMarkIcon } from '@heroicons/react/24/solid';
import { Difficulty } from '../../types/games';
import { DIFFICULTY_LABELS, GAME_CONFIG } from '../../constants/games';

interface GameLobbyProps {
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function GameLobby({ onSelectDifficulty, onClose, isLoading = false }: GameLobbyProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <span className="text-2xl">🎮</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Trivia Battle</h2>
              <p className="text-white/80 text-xs">Face off against your peer</p>
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
        <div className="p-6">
          <p className="text-gray-600 mb-6 text-center font-medium">
            Choose your difficulty level
          </p>

          <div className="space-y-3">
            {GAME_CONFIG.TRIVIA.DIFFICULTIES.map((difficulty) => (
              <button
                key={difficulty}
                onClick={() => onSelectDifficulty(difficulty)}
                disabled={isLoading}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left font-medium flex items-center justify-between ${
                  difficulty === 'easy'
                    ? 'border-emerald-300 hover:bg-emerald-50'
                    : difficulty === 'medium'
                      ? 'border-amber-300 hover:bg-amber-50'
                      : 'border-red-300 hover:bg-red-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="flex items-center gap-3">
                  <span className="text-2xl">
                    {difficulty === 'easy' ? '🟢' : difficulty === 'medium' ? '🟡' : '🔴'}
                  </span>
                  <span>{DIFFICULTY_LABELS[difficulty]}</span>
                </span>
                <span className="text-sm text-gray-500">
                  {difficulty === 'easy' && '1-3 stars'}
                  {difficulty === 'medium' && '4-6 stars'}
                  {difficulty === 'hard' && '7-9 stars'}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs text-blue-800 text-center">
              <strong>Game Rules:</strong> Answer 10 trivia questions correctly to win. You have 30 seconds per question. Good luck! 🍀
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
