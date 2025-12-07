import { useState } from 'react';
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

export default function ReportModal({ onSubmit, onClose, isLoading = false }: ReportModalProps) {
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <FlagIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Report User</h2>
              <p className="text-white/80 text-xs">Help keep our community safe</p>
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
          {step === 'reason' ? (
            <>
              <p className="text-gray-600 mb-4 text-sm">
                What's the issue? Select a reason below:
              </p>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => handleReasonSelect(reason.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      selectedReason === reason.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                    }`}
                  >
                    <span className="text-2xl">{reason.icon}</span>
                    <span className="font-medium text-gray-800">{reason.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('reason')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {REPORT_REASONS.find(r => r.id === selectedReason)?.icon}
                  </span>
                  <span className="font-medium text-orange-800">
                    {REPORT_REASONS.find(r => r.id === selectedReason)?.label}
                  </span>
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Provide any additional context..."
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-0 outline-none text-sm resize-none h-24"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {comment.length}/500
              </p>

              <div className="mt-4 space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                  className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-800">
              Reports are reviewed within 24 hours. Thank you for helping keep PairCam safe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
