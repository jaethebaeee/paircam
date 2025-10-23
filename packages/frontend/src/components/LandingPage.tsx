import { useState } from 'react';

interface LandingPageProps {
  onStartCall: (name: string) => void;
}

export default function LandingPage({ onStartCall }: LandingPageProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState('');
  const [showNameError, setShowNameError] = useState(false);
  const [showAgeError, setShowAgeError] = useState(false);

  const handleStartChat = () => {
    if (!userName.trim()) {
      setShowNameError(true);
      return;
    }
    if (isAdultConfirmed && (!userAge || parseInt(userAge) < 18)) {
      setShowAgeError(true);
      return;
    }
    onStartCall(userName.trim());
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        {/* Main Content */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-3 rounded-2xl shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Meet People Worldwide
          </h1>
          <p className="text-xl text-gray-700 mb-2 font-medium">
            🎥 Video Chat • 🎤 Voice Call • 💬 Text Chat
          </p>
          <p className="text-base text-gray-600 mb-2">
            Instantly match with strangers from every corner of the globe
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌍</span>
              <span>195+ Countries</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <span>Instant Matching</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <span>100% Anonymous</span>
            </div>
          </div>
        </div>

        {/* Modern Options Box */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Start chatting:</h2>
          
          <div className="space-y-4">
            {/* Name Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">
                What's your name? <span className="text-pink-600">*</span>
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  setShowNameError(false);
                }}
                placeholder="Enter your name or nickname"
                className={`w-full px-4 py-3 rounded-2xl border-2 ${
                  showNameError ? 'border-red-500' : 'border-gray-200'
                } focus:border-pink-500 focus:ring-0 outline-none text-base bg-gray-50 focus:bg-white transition-all placeholder:text-gray-400`}
                maxLength={30}
              />
              {showNameError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Please enter your name to continue
                </p>
              )}
            </div>

            {/* Modern Toggle Switch for Video */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <label className="flex items-center cursor-pointer flex-1">
                <div className="flex-1">
                  <span className="text-base font-medium text-gray-900">Enable video</span>
                  <p className="text-sm text-gray-500">Share your camera during calls</p>
                </div>
              </label>
              <button
                onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${
                  isVideoEnabled ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                    isVideoEnabled ? 'translate-x-7' : 'translate-x-1'
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
              className="flex items-start p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center h-6">
                <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                  isAdultConfirmed 
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 border-pink-500' 
                    : 'border-gray-300 bg-white'
                }`}>
                  {isAdultConfirmed && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="ml-3 flex-1">
                <span className="text-base font-medium text-gray-900">I'm 18 years or older</span>
                <p className="text-sm text-gray-500">Required for unmoderated video chat</p>
              </div>
            </div>

            {/* Age Input - Shows when 18+ is confirmed */}
            {isAdultConfirmed && (
              <div className="space-y-2 animate-fadeIn">
                <label className="block text-sm font-medium text-gray-900">
                  What's your age? <span className="text-pink-600">*</span>
                </label>
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
                  className={`w-full px-4 py-3 rounded-2xl border-2 ${
                    showAgeError ? 'border-red-500' : 'border-gray-200'
                  } focus:border-pink-500 focus:ring-0 outline-none text-base bg-gray-50 focus:bg-white transition-all placeholder:text-gray-400`}
                />
                {showAgeError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    You must be 18 or older to use this service
                  </p>
                )}
              </div>
            )}

            {/* Modern Primary Button */}
            <div className="pt-4">
              <button 
                onClick={handleStartChat}
                className="group relative w-full py-4 px-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold text-lg rounded-2xl shadow-lg shadow-pink-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center justify-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Start Video Chat
                </span>
              </button>
            </div>

            {/* Text Only Option */}
            <div className="text-center">
              <button className="text-pink-600 hover:text-purple-700 font-medium text-base hover:underline transition-colors">
                Text only mode
              </button>
            </div>
          </div>
        </div>

        {/* Modern Disclaimer */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-gray-900 mb-2">
                Stay Safe Online
              </p>
              <p className="text-sm text-gray-700 mb-3">
                Never share personal information with strangers. Be respectful and report any inappropriate behavior.
              </p>
              <p className="text-xs text-gray-600">
                By using this service, you agree to our{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium underline">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
