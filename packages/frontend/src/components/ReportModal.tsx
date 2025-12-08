import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ReportModalProps {
  onSubmit: (reason: string, comment?: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or Bullying' },
  { id: 'inappropriate_content', label: 'Inappropriate Content' },
  { id: 'spam', label: 'Spam or Advertising' },
  { id: 'hate_speech', label: 'Hate Speech' },
  { id: 'underage', label: 'Appears Underage' },
  { id: 'other', label: 'Other' },
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Report</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1.5 hover:bg-neutral-100 rounded-full transition-all"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {step === 'reason' ? (
            <>
              <p className="text-neutral-500 text-sm mb-5">
                What's the issue?
              </p>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => handleReasonSelect(reason.id)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-all text-left"
                  >
                    <span className="text-sm font-medium text-neutral-800">{reason.label}</span>
                    <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('reason')}
                className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-700 mb-5 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="bg-neutral-50 rounded-xl px-4 py-3 mb-5">
                <span className="text-sm font-medium text-neutral-700">
                  {REPORT_REASONS.find(r => r.id === selectedReason)?.label}
                </span>
              </div>

              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Additional details
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-neutral-400 focus:ring-0 outline-none text-sm resize-none h-24 bg-white"
                maxLength={500}
              />

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                  className="w-full py-3 text-neutral-500 hover:text-neutral-700 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
