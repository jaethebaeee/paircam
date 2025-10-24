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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900">
        Who would you like to meet?
        {!isPremium && (
          <span className="ml-2 text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full font-bold">
            ⭐ Premium
          </span>
        )}
      </label>
      
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handlePreferenceChange('any')}
          className={`p-3 rounded-xl border-2 transition-all ${
            genderPreference === 'any'
              ? 'border-pink-500 bg-pink-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-1">🌍</div>
          <div className="text-sm font-medium">Anyone</div>
        </button>
        
        <button
          onClick={() => handlePreferenceChange('female')}
          className={`p-3 rounded-xl border-2 transition-all relative ${
            genderPreference === 'female'
              ? 'border-pink-500 bg-pink-50'
              : 'border-gray-200 hover:border-gray-300'
          } ${!isPremium ? 'opacity-75' : ''}`}
        >
          {!isPremium && (
            <div className="absolute top-1 right-1 text-xs">🔒</div>
          )}
          <div className="text-2xl mb-1">👩</div>
          <div className="text-sm font-medium">Women</div>
        </button>
        
        <button
          onClick={() => handlePreferenceChange('male')}
          className={`p-3 rounded-xl border-2 transition-all relative ${
            genderPreference === 'male'
              ? 'border-pink-500 bg-pink-50'
              : 'border-gray-200 hover:border-gray-300'
          } ${!isPremium ? 'opacity-75' : ''}`}
        >
          {!isPremium && (
            <div className="absolute top-1 right-1 text-xs">🔒</div>
          )}
          <div className="text-2xl mb-1">👨</div>
          <div className="text-sm font-medium">Men</div>
        </button>
      </div>
      
      {showUpgradePrompt && (
        <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⭐</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 mb-1">
                Premium Feature
              </p>
              <p className="text-sm text-gray-600 mb-3">
                Gender filters are available with Premium. Match with your preferred gender only!
              </p>
              <button
                onClick={onUpgradeClick}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:shadow-lg transition-all hover:scale-105"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

