import { useState } from 'react';

interface PremiumModalProps {
  onClose: () => void;
}

export default function PremiumModal({ onClose }: PremiumModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';
      
      const response = await fetch(`${apiUrl}/payments/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-bold mb-4">
            <span>⭐</span>
            <span>PREMIUM</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">Try Free</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-3">
            Match 3x Faster
          </h2>
          <p className="text-neutral-600 text-base sm:text-lg max-w-md mx-auto">
            Get priority matching, gender filters, and an ad-free experience
          </p>
          {/* Social proof */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs">JK</div>
              <div className="w-8 h-8 rounded-full bg-violet-100 border-2 border-white flex items-center justify-center text-xs">AM</div>
              <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs">TL</div>
            </div>
            <p className="text-sm text-neutral-500">
              <span className="font-semibold text-neutral-700">2,500+</span> upgraded this week
            </p>
          </div>
        </div>

        {/* Features Grid with quantified benefits */}
        <div className="grid md:grid-cols-2 gap-3 mb-8">
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100">
            <div className="text-2xl">🎯</div>
            <div>
              <h3 className="font-bold text-neutral-900">Gender Filter</h3>
              <p className="text-sm text-neutral-600">Match your preferred gender only</p>
              <p className="text-xs text-indigo-600 font-medium mt-1">50% more relevant matches</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-100">
            <div className="text-2xl">⚡</div>
            <div>
              <h3 className="font-bold text-neutral-900">Priority Queue</h3>
              <p className="text-sm text-neutral-600">Skip the line, match instantly</p>
              <p className="text-xs text-violet-600 font-medium mt-1">3x faster matching</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
            <div className="text-2xl">🚫</div>
            <div>
              <h3 className="font-bold text-neutral-900">Ad-Free Experience</h3>
              <p className="text-sm text-neutral-600">Zero interruptions, pure chat</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">100% distraction-free</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
            <div className="text-2xl">↩️</div>
            <div>
              <h3 className="font-bold text-neutral-900">Rewind Skip</h3>
              <p className="text-sm text-neutral-600">Undo accidental skips</p>
              <p className="text-xs text-amber-600 font-medium mt-1">Never lose a connection</p>
            </div>
          </div>
        </div>

        {/* Pricing Toggle */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setSelectedPlan('weekly')}
            className={`px-8 py-4 rounded-2xl font-semibold transition-all ${
              selectedPlan === 'weekly'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg scale-105'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <div className="text-2xl font-bold">$2.99</div>
            <div className="text-sm opacity-90">per week</div>
          </button>
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`px-8 py-4 rounded-2xl font-semibold transition-all relative ${
              selectedPlan === 'monthly'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg scale-105'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              Save 25%
            </div>
            <div className="text-2xl font-bold">$9.99</div>
            <div className="text-sm opacity-90">per month</div>
          </button>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-lg rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading...
            </span>
          ) : (
            'Upgrade Now'
          )}
        </button>

        {/* Trust signals */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-center gap-6 text-neutral-500 text-xs">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No hidden fees
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Secure payment
            </span>
          </div>
          <p className="text-center text-xs text-neutral-400">
            Powered by Stripe. Your payment info is never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}

