import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface ReferralBannerProps {
  variant?: 'full' | 'compact';
}

export default function ReferralBanner({ variant = 'full' }: ReferralBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if banner was dismissed in this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('referral_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('referral_banner_dismissed', 'true');
    setIsDismissed(true);
  };

  if (isDismissed || !isVisible) return null;

  if (variant === 'compact') {
    return (
      <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white py-2 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm font-medium flex items-center gap-2">
            <span>Invite friends & earn coins!</span>
            <span className="hidden sm:inline">Get up to 350 coins per referral.</span>
          </p>
          <div className="flex items-center gap-2">
            <Link
              to="/referrals"
              className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
            >
              Learn More
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Dismiss banner"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 border-y border-purple-200 py-4 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-pink-300 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-purple-300 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>

            {/* Text */}
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                Invite Friends, Earn Coins!
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  NEW
                </span>
              </h3>
              <p className="text-sm text-gray-600">
                Get <span className="font-bold text-green-600">100-350 coins</span> for each friend you invite.
                Your friend gets <span className="font-bold text-green-600">150 coins</span> too!
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <Link
              to="/referrals"
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-pink-500/30 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Get Your Code
            </Link>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
              aria-label="Dismiss banner"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
