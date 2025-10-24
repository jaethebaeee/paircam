import { useState } from 'react';
import { XMarkIcon, SparklesIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import GenderFilter from './GenderFilter';

interface PreferencesModalProps {
  onStart: (preferences: {
    gender?: string;
    genderPreference: string;
  }) => void;
  onCancel: () => void;
  isPremium?: boolean;
  onUpgrade?: () => void;
}

export default function PreferencesModal({ onStart, onCancel, isPremium = false, onUpgrade }: PreferencesModalProps) {
  const [userGender, setUserGender] = useState<string | undefined>(undefined);
  const [genderPreference, setGenderPreference] = useState('any');

  const handleStart = () => {
    onStart({
      gender: userGender,
      genderPreference: genderPreference,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Quick Setup</h2>
                <p className="text-white/90 text-sm">Set your preferences (optional)</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* Your Gender */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-purple-100 p-2 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Your Gender (Optional)</h3>
                <p className="text-sm text-gray-600">
                  Helps premium users find you through filters
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {/* Male */}
              <button
                onClick={() => setUserGender('male')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  userGender === 'male'
                    ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-3xl mb-2">👨</div>
                <div className="text-sm font-semibold text-gray-700">Male</div>
              </button>

              {/* Female */}
              <button
                onClick={() => setUserGender('female')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  userGender === 'female'
                    ? 'border-pink-500 bg-pink-50 shadow-md scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-3xl mb-2">👩</div>
                <div className="text-sm font-semibold text-gray-700">Female</div>
              </button>

              {/* Other */}
              <button
                onClick={() => setUserGender('other')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  userGender === 'other'
                    ? 'border-purple-500 bg-purple-50 shadow-md scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-3xl mb-2">✨</div>
                <div className="text-sm font-semibold text-gray-700">Other</div>
              </button>

              {/* Private */}
              <button
                onClick={() => setUserGender(undefined)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  userGender === undefined
                    ? 'border-gray-500 bg-gray-50 shadow-md scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-3xl mb-2">🔒</div>
                <div className="text-sm font-semibold text-gray-700">Private</div>
              </button>
            </div>

            {userGender === undefined && (
              <div className="mt-3 flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                <LockClosedIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  You'll match with everyone, but premium users can't filter for you
                </span>
              </div>
            )}
          </div>

          {/* Who to Meet */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-2 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">Who would you like to meet?</h3>
                  {!isPremium && (
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                      Premium
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Gender filters are a premium feature
                </p>
              </div>
            </div>

            <GenderFilter
              onPreferenceChange={setGenderPreference}
              onUpgradeClick={onUpgrade || (() => {})}
              isPremium={isPremium}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-300 hover:shadow-lg active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-xl shadow-pink-500/30 hover:shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Start Chatting →
            </button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-center text-gray-500 pt-2">
            You can skip this and change preferences anytime
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

