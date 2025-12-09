import { useState, useEffect } from 'react';
import PremiumModal from './PremiumModal';
import AnimatedBackground from './ui/AnimatedBackground';
import AdBanner from './ads/AdBanner';

interface LandingPageProps {
  onStartCall: (data: {
    name: string;
    gender?: string;
    genderPreference?: string;
    isTextMode?: boolean;
    isVideoEnabled?: boolean;
  }) => void;
}

// Simulated live user count (in production, fetch from API)
function useLiveUserCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Start with a realistic base count
    const baseCount = 1247 + Math.floor(Math.random() * 500);
    setCount(baseCount);

    // Simulate fluctuation
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
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState('');
  const [showNameError, setShowNameError] = useState(false);
  const [showAgeError, setShowAgeError] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const liveUserCount = useLiveUserCount();

  const handleStartChat = (textMode = false) => {
    if (!userName.trim()) {
      setShowNameError(true);
      return;
    }
    if (isAdultConfirmed && (!userAge || parseInt(userAge) < 18)) {
      setShowAgeError(true);
      return;
    }
    // Just pass basic info, preferences will be collected in modal
    onStartCall({
      name: userName.trim(),
      isTextMode: textMode,
      isVideoEnabled: isVideoEnabled,
    });
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground variant="gradient-orbs" />

      {/* Live Users Indicator - Fixed Top Left */}
      <div className="fixed top-20 sm:top-24 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full shadow-lg border border-green-200 animate-fadeIn">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-sm font-semibold text-gray-700">
            <span className="text-green-600">{liveUserCount.toLocaleString()}</span> online
          </span>
        </div>
      </div>

      {/* Premium Button - Fixed Top Right */}
      <button
        onClick={() => setShowPremiumModal(true)}
        className="group fixed top-20 sm:top-24 right-4 z-10 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 sm:px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all text-sm"
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Get Premium
        </span>
      </button>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Hero Section - Clean & Simple */}
        <div className="text-center mb-8 sm:mb-12 pt-12 sm:pt-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500 bg-clip-text text-transparent mb-4 sm:mb-5 leading-tight px-2">
            Your Next Conversation Awaits
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-xl mx-auto px-4">
            Connect instantly with people around the world. No signup, no hassle.
          </p>

          {/* Simple Value Props */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-sm text-gray-600 mb-8 px-2">
            <span className="flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-full shadow-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Free
            </span>
            <span className="flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-full shadow-sm">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Anonymous
            </span>
            <span className="flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-full shadow-sm">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Instant
            </span>
          </div>
        </div>

        {/* Start Chat Form Section */}
        <div className="max-w-md mx-auto px-2">

        {/* Clean Form Box */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-4 sm:mb-6">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Get Started</h3>

          <div className="space-y-5">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value.slice(0, 30));
                  setShowNameError(false);
                }}
                placeholder="Enter a nickname"
                aria-label="Your name or nickname"
                aria-required="true"
                aria-invalid={showNameError}
                className={`w-full px-4 py-3 rounded-lg border ${
                  showNameError
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                    : 'border-gray-300 focus:border-gray-900 focus:ring-gray-100'
                } focus:ring-2 outline-none text-base transition-colors`}
                maxLength={30}
              />
              {showNameError && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  Please enter your name to continue
                </p>
              )}
            </div>

            {/* Video Toggle */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <span className="text-sm font-medium text-gray-900">Enable video</span>
                <p className="text-xs text-gray-500">Share your camera during calls</p>
              </div>
              <button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                role="switch"
                aria-checked={isVideoEnabled}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isVideoEnabled ? 'bg-gray-900' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isVideoEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Age Confirmation */}
            <label className="flex items-center gap-3 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdultConfirmed}
                onChange={() => {
                  setIsAdultConfirmed(!isAdultConfirmed);
                  if (isAdultConfirmed) {
                    setUserAge('');
                    setShowAgeError(false);
                  }
                }}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                isAdultConfirmed ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
              }`}>
                {isAdultConfirmed && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">I'm 18 or older</span>
                <p className="text-xs text-gray-500">Required for video chat</p>
              </div>
            </label>

            {/* Age Input */}
            {isAdultConfirmed && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your age
                </label>
                <input
                  type="number"
                  value={userAge}
                  onChange={(e) => {
                    setUserAge(e.target.value);
                    setShowAgeError(false);
                  }}
                  placeholder="18"
                  min="18"
                  max="120"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    showAgeError
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-300 focus:border-gray-900'
                  } focus:ring-2 focus:ring-gray-100 outline-none text-base transition-colors`}
                />
                {showAgeError && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    You must be 18 or older
                  </p>
                )}
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={() => handleStartChat(false)}
              disabled={!userName.trim() || (isAdultConfirmed && (!userAge || parseInt(userAge) < 18))}
              className="group w-full py-4 px-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold text-base rounded-xl transition-all disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Start Video Chat
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            {/* Text Mode Button */}
            <button
              onClick={() => handleStartChat(true)}
              disabled={!userName.trim()}
              className="w-full py-3 px-6 border-2 border-gray-200 hover:border-gray-300 disabled:border-gray-100 text-gray-700 hover:text-gray-900 disabled:text-gray-400 font-medium text-sm rounded-xl transition-all disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Text-Only Mode
              </span>
            </button>
          </div>
        </div>

        {/* Compact Safety Section */}
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-sm font-semibold text-gray-900">Your Safety Matters</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span>24/7 Moderation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              <span>Anonymous by Default</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
              <span>Report & Block</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
              <span>18+ Verification</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-1">
            <span className="font-medium text-gray-900">Stay safe:</span> Never share personal info with strangers.
          </p>
          <p className="text-xs text-gray-500">
            By using this service, you agree to our{' '}
            <a href="/terms-of-service" className="text-gray-700 underline hover:text-gray-900">Terms</a>
            {' '}and{' '}
            <a href="/privacy-policy" className="text-gray-700 underline hover:text-gray-900">Privacy Policy</a>.
          </p>
        </div>

        {/* Ad Banner - Below Form */}
        <div className="max-w-md mx-auto mt-8 px-2">
          <AdBanner format="responsive" className="rounded-xl overflow-hidden" />
        </div>
      </div>
      </div>

      {/* Ad Banner - Side placement for desktop */}
      <div className="hidden xl:block fixed right-4 top-1/2 -translate-y-1/2 w-[160px] z-0">
        <AdBanner format="vertical" className="rounded-xl overflow-hidden" />
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <PremiumModal onClose={() => setShowPremiumModal(false)} />
      )}
    </div>
  );
}
