import { useState } from 'react';
import { FlagIcon } from '@heroicons/react/24/solid';
import CloseButton from './ui/CloseButton';
import PrimaryButton from './ui/PrimaryButton';
import { BackIcon } from './ui/icons';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[95vh] overflow-y-auto shadow-2xl animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg sm:rounded-xl">
              <FlagIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base sm:text-lg">Report User</h2>
              <p className="text-white/80 text-[10px] sm:text-xs">Help keep our community safe</p>
            </div>
          </div>
          <CloseButton onClick={onClose} variant="light" size="md" />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {step === 'reason' ? (
            <>
              <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">
                What's the issue? Select a reason below:
              </p>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => handleReasonSelect(reason.id)}
                    className={`w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-xl border-2 transition-all text-left min-h-[48px] ${
                      selectedReason === reason.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl">{reason.icon}</span>
                    <span className="font-medium text-gray-800 text-sm sm:text-base">{reason.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('reason')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-3 sm:mb-4 text-xs sm:text-sm"
              >
                <BackIcon />
                Back
              </button>

              <div className="bg-orange-50 border border-orange-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl">
                    {REPORT_REASONS.find(r => r.id === selectedReason)?.icon}
                  </span>
                  <span className="font-medium text-orange-800 text-sm sm:text-base">
                    {REPORT_REASONS.find(r => r.id === selectedReason)?.label}
                  </span>
                </div>
              </div>

              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Provide any additional context..."
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:ring-0 outline-none text-sm resize-none h-20 sm:h-24"
                maxLength={500}
              />
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1 text-right">
                {comment.length}/500
              </p>

              <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                <PrimaryButton
                  onClick={handleSubmit}
                  disabled={isLoading}
                  loading={isLoading}
                  loadingText="Submitting..."
                  variant="danger"
                  fullWidth
                >
                  Submit Report
                </PrimaryButton>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 sm:py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors text-sm sm:text-base min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-2.5 sm:p-3 text-center">
            <p className="text-[10px] sm:text-xs text-blue-800">
              Reports are reviewed within 24 hours. Thank you for helping keep PairCam safe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
