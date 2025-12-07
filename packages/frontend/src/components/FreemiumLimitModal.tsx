/**
 * Freemium Limit Modal
 * Shows when free tier users reach their daily limits
 */

import { FREE_TIER_LIMITS } from '../hooks/useFreemiumLimits';

interface FreemiumLimitModalProps {
  limitType: 'matches' | 'skips' | 'session';
  onUpgrade: () => void;
  onClose: () => void;
}

export default function FreemiumLimitModal({ limitType, onUpgrade, onClose }: FreemiumLimitModalProps) {
  const getLimitInfo = () => {
    switch (limitType) {
      case 'matches':
        return {
          icon: '🎯',
          title: "You've reached your daily match limit!",
          description: `Free users can have up to ${FREE_TIER_LIMITS.DAILY_MATCHES} matches per day. Your limit resets at midnight.`,
          upgradeText: 'Upgrade to Premium for unlimited matches!',
        };
      case 'skips':
        return {
          icon: '⏭️',
          title: "You've used all your skips for today!",
          description: `Free users can skip up to ${FREE_TIER_LIMITS.DAILY_SKIPS} times per day. Your limit resets at midnight.`,
          upgradeText: 'Upgrade to Premium for unlimited skips!',
        };
      case 'session':
        return {
          icon: '⏱️',
          title: 'Your free session has ended!',
          description: `Free users can chat for up to ${FREE_TIER_LIMITS.SESSION_DURATION / 60} minutes per session.`,
          upgradeText: 'Upgrade to Premium for unlimited session time!',
        };
    }
  };

  const info = getLimitInfo();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 relative shadow-2xl animate-scaleIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{info.icon}</div>
          <div className="inline-block bg-gradient-to-r from-orange-400 to-red-500 text-white px-4 py-1 rounded-full text-sm font-bold">
            Limit Reached
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          {info.title}
        </h2>

        {/* Description */}
        <p className="text-gray-600 text-center mb-6">
          {info.description}
        </p>

        {/* Premium Upsell */}
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 mb-6 border-2 border-pink-100">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">⭐</span>
            <span className="font-bold text-gray-900">{info.upgradeText}</span>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited daily matches
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Unlimited skips
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              No session time limits
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Gender filter & priority matching
            </li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onUpgrade}
            className="w-full py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 text-white font-bold text-lg rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Upgrade to Premium
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-gray-600 font-medium hover:text-gray-900 transition-colors"
          >
            Maybe later
          </button>
        </div>

        {/* Reset Time */}
        <p className="text-center text-sm text-gray-500 mt-4">
          {limitType !== 'session' && 'Your daily limits reset at midnight local time.'}
          {limitType === 'session' && 'Start a new session to continue chatting.'}
        </p>
      </div>
    </div>
  );
}
