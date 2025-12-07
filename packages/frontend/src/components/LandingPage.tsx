import { useState, useEffect } from 'react';
import PremiumModal from './PremiumModal';
import { useAuthContext } from '../contexts/AuthContext';
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
  const liveUsers = useLiveUserCount();

  // Get premium status from auth context (used for premium button visibility)
  const { } = useAuthContext();

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
            <span className="text-green-600">{liveUsers.toLocaleString()}</span> online
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
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4 sm:mb-6 leading-tight px-2">
            Instant Video Chat
            <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl mt-1 sm:mt-2">with Strangers</span>
          </h1>
          <h2 className="text-lg sm:text-xl md:text-2xl text-gray-800 mb-3 sm:mb-4 font-semibold max-w-3xl mx-auto px-4">
            Meet new people instantly - No signup, 100% free
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Anonymous, instant connections with people worldwide. Choose video, voice, or text chat.
          </p>

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

        {/* Modern Options Box */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-luxury border border-gray-100 p-5 sm:p-8 md:p-10 mb-4 sm:mb-6 hover:shadow-luxury-hover transition-all duration-300 animate-fadeIn">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8 tracking-tight">Start chatting:</h3>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Name Input */}
            <div className="space-y-2 sm:space-y-3">
              <label className="block text-sm font-semibold text-gray-900">
                What's your name? <span className="text-pink-600">*</span>
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    setShowNameError(false);
                  }}
                  placeholder="Enter your name or nickname"
                  className={`w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 ${
                    showNameError
                      ? 'border-red-400 bg-red-50/30 focus:border-red-500'
                      : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 focus:border-pink-500'
                  } focus:ring-4 focus:ring-pink-100 outline-none text-sm sm:text-base transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:shadow-md`}
                  maxLength={30}
                />
                {userName && !showNameError && (
                  <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-green-500">
                    <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {showNameError && (
                <p className="text-xs sm:text-sm text-red-600 flex items-center gap-2 animate-fadeIn">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Please enter your name to continue
                </p>
              )}
            </div>

            {/* Modern Toggle Switch for Video */}
            <div className="flex items-center justify-between p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl sm:rounded-2xl shadow-inner border border-gray-100 hover:shadow-md transition-all duration-200 group">
              <label className="flex items-center cursor-pointer flex-1" onClick={() => setIsVideoEnabled(!isVideoEnabled)}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                    <span className="text-sm sm:text-base font-semibold text-gray-900">Enable video</span>
                    <svg className={`w-4 h-4 transition-colors ${isVideoEnabled ? 'text-pink-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600">Share your camera during calls</p>
                </div>
              </label>
              <button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
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
            <div
              onClick={() => {
                setIsAdultConfirmed(!isAdultConfirmed);
                if (isAdultConfirmed) {
                  setUserAge('');
                  setShowAgeError(false);
                }
              }}
              className="flex items-start p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl sm:rounded-2xl cursor-pointer hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200/50 transition-all duration-200 shadow-inner border border-gray-100 group hover:shadow-md"
            >
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
                <span className="text-sm sm:text-base font-semibold text-gray-900">I'm 18 years or older</span>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Required for unmoderated video chat</p>
              </div>
            </div>

            {/* Age Input - Shows when 18+ is confirmed */}
            {isAdultConfirmed && (
              <div className="space-y-2 sm:space-y-3 animate-slideUp">
                <label className="block text-sm font-semibold text-gray-900">
                  What's your age? <span className="text-pink-600">*</span>
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    value={userAge}
                    onChange={(e) => {
                      setUserAge(e.target.value);
                      setShowAgeError(false);
                    }}
                    placeholder="Enter your age"
                    min="18"
                    max="120"
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
                  <p className="text-xs sm:text-sm text-red-600 flex items-center gap-2 animate-fadeIn">
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
                className="group relative w-full py-4 sm:py-5 px-6 sm:px-8 bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 hover:from-pink-600 hover:via-purple-600 hover:to-purple-700 text-white font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl shadow-xl shadow-pink-500/40 hover:shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] focus:outline-none focus:ring-4 focus:ring-pink-300 overflow-hidden"
              >
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white/10 opacity-0 group-hover:animate-pulse" />
                <span className="relative flex items-center justify-center gap-2 sm:gap-3">
                  <svg className="w-5 sm:w-6 h-5 sm:h-6 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="tracking-wide">Start Video Chat</span>
                  <svg className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            </div>

            {/* Text Only Option */}
            <div className="text-center pt-1 sm:pt-2">
              <button
                onClick={() => handleStartChat(true)}
                className="group inline-flex items-center gap-2 text-pink-600 hover:text-purple-700 font-semibold text-sm sm:text-base transition-all duration-200 hover:gap-3 px-4 py-2 rounded-xl hover:bg-pink-50"
              >
                <span className="text-lg sm:text-xl">💬</span>
                <span className="relative">
                  Text only mode
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-pink-600 to-purple-700 group-hover:w-full transition-all duration-300"></span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Modern Disclaimer */}
        <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 rounded-xl sm:rounded-2xl border-2 border-yellow-200/70 p-4 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-md">
                <svg className="w-5 sm:w-6 h-5 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2.5">
                Stay Safe, Be Respectful
              </p>
              <p className="text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4 leading-relaxed">
                Never share personal info with strangers. Report inappropriate behavior immediately.
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                By using this service, you agree to our{' '}
                <a href="/terms-of-service" className="text-blue-600 hover:text-blue-700 font-semibold underline transition-colors">Terms</a>
                {' '}and{' '}
                <a href="/privacy-policy" className="text-blue-600 hover:text-blue-700 font-semibold underline transition-colors">Privacy Policy</a>.
              </p>
            </div>
          </div>
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
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <PremiumModal onClose={() => setShowPremiumModal(false)} />
      )}
    </div>
  );
}
