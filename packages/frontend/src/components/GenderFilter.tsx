import { useState } from 'react';

interface GenderFilterProps {
  onPreferenceChange: (preference: string) => void;
  onUpgradeClick: () => void;
  isPremium?: boolean;
}

// Modern SVG Icons
const GlobeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const FemaleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <circle cx="12" cy="8" r="5" />
    <path d="M12 13v8M9 18h6" />
  </svg>
);

const MaleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <circle cx="10" cy="14" r="5" />
    <path d="M19 5l-5.4 5.4M19 5h-5M19 5v5" />
  </svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
  </svg>
);

export default function GenderFilter({ onPreferenceChange, onUpgradeClick, isPremium = false }: GenderFilterProps) {
  const [genderPreference, setGenderPreference] = useState('any');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const handlePreferenceChange = (preference: string) => {
    if (!isPremium && preference !== 'any') {
      setShowUpgradePrompt(true);
      setTimeout(() => setShowUpgradePrompt(false), 5000);
      return;
    }

    setGenderPreference(preference);
    onPreferenceChange(preference);
  };

  const options = [
    { id: 'any', label: 'Anyone', Icon: GlobeIcon, gradient: 'from-violet-500 to-purple-600' },
    { id: 'female', label: 'Women', Icon: FemaleIcon, gradient: 'from-pink-500 to-rose-600' },
    { id: 'male', label: 'Men', Icon: MaleIcon, gradient: 'from-blue-500 to-indigo-600' },
  ];

  return (
    <div className="space-y-4">
      {/* Modern Segmented Control */}
      <div className="relative bg-gray-100 rounded-2xl p-1.5 flex gap-1">
        {/* Animated Selection Indicator */}
        <div
          className={`absolute top-1.5 bottom-1.5 w-[calc(33.333%-4px)] bg-gradient-to-r ${
            genderPreference === 'any' ? 'from-violet-500 to-purple-600' :
            genderPreference === 'female' ? 'from-pink-500 to-rose-600' :
            'from-blue-500 to-indigo-600'
          } rounded-xl shadow-lg transition-all duration-300 ease-out`}
          style={{
            left: genderPreference === 'any' ? '6px' :
                  genderPreference === 'female' ? 'calc(33.333% + 2px)' :
                  'calc(66.666% - 2px)'
          }}
        />

        {options.map(({ id, label, Icon }) => {
          const isSelected = genderPreference === id;
          const isLocked = !isPremium && id !== 'any';

          return (
            <button
              key={id}
              onClick={() => handlePreferenceChange(id)}
              className={`relative flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-xl transition-all duration-300 ${
                isSelected
                  ? 'text-white'
                  : 'text-gray-600 hover:text-gray-900'
              } ${isLocked ? 'cursor-pointer' : ''}`}
            >
              {/* Icon Container with Animation */}
              <div className={`relative transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}>
                <Icon className={`w-7 h-7 transition-all duration-300 ${
                  isSelected ? 'stroke-white' : 'stroke-gray-500'
                }`} />

                {/* Lock Badge for Premium Options */}
                {isLocked && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                    <LockIcon className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>

              <span className={`text-sm font-semibold transition-all duration-300 ${
                isSelected ? 'text-white' : 'text-gray-700'
              }`}>
                {label}
              </span>
            </button>
          );
        })}
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
