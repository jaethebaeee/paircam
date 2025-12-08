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
                className={`w-full p-4 rounded-2xl transition-all text-left font-semibold flex items-center justify-between shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
                  difficulty === 'easy'
                    ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white'
                    : difficulty === 'medium'
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                      : 'bg-gradient-to-r from-red-400 to-rose-500 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                <span className="flex items-center gap-3">
                  <span className="text-2xl bg-white/20 p-2 rounded-xl">
                    {difficulty === 'easy' ? '🌱' : difficulty === 'medium' ? '⚡' : '🔥'}
                  </span>
                  <span className="text-lg">{DIFFICULTY_LABELS[difficulty]}</span>
                </span>
                <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                  {difficulty === 'easy' && '1-3 ⭐'}
                  {difficulty === 'medium' && '4-6 ⭐'}
                  {difficulty === 'hard' && '7-9 ⭐'}
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
            className="w-full mt-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
