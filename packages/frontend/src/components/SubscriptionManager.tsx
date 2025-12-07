/**
 * Subscription Manager Component
 * View and manage premium subscription
 */

import { useState, useEffect, useCallback } from 'react';

interface Subscription {
  plan: 'weekly' | 'monthly';
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionManagerProps {
  onClose: () => void;
  onUpgrade: () => void;
}

export default function SubscriptionManager({ onClose, onUpgrade }: SubscriptionManagerProps) {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';

      const response = await fetch(`${apiUrl}/subscriptions/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();

      if (data.isPremium && data.subscription) {
        setSubscription(data.subscription);
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will keep access until the end of your billing period.')) {
      return;
    }

    setCanceling(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';

      const response = await fetch(`${apiUrl}/payments/cancel-subscription`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      // Refresh subscription data
      await fetchSubscription();
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Subscription</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {!subscription ? (
          // No active subscription
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
            <p className="text-gray-600 mb-6">
              Upgrade to Premium to unlock gender filters, priority matching, and more!
            </p>
            <button
              onClick={onUpgrade}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-2xl hover:shadow-lg transition-all"
            >
              Upgrade to Premium
            </button>
          </div>
        ) : (
          // Active subscription
          <div>
            {/* Status Badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                PREMIUM
              </div>
              {subscription.cancelAtPeriodEnd ? (
                <span className="text-orange-600 text-sm font-medium">Canceling</span>
              ) : (
                <span className="text-green-600 text-sm font-medium">Active</span>
              )}
            </div>

            {/* Subscription Details */}
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-4 mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Plan</span>
                <span className="font-bold text-gray-900 capitalize">{subscription.plan}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Price</span>
                <span className="font-bold text-gray-900">
                  {subscription.plan === 'weekly' ? '$2.99/week' : '$9.99/month'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  {subscription.cancelAtPeriodEnd ? 'Access Until' : 'Next Billing'}
                </span>
                <span className="font-bold text-gray-900">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Your Premium Features:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: '🎯', text: 'Gender Filter' },
                  { icon: '⚡', text: 'Priority Match' },
                  { icon: '🚫', text: 'No Ads' },
                  { icon: '♾️', text: 'Unlimited' },
                ].map((feature) => (
                  <div
                    key={feature.text}
                    className="flex items-center gap-2 text-sm text-gray-600 bg-white rounded-lg p-2"
                  >
                    <span>{feature.icon}</span>
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cancel Button */}
            {!subscription.cancelAtPeriodEnd ? (
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-2xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {canceling ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            ) : (
              <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-xl text-center">
                <p className="font-medium">Subscription will cancel on</p>
                <p className="text-lg font-bold">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            )}

            <p className="text-center text-xs text-gray-500 mt-4">
              Questions? Contact support@paircam.live
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
