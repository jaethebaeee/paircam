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
    <div className="min-h-screen py-8 sm:py-12 px-4 relative overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 transition-colors">
      {/* Animated Background */}
      <AnimatedBackground variant="gradient-orbs" />

      {/* Live Users Indicator - Fixed Top Left */}
      <div className="fixed top-20 sm:top-24 left-4 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-4 py-2.5 rounded-full shadow-soft border border-gray-100 dark:border-gray-800 animate-fadeIn">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{liveUserCount.toLocaleString()}</span> online
          </span>
        </div>
      </div>

      {/* Premium Button - Fixed Top Right */}
      <button
        onClick={() => setShowPremiumModal(true)}
        className="group fixed top-20 sm:top-24 right-4 z-10 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 sm:px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/25 transition-all text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        aria-label="Upgrade to premium"
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Get Premium
        </span>
      </button>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12 pt-12 sm:pt-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent mb-5 leading-tight tracking-tight px-2">
            Your Next Conversation Awaits
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto px-4 leading-relaxed">
            Connect instantly with people around the world. No signup, no hassle.
          </p>

          {/* Simple Value Props */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-8 px-2">
            <span className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-soft border border-gray-100 dark:border-gray-700">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" aria-hidden="true"></span>
              Free
            </span>
            <span className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-soft border border-gray-100 dark:border-gray-700">
              <span className="w-2 h-2 bg-violet-500 rounded-full" aria-hidden="true"></span>
              Anonymous
            </span>
            <span className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-soft border border-gray-100 dark:border-gray-700">
              <span className="w-2 h-2 bg-blue-500 rounded-full" aria-hidden="true"></span>
              Instant
            </span>
          </div>
        </div>

        {/* Start Chat Form Section */}
        <div className="max-w-md mx-auto px-2">

        {/* Clean Form Box */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-soft-lg border border-gray-100 dark:border-gray-800 p-6 sm:p-8 mb-4 sm:mb-6 transition-colors">
          <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-6">Get Started</h3>

          <div className="space-y-5">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                className={`w-full px-4 py-3.5 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                  showNameError
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-200 dark:border-gray-700 focus:border-violet-500 dark:focus:border-violet-400 focus:ring-violet-500/20'
                } focus:ring-2 outline-none text-base transition-all hover:border-gray-300 dark:hover:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500`}
                maxLength={30}
              />
              {showNameError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5" role="alert">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Please enter your name to continue
                </p>
              )}
            </div>

            {/* Video Toggle */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Enable video</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Share your camera during calls</p>
              </div>
              <button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                role="switch"
                aria-checked={isVideoEnabled}
                aria-label="Toggle video"
                className={`relative w-12 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                  isVideoEnabled ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    isVideoEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* Age Confirmation */}
            <label className="flex items-start gap-3 py-3 cursor-pointer group">
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
                aria-label="I confirm I am 18 years or older"
              />
              <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all ${
                isAdultConfirmed ? 'bg-violet-600 border-violet-600' : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500'
              }`} aria-hidden="true">
                {isAdultConfirmed && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">I'm 18 or older</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Required for video chat</p>
              </div>
            </label>

            {/* Age Input */}
            {isAdultConfirmed && (
              <div className="animate-fadeIn">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  aria-label="Your age"
                  className={`w-full px-4 py-3.5 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                    showAgeError
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-gray-200 dark:border-gray-700 focus:border-violet-500 dark:focus:border-violet-400 focus:ring-violet-500/20'
                  } focus:ring-2 outline-none text-base transition-all hover:border-gray-300 dark:hover:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500`}
                />
                {showAgeError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5" role="alert">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    You must be 18 or older
                  </p>
                )}
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={() => handleStartChat(false)}
              disabled={!userName.trim() || (isAdultConfirmed && (!userAge || parseInt(userAge) < 18))}
              className="group w-full py-3.5 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-200 disabled:to-gray-200 dark:disabled:from-gray-700 dark:disabled:to-gray-700 text-white disabled:text-gray-400 dark:disabled:text-gray-500 font-semibold text-base rounded-xl transition-all disabled:cursor-not-allowed shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/25 disabled:shadow-none active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Start Video Chat
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            {/* Text Mode Button */}
            <button
              onClick={() => handleStartChat(true)}
              disabled={!userName.trim()}
              className="w-full py-3.5 px-6 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:border-gray-100 dark:disabled:border-gray-800 disabled:bg-transparent text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:text-gray-300 dark:disabled:text-gray-600 font-medium text-sm rounded-xl transition-all disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Text-Only Mode
              </span>
            </button>
          </div>
        </div>

        {/* Compact Safety Section */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Your Safety Matters</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" aria-hidden="true"></span>
              <span>24/7 Moderation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" aria-hidden="true"></span>
              <span>Anonymous by Default</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" aria-hidden="true"></span>
              <span>Report & Block</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" aria-hidden="true"></span>
              <span>18+ Verification</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span className="font-medium text-gray-900 dark:text-white">Stay safe:</span> Never share personal info with strangers.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            By using this service, you agree to our{' '}
            <a href="/terms-of-service" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium">Terms</a>
            {' '}and{' '}
            <a href="/privacy-policy" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium">Privacy Policy</a>.
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
