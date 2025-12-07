/**
 * Premium Upsell Popup
 * Shows contextual upgrade prompts at strategic moments
 */

import { useState, useEffect } from 'react';

type UpsellTrigger =
  | 'after_matches'      // After X matches
  | 'gender_filter'      // When trying to use gender filter
  | 'skip_limit'         // When hitting skip limit
  | 'match_limit'        // When hitting match limit
  | 'session_timeout'    // When session is about to timeout
  | 'queue_wait'         // After waiting too long in queue
  | 'periodic';          // Periodic reminder

interface PremiumUpsellPopupProps {
  trigger: UpsellTrigger;
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  matchCount?: number;
  waitTime?: number;
}

const triggerContent: Record<UpsellTrigger, {
  icon: string;
  title: string;
  description: string;
  cta: string;
  highlight?: string;
}> = {
  after_matches: {
    icon: '🎉',
    title: 'Great conversations!',
    description: "You've had some amazing chats. Unlock premium features to make them even better!",
    cta: 'Unlock Premium Features',
    highlight: 'Gender filter, priority matching & more',
  },
  gender_filter: {
    icon: '🎯',
    title: 'Want to filter by gender?',
    description: 'Premium members can choose to match only with their preferred gender.',
    cta: 'Enable Gender Filter',
    highlight: 'Match with who you want',
  },
  skip_limit: {
    icon: '⚡',
    title: "You've used all your skips!",
    description: 'Premium members get unlimited skips. Never settle for a bad match again.',
    cta: 'Get Unlimited Skips',
    highlight: 'Skip as much as you want',
  },
  match_limit: {
    icon: '💫',
    title: 'Daily limit reached',
    description: "You've reached your daily match limit. Go premium for unlimited matches!",
    cta: 'Get Unlimited Matches',
    highlight: 'No more waiting until tomorrow',
  },
  session_timeout: {
    icon: '⏰',
    title: 'Session ending soon',
    description: 'Your session is about to timeout. Premium members get unlimited session time.',
    cta: 'Remove Time Limits',
    highlight: 'Chat as long as you want',
  },
  queue_wait: {
    icon: '🚀',
    title: 'Skip the wait!',
    description: "Been waiting a while? Premium members get priority matching and connect instantly.",
    cta: 'Get Priority Matching',
    highlight: 'Match instantly, every time',
  },
  periodic: {
    icon: '⭐',
    title: 'Upgrade to Premium',
    description: 'Get the best PairCam experience with exclusive features.',
    cta: 'See Premium Features',
    highlight: 'Starting at just $2.99/week',
  },
};

export default function PremiumUpsellPopup({
  trigger,
  isOpen,
  onClose,
  onUpgrade,
  matchCount,
  waitTime,
}: PremiumUpsellPopupProps) {
  const [animateOut, setAnimateOut] = useState(false);

  const content = triggerContent[trigger];

  const handleClose = () => {
    setAnimateOut(true);
    setTimeout(() => {
      setAnimateOut(false);
      onClose();
    }, 200);
  };

  const handleUpgrade = () => {
    onUpgrade();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${
        animateOut ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl transform transition-all duration-200 ${
          animateOut ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 p-6 text-center relative overflow-hidden">
          {/* Animated background circles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full animate-pulse delay-300" />
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icon */}
          <div className="relative">
            <div className="text-6xl mb-3 animate-bounce-slow">{content.icon}</div>
            {matchCount && (
              <div className="absolute -top-2 -right-2 bg-white text-pink-600 text-xs font-bold px-2 py-1 rounded-full shadow">
                {matchCount} matches!
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{content.title}</h2>
          {content.highlight && (
            <div className="inline-block bg-white/20 backdrop-blur-sm text-white text-sm px-4 py-1 rounded-full">
              {content.highlight}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 text-center mb-6">{content.description}</p>

          {/* Features preview */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { icon: '🎯', text: 'Gender Filter' },
              { icon: '⚡', text: 'Priority Match' },
              { icon: '🚫', text: 'No Ads' },
              { icon: '♾️', text: 'Unlimited' },
            ].map((feature) => (
              <div
                key={feature.text}
                className="flex items-center gap-2 bg-gray-50 rounded-xl p-3"
              >
                <span className="text-lg">{feature.icon}</span>
                <span className="text-sm text-gray-700">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="flex justify-center gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">$2.99</p>
              <p className="text-xs text-gray-500">per week</p>
            </div>
            <div className="text-center opacity-60">
              <p className="text-lg text-gray-400">or</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">$9.99</p>
              <p className="text-xs text-gray-500">per month</p>
              <span className="text-xs text-green-600 font-medium">Save 25%</span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {content.cta}
          </button>

          {/* Skip */}
          <button
            onClick={handleClose}
            className="w-full py-3 text-gray-500 text-sm hover:text-gray-700 transition-colors mt-2"
          >
            Maybe later
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
