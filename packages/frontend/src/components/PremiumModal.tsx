import { useState } from 'react';
import CloseButton from './ui/CloseButton';
import PrimaryButton from './ui/PrimaryButton';
import { CheckCircleIcon, LockIcon } from './ui/icons';

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
      <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
        <CloseButton onClick={onClose} className="absolute top-4 right-4" />

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
        <div className="grid md:grid-cols-2 gap-2 sm:gap-3 mb-6 sm:mb-8">
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
        <div className="flex justify-center gap-2 sm:gap-4 mb-6">
          <button
            onClick={() => setSelectedPlan('weekly')}
            className={`px-4 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold transition-all min-h-[70px] ${
              selectedPlan === 'weekly'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold">$2.99</div>
            <div className="text-xs sm:text-sm opacity-90">per week</div>
          </button>
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`px-4 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold transition-all relative min-h-[70px] ${
              selectedPlan === 'monthly'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              Save 25%
            </div>
            <div className="text-xl sm:text-2xl font-bold">$9.99</div>
            <div className="text-xs sm:text-sm opacity-90">per month</div>
          </button>
        </div>

        {/* CTA Button */}
        <PrimaryButton
          onClick={handleUpgrade}
          loading={loading}
          loadingText="Loading..."
          size="lg"
          fullWidth
        >
          Upgrade Now
        </PrimaryButton>

        {/* Trust signals */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-center gap-6 text-gray-500 text-xs">
            <span className="flex items-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              No hidden fees
            </span>
            <span className="flex items-center gap-1.5">
              <LockIcon className="w-4 h-4 text-green-500" />
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

