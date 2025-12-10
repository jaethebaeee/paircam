import { useState, memo } from 'react';
import { XMarkIcon, NoSymbolIcon } from '@heroicons/react/24/solid';

interface BlockModalProps {
  onBlock: (reason: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const BLOCK_REASONS = [
  { id: 'harassment', label: 'Harassment or Bullying' },
  { id: 'inappropriate', label: 'Inappropriate Behavior' },
  { id: 'spam', label: 'Spam or Advertising' },
  { id: 'offensive', label: 'Offensive Content' },
  { id: 'uncomfortable', label: 'Made Me Uncomfortable' },
  { id: 'other', label: 'Other' },
];

function BlockModal({ onBlock, onClose, isLoading = false }: BlockModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');

  const handleSubmit = () => {
    if (selectedReason) {
      onBlock(selectedReason);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-modal-title"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full" aria-hidden="true">
              <NoSymbolIcon className="h-6 w-6 text-white" />
            </div>
            <h2 id="block-modal-title" className="text-xl font-bold text-white">Block User</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            disabled={isLoading}
            aria-label="Close dialog"
          >
            <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Blocking this user will prevent you from being matched with them again.
            They won't be notified that you blocked them.
          </p>

          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
            Why are you blocking this user?
          </p>

          <div className="space-y-2 mb-6" role="radiogroup" aria-label="Select a reason for blocking">
            {BLOCK_REASONS.map((reason) => (
              <button
                key={reason.id}
                onClick={() => setSelectedReason(reason.id)}
                role="radio"
                aria-checked={selectedReason === reason.id}
                className={`w-full px-4 py-3 rounded-xl border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50 ${
                  selectedReason === reason.id
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
                disabled={isLoading}
              >
                {reason.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/30"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedReason || isLoading}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-red-500/50 ${
                selectedReason && !isLoading
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Blocking...
                </span>
              ) : (
                'Block User'
              )}
            </button>
          </div>
        </div>

        {/* Info Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            You can manage blocked users in your settings at any time.
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(BlockModal);
