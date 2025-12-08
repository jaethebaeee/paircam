import { useState } from 'react';
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

export default function BlockModal({ onBlock, onClose, isLoading = false }: BlockModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');

  const handleSubmit = () => {
    if (selectedReason) {
      onBlock(selectedReason);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <NoSymbolIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Block User</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            disabled={isLoading}
          >
            <XMarkIcon className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Blocking this user will prevent you from being matched with them again.
            They won't be notified that you blocked them.
          </p>

          <p className="text-sm font-medium text-gray-800 mb-3">
            Why are you blocking this user?
          </p>

          <div className="space-y-2 mb-6">
            {BLOCK_REASONS.map((reason) => (
              <button
                key={reason.id}
                onClick={() => setSelectedReason(reason.id)}
                className={`w-full px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  selectedReason === reason.id
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
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
              className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedReason || isLoading}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                selectedReason && !isLoading
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            You can manage blocked users in your settings at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
