import { useState, useEffect } from 'react';
import AnimatedBackground from './ui/AnimatedBackground';

interface PremiumModalProps {
  onClose: () => void;
}

export default function PremiumModal({ onClose }: PremiumModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

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
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={`relative bg-white/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl transition-all duration-300 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-3xl" />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-bold mb-4">
            <span>⭐</span>
            <span>PREMIUM</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">Try Free</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Match 3x Faster
          </h2>
          <p className="text-gray-600 text-base sm:text-lg max-w-md mx-auto">
            Get priority matching, gender filters, and an ad-free experience
          </p>
          {/* Social proof */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-pink-200 border-2 border-white flex items-center justify-center text-xs">JK</div>
              <div className="w-8 h-8 rounded-full bg-purple-200 border-2 border-white flex items-center justify-center text-xs">AM</div>
              <div className="w-8 h-8 rounded-full bg-blue-200 border-2 border-white flex items-center justify-center text-xs">TL</div>
            </div>
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-700">2,500+</span> upgraded this week
            </p>
          </div>
        </div>

        {/* Features Grid with quantified benefits */}
        <div className="grid md:grid-cols-2 gap-3 mb-8">
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border border-pink-100">
            <div className="text-2xl">🎯</div>
            <div>
              <h3 className="font-bold text-gray-900">Gender Filter</h3>
              <p className="text-sm text-gray-600">Match your preferred gender only</p>
              <p className="text-xs text-pink-600 font-medium mt-1">50% more relevant matches</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border border-purple-100">
            <div className="text-2xl">⚡</div>
            <div>
              <h3 className="font-bold text-gray-900">Priority Queue</h3>
              <p className="text-sm text-gray-600">Skip the line, match instantly</p>
              <p className="text-xs text-purple-600 font-medium mt-1">3x faster matching</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100">
            <div className="text-2xl">🚫</div>
            <div>
              <h3 className="font-bold text-gray-900">Ad-Free Experience</h3>
              <p className="text-sm text-gray-600">Zero interruptions, pure chat</p>
              <p className="text-xs text-green-600 font-medium mt-1">100% distraction-free</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
            <div className="text-2xl">↩️</div>
            <div>
              <h3 className="font-bold text-gray-900">Rewind Skip</h3>
              <p className="text-sm text-gray-600">Undo accidental skips</p>
              <p className="text-xs text-orange-600 font-medium mt-1">Never lose a connection</p>
            </div>
          </div>
        </div>

        {/* Pricing Toggle */}
        <div className="flex justify-center gap-4 mb-6 relative">
          <button
            onClick={() => setSelectedPlan('weekly')}
            className={`group relative px-8 py-5 rounded-2xl font-semibold transition-all duration-300 overflow-hidden ${
              selectedPlan === 'weekly'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xl shadow-pink-500/30 scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-[1.02]'
            }`}
          >
            {selectedPlan === 'weekly' && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full animate-shimmer" />
            )}
            <div className="relative">
              <div className="text-2xl font-bold">$2.99</div>
              <div className="text-sm opacity-90">per week</div>
            </div>
          </button>
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`group relative px-8 py-5 rounded-2xl font-semibold transition-all duration-300 overflow-hidden ${
              selectedPlan === 'monthly'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xl shadow-pink-500/30 scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-[1.02]'
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg animate-bounce-subtle">
              Save 25%
            </div>
            {selectedPlan === 'monthly' && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full animate-shimmer" />
            )}
            <div className="relative">
              <div className="text-2xl font-bold">$9.99</div>
              <div className="text-sm opacity-90">per month</div>
            </div>
          </button>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="group relative w-full py-5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-bold text-lg rounded-2xl shadow-xl shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

          <span className="relative flex items-center justify-center gap-3">
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <span className="text-xl">⭐</span>
                <span>Upgrade to Premium</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </span>
        </button>

        {/* Trust signals */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-center gap-6 text-gray-500 text-xs">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No hidden fees
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Secure payment
            </span>
          </div>
          <p className="text-center text-xs text-gray-400">
            Powered by Stripe. Your payment info is never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}

