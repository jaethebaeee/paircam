import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeftIcon, NoSymbolIcon, TrashIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../hooks/useAuth';
import { getBlockedUsers, unblockUser, BlockedUserInfo } from '../api/blocking';
import LoadingSpinner from './LoadingSpinner';

export default function BlockedUsersPage() {
  const navigate = useNavigate();
  const { accessToken, authenticate } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  useEffect(() => {
    if (accessToken) {
      loadBlockedUsers();
    }
  }, [accessToken]);

  const loadBlockedUsers = async () => {
    if (!accessToken) return;

    try {
      setIsLoading(true);
      const data = await getBlockedUsers(accessToken);
      setBlockedUsers(data.blocked);
    } catch (error) {
      console.error('Failed to load blocked users:', error);
      toast.error('Failed to load blocked users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    if (!accessToken) return;

    try {
      setUnblockingId(blockedId);
      await unblockUser(accessToken, blockedId);
      setBlockedUsers((prev) => prev.filter((user) => user.blockedId !== blockedId));
      toast.success('User unblocked successfully');
    } catch (error) {
      console.error('Failed to unblock user:', error);
      toast.error('Failed to unblock user');
    } finally {
      setUnblockingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getReasonLabel = (reason?: string) => {
    const labels: Record<string, string> = {
      harassment: 'Harassment or Bullying',
      inappropriate: 'Inappropriate Behavior',
      spam: 'Spam or Advertising',
      offensive: 'Offensive Content',
      uncomfortable: 'Made Me Uncomfortable',
      other: 'Other',
    };
    return reason ? labels[reason] || reason : 'No reason provided';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Blocked Users</h1>
            <p className="text-gray-500 text-sm">
              {blockedUsers.length} {blockedUsers.length === 1 ? 'user' : 'users'} blocked
            </p>
          </div>
        </div>

        {/* Content */}
        {blockedUsers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <NoSymbolIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No blocked users</h2>
            <p className="text-gray-500">
              You haven't blocked anyone yet. Blocked users won't be able to match with you.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="divide-y divide-gray-100">
              {blockedUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                      <NoSymbolIcon className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {user.blockedUsername || `User ${user.blockedId.slice(0, 8)}...`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getReasonLabel(user.reason)} - {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(user.blockedId)}
                    disabled={unblockingId === user.blockedId}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {unblockingId === user.blockedId ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Unblocking...
                      </>
                    ) : (
                      <>
                        <TrashIcon className="h-4 w-4" />
                        Unblock
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 mb-1">About Blocking</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>- Blocked users cannot be matched with you</li>
            <li>- They won't know they've been blocked</li>
            <li>- You can unblock them at any time</li>
            <li>- Blocking is mutual - they can't see you either</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
