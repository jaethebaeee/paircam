import { useEffect, useState } from 'react';

interface PremiumModalProps {
  onClose: () => void;
}

// Get or create a device ID for tracking
function getDeviceId(): string {
  let deviceId = localStorage.getItem('paircam_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('paircam_device_id', deviceId);
  }
  return deviceId;
}

export default function PremiumModal({ onClose }: PremiumModalProps) {
  const [deviceId] = useState(getDeviceId);

  // Load Stripe Buy Button script
  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://js.stripe.com/v3/buy-button.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/buy-button.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-bold mb-4">
            <span>⭐</span>
            <span>PREMIUM</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Match 3x Faster
          </h2>
          <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto">
            Priority matching, gender filters, ad-free experience
          </p>
        </div>

        {/* Features Grid - Compact */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="flex items-center gap-2 p-3 bg-pink-50 rounded-xl">
            <span className="text-lg">🎯</span>
            <span className="text-sm font-medium text-gray-800">Gender Filter</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl">
            <span className="text-lg">⚡</span>
            <span className="text-sm font-medium text-gray-800">Priority Queue</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
            <span className="text-lg">🚫</span>
            <span className="text-sm font-medium text-gray-800">No Ads</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl">
            <span className="text-lg">↩️</span>
            <span className="text-sm font-medium text-gray-800">Rewind Skip</span>
          </div>
        </div>

        {/* Stripe Buy Button */}
        <div className="flex justify-center mb-4">
          {/* @ts-expect-error Stripe Buy Button is a web component */}
          <stripe-buy-button
            buy-button-id="buy_btn_1Sc8UsQ77jsomY7koQXdwZSM"
            publishable-key="pk_live_51SbtK5Q77jsomY7k84jtpZxsb8MOMeZenCKMoQjYqovKqBQ6Uwl25lDG22AzTsL9MPbrGUCDeznUhdYRxUvzBKnC00EQ2nLitg"
            client-reference-id={deviceId}
          />
        </div>

        {/* Trust signals */}
        <p className="text-center text-xs text-gray-400">
          Cancel anytime · Secure payment via Stripe
        </p>
      </div>
    </div>
  );
}

