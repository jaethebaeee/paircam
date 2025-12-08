import { useState } from 'react';

interface GenderFilterProps {
  onPreferenceChange: (preference: string) => void;
  onUpgradeClick: () => void;
  isPremium?: boolean;
}

export default function GenderFilter({ onPreferenceChange, onUpgradeClick, isPremium = false }: GenderFilterProps) {
  const [genderPreference, setGenderPreference] = useState('any');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const handlePreferenceChange = (preference: string) => {
    if (!isPremium && preference !== 'any') {
      setShowUpgradePrompt(true);
      setTimeout(() => setShowUpgradePrompt(false), 5000); // Auto-hide after 5 seconds
      return;
    }
    
    setGenderPreference(preference);
    onPreferenceChange(preference);
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      <label className="block text-xs sm:text-sm font-semibold text-gray-900">
        Who would you like to meet?
        {!isPremium && (
          <span className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-bold shadow-sm">
            ⭐ Premium
          </span>
        )}
      </label>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button
          onClick={() => handlePreferenceChange('any')}
          className={`group p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 touch-target ${
            genderPreference === 'any'
              ? 'border-pink-500 bg-pink-100/70 shadow-lg shadow-pink-200/50 scale-105'
              : 'border-gray-200 hover:border-pink-300 bg-white hover:bg-pink-50 shadow-sm hover:shadow-md hover:scale-105'
          }`}
        >
          <div className="text-2xl sm:text-3xl mb-1 sm:mb-2 transform group-hover:scale-110 transition-transform">🌍</div>
          <div className="text-xs sm:text-sm font-semibold text-gray-700">Anyone</div>
        </button>

        <button
          onClick={() => handlePreferenceChange('female')}
          className={`group p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 relative touch-target ${
            genderPreference === 'female'
              ? 'border-pink-500 bg-pink-100/70 shadow-lg shadow-pink-200/50 scale-105'
              : 'border-gray-200 hover:border-pink-300 bg-white hover:bg-pink-50 shadow-sm hover:shadow-md hover:scale-105'
          } ${!isPremium ? 'opacity-70 hover:opacity-80' : ''}`}
        >
          {!isPremium && (
            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 text-sm sm:text-lg bg-white rounded-full p-0.5 shadow-sm">🔒</div>
          )}
          <div className="text-2xl sm:text-3xl mb-1 sm:mb-2 transform group-hover:scale-110 transition-transform">👩</div>
          <div className="text-xs sm:text-sm font-semibold text-gray-700">Women</div>
        </button>

        <button
          onClick={() => handlePreferenceChange('male')}
          className={`group p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 relative touch-target ${
            genderPreference === 'male'
              ? 'border-pink-500 bg-pink-100/70 shadow-lg shadow-pink-200/50 scale-105'
              : 'border-gray-200 hover:border-pink-300 bg-white hover:bg-pink-50 shadow-sm hover:shadow-md hover:scale-105'
          } ${!isPremium ? 'opacity-70 hover:opacity-80' : ''}`}
        >
          {!isPremium && (
            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 text-sm sm:text-lg bg-white rounded-full p-0.5 shadow-sm">🔒</div>
          )}
          <div className="text-2xl sm:text-3xl mb-1 sm:mb-2 transform group-hover:scale-110 transition-transform">👨</div>
          <div className="text-xs sm:text-sm font-semibold text-gray-700">Men</div>
        </button>
      </div>
      
      {showUpgradePrompt && (
        <div className="mt-2 p-3 sm:p-5 bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50 rounded-xl sm:rounded-2xl border-2 border-yellow-300/60 animate-slideUp shadow-lg">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="text-2xl sm:text-3xl animate-bounce-subtle">⭐</div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-1 sm:mb-1.5 text-sm sm:text-base">
                Premium Feature
              </p>
              <p className="text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4 leading-relaxed">
                Gender filters are available with Premium. Match with your preferred gender only!
              </p>
              <button
                onClick={onUpgradeClick}
                className="group relative bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-orange-300/40 hover:shadow-xl hover:shadow-orange-300/60 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden touch-target"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative flex items-center gap-1.5 sm:gap-2">
                  Upgrade to Premium
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

