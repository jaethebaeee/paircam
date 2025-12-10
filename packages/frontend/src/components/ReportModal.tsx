import { useState, memo } from 'react';
import { FlagIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface ReportModalProps {
  onSubmit: (reason: string, comment?: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or Bullying', icon: '😡' },
  { id: 'inappropriate_content', label: 'Inappropriate Content', icon: '🔞' },
  { id: 'spam', label: 'Spam or Advertising', icon: '📢' },
  { id: 'hate_speech', label: 'Hate Speech', icon: '🚫' },
  { id: 'underage', label: 'Appears Underage', icon: '👶' },
  { id: 'other', label: 'Other', icon: '❓' },
];

function ReportModal({ onSubmit, onClose, isLoading = false }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<'reason' | 'comment'>('reason');

  const handleSubmit = () => {
    if (!selectedReason) return;
    onSubmit(selectedReason, comment || undefined);
  };

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
    setStep('comment');
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl" aria-hidden="true">
              <FlagIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 id="report-modal-title" className="text-white font-bold text-lg">Report User</h2>
              <p className="text-white/80 text-xs">Help keep our community safe</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Close dialog"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'reason' ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                What's the issue? Select a reason below:
              </p>
              <div className="space-y-2" role="radiogroup" aria-label="Report reason">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => handleReasonSelect(reason.id)}
                    role="radio"
                    aria-checked={selectedReason === reason.id}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                      selectedReason === reason.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
                    }`}
                  >
                    <span className="text-2xl" aria-hidden="true">{reason.icon}</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{reason.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('reason')}
                className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 rounded"
                aria-label="Go back to reason selection"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">
                    {REPORT_REASONS.find(r => r.id === selectedReason)?.icon}
                  </span>
                  <span className="font-medium text-orange-800 dark:text-orange-200">
                    {REPORT_REASONS.find(r => r.id === selectedReason)?.label}
                  </span>
                </div>
              </div>

              <label htmlFor="report-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional details (optional)
              </label>
              <textarea
                id="report-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Provide any additional context..."
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-0 outline-none text-sm resize-none h-24"
                maxLength={500}
                aria-describedby="comment-count"
              />
              <p id="comment-count" className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
                {comment.length}/500
              </p>

              <div className="mt-4 space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    'Submit Report'
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/30 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Reports are reviewed within 24 hours. Thank you for helping keep PairCam safe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ReportModal);
