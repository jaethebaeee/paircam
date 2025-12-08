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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-5 sm:p-6 animate-slideUp sm:animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Account</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors -mr-2"
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
            {/* Why link - compact */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-3 mb-4">
              <p className="text-sm text-gray-700 flex items-center gap-2">
                <span>🔐</span>
                <span>Link to save coins across devices</span>
              </p>
            </div>

            {/* Google */}
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm sm:text-base">Google</p>
                    {linkedAccount?.google ? (
                      <p className="text-xs sm:text-sm text-gray-500 truncate">{linkedAccount.email}</p>
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-400">Not connected</p>
                    )}
                  </div>
                </div>

                {linkedAccount?.google ? (
                  <button
                    onClick={handleUnlink}
                    disabled={isUnlinking}
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {isUnlinking ? '...' : 'Unlink'}
                  </button>
                ) : (
                  <GoogleLoginButton variant="compact" />
                )}
              </div>
            </div>

            {/* Privacy note */}
            <p className="text-xs text-gray-400 text-center mt-4">
              We never post or access your contacts
            </p>
          </>
        )}
      </div>
    </div>
  );
}
