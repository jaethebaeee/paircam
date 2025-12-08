import { useState, useEffect } from 'react';
import { SparklesIcon, UserGroupIcon, ClockIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface WaitingQueueProps {
  queuePosition?: number;
  estimatedWaitTime?: number; // seconds
  onCancel: () => void;
}

export default function WaitingQueue({ queuePosition, estimatedWaitTime, onCancel }: WaitingQueueProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const tips = [
    { icon: '🤝', text: 'Be respectful and kind to everyone you meet' },
    { icon: '🚨', text: 'Report inappropriate behavior immediately' },
    { icon: '🎭', text: 'You can skip to the next person anytime' },
    { icon: '💬', text: 'Use the chat feature if your camera is off' },
    { icon: '🌍', text: 'Meet people from around the world!' },
    { icon: '⚠️', text: 'Never share personal information like your address' },
    { icon: '🛡️', text: 'Our AI monitors for inappropriate content' },
  ];

  // Rotate tips every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [tips.length]);

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate progress based on estimated wait time or elapsed time
  useEffect(() => {
    if (estimatedWaitTime && estimatedWaitTime > 0) {
      const progressPercentage = Math.min((elapsedTime / estimatedWaitTime) * 100, 95);
      setProgress(progressPercentage);
    } else {
      // If no estimate, show a pulsing progress (30% to 70%)
      const pulsingProgress = 30 + Math.sin(elapsedTime / 2) * 20;
      setProgress(pulsingProgress);
    }
  }, [elapsedTime, estimatedWaitTime]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full mb-6 animate-pulse">
              <SparklesIcon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Finding your match...
            </h2>
            <p className="text-gray-600 text-lg">
              We're connecting you with someone awesome
            </p>
          </div>

          {/* Queue Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Queue Position */}
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-6 text-center">
              <UserGroupIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-purple-900 mb-1">
                {queuePosition !== undefined ? queuePosition : '...'}
              </div>
              <div className="text-sm text-purple-700 font-medium">
                {queuePosition === 1 ? 'person ahead' : 'people in queue'}
              </div>
            </div>

            {/* Wait Time */}
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl p-6 text-center">
              <ClockIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-blue-900 mb-1">
                {estimatedWaitTime !== undefined ? formatTime(estimatedWaitTime) : '~15s'}
              </div>
              <div className="text-sm text-blue-700 font-medium">
                estimated wait
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 transition-all duration-500 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span>Searching...</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Rotating Tips */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-orange-400 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="text-4xl mt-1 animate-bounce-subtle">
                {tips[currentTipIndex].icon}
              </div>
              <div>
                <div className="text-sm font-semibold text-orange-900 mb-1 uppercase tracking-wide">
                  Quick Tip
                </div>
                <p className="text-gray-800 text-base leading-relaxed">
                  {tips[currentTipIndex].text}
                </p>
              </div>
            </div>
          </div>

          {/* Safety Badge */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-6">
            <ShieldCheckIcon className="w-5 h-5 text-green-600" />
            <span>Your safety is our priority • All chats are monitored</span>
          </div>

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="w-full px-6 py-3 border-2 border-gray-400 text-gray-600 font-semibold rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center text-center"
          >
            <span>Cancel and Go Back</span>
          </button>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Having trouble connecting? Check your internet connection or try again later.
            </p>
          </div>
        </div>

        {/* Fun Facts Below Card */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            💡 <strong>Did you know?</strong> Over 10,000+ people connect daily on PairCam
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}

