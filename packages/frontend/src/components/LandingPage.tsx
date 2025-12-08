import { useState, useEffect } from 'react';
import PremiumModal from './PremiumModal';

interface LandingPageProps {
  onStartCall: (data: {
    name: string;
    gender?: string;
    genderPreference?: string;
    isTextMode?: boolean;
    isVideoEnabled?: boolean;
  }) => void;
}

// Live user count
function useLiveUserCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const baseCount = 1247 + Math.floor(Math.random() * 500);
    setCount(baseCount);

    const interval = setInterval(() => {
      setCount(prev => {
        const change = Math.floor(Math.random() * 20) - 10;
        return Math.max(800, prev + change);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return count;
}

export default function LandingPage({ onStartCall }: LandingPageProps) {
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const liveUserCount = useLiveUserCount();

  const handleStart = (textMode = false) => {
    if (!isAdultConfirmed) {
      return;
    }
    onStartCall({
      name: 'Stranger',
      isTextMode: textMode,
      isVideoEnabled: !textMode,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Premium Button - Top Right */}
      <button
        onClick={() => setShowPremiumModal(true)}
        className="absolute top-6 right-6 z-20 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white px-5 py-2.5 rounded-full font-bold shadow-xl hover:scale-105 transition-all text-sm"
      >
        <span className="flex items-center gap-2">
          <span>⭐</span>
          Premium
        </span>
      </button>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-lg mx-auto">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl shadow-2xl mb-4">
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white mb-2">PairCam</h1>
          <p className="text-purple-200 text-lg">Random Video Chat</p>
        </div>

        {/* Live Users */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-white font-bold text-xl">{liveUserCount.toLocaleString()}</span>
            <span className="text-purple-200">online now</span>
          </div>
        </div>

        {/* 18+ Checkbox */}
        <label className="flex items-center justify-center gap-3 mb-8 cursor-pointer group">
          <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
            isAdultConfirmed
              ? 'bg-pink-500 border-pink-500'
              : 'border-white/50 group-hover:border-white'
          }`}>
            {isAdultConfirmed && (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <input
            type="checkbox"
            checked={isAdultConfirmed}
            onChange={() => setIsAdultConfirmed(!isAdultConfirmed)}
            className="sr-only"
          />
          <span className="text-white text-lg">I am 18 or older</span>
        </label>

        {/* Start Buttons */}
        <div className="space-y-4">
          <button
            onClick={() => handleStart(false)}
            disabled={!isAdultConfirmed}
            className="w-full py-5 px-8 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold text-xl rounded-2xl shadow-2xl transition-all transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-3">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Start Video
            </span>
          </button>

          <button
            onClick={() => handleStart(true)}
            disabled={!isAdultConfirmed}
            className="w-full py-4 px-8 bg-white/10 hover:bg-white/20 disabled:bg-white/5 backdrop-blur-sm text-white font-semibold text-lg rounded-2xl border-2 border-white/20 hover:border-white/40 disabled:border-white/10 transition-all disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Text Chat
            </span>
          </button>
        </div>

        {/* Terms */}
        <p className="mt-8 text-purple-300/70 text-sm">
          By using PairCam, you agree to our{' '}
          <a href="/terms-of-service" className="underline hover:text-white">Terms</a>
          {' & '}
          <a href="/privacy-policy" className="underline hover:text-white">Privacy</a>
        </p>
      </div>

      {/* Footer Links */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 text-purple-300/60 text-sm">
        <a href="/blog" className="hover:text-white transition-colors">Blog</a>
        <a href="/blog/video-chat-safety-tips-protect-yourself-online" className="hover:text-white transition-colors">Safety</a>
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <PremiumModal onClose={() => setShowPremiumModal(false)} />
      )}
    </div>
  );
}
