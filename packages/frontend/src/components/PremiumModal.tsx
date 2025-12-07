import { useState, useEffect } from 'react';

interface PremiumModalProps {
  onClose: () => void;
  isPremium?: boolean;
  onManageSubscription?: () => void;
}

export default function PremiumModal({ onClose, isPremium, onManageSubscription }: PremiumModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(!isPremium);
  const [hasPremium, setHasPremium] = useState(isPremium || false);

  // Check premium status on mount if not provided
  useEffect(() => {
    if (isPremium !== undefined) {
      setHasPremium(isPremium);
      setCheckingStatus(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';

        const response = await fetch(`${apiUrl}/subscriptions/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setHasPremium(data.isPremium);
        }
      } catch (err) {
        console.error('Error checking premium status:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, [isPremium]);

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

  // Loading state
  if (checkingStatus) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Already premium - show manage subscription option
  if (hasPremium) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⭐</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're Premium!</h2>
            <p className="text-gray-600 mb-6">
              You have access to all premium features
            </p>

            {/* Features list */}
            <div className="text-left bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-4 mb-6">
              {[
                { icon: '🎯', text: 'Gender Filter' },
                { icon: '⚡', text: 'Priority Matching' },
                { icon: '🚫', text: 'Ad-Free Experience' },
                { icon: '♾️', text: 'Unlimited Matches' },
                { icon: '↩️', text: 'Rewind Skip' },
              ].map((feature) => (
                <div key={feature.text} className="flex items-center gap-3 py-2">
                  <span>{feature.icon}</span>
                  <span className="text-gray-700">{feature.text}</span>
                  <svg className="w-5 h-5 text-green-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ))}
            </div>

            {onManageSubscription && (
              <button
                onClick={onManageSubscription}
                className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-2xl hover:bg-gray-200 transition-colors"
              >
                Manage Subscription
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold mb-4">
            ⭐ PREMIUM
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Upgrade to Premium
          </h2>
          <p className="text-gray-600 text-lg">
            Get exclusive features and better matches
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
            <div className="text-2xl">🎯</div>
            <div>
              <h3 className="font-bold text-gray-900">Gender Filter</h3>
              <p className="text-sm text-gray-600">Match with your preferred gender only</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
            <div className="text-2xl">⚡</div>
            <div>
              <h3 className="font-bold text-gray-900">Priority Matching</h3>
              <p className="text-sm text-gray-600">Skip the queue and match faster</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
            <div className="text-2xl">🚫</div>
            <div>
              <h3 className="font-bold text-gray-900">Ad-Free</h3>
              <p className="text-sm text-gray-600">Enjoy uninterrupted conversations</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
            <div className="text-2xl">↩️</div>
            <div>
              <h3 className="font-bold text-gray-900">Rewind Skip</h3>
              <p className="text-sm text-gray-600">Undo your last skip once per session</p>
            </div>
          </div>
        </div>

        {/* Pricing Toggle */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setSelectedPlan('weekly')}
            className={`px-8 py-4 rounded-2xl font-semibold transition-all ${
              selectedPlan === 'weekly'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="text-2xl font-bold">$2.99</div>
            <div className="text-sm opacity-90">per week</div>
          </button>
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`px-8 py-4 rounded-2xl font-semibold transition-all relative ${
              selectedPlan === 'monthly'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
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
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-lg rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
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

        <p className="text-center text-sm text-gray-500 mt-4">
          Cancel anytime. No hidden fees. Secure payment via Stripe.
        </p>
      </div>
    </div>
  );
}

