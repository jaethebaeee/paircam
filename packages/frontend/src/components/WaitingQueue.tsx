import { useState, useEffect, useMemo } from 'react';
import { SparklesIcon, UserGroupIcon, ClockIcon, ShieldCheckIcon, HeartIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from './ui/AnimatedBackground';

interface WaitingQueueProps {
  queuePosition?: number;
  estimatedWaitTime?: number; // seconds
  onCancel: () => void;
}

// Floating hearts animation
function FloatingHearts() {
  const hearts = useMemo(() =>
    Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 4}s`,
      size: 12 + Math.random() * 16,
      opacity: 0.2 + Math.random() * 0.3,
    }))
  , []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute bottom-0 animate-float-up"
          style={{
            left: heart.left,
            animationDelay: heart.delay,
            animationDuration: heart.duration,
          }}
        >
          <HeartIcon
            className="text-pink-400"
            style={{
              width: heart.size,
              height: heart.size,
              opacity: heart.opacity,
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) rotate(0deg) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translateY(-10vh) rotate(-10deg) scale(1);
          }
          90% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-100vh) rotate(20deg) scale(0.5);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: float-up linear infinite;
        }
      `}</style>
    </div>
  );
}

export default function WaitingQueue({ queuePosition, estimatedWaitTime, onCancel }: WaitingQueueProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pulseScale, setPulseScale] = useState(1);

  const tips = [
    { icon: '🤝', text: 'Be respectful and kind to everyone you meet' },
    { icon: '🚨', text: 'Report inappropriate behavior immediately' },
    { icon: '🎭', text: 'You can skip to the next person anytime' },
    { icon: '💬', text: 'Use the chat feature if your camera is off' },
    { icon: '🌍', text: 'Meet people from around the world!' },
    { icon: '⚠️', text: 'Never share personal information like your address' },
    { icon: '🛡️', text: 'Our AI monitors for inappropriate content' },
  ];

  // Pulse animation for the main icon
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseScale(s => s === 1 ? 1.1 : 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground variant="particles" intensity="low" />
      <FloatingHearts />

      <div className="max-w-2xl w-full relative z-10">
        {/* Main Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-12 border border-white/50 relative overflow-hidden">
          {/* Gradient glow effect */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-pink-400/30 to-purple-400/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-8 relative">
            <div
              className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 rounded-full mb-6 shadow-xl shadow-purple-500/30 transition-transform duration-500"
              style={{ transform: `scale(${pulseScale})` }}
            >
              <SparklesIcon className="w-12 h-12 text-white" />
              {/* Rotating ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-pink-300/50 animate-spin" style={{ animationDuration: '10s' }} />
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
          <div className="mb-8 relative">
            <div className="bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 transition-all duration-500 ease-out relative rounded-full"
                style={{ width: `${progress}%` }}
              >
                {/* Animated shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />
                {/* Glowing tip */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg shadow-white/50" />
              </div>
            </div>
            <div className="flex justify-between mt-3 text-sm">
              <span className="text-gray-500 flex items-center gap-2">
                <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                Searching for your match...
              </span>
              <span className="font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {/* Rotating Tips */}
          <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-amber-200/50 shadow-lg relative overflow-hidden">
            {/* Animated gradient border */}
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-amber-400/20 via-orange-400/20 to-amber-400/20 opacity-50" />

            <div className="flex items-center gap-4 relative">
              <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-orange-500/25">
                <span className="text-3xl animate-bounce-subtle">{tips[currentTipIndex].icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Quick Tip</span>
                  <div className="flex gap-1">
                    {tips.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                          i === currentTipIndex ? 'bg-orange-500 w-4' : 'bg-orange-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 font-medium leading-relaxed animate-fadeIn" key={currentTipIndex}>
                  {tips[currentTipIndex].text}
                </p>
              </div>
            </div>
          </div>

          {/* Safety Badge */}
          <div className="flex items-center justify-center gap-3 text-sm mb-6 bg-green-50/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-green-200/50">
            <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full">
              <ShieldCheckIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-green-800 font-medium">Your safety is our priority • All chats are AI monitored</span>
          </div>

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="group w-full py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-300 hover:shadow-lg active:scale-[0.98] relative overflow-hidden"
          >
            <span className="relative z-10">Cancel and Go Back</span>
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200/0 via-gray-300/50 to-gray-200/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Having trouble connecting? Check your internet connection or try again later.
            </p>
          </div>
        </div>

        {/* Fun Facts Below Card */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm px-5 py-3 rounded-full shadow-lg border border-white/50">
            <span className="text-xl">💡</span>
            <span className="text-sm text-gray-700">
              <strong className="text-gray-900">Did you know?</strong> Over 10,000+ people connect daily on PairCam
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

