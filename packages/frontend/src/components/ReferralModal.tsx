import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useReferral } from '../hooks/useReferral';
import { useReferralCode } from '../hooks/useReferralCode';

interface ReferralModalProps {
  onClose: () => void;
  onSkip: () => void;
}

export default function ReferralModal({ onClose, onSkip }: ReferralModalProps) {
  const { applyReferralCode, validateReferralCode } = useReferral();
  const { pendingReferralCode, markCodeAsApplied, clearPendingCode } = useReferralCode();

  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState('');

  // Pre-fill with pending referral code from URL
  useEffect(() => {
    if (pendingReferralCode) {
      setCode(pendingReferralCode);
      // Auto-validate the code
      handleValidate(pendingReferralCode);
    }
  }, [pendingReferralCode]);

  const handleValidate = async (codeToValidate: string) => {
    if (!codeToValidate || codeToValidate.length < 6) {
      setIsValid(null);
      setValidationMessage('');
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateReferralCode(codeToValidate);
      setIsValid(result.valid);
      setValidationMessage(result.message);
    } catch (err) {
      setIsValid(false);
      setValidationMessage('Failed to validate code');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCodeChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCode(upperValue);
    setIsValid(null);
    setValidationMessage('');

    // Debounced validation
    if (upperValue.length >= 6) {
      const timeout = setTimeout(() => handleValidate(upperValue), 500);
      return () => clearTimeout(timeout);
    }
  };

  const handleApply = async () => {
    if (!code || code.length < 6) {
      toast.error('Please enter a valid referral code');
      return;
    }

    setIsApplying(true);
    try {
      const result = await applyReferralCode(code);
      markCodeAsApplied();
      toast.success(result.message, {
        description: `You earned ${result.coinsAwarded} bonus coins!`,
        duration: 5000,
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply code');
    } finally {
      setIsApplying(false);
    }
  };

  const handleSkip = () => {
    clearPendingCode();
    onSkip();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scaleIn">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Got a Referral Code?
          </h2>
          <p className="text-gray-600 text-sm">
            Enter a friend's code to get <span className="font-bold text-green-600">150 bonus coins</span>!
          </p>
        </div>

        {/* Referral Code Input */}
        <div className="mb-6">
          <label htmlFor="referral-code" className="block text-sm font-medium text-gray-700 mb-2">
            Referral Code
          </label>
          <div className="relative">
            <input
              id="referral-code"
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="e.g., PAIRAB1234"
              className={`w-full px-4 py-3 border-2 rounded-xl text-center text-lg font-bold tracking-wider uppercase transition-colors ${
                isValid === true
                  ? 'border-green-400 bg-green-50 focus:ring-green-500'
                  : isValid === false
                    ? 'border-red-400 bg-red-50 focus:ring-red-500'
                    : 'border-gray-300 focus:border-pink-500 focus:ring-pink-500'
              } focus:ring-2 focus:outline-none`}
              maxLength={20}
              autoComplete="off"
            />

            {/* Validation indicator */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValidating ? (
                <div className="animate-spin h-5 w-5 border-2 border-pink-500 border-t-transparent rounded-full" />
              ) : isValid === true ? (
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : isValid === false ? (
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : null}
            </div>
          </div>

          {/* Validation message */}
          {validationMessage && (
            <p className={`text-sm mt-2 ${isValid ? 'text-green-600' : 'text-red-600'}`}>
              {validationMessage}
            </p>
          )}
        </div>

        {/* Benefits */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-2 text-sm">What you'll get:</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-gray-700">
              <span className="text-yellow-500">coins</span>
              <span><strong>150 coins</strong> welcome bonus</span>
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="text-pink-500">heart</span>
              <span>Your friend gets bonus coins too!</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleApply}
            disabled={!isValid || isApplying}
            className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-700 hover:to-purple-700 shadow-lg shadow-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isApplying ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Applying...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                Claim My Bonus
              </>
            )}
          </button>

          <button
            onClick={handleSkip}
            className="w-full px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-all"
          >
            Skip for now
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-500 mt-4">
          Don't have a code? You can always add one later in{' '}
          <a href="/referrals" className="text-pink-600 hover:underline font-medium">
            Referrals
          </a>
        </p>
      </div>
    </div>
  );
}
