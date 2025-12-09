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
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-900">
        Who would you like to meet?
        {!isPremium && (
          <span className="ml-2 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2.5 py-1 rounded-full font-bold shadow-sm">
            Premium
          </span>
        )}
      </label>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => handlePreferenceChange('any')}
          className={`group p-4 rounded-xl border-2 transition-all duration-200 ${
            genderPreference === 'any'
              ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-200/50 scale-105'
              : 'border-gray-200 hover:border-violet-300 bg-white hover:bg-violet-50/50 shadow-sm hover:shadow-md hover:scale-105'
          }`}
        >
          <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform">🌍</div>
          <div className="text-sm font-semibold text-gray-700">Anyone</div>
        </button>

        <button
          onClick={() => handlePreferenceChange('female')}
          className={`group p-4 rounded-xl border-2 transition-all duration-200 relative ${
            genderPreference === 'female'
              ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-200/50 scale-105'
              : 'border-gray-200 hover:border-violet-300 bg-white hover:bg-violet-50/50 shadow-sm hover:shadow-md hover:scale-105'
          } ${!isPremium ? 'opacity-70 hover:opacity-80' : ''}`}
        >
          {!isPremium && (
            <div className="absolute top-2 right-2 text-lg bg-white rounded-full p-0.5 shadow-sm">🔒</div>
          )}
          <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform">👩</div>
          <div className="text-sm font-semibold text-gray-700">Women</div>
        </button>

        <button
          onClick={() => handlePreferenceChange('male')}
          className={`group p-4 rounded-xl border-2 transition-all duration-200 relative ${
            genderPreference === 'male'
              ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-200/50 scale-105'
              : 'border-gray-200 hover:border-violet-300 bg-white hover:bg-violet-50/50 shadow-sm hover:shadow-md hover:scale-105'
          } ${!isPremium ? 'opacity-70 hover:opacity-80' : ''}`}
        >
          {!isPremium && (
            <div className="absolute top-2 right-2 text-lg bg-white rounded-full p-0.5 shadow-sm">🔒</div>
          )}
          <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform">👨</div>
          <div className="text-sm font-semibold text-gray-700">Men</div>
        </button>
      </div>

      {showUpgradePrompt && (
        <div className="mt-2 p-5 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 rounded-2xl border-2 border-amber-200/60 animate-slideUp shadow-lg">
          <div className="flex items-start gap-3">
            <div className="text-3xl animate-bounce-subtle">
              <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-1.5 text-base">
                Premium Feature
              </p>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                Gender filters are available with Premium. Match with your preferred gender only!
              </p>
              <button
                onClick={onUpgradeClick}
                className="group relative bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/35 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative flex items-center gap-2">
                  Upgrade to Premium
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
