import { XMarkIcon } from '@heroicons/react/24/outline';

type UpsellReason = 'skip_limit' | 'gender_filter' | 'region_filter' | 'long_wait' | 'general';

interface PremiumUpsellModalProps {
  reason: UpsellReason;
  onClose: () => void;
  onUpgrade: () => void;
  skipStats?: {
    count: number;
    limit: number;
    remaining: number;
  };
}

const upsellContent: Record<UpsellReason, { title: string; subtitle: string; benefit: string }> = {
  skip_limit: {
    title: "You've hit your daily limit",
    subtitle: "Free users get 30 skips per day",
    benefit: "Unlimited skips",
  },
  gender_filter: {
    title: "Unlock gender filters",
    subtitle: "Choose who you want to meet",
    benefit: "Filter by gender",
  },
  region_filter: {
    title: "Match locally",
    subtitle: "Better connections, lower latency",
    benefit: "Filter by region",
  },
  long_wait: {
    title: "Skip the queue",
    subtitle: "Premium members get matched faster",
    benefit: "Priority matching",
  },
  general: {
    title: "Upgrade to Premium",
    subtitle: "Get the most out of PairCam",
    benefit: "All premium features",
  },
};

export default function PremiumUpsellModal({ reason, onClose, onUpgrade, skipStats }: PremiumUpsellModalProps) {
  const content = upsellContent[reason];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 px-6 py-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>

          <div className="text-5xl mb-3">⭐</div>
          <h2 className="text-xl font-bold text-white mb-1">{content.title}</h2>
          <p className="text-white/90 text-sm">{content.subtitle}</p>

          {/* Skip counter for skip_limit reason */}
          {reason === 'skip_limit' && skipStats && (
            <div className="mt-4 bg-white/20 rounded-lg px-4 py-2 inline-block">
              <span className="text-white font-mono text-lg">
                {skipStats.count} / {skipStats.limit} skips used
              </span>
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="px-6 py-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Premium includes
          </h3>

          <div className="space-y-3">
            {[
              { icon: '♾️', text: 'Unlimited skips', highlight: reason === 'skip_limit' },
              { icon: '👤', text: 'Gender filters', highlight: reason === 'gender_filter' },
              { icon: '🌍', text: 'Region filters', highlight: reason === 'region_filter' },
              { icon: '⚡', text: 'Priority matching', highlight: reason === 'long_wait' },
              { icon: '🚫', text: 'No ads', highlight: false },
            ].map((item) => (
              <div
                key={item.text}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  item.highlight ? 'bg-orange-50 border border-orange-200' : ''
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className={`${item.highlight ? 'font-semibold text-orange-700' : 'text-gray-700'}`}>
                  {item.text}
                </span>
                {item.highlight && (
                  <span className="ml-auto text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                    Unlock
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onUpgrade}
            className="w-full mt-6 py-3.5 bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 hover:from-yellow-500 hover:via-orange-500 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-300/50 hover:shadow-xl transition-all"
          >
            Upgrade to Premium
          </button>

          {/* Dismiss */}
          <button
            onClick={onClose}
            className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            Maybe later
          </button>

          {/* Price hint */}
          <p className="text-center text-xs text-gray-400 mt-3">
            Starting at $4.99/week • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
