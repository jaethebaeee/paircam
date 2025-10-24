import { useState } from 'react';
import GenderFilter from './GenderFilter';
import PremiumModal from './PremiumModal';
import { useAuthContext } from '../contexts/AuthContext';

interface LandingPageProps {
  onStartCall: (data: { 
    name: string; 
    gender?: string; 
    genderPreference?: string;
    isTextMode?: boolean;
    isVideoEnabled?: boolean;
  }) => void;
}

export default function LandingPage({ onStartCall }: LandingPageProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState('');
  const [userGender, setUserGender] = useState<string | undefined>(undefined);
  const [genderPreference, setGenderPreference] = useState('any');
  const [showNameError, setShowNameError] = useState(false);
  const [showAgeError, setShowAgeError] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  // Get premium status from auth context
  const { isPremium } = useAuthContext();

  const handleStartChat = (textMode = false) => {
    if (!userName.trim()) {
      setShowNameError(true);
      return;
    }
    if (isAdultConfirmed && (!userAge || parseInt(userAge) < 18)) {
      setShowAgeError(true);
      return;
    }
    onStartCall({
      name: userName.trim(),
      gender: userGender,  // Optional: undefined means private/anonymous
      genderPreference: genderPreference,
      isTextMode: textMode,
      isVideoEnabled: isVideoEnabled,  // Pass video preference to parent
    });
  };

  return (
    <div className="min-h-screen py-12 px-4">
      {/* Premium Button - Fixed Top Right */}
      <button
        onClick={() => setShowPremiumModal(true)}
        className="group fixed top-24 right-4 z-10 bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 hover:from-yellow-500 hover:via-orange-500 hover:to-orange-600 text-white px-5 py-2.5 rounded-full font-bold shadow-xl shadow-orange-300/40 hover:shadow-2xl hover:shadow-orange-400/60 transition-all duration-300 hover:scale-110 active:scale-95 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <span className="relative flex items-center gap-2">
          <span className="text-lg animate-bounce-subtle">⭐</span>
          <span>Get Premium</span>
        </span>
      </button>

      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 rounded-3xl shadow-xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-6 leading-tight">
            Meet Someone New<br/>Right Now
          </h1>
          <p className="text-2xl text-gray-800 mb-4 font-semibold max-w-3xl mx-auto">
            Join random video chats in 5 seconds – No signup, no hassle
          </p>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Anonymous, instant connections with people worldwide. Choose video, voice, or text chat.
          </p>
          
          {/* Key Value Props */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-base text-gray-700 mb-12">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
              <span className="text-2xl">⚡</span>
              <span className="font-medium">Start in 5 seconds</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
              <span className="text-2xl">🔒</span>
              <span className="font-medium">100% Anonymous</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
              <span className="text-2xl">🌍</span>
              <span className="font-medium">Global Community</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md">
              <span className="text-2xl">🛡️</span>
              <span className="font-medium">Safe & Moderated</span>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 rounded-3xl shadow-2xl overflow-hidden border-4 border-white">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/80"></div>
                  <div className="w-3 h-3 rounded-full bg-white/60"></div>
                  <div className="w-3 h-3 rounded-full bg-white/40"></div>
                </div>
                <span className="text-white text-sm font-semibold">Live Video Chat</span>
                <div className="w-20"></div>
              </div>
              <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-24 h-24 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="relative z-10 text-center text-white">
                  <div className="text-5xl mb-3">👋</div>
                  <p className="text-xl font-semibold mb-1">Connect face-to-face</p>
                  <p className="text-sm text-gray-300">with people from around the world</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">How It Works</h2>
          <p className="text-center text-gray-600 mb-12 text-lg">Get started in three simple steps</p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="bg-white rounded-3xl shadow-lg border-2 border-pink-100 p-8 text-center hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Enter Your Name</h3>
              <p className="text-gray-600 leading-relaxed">
                Choose a name or nickname. No email, no phone number, no signup required. Stay completely anonymous.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-3xl shadow-lg border-2 border-purple-100 p-8 text-center hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Get Matched</h3>
              <p className="text-gray-600 leading-relaxed">
                Our system instantly pairs you with someone online. It takes just seconds to find your next conversation.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-3xl shadow-lg border-2 border-blue-100 p-8 text-center hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Start Chatting</h3>
              <p className="text-gray-600 leading-relaxed">
                Connect via video, voice, or text. Don't like the match? Skip to the next person instantly with one click.
              </p>
            </div>
          </div>
        </div>

        {/* Trust & Safety Section */}
        <div className="mb-16 max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl shadow-lg border-2 border-green-200 p-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Safety Matters</h2>
              <p className="text-gray-700 text-lg">We're committed to creating a safe, respectful community</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">24/7 Moderation</h3>
                  <p className="text-sm text-gray-600">AI and human moderators monitor for inappropriate content and behavior</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Anonymous by Default</h3>
                  <p className="text-sm text-gray-600">No personal info required. Your privacy is protected at all times</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Report & Block</h3>
                  <p className="text-sm text-gray-600">Instantly report users who violate our community guidelines</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">18+ Verification</h3>
                  <p className="text-sm text-gray-600">Age verification required for video chat to keep minors safe</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-white/70 rounded-2xl border border-green-300">
              <p className="text-sm text-gray-700 text-center">
                <strong className="text-gray-900">Remember:</strong> Never share personal information like your address, phone number, or financial details with strangers online.
              </p>
            </div>
          </div>
        </div>

        {/* Start Chat Form Section */}
        <div className="max-w-2xl mx-auto">

        {/* Modern Options Box */}
        <div className="bg-white rounded-3xl shadow-luxury border border-gray-100 p-10 mb-6 hover:shadow-luxury-hover transition-all duration-300 animate-fadeIn">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">Start chatting:</h2>
          
          <div className="space-y-6">
            {/* Name Input */}
            <div className="space-y-3">
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
                  className={`w-full px-5 py-4 rounded-2xl border-2 ${
                    showNameError 
                      ? 'border-red-400 bg-red-50/30 focus:border-red-500' 
                      : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 focus:border-pink-500'
                  } focus:ring-4 focus:ring-pink-100 outline-none text-base transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:shadow-md`}
                  maxLength={30}
                />
                {userName && !showNameError && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {showNameError && (
                <p className="text-sm text-red-600 flex items-center gap-2 animate-fadeIn">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Please enter your name to continue
                </p>
              )}
            </div>

            {/* Modern Toggle Switch for Video */}
            <div className="flex items-center justify-between p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl shadow-inner border border-gray-100 hover:shadow-md transition-all duration-200 group">
              <label className="flex items-center cursor-pointer flex-1" onClick={() => setIsVideoEnabled(!isVideoEnabled)}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-semibold text-gray-900">Enable video</span>
                    <svg className={`w-4 h-4 transition-colors ${isVideoEnabled ? 'text-pink-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">Share your camera during calls</p>
                </div>
              </label>
              <button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                className={`relative inline-flex h-9 w-16 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-pink-100 shadow-sm ${
                  isVideoEnabled ? 'bg-gradient-to-r from-pink-500 to-purple-500 shadow-pink-200' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              >
                <span
                  className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-md transition-all duration-300 ${
                    isVideoEnabled ? 'translate-x-8 scale-110' : 'translate-x-1'
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
              className="flex items-start p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl cursor-pointer hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200/50 transition-all duration-200 shadow-inner border border-gray-100 group hover:shadow-md"
            >
              <div className="flex items-center h-6 mt-1">
                <div className={`h-7 w-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${
                  isAdultConfirmed 
                    ? 'bg-gradient-to-br from-pink-500 to-purple-600 border-pink-500 shadow-pink-200 scale-105' 
                    : 'border-gray-300 bg-white group-hover:border-gray-400'
                }`}>
                  {isAdultConfirmed && (
                    <svg className="w-5 h-5 text-white animate-scaleIn" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="ml-4 flex-1">
                <span className="text-base font-semibold text-gray-900">I'm 18 years or older</span>
                <p className="text-sm text-gray-600 mt-0.5">Required for unmoderated video chat</p>
              </div>
            </div>

            {/* Age Input - Shows when 18+ is confirmed */}
            {isAdultConfirmed && (
              <div className="space-y-3 animate-slideUp">
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
                    className={`w-full px-5 py-4 rounded-2xl border-2 ${
                      showAgeError 
                        ? 'border-red-400 bg-red-50/30 focus:border-red-500' 
                        : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 focus:border-pink-500'
                    } focus:ring-4 focus:ring-pink-100 outline-none text-base transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:shadow-md`}
                  />
                  {userAge && parseInt(userAge) >= 18 && !showAgeError && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 animate-scaleIn">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {showAgeError && (
                  <p className="text-sm text-red-600 flex items-center gap-2 animate-fadeIn">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    You must be 18 or older to use this service
                  </p>
                )}
              </div>
            )}

            {/* Gender Selection (Optional) */}
            <div className="bg-gradient-to-br from-blue-50/50 via-purple-50/50 to-pink-50/50 border-2 border-blue-200/60 rounded-2xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-2.5 shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base mb-1.5">
                    Your Gender (Optional)
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Specifying your gender helps premium users find you through filters. Select "Private" to remain anonymous and match with everyone.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setUserGender('male')}
                  className={`group p-4 rounded-xl border-2 transition-all duration-200 ${
                    userGender === 'male'
                      ? 'border-blue-500 bg-blue-100/70 shadow-lg shadow-blue-200/50 scale-105'
                      : 'border-gray-200 hover:border-blue-300 bg-white hover:bg-blue-50 shadow-sm hover:shadow-md hover:scale-105'
                  }`}
                >
                  <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform">👨</div>
                  <div className="text-xs font-semibold text-gray-700">Male</div>
                </button>
                <button
                  type="button"
                  onClick={() => setUserGender('female')}
                  className={`group p-4 rounded-xl border-2 transition-all duration-200 ${
                    userGender === 'female'
                      ? 'border-pink-500 bg-pink-100/70 shadow-lg shadow-pink-200/50 scale-105'
                      : 'border-gray-200 hover:border-pink-300 bg-white hover:bg-pink-50 shadow-sm hover:shadow-md hover:scale-105'
                  }`}
                >
                  <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform">👩</div>
                  <div className="text-xs font-semibold text-gray-700">Female</div>
                </button>
                <button
                  type="button"
                  onClick={() => setUserGender('other')}
                  className={`group p-4 rounded-xl border-2 transition-all duration-200 ${
                    userGender === 'other'
                      ? 'border-purple-500 bg-purple-100/70 shadow-lg shadow-purple-200/50 scale-105'
                      : 'border-gray-200 hover:border-purple-300 bg-white hover:bg-purple-50 shadow-sm hover:shadow-md hover:scale-105'
                  }`}
                >
                  <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform">✨</div>
                  <div className="text-xs font-semibold text-gray-700">Other</div>
                </button>
                <button
                  type="button"
                  onClick={() => setUserGender(undefined)}
                  className={`group p-4 rounded-xl border-2 transition-all duration-200 ${
                    userGender === undefined
                      ? 'border-gray-500 bg-gray-100/70 shadow-lg shadow-gray-200/50 scale-105'
                      : 'border-gray-200 hover:border-gray-400 bg-white hover:bg-gray-50 shadow-sm hover:shadow-md hover:scale-105'
                  }`}
                >
                  <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform">🔒</div>
                  <div className="text-xs font-semibold text-gray-700">Private</div>
                </button>
              </div>
              
              {userGender === undefined && (
                <div className="flex items-center gap-2 text-xs text-gray-700 bg-white/80 rounded-xl p-3 shadow-sm border border-gray-200 animate-fadeIn">
                  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="leading-relaxed">Private mode: You'll match with everyone, but premium users can't filter you</span>
                </div>
              )}
              
              {userGender && (
                <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-100/70 rounded-xl p-3 shadow-sm border border-blue-200 animate-fadeIn">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="leading-relaxed font-medium">Great! Premium users looking for {userGender === 'other' ? 'diverse matches' : `${userGender}s`} can find you</span>
                </div>
              )}
            </div>

            {/* Gender Filter (Premium Feature) */}
            <GenderFilter
              onPreferenceChange={setGenderPreference}
              onUpgradeClick={() => setShowPremiumModal(true)}
              isPremium={isPremium}
            />

            {/* Modern Primary Button */}
            <div className="pt-6">
              <button 
                onClick={() => handleStartChat(false)}
                className="group relative w-full py-5 px-8 bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 hover:from-pink-600 hover:via-purple-600 hover:to-purple-700 text-white font-bold text-lg rounded-2xl shadow-xl shadow-pink-500/40 hover:shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.97] focus:outline-none focus:ring-4 focus:ring-pink-300 overflow-hidden"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:animate-pulse" />
                <span className="relative flex items-center justify-center gap-3">
                  <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="tracking-wide">Start Video Chat</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            </div>

            {/* Text Only Option */}
            <div className="text-center pt-2">
              <button 
                onClick={() => handleStartChat(true)}
                className="group inline-flex items-center gap-2 text-pink-600 hover:text-purple-700 font-semibold text-base transition-all duration-200 hover:gap-3 px-4 py-2 rounded-xl hover:bg-pink-50"
              >
                <span className="text-xl">💬</span>
                <span className="relative">
                  Text only mode
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-pink-600 to-purple-700 group-hover:w-full transition-all duration-300"></span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Modern Disclaimer */}
        <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 rounded-2xl border-2 border-yellow-200/70 p-6 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-2 rounded-xl shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-gray-900 mb-2.5">
                Stay Safe, Be Respectful
              </p>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                Never share personal information with strangers. Report any inappropriate behavior immediately.
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                By using this service, you agree to our{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold underline transition-colors">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold underline transition-colors">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
        </div>

        {/* Additional Features Section */}
        <div className="max-w-5xl mx-auto mt-16 mb-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose Us?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-gray-600">Connect with someone in seconds. No waiting, no delays, just instant conversations.</p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Global Reach</h3>
              <p className="text-gray-600">Meet people from 195+ countries. Experience diverse cultures and perspectives.</p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Your Choice</h3>
              <p className="text-gray-600">Video, voice, or text – you decide how you want to connect. Switch modes anytime.</p>
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
