import { useState } from 'react';
import { XMarkIcon, SparklesIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import GenderFilter from './GenderFilter';
import { AVAILABLE_INTERESTS, QUEUE_TYPES, LANGUAGES } from '../constants/interests';

interface PreferencesModalProps {
  onStart: (preferences: {
    gender?: string;
    genderPreference: string;
    interests?: string[];
    queueType?: 'casual' | 'serious' | 'language' | 'gaming';
    nativeLanguage?: string;
    learningLanguage?: string;
  }) => void;
  onCancel: () => void;
  isPremium?: boolean;
  onUpgrade?: () => void;
}

export default function PreferencesModal({ onStart, onCancel, isPremium = false, onUpgrade }: PreferencesModalProps) {
  const [userGender, setUserGender] = useState<string | undefined>(undefined);
  const [genderPreference, setGenderPreference] = useState('any');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [queueType, setQueueType] = useState<'casual' | 'serious' | 'language' | 'gaming'>('casual');
  const [nativeLanguage, setNativeLanguage] = useState<string>('en');
  const [learningLanguage, setLearningLanguage] = useState<string>('es');

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : prev.length < 5 // Max 5 interests
        ? [...prev, interestId]
        : prev
    );
  };

  const handleStart = () => {
    onStart({
      gender: userGender,
      genderPreference: genderPreference,
      interests: selectedInterests,
      queueType,
      nativeLanguage: queueType === 'language' ? nativeLanguage : undefined,
      learningLanguage: queueType === 'language' ? learningLanguage : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary-500 to-secondary-600 px-8 py-6 rounded-t-3xl">
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
              <div className="bg-secondary-100 p-2 rounded-lg">
                <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    ? 'border-primary-500 bg-primary-50 shadow-md scale-105'
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
                    ? 'border-secondary-500 bg-secondary-50 shadow-md scale-105'
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
              <div className="bg-gradient-to-r from-primary-500 to-secondary-600 p-2 rounded-lg">
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

            {/* 🆕 Queue Type Selection */}
            <div className="bg-gradient-to-br from-secondary-50/50 via-primary-50/50 to-accent-50/50 border-2 border-primary-200/60 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="bg-gradient-to-br from-primary-500 to-secondary-600 rounded-2xl p-2.5 shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base mb-1.5">
                    Conversation Style
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">
                    Choose what type of conversation you're looking for
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {QUEUE_TYPES.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setQueueType(type.id as any)}
                    className={`group p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      queueType === type.id
                        ? 'border-primary-500 bg-primary-100/70 shadow-lg shadow-primary-200/50 scale-105'
                        : 'border-gray-200 hover:border-primary-300 bg-white hover:bg-primary-50 shadow-sm hover:shadow-md hover:scale-105'
                    }`}
                  >
                    <div className="text-3xl mb-2 transform group-hover:scale-110 transition-transform">{type.icon}</div>
                    <div className="text-sm font-bold text-gray-800 mb-1">{type.label}</div>
                    <div className="text-xs text-gray-600">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 🆕 Language Learning (conditional) */}
            {queueType === 'language' && (
              <div className="bg-gradient-to-br from-green-50/50 via-secondary-50/50 to-primary-50/50 border-2 border-green-200/60 rounded-2xl p-6 space-y-4 shadow-sm animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl p-2.5 shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-base mb-1.5">
                      Language Exchange
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Get matched with native speakers for practice
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Your Native Language
                    </label>
                    <select
                      value={nativeLanguage}
                      onChange={(e) => setNativeLanguage(e.target.value)}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Learning Language
                    </label>
                    <select
                      value={learningLanguage}
                      onChange={(e) => setLearningLanguage(e.target.value)}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 🆕 Interest Tags */}
            <div className="bg-gradient-to-br from-primary-50/50 via-accent-50/50 to-highlight-50/50 border-2 border-accent-200/60 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="bg-gradient-to-br from-accent-500 to-primary-600 rounded-2xl p-2.5 shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base mb-1.5">
                    Your Interests (Optional)
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Select up to 5 interests to find better matches ({selectedInterests.length}/5)
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_INTERESTS.map(interest => {
                  const isSelected = selectedInterests.includes(interest.id);
                  const isDisabled = !isSelected && selectedInterests.length >= 5;
                  
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => toggleInterest(interest.id)}
                      disabled={isDisabled}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                        isSelected
                          ? 'bg-gradient-to-r from-accent-500 to-primary-600 text-white shadow-lg shadow-accent-200/50 scale-105'
                          : isDisabled
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-accent-300 hover:bg-accent-50 hover:scale-105 shadow-sm'
                      }`}
                    >
                      <span className="mr-2">{interest.emoji}</span>
                      {interest.label}
                    </button>
                  );
                })}
              </div>
            </div>
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
              className="flex-1 py-4 px-6 bg-gradient-to-r from-primary-500 to-secondary-600 hover:from-primary-600 hover:to-secondary-700 text-white font-bold rounded-xl shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/50 transition-all duration-300 hover:scale-105 active:scale-95"
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

