import { useState, useEffect } from 'react';
import PremiumModal from './PremiumModal';
import AnimatedBackground from './ui/AnimatedBackground';
import { signInWithGoogle } from '../lib/supabase';

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

      {/* Top Right Actions */}
      <div className="fixed top-20 sm:top-24 right-4 z-10 flex items-center gap-3">
        <a
          href="/login"
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          Sign in
        </a>
        <button
          onClick={() => setShowPremiumModal(true)}
          className="group bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 hover:from-yellow-500 hover:via-orange-500 hover:to-orange-600 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold shadow-xl shadow-orange-300/40 hover:shadow-2xl hover:shadow-orange-400/60 transition-all duration-300 hover:scale-110 active:scale-95 overflow-hidden text-sm sm:text-base"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="relative flex items-center gap-1.5 sm:gap-2">
            <span className="text-base sm:text-lg">⭐</span>
            <span className="hidden sm:inline">Premium</span>
          </span>
        </button>
      </div>

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
            {/* Google Sign In */}
            <button
              onClick={async () => {
                const { error } = await signInWithGoogle();
                if (error) console.error('Google sign in error:', error);
              }}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-700 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-400">or continue anonymously</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

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
