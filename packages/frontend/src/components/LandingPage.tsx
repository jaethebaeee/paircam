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
        className="fixed top-20 sm:top-24 right-4 z-10 bg-gray-900 hover:bg-gray-800 text-white px-4 sm:px-5 py-2.5 rounded-lg font-semibold shadow-lg transition-colors text-sm"
      >
        Get Premium
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
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4 sm:mb-6 leading-tight px-2">
            Instant Video Chat
            <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl mt-1 sm:mt-2">with Strangers</span>
          </h1>
          <h2 className="text-lg sm:text-xl md:text-2xl text-gray-800 mb-3 sm:mb-4 font-semibold max-w-3xl mx-auto px-4">
            Meet new people instantly - No signup, 100% free
          </h2>
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Anonymous, instant connections with people worldwide. Choose video, voice, or text chat.
          </p>

          {/* Live User Count Badge */}
          {liveUserCount > 0 && (
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="inline-flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-800 px-6 py-3 rounded-full shadow-lg">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="font-bold text-2xl text-gray-900">{liveUserCount.toLocaleString()}</span>
                <span className="font-medium text-gray-600">users online now</span>
              </div>
            </div>
          )}

          {/* Key Value Props */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-4 md:gap-6 text-sm sm:text-base text-gray-700 mb-8 sm:mb-12 px-2">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-shadow">
              <span className="text-lg sm:text-2xl">⚡</span>
              <span className="font-medium text-xs sm:text-sm md:text-base">5 sec start</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-shadow">
              <span className="text-lg sm:text-2xl">🔒</span>
              <span className="font-medium text-xs sm:text-sm md:text-base">Anonymous</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-shadow">
              <span className="text-lg sm:text-2xl">🌍</span>
              <span className="font-medium text-xs sm:text-sm md:text-base">Global</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-shadow">
              <span className="text-lg sm:text-2xl">🛡️</span>
              <span className="font-medium text-xs sm:text-sm md:text-base">Safe</span>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="max-w-4xl mx-auto mb-10 sm:mb-16 px-2">
            <div className="bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border-2 sm:border-4 border-white">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-white/80"></div>
                  <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-white/60"></div>
                  <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-white/40"></div>
                </div>
                <span className="text-white text-xs sm:text-sm font-semibold">Live Video Chat</span>
                <div className="w-12 sm:w-20"></div>
              </div>
              <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-16 sm:w-24 h-16 sm:h-24 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="relative z-10 text-center text-white px-4">
                  <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">👋</div>
                  <p className="text-base sm:text-xl font-semibold mb-1">Connect face-to-face</p>
                  <p className="text-xs sm:text-sm text-gray-300">with people from around the world</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ad Banner - Below Hero */}
        <div className="max-w-4xl mx-auto mb-12 sm:mb-16 px-2">
          <AdBanner format="responsive" className="rounded-xl overflow-hidden" />
        </div>

        {/* How It Works Section */}
        <div id="features" className="mb-12 sm:mb-16 px-2 scroll-mt-24">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-gray-900 mb-2 sm:mb-4">How It Works</h2>
          <p className="text-center text-gray-600 mb-8 sm:mb-12 text-base sm:text-lg">Get started in three simple steps</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border-2 border-pink-100 p-5 sm:p-8 text-center hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 w-12 sm:w-16 h-12 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                <span className="text-2xl sm:text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Enter Your Name</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Choose a name or nickname. No signup required. Stay anonymous.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border-2 border-purple-100 p-5 sm:p-8 text-center hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-12 sm:w-16 h-12 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                <span className="text-2xl sm:text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Get Matched</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Instantly paired with someone online. Takes just seconds.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border-2 border-blue-100 p-5 sm:p-8 text-center hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-12 sm:w-16 h-12 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                <span className="text-2xl sm:text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Start Chatting</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Video, voice, or text. Skip anytime with one click.
              </p>
            </div>
          </div>
        </div>

        {/* Ad Banner - Between Sections (Desktop Only) */}
        <div className="hidden md:block max-w-4xl mx-auto mb-12 sm:mb-16 px-2">
          <AdBanner format="horizontal" className="mx-auto" />
        </div>

        {/* Trust & Safety Section */}
        <div id="safety" className="mb-12 sm:mb-16 max-w-4xl mx-auto px-2 scroll-mt-24">
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl sm:rounded-3xl shadow-lg border-2 border-green-200 p-5 sm:p-8 md:p-10">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 sm:w-16 h-12 sm:h-16 bg-green-500 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg">
                <svg className="w-6 sm:w-8 h-6 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">Your Safety Matters</h2>
              <p className="text-gray-700 text-sm sm:text-base md:text-lg">We're committed to creating a safe, respectful community</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 sm:w-10 h-8 sm:h-10 bg-green-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-0.5 sm:mb-1">24/7 Moderation</h3>
                  <p className="text-xs sm:text-sm text-gray-600">AI and human moderators monitor content</p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 sm:w-10 h-8 sm:h-10 bg-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-0.5 sm:mb-1">Anonymous by Default</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Your privacy is always protected</p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 sm:w-10 h-8 sm:h-10 bg-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-0.5 sm:mb-1">Report & Block</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Instantly report rule violators</p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 sm:w-10 h-8 sm:h-10 bg-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-0.5 sm:mb-1">18+ Verification</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Age verification for video chat</p>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-white/70 rounded-xl sm:rounded-2xl border border-green-300">
              <p className="text-xs sm:text-sm text-gray-700 text-center">
                <strong className="text-gray-900">Remember:</strong> Never share personal info with strangers online.
              </p>
            </div>
          </div>
        </div>

        {/* Start Chat Form Section */}
        <div className="max-w-2xl mx-auto px-2">

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
                onFocus={() => setIsFormFocused(true)}
                onBlur={() => setIsFormFocused(false)}
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
                  onFocus={() => setIsFormFocused(true)}
                  onBlur={() => setIsFormFocused(false)}
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
              className="w-full py-4 px-6 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold text-base rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              Start Video Chat
            </button>

            {/* Text Mode Link */}
            <button
              onClick={() => handleStartChat(true)}
              disabled={!userName.trim()}
              className="w-full py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 font-medium text-sm transition-colors disabled:cursor-not-allowed"
            >
              or use text-only mode
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 sm:p-5">
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium text-gray-900">Stay safe:</span> Never share personal info with strangers.
          </p>
          <p className="text-xs text-gray-500">
            By using this service, you agree to our{' '}
            <a href="/terms-of-service" className="text-gray-700 underline hover:text-gray-900">Terms</a>
            {' '}and{' '}
            <a href="/privacy-policy" className="text-gray-700 underline hover:text-gray-900">Privacy Policy</a>.
          </p>
        </div>
        </div>

        {/* Additional Features Section */}
        <div id="about" className="max-w-5xl mx-auto mt-10 sm:mt-16 mb-8 sm:mb-12 px-2 scroll-mt-24">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-900 mb-8 sm:mb-12">Why Choose Us?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 w-12 sm:w-14 h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                <svg className="w-6 sm:w-7 h-6 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Lightning Fast</h3>
              <p className="text-sm sm:text-base text-gray-600">Connect in seconds. No waiting, just instant conversations.</p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-12 sm:w-14 h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                <svg className="w-6 sm:w-7 h-6 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Global Reach</h3>
              <p className="text-sm sm:text-base text-gray-600">Meet people from 195+ countries worldwide.</p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-12 sm:w-14 h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                <svg className="w-6 sm:w-7 h-6 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">Your Choice</h3>
              <p className="text-sm sm:text-base text-gray-600">Video, voice, or text – switch modes anytime.</p>
            </div>
          </div>
        </div>

        {/* Ad Banner - Bottom of Page */}
        <div className="max-w-4xl mx-auto mt-8 sm:mt-12 mb-8 px-2">
          <AdBanner format="responsive" className="rounded-xl overflow-hidden" />
        </div>
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <PremiumModal onClose={() => setShowPremiumModal(false)} />
      )}
    </div>
  );
}
