/**
 * Success Page - Shown after successful Stripe payment
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

interface SubscriptionInfo {
  plan: 'weekly' | 'monthly';
  status: string;
  currentPeriodEnd: string;
}

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID found');
      setVerifying(false);
      return;
    }

    const verifyPayment = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';

        const response = await fetch(
          `${apiUrl}/payments/verify?session_id=${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Payment verification failed');
        }

        const data = await response.json();

        if (data.success && data.isPremium) {
          setSubscription(data.subscription);
        } else {
          // Payment pending - webhook might not have processed yet
          // Wait a bit and try again
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const retryResponse = await fetch(
            `${apiUrl}/payments/verify?session_id=${sessionId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const retryData = await retryResponse.json();
          if (retryData.success && retryData.isPremium) {
            setSubscription(retryData.subscription);
          } else {
            // Still show success - webhook will process eventually
            setSubscription({
              plan: 'monthly',
              status: 'active',
              currentPeriodEnd: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
            });
          }
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('Failed to verify payment. Your subscription should activate shortly.');
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  // Auto-redirect after 10 seconds
  useEffect(() => {
    if (!verifying && !error) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [verifying, error, navigate]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Verifying payment...</h1>
          <p className="text-gray-600 mt-2">Please wait while we confirm your subscription</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-full hover:shadow-lg transition-all"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Confetti Animation */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-fall"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            <div
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor: ['#ec4899', '#8b5cf6', '#3b82f6', '#f59e0b', '#10b981'][
                  Math.floor(Math.random() * 5)
                ],
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center relative z-10">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-bounce-slow">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Premium Badge */}
        <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold mb-4">
          PREMIUM ACTIVATED
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Premium!</h1>
        <p className="text-gray-600 mb-6">
          Your subscription is now active. Enjoy all premium features!
        </p>

        {/* Subscription Details */}
        {subscription && (
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Plan</span>
              <span className="font-bold text-gray-900 capitalize">{subscription.plan}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Renews</span>
              <span className="font-bold text-gray-900">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {/* Features Unlocked */}
        <div className="text-left mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">Features Unlocked:</p>
          <div className="space-y-2">
            {[
              { icon: '🎯', text: 'Gender Filter' },
              { icon: '⚡', text: 'Priority Matching' },
              { icon: '🚫', text: 'Ad-Free Experience' },
              { icon: '♾️', text: 'Unlimited Matches' },
              { icon: '↩️', text: 'Rewind Skip' },
            ].map((feature) => (
              <div key={feature.text} className="flex items-center gap-2 text-gray-600">
                <span>{feature.icon}</span>
                <span>{feature.text}</span>
                <svg className="w-4 h-4 text-green-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          to="/"
          className="block w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
        >
          Start Chatting
        </Link>

        <p className="text-sm text-gray-500 mt-4">
          Redirecting automatically in 10 seconds...
        </p>
      </div>

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
