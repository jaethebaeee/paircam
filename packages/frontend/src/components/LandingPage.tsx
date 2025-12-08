import { useState, useEffect } from 'react';
import PremiumModal from './PremiumModal';
import AnimatedBackground from './ui/AnimatedBackground';

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
  const [isFormFocused, setIsFormFocused] = useState(false);
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

      {/* Premium Button - Fixed Top Right */}
      <button
        onClick={() => setShowPremiumModal(true)}
        className="group fixed top-20 sm:top-24 right-4 z-10 bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 hover:from-yellow-500 hover:via-orange-500 hover:to-orange-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold shadow-xl shadow-orange-300/40 hover:shadow-2xl hover:shadow-orange-400/60 transition-all duration-300 hover:scale-110 active:scale-95 overflow-hidden text-sm sm:text-base"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <span className="relative flex items-center gap-1.5 sm:gap-2">
          <span className="text-base sm:text-lg animate-bounce-subtle">⭐</span>
          <span className="hidden sm:inline">Get Premium</span>
          <span className="sm:hidden">Premium</span>
        </span>
      </button>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12 pt-16 sm:pt-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight px-2">
            No profiles. No swiping.
            <span className="block bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mt-2">Just people.</span>
          </h1>

          {/* Social Proof - User Count */}
          {liveUserCount > 0 && (
            <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-gray-600 text-base sm:text-lg">
                <span className="font-semibold text-gray-900">{liveUserCount.toLocaleString()}</span> people online right now
              </span>
            </div>
          )}
        </div>


        {/* Start Chat Form Section */}
        <div className="max-w-2xl mx-auto px-2">

        {/* Clean Form Card */}
        <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-xl border transition-all duration-300 p-6 sm:p-8 mb-4 sm:mb-6 ${
          isFormFocused ? 'border-pink-200 shadow-2xl' : 'border-gray-100'
        }`}>
          <div className="space-y-5">
            {/* Name Input */}
            <div>
              <input
                type="text"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value.slice(0, 30));
                  setShowNameError(false);
                }}
                onFocus={() => setIsFormFocused(true)}
                onBlur={() => setIsFormFocused(false)}
                placeholder="Pick a name, any name"
                aria-label="Your nickname"
                aria-required="true"
                aria-invalid={showNameError}
                className={`w-full px-4 py-4 rounded-xl border-2 text-lg ${
                  showNameError
                    ? 'border-red-400 bg-red-50/50'
                    : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 focus:border-pink-500'
                } focus:ring-4 focus:ring-pink-100 outline-none transition-all placeholder:text-gray-400`}
                maxLength={30}
              />
              {showNameError && (
                <p className="mt-2 text-sm text-red-600" role="alert">Enter a name to continue</p>
              )}
            </div>

            {/* Video Toggle - Simplified */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                  role="switch"
                  aria-checked={isVideoEnabled}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    isVideoEnabled ? 'bg-pink-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isVideoEnabled ? 'translate-x-5' : ''
                  }`} />
                </button>
                <span className="text-gray-700">Video on</span>
              </div>
            </div>

            {/* 18+ Checkbox - Simplified */}
            <label className="flex items-center gap-3 py-2 cursor-pointer">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isAdultConfirmed ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
              }`}>
                {isAdultConfirmed && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
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
              <span className="text-gray-700">I'm 18+</span>
            </label>

            {/* Age Input - Shows when 18+ is confirmed */}
            {isAdultConfirmed && (
              <div>
                <input
                  type="number"
                  value={userAge}
                  onChange={(e) => {
                    setUserAge(e.target.value);
                    setShowAgeError(false);
                  }}
                  onFocus={() => setIsFormFocused(true)}
                  onBlur={() => setIsFormFocused(false)}
                  placeholder="Your age"
                  min="18"
                  max="120"
                  className={`w-full px-4 py-4 rounded-xl border-2 text-lg ${
                    showAgeError ? 'border-red-400 bg-red-50/50' : 'border-gray-200 bg-gray-50/50 focus:border-pink-500'
                  } focus:ring-4 focus:ring-pink-100 outline-none transition-all placeholder:text-gray-400`}
                />
                {showAgeError && (
                  <p className="mt-2 text-sm text-red-600">Must be 18 or older</p>
                )}
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={() => handleStartChat(false)}
              disabled={!userName.trim() || (isAdultConfirmed && (!userAge || parseInt(userAge) < 18))}
              className="w-full py-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold text-lg rounded-xl transition-all disabled:cursor-not-allowed"
            >
              Start chatting →
            </button>

            {/* Text option */}
            <button
              onClick={() => handleStartChat(true)}
              disabled={!userName.trim()}
              className="w-full text-center text-gray-500 hover:text-gray-700 disabled:text-gray-300 text-sm transition-colors"
            >
              or text only
            </button>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="text-center mt-6 sm:mt-8 text-xs sm:text-sm text-gray-500">
          <p>
            Moderated 24/7. Be kind, stay anonymous.{' '}
            <a href="/terms-of-service" className="text-gray-600 hover:text-gray-800 underline">Terms</a>
            {' '}&{' '}
            <a href="/privacy-policy" className="text-gray-600 hover:text-gray-800 underline">Privacy</a>
          </p>
        </div>
        </div>
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <PremiumModal onClose={() => setShowPremiumModal(false)} />
      )}
    </div>
  );
}
