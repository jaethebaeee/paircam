import { useState } from 'react';
import { toast } from 'sonner';
import GoogleLoginButton from './GoogleLoginButton';
import { useGoogleAccount } from '../hooks/useGoogleAccount';

interface AccountModalProps {
  onClose: () => void;
}

export default function AccountModal({ onClose }: AccountModalProps) {
  const { linkedAccount, isLoading, unlinkGoogle } = useGoogleAccount();
  const [isUnlinking, setIsUnlinking] = useState(false);

  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink your Google account?')) return;

    setIsUnlinking(true);
    try {
      await unlinkGoogle();
      toast.success('Google account unlinked');
    } catch {
      toast.error('Failed to unlink account');
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Account</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        ) : (
          <>
            {/* Why link account */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <span className="text-xl">🔐</span>
                Why link your account?
              </h3>
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Keep your coins safe across devices
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Restore progress if you clear browser data
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Same account on phone & desktop
                </li>
              </ul>
            </div>

            {/* Linked Accounts */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800">Linked Accounts</h3>

              {/* Google */}
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Google</p>
                      {linkedAccount?.google ? (
                        <p className="text-sm text-gray-500">{linkedAccount.email}</p>
                      ) : (
                        <p className="text-sm text-gray-400">Not connected</p>
                      )}
                    </div>
                  </div>

                  {linkedAccount?.google ? (
                    <button
                      onClick={handleUnlink}
                      disabled={isUnlinking}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isUnlinking ? 'Unlinking...' : 'Unlink'}
                    </button>
                  ) : (
                    <GoogleLoginButton variant="compact" />
                  )}
                </div>
              </div>
            </div>

            {/* Privacy note */}
            <p className="text-xs text-gray-400 text-center mt-6">
              We only use your email to link your account. We never post anything or access your contacts.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
