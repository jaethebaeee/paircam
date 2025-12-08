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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 p-6 text-center text-white relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <span>⭐</span>
            <span>PREMIUM</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">
            Upgrade Your Experience
          </h2>
          <p className="text-white/80 text-sm">
            Match faster, chat better
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Price highlight */}
          <div className="text-center mb-5">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-4xl font-bold text-gray-900">$9.99</span>
              <span className="text-gray-500">/month</span>
            </div>
          </div>

          {/* Features list */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🎯</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Gender Filter</p>
                <p className="text-xs text-gray-500">Match who you want</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">⚡</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Priority Matching</p>
                <p className="text-xs text-gray-500">Skip the queue, connect instantly</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🚫</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Ad-Free</p>
                <p className="text-xs text-gray-500">Zero interruptions</p>
              </div>
            </div>
          </div>

          {/* Stripe Buy Button */}
          <div className="flex justify-center">
            {/* @ts-expect-error Stripe Buy Button is a web component */}
            <stripe-buy-button
              buy-button-id="buy_btn_1Sc8UsQ77jsomY7koQXdwZSM"
              publishable-key="pk_live_51SbtK5Q77jsomY7k84jtpZxsb8MOMeZenCKMoQjYqovKqBQ6Uwl25lDG22AzTsL9MPbrGUCDeznUhdYRxUvzBKnC00EQ2nLitg"
              client-reference-id={deviceId}
            />
          </div>

          {/* Trust */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Cancel anytime · Secure payment via Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
