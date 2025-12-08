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
        className="fixed top-20 sm:top-24 right-4 z-10 bg-white border border-gray-200 hover:border-purple-300 text-gray-700 hover:text-purple-600 px-4 py-2 rounded-full font-medium shadow-sm hover:shadow-md transition-all duration-200 text-sm flex items-center gap-2"
      >
        <span className="text-yellow-500">★</span>
        <span>Premium</span>
      </button>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Hero Section - Clean & Simple */}
        <div className="text-center mb-8 sm:mb-12 pt-12 sm:pt-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4 sm:mb-5 leading-tight px-2">
            Video Chat with Strangers
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-700 mb-6 sm:mb-8 max-w-xl mx-auto px-4">
            Meet new people worldwide. No signup required.
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

        {/* Clean Form Card */}
        <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-lg border-2 transition-all duration-300 p-5 sm:p-8 mb-4 sm:mb-6 ${
          isFormFocused ? 'border-pink-300 shadow-xl' : 'border-gray-100'
        }`}>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Name Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Your name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value.slice(0, 30));
                  setShowNameError(false);
                }}
                onFocus={() => setIsFormFocused(true)}
                onBlur={() => setIsFormFocused(false)}
                placeholder="Enter a nickname"
                aria-label="Your name or nickname"
                aria-required="true"
                aria-invalid={showNameError}
                className={`w-full px-4 py-3 rounded-xl border ${
                  showNameError
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-pink-500'
                } focus:ring-2 focus:ring-pink-100 outline-none text-base transition-colors`}
                maxLength={30}
              />
              {showNameError && (
                <p className="text-xs text-red-600" role="alert">
                  Please enter a name
                </p>
              )}
            </div>

            {/* Video Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm font-medium text-gray-700">Enable video</span>
              <button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                role="switch"
                aria-checked={isVideoEnabled}
                aria-label={`Video ${isVideoEnabled ? 'enabled' : 'disabled'}`}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isVideoEnabled ? 'bg-pink-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isVideoEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Adult Confirmation */}
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
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
                className="w-5 h-5 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                aria-label="Confirm you are 18 years or older"
              />
              <span className="text-sm text-gray-700">I'm 18 or older</span>
            </label>

            {/* Age Input */}
            {isAdultConfirmed && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Your age</label>
                <input
                  type="number"
                  value={userAge}
                  onChange={(e) => {
                    setUserAge(e.target.value);
                    setShowAgeError(false);
                  }}
                  onFocus={() => setIsFormFocused(true)}
                  onBlur={() => setIsFormFocused(false)}
                  placeholder="18"
                  min="18"
                  max="120"
                  aria-label="Your age"
                  aria-required="true"
                  aria-invalid={showAgeError}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    showAgeError
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-pink-500'
                  } focus:ring-2 focus:ring-pink-100 outline-none text-base transition-colors`}
                />
                {showAgeError && (
                  <p className="text-xs text-red-600" role="alert">
                    Must be 18 or older
                  </p>
                )}
              </div>
            )}


            {/* Start Button */}
            <div className="pt-2">
              <button
                onClick={() => handleStartChat(false)}
                disabled={!userName.trim() || (isAdultConfirmed && (!userAge || parseInt(userAge) < 18))}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl disabled:shadow-none transition-all disabled:cursor-not-allowed"
              >
                Start Chat
              </button>
            </div>

            {/* Text Only Option */}
            <div className="text-center">
              <button
                onClick={() => handleStartChat(true)}
                disabled={!userName.trim()}
                aria-label="Start text only chat mode"
                className="text-sm text-gray-500 hover:text-pink-600 disabled:text-gray-300 transition-colors disabled:cursor-not-allowed"
              >
                or text only
              </button>
            </div>
          </div>
        </div>

        {/* Simple Disclaimer */}
        <p className="text-xs text-center text-gray-500 mt-4">
          By clicking Start, you agree to our{' '}
          <a href="/terms-of-service" className="text-pink-600 hover:underline">Terms</a>
          {' '}&{' '}
          <a href="/privacy-policy" className="text-pink-600 hover:underline">Privacy</a>
        </p>
        </div>

        {/* Ad Banner - Below Form */}
        <div className="max-w-md mx-auto mt-8 px-2">
          <AdBanner format="responsive" className="rounded-xl overflow-hidden" />
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
