import { useState, useEffect } from 'react';

interface MatchingTimeoutWarningProps {
  isMatching: boolean;
  queueJoinedAt?: number;
  warningThreshold?: number; // seconds before showing warning
  criticalThreshold?: number; // seconds before showing "restart" option
  onRestart?: () => void;
  onCancel?: () => void;
}

export default function MatchingTimeoutWarning({
  isMatching,
  queueJoinedAt,
  warningThreshold = 45,
  criticalThreshold = 90,
  onRestart,
  onCancel,
}: MatchingTimeoutWarningProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isMatching || !queueJoinedAt) {
      setElapsedSeconds(0);
      setDismissed(false);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - queueJoinedAt) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isMatching, queueJoinedAt]);

  // Reset dismissed when re-entering matching
  useEffect(() => {
    if (isMatching) {
      setDismissed(false);
    }
  }, [isMatching]);

  if (!isMatching || dismissed) {
    return null;
  }

  const showWarning = elapsedSeconds >= warningThreshold;
  const isCritical = elapsedSeconds >= criticalThreshold;

  if (!showWarning) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-40 max-w-sm mx-4 transition-all duration-300 ${
        showWarning ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        className={`rounded-xl shadow-lg p-4 ${
          isCritical
            ? 'bg-amber-500 text-white'
            : 'bg-white/95 backdrop-blur-sm text-gray-800 border border-gray-200'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`flex-shrink-0 p-2 rounded-full ${
              isCritical ? 'bg-amber-600' : 'bg-amber-100'
            }`}
          >
            <svg
              className={`w-5 h-5 ${isCritical ? 'text-white' : 'text-amber-600'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">
              {isCritical ? 'Taking Longer Than Expected' : 'Still Searching...'}
            </h4>
            <p className={`text-xs mt-0.5 ${isCritical ? 'text-amber-100' : 'text-gray-600'}`}>
              {isCritical
                ? `You've been waiting for ${Math.floor(elapsedSeconds / 60)}+ minutes. Try restarting or come back later.`
                : "We're still looking for someone. This might take a bit longer."}
            </p>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              {isCritical && onRestart && (
                <button
                  onClick={onRestart}
                  className="bg-white text-amber-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-50 transition-colors"
                >
                  Restart Search
                </button>
              )}
              {isCritical && onCancel && (
                <button
                  onClick={onCancel}
                  className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors border border-amber-400"
                >
                  Leave Queue
                </button>
              )}
              {!isCritical && (
                <button
                  onClick={() => setDismissed(true)}
                  className="text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>

          {/* Close button for non-critical */}
          {!isCritical && (
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-black/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isCritical ? 'bg-white' : 'bg-amber-500'
            }`}
            style={{
              width: `${Math.min(100, (elapsedSeconds / criticalThreshold) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
