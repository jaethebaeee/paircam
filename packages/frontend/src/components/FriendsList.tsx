import { useState, useEffect } from 'react';
import { XMarkIcon, ChatBubbleLeftRightIcon, UserGroupIcon, MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { useAutoAnimate } from '@formkit/auto-animate/react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const TOKEN_KEY = 'paircam_access_token';

interface Friend {
  id: string;
  username: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastInteraction?: string;
}

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  lastMessagePreview?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

interface FriendsListProps {
  onClose: () => void;
  onSelectConversation: (conversationId: string, friend: Friend) => void;
  totalUnread?: number;
}

// Avatar component with gradient fallback
function Avatar({ user, size = 'md', showOnline = false, isOnline = false }: {
  user: { username: string; avatarUrl?: string };
  size?: 'sm' | 'md' | 'lg';
  showOnline?: boolean;
  isOnline?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-12 h-12 sm:w-14 sm:h-14 text-base sm:text-lg',
    lg: 'w-16 h-16 text-xl',
  };

  const onlineDotClasses = {
    sm: 'w-2.5 h-2.5 border-[1.5px]',
    md: 'w-3 h-3 sm:w-3.5 sm:h-3.5 border-2',
    lg: 'w-4 h-4 border-2',
  };

  return (
    <div className="relative">
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/20`}>
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.username}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="drop-shadow-sm">{user.username.charAt(0).toUpperCase()}</span>
        )}
      </div>
      {showOnline && isOnline && (
        <div className={`absolute bottom-0 right-0 ${onlineDotClasses[size]} bg-emerald-500 rounded-full border-white animate-pulse`} />
      )}
    </div>
  );
}

// Skeleton loader for conversations
function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full skeleton" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 skeleton rounded" />
        <div className="h-3 w-36 skeleton rounded" />
      </div>
    </div>
  );
}

export default function FriendsList({ onClose, onSelectConversation, totalUnread = 0 }: FriendsListProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'friends'>('messages');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [listParent] = useAutoAnimate();

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = getToken();

      if (activeTab === 'messages') {
        const response = await fetch(`${API_URL}/messages/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setConversations(data.conversations || []);
        }
      } else {
        const response = await fetch(`${API_URL}/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          // Friends API may return array directly or wrapped object
          setFriends(Array.isArray(data) ? data : data.friends || []);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFriendClick = async (friend: Friend) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/messages/conversation-with/${friend.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        onSelectConversation(data.conversationId, friend);
      }
    } catch (error) {
      console.error('Failed to get conversation:', error);
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scaleIn max-h-[85vh] flex flex-col">
        {/* Header with gradient */}
        <div className="relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/10 rounded-full blur-xl" />

          <div className="relative px-5 sm:px-6 py-5 sm:py-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-2xl">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-xl sm:text-2xl">Messages</h2>
                  {totalUnread > 0 && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <SparklesIcon className="h-3.5 w-3.5 text-yellow-300" />
                      <p className="text-white/90 text-sm font-medium">{totalUnread} new</p>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all duration-200 touch-target backdrop-blur-sm"
              >
                <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white/10 backdrop-blur-sm p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab('messages')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'messages'
                    ? 'bg-white text-purple-600 shadow-lg shadow-purple-500/20'
                    : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                Chats
              </button>
              <button
                onClick={() => setActiveTab('friends')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'friends'
                    ? 'bg-white text-purple-600 shadow-lg shadow-purple-500/20'
                    : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <UserGroupIcon className="h-4 w-4" />
                Friends
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'messages' ? 'Search conversations...' : 'Search friends...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 outline-none text-sm bg-white transition-all duration-200 placeholder:text-gray-400 input-mobile"
            />
          </div>
        </div>

        {/* Content */}
        <div ref={listParent} className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="divide-y divide-gray-100">
              {[1, 2, 3, 4].map((i) => (
                <ConversationSkeleton key={i} />
              ))}
            </div>
          ) : activeTab === 'messages' ? (
            filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="relative mb-6">
                  <div className="bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 rounded-3xl p-6 shadow-lg shadow-purple-500/10">
                    <ChatBubbleLeftRightIcon className="h-12 w-12 text-purple-500" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1.5 shadow-lg">
                    <SparklesIcon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">No conversations yet</h3>
                <p className="text-sm text-gray-500 text-center max-w-[200px]">
                  Start chatting with your friends to see your conversations here
                </p>
                <button
                  onClick={() => setActiveTab('friends')}
                  className="mt-6 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-purple-500/30 transform hover:scale-105 active:scale-95"
                >
                  View Friends
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conv, index) => (
                  <button
                    key={conv.id}
                    onClick={() =>
                      onSelectConversation(conv.id, {
                        id: conv.otherUser.id,
                        username: conv.otherUser.username,
                        avatarUrl: conv.otherUser.avatarUrl,
                      })
                    }
                    className="w-full flex items-center gap-3 p-4 hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-purple-50/50 transition-all duration-200 group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative">
                      <Avatar user={conv.otherUser} size="md" />
                      {conv.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 min-w-[20px] h-5 sm:min-w-[24px] sm:h-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/40 animate-bounce-subtle">
                          <span className="text-white text-[10px] sm:text-xs font-bold px-1">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-semibold text-sm sm:text-base truncate transition-colors ${
                          conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                        }`}>
                          {conv.otherUser.username}
                        </span>
                        <span className={`text-xs whitespace-nowrap ${
                          conv.unreadCount > 0 ? 'text-purple-600 font-medium' : 'text-gray-400'
                        }`}>
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      {conv.lastMessagePreview && (
                        <p className={`text-xs sm:text-sm truncate mt-0.5 transition-colors ${
                          conv.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'
                        }`}>
                          {conv.lastMessagePreview}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="relative mb-6">
                <div className="bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 rounded-3xl p-6 shadow-lg shadow-purple-500/10">
                  <UserGroupIcon className="h-12 w-12 text-purple-500" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-pink-500 rounded-full p-1.5 shadow-lg">
                  <span className="text-white text-xs">💝</span>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">No friends yet</h3>
              <p className="text-sm text-gray-500 text-center max-w-[220px]">
                Add friends while video chatting to stay connected!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredFriends.map((friend, index) => (
                <button
                  key={friend.id}
                  onClick={() => handleFriendClick(friend)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-purple-50/50 transition-all duration-200 group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Avatar user={friend} size="md" showOnline isOnline={friend.isOnline} />
                  <div className="flex-1 text-left min-w-0">
                    <span className="font-semibold text-gray-700 group-hover:text-gray-900 text-sm sm:text-base block truncate transition-colors">
                      {friend.username}
                    </span>
                    <span className={`text-xs ${friend.isOnline ? 'text-emerald-500 font-medium' : 'text-gray-400'}`}>
                      {friend.isOnline ? 'Online now' : formatTime(friend.lastInteraction) || 'Offline'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-gray-100 group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-purple-600 transition-all duration-200">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
