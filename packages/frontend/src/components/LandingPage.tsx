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
        <div className="text-center mb-12 sm:mb-16 pt-12 sm:pt-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 rounded-3xl shadow-xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="PairCam logo - Global video chat network">
                <title>PairCam - Connect with people worldwide</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-6 sm:mb-8 leading-tight px-2">
            Real conversations.
            <span className="block mt-1 sm:mt-2">Real people.</span>
            <span className="block mt-1 sm:mt-2">Right now.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12 max-w-xl mx-auto px-4">
            No accounts. No algorithms. Just you and someone new.
          </p>
        </div>


        {/* Start Chat Form Section */}
        <div className="max-w-2xl mx-auto px-2">

        {/* Modern Options Box */}
        <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-luxury border-2 transition-all duration-300 p-5 sm:p-8 md:p-10 mb-4 sm:mb-6 animate-fadeIn ${
          isFormFocused ? 'border-pink-300 shadow-lg shadow-pink-200/30 scale-[1.01]' : 'border-gray-100 hover:shadow-luxury-hover'
        }`}>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 tracking-tight">Jump in</h3>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Name Input */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-semibold text-gray-900">
                  What should we call you?
                </label>
                <span className={`text-xs sm:text-sm font-medium transition-colors ${
                  userName.length === 30 ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {userName.length}/30
                </span>
              </div>
              <div className="relative group">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value.slice(0, 30));
                    setShowNameError(false);
                  }}
                  onFocus={() => setIsFormFocused(true)}
                  onBlur={() => setIsFormFocused(false)}
                  placeholder="Pick any name"
                  aria-label="Your nickname"
                  aria-required="true"
                  aria-invalid={showNameError}
                  className={`w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 ${
                    showNameError
                      ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                      : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 focus:border-pink-500'
                  } focus:ring-4 focus:ring-pink-100 outline-none text-sm sm:text-base transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:shadow-md`}
                  maxLength={30}
                />
                {userName && !showNameError && (
                  <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-green-500 animate-scaleIn">
                    <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {showNameError && (
                <p className="text-xs sm:text-sm text-red-600 flex items-center gap-2 animate-fadeIn" role="alert">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Please enter your name to continue
                </p>
              )}
            </div>

            {/* Modern Toggle Switch for Video */}
            <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl sm:rounded-2xl shadow-inner border-2 border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 group">
              <label className="flex items-center cursor-pointer flex-1">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                    <span className="text-sm sm:text-base font-semibold text-gray-900">Use camera</span>
                    <svg className={`w-4 h-4 transition-colors ${isVideoEnabled ? 'text-pink-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600">Face-to-face is more fun</p>
                </div>
              </label>
              <button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                role="switch"
                aria-checked={isVideoEnabled}
                aria-label={`Video ${isVideoEnabled ? 'enabled' : 'disabled'}`}
                className={`relative inline-flex h-7 sm:h-9 w-12 sm:w-16 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-pink-100 shadow-sm flex-shrink-0 ml-3 ${
                  isVideoEnabled ? 'bg-gradient-to-r from-pink-500 to-purple-500 shadow-pink-200' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              >
                <span
                  className={`inline-block h-5 sm:h-7 w-5 sm:w-7 transform rounded-full bg-white shadow-md transition-all duration-300 ${
                    isVideoEnabled ? 'translate-x-6 sm:translate-x-8 scale-110' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Modern Checkbox for Adult Confirmation */}
            <label
              className="flex items-start p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl sm:rounded-2xl cursor-pointer hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200/50 transition-all duration-200 shadow-inner border-2 border-gray-100 hover:border-gray-200 group hover:shadow-md"
            >
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
                aria-label="Confirm you are 18 years or older"
              />
              <div className="flex items-center h-5 sm:h-6 mt-0.5 sm:mt-1">
                <div className={`h-6 sm:h-7 w-6 sm:w-7 rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${
                  isAdultConfirmed
                    ? 'bg-gradient-to-br from-pink-500 to-purple-600 border-pink-500 shadow-pink-200 scale-105'
                    : 'border-gray-300 bg-white group-hover:border-gray-400'
                }`}>
                  {isAdultConfirmed && (
                    <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white animate-scaleIn" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <span className="text-sm sm:text-base font-semibold text-gray-900">I'm 18 or older</span>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">This is an adults-only platform</p>
              </div>
            </label>

            {/* Age Input - Shows when 18+ is confirmed */}
            {isAdultConfirmed && (
              <div className="space-y-2 sm:space-y-3 animate-slideUp">
                <label className="block text-sm font-semibold text-gray-900">
                  Your age <span className="text-pink-600">*</span>
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    value={userAge}
                    onChange={(e) => {
                      setUserAge(e.target.value);
                      setShowAgeError(false);
                    }}
                    onFocus={() => setIsFormFocused(true)}
                    onBlur={() => setIsFormFocused(false)}
                    placeholder="Enter your age"
                    min="18"
                    max="120"
                    aria-label="Your age"
                    aria-required="true"
                    aria-invalid={showAgeError}
                    className={`w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 ${
                      showAgeError
                        ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 focus:border-pink-500'
                    } focus:ring-4 focus:ring-pink-100 outline-none text-sm sm:text-base transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:shadow-md`}
                  />
                  {userAge && parseInt(userAge) >= 18 && !showAgeError && (
                    <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-green-500 animate-scaleIn">
                      <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {showAgeError && (
                  <p className="text-xs sm:text-sm text-red-600 flex items-center gap-2 animate-fadeIn" role="alert">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    You must be 18 or older to use this service
                  </p>
                )}
              </div>
            )}


            {/* Modern Primary Button */}
            <div className="pt-4 sm:pt-6">
              <button
                onClick={() => handleStartChat(false)}
                disabled={!userName.trim() || (isAdultConfirmed && (!userAge || parseInt(userAge) < 18))}
                className="group relative w-full py-4 sm:py-5 px-6 sm:px-8 bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 hover:from-pink-600 hover:via-purple-600 hover:to-purple-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400 text-white font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl shadow-xl shadow-pink-500/40 hover:shadow-2xl hover:shadow-pink-500/50 disabled:shadow-gray-300/30 transition-all duration-300 transform hover:scale-[1.02] hover:disabled:scale-100 active:scale-[0.97] active:disabled:scale-100 focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 disabled:opacity-0 transition-opacity duration-500" />
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white/10 opacity-0 group-hover:animate-pulse disabled:opacity-0" />
                <span className="relative flex items-center justify-center gap-2 sm:gap-3">
                  <svg className="w-5 sm:w-6 h-5 sm:h-6 group-hover:scale-110 disabled:group-hover:scale-100 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="tracking-wide">Start chatting</span>
                  <svg className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 disabled:group-hover:translate-x-0 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            </div>

            {/* Text Only Option */}
            <div className="text-center pt-1 sm:pt-2">
              <button
                onClick={() => handleStartChat(true)}
                disabled={!userName.trim()}
                aria-label="Start text only chat mode"
                className="group inline-flex items-center gap-2 text-pink-600 hover:text-purple-700 disabled:text-gray-400 font-semibold text-sm sm:text-base transition-all duration-200 hover:gap-3 disabled:hover:gap-2 px-4 py-2 rounded-xl hover:bg-pink-50 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              >
                <span className="text-lg sm:text-xl">💬</span>
                <span className="relative">
                  Or just text
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-pink-600 to-purple-700 group-hover:w-full disabled:group-hover:w-0 transition-all duration-300"></span>
                </span>
              </button>
            </div>
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
