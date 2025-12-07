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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-400 to-gold-600 text-gray-900 px-4 py-1.5 rounded-full text-sm font-bold mb-4 shadow-lg shadow-gold-500/30">
            <span className="text-lg">👑</span>
            <span>PREMIUM</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-600 via-violet-600 to-violet-500 bg-clip-text text-transparent mb-3">
            Upgrade to Premium
          </h2>
          <p className="text-gray-600 text-base sm:text-lg">
            Get exclusive features and better matches
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-8">
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-brand-50 to-violet-50 rounded-2xl border border-brand-100 hover:shadow-md transition-shadow">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-brand-500 to-violet-500 rounded-xl flex items-center justify-center text-white text-lg shadow-lg shadow-brand-500/25">
              🎯
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Gender Filter</h3>
              <p className="text-sm text-gray-600">Match with your preferred gender only</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-brand-50 to-violet-50 rounded-2xl border border-brand-100 hover:shadow-md transition-shadow">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-brand-500 to-violet-500 rounded-xl flex items-center justify-center text-white text-lg shadow-lg shadow-brand-500/25">
              ⚡
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Priority Matching</h3>
              <p className="text-sm text-gray-600">Skip the queue and match faster</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-brand-50 to-violet-50 rounded-2xl border border-brand-100 hover:shadow-md transition-shadow">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-brand-500 to-violet-500 rounded-xl flex items-center justify-center text-white text-lg shadow-lg shadow-brand-500/25">
              🚫
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Ad-Free</h3>
              <p className="text-sm text-gray-600">Enjoy uninterrupted conversations</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-brand-50 to-violet-50 rounded-2xl border border-brand-100 hover:shadow-md transition-shadow">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-brand-500 to-violet-500 rounded-xl flex items-center justify-center text-white text-lg shadow-lg shadow-brand-500/25">
              ↩️
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Rewind Skip</h3>
              <p className="text-sm text-gray-600">Undo your last skip once per session</p>
            </div>
          </div>
        </div>

        {/* Pricing Toggle */}
        <div className="flex justify-center gap-3 sm:gap-4 mb-6">
          <button
            onClick={() => setSelectedPlan('weekly')}
            className={`group px-6 sm:px-8 py-4 rounded-2xl font-semibold transition-all duration-300 ${
              selectedPlan === 'weekly'
                ? 'bg-gradient-to-r from-brand-500 to-violet-600 text-white shadow-xl shadow-brand-500/30 scale-105 -translate-y-1'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
            }`}
          >
            <div className="text-2xl font-bold">$2.99</div>
            <div className={`text-sm ${selectedPlan === 'weekly' ? 'text-white/90' : 'text-gray-500'}`}>per week</div>
          </button>
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`group px-6 sm:px-8 py-4 rounded-2xl font-semibold transition-all duration-300 relative ${
              selectedPlan === 'monthly'
                ? 'bg-gradient-to-r from-brand-500 to-violet-600 text-white shadow-xl shadow-brand-500/30 scale-105 -translate-y-1'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
            }`}
          >
            <div className="absolute -top-3 -right-2 bg-gradient-to-r from-success-500 to-success-600 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-lg">
              Save 25%
            </div>
            <div className="text-2xl font-bold">$9.99</div>
            <div className={`text-sm ${selectedPlan === 'monthly' ? 'text-white/90' : 'text-gray-500'}`}>per month</div>
          </button>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="group w-full py-4 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 hover:from-gold-500 hover:via-gold-600 hover:to-gold-700 text-gray-900 font-bold text-lg rounded-2xl shadow-xl shadow-gold-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="text-xl">👑</span>
              Upgrade Now
            </span>
          )}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4 flex items-center justify-center gap-2">
          <svg className="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Cancel anytime. Secure payment via Stripe.
        </p>
      </div>
    </div>
  );
}
