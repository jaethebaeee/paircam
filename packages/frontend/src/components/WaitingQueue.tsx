import { useState, useEffect } from 'react';

interface WaitingQueueProps {
  queuePosition?: number;
  estimatedWaitTime?: number;
  onCancel: () => void;
}

export default function WaitingQueue({ queuePosition, onCancel }: WaitingQueueProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const tips = [
    'Be respectful and kind to everyone you meet',
    'You can skip to the next person anytime',
    'Use the chat feature to send messages',
    'Report any inappropriate behavior',
  ];

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [tips.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        {/* Loading animation - clean minimal */}
        <div className="mb-10">
          <div className="relative w-20 h-20 mx-auto">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-neutral-100"></div>
            {/* Spinning indicator */}
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-rose-400 animate-spin"
              style={{ animationDuration: '1.2s' }}
            ></div>
            {/* Inner content */}
            <div className="absolute inset-3 rounded-full bg-neutral-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
          Finding your match
        </h1>
        <p className="text-neutral-500 mb-8">
          This usually takes a few seconds
        </p>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 mb-10">
          {queuePosition !== undefined && (
            <div className="text-center">
              <div className="text-2xl font-semibold text-neutral-900">{queuePosition}</div>
              <div className="text-xs text-neutral-400 uppercase tracking-wide">in queue</div>
            </div>
          )}
          <div className="text-center">
            <div className="text-2xl font-semibold text-neutral-900 tabular-nums">{formatTime(elapsedTime)}</div>
            <div className="text-xs text-neutral-400 uppercase tracking-wide">elapsed</div>
          </div>
        </div>

        {/* Tip - clean minimal */}
        <div className="bg-neutral-50 rounded-2xl px-6 py-4 mb-10">
          <p className="text-sm text-neutral-600 leading-relaxed">
            {tips[currentTipIndex]}
          </p>
        </div>

        {/* Cancel button - Hinge/Airbnb style */}
        <button
          onClick={onCancel}
          className="w-full py-4 text-neutral-500 hover:text-neutral-700 font-medium text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
