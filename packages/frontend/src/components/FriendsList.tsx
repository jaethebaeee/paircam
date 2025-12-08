import { useState, useEffect } from 'react';
import { XMarkIcon, ChatBubbleLeftRightIcon, UserGroupIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
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
          setConversations(data);
        }
      } else {
        const response = await fetch(`${API_URL}/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setFriends(data);
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
        const conversation = await response.json();
        onSelectConversation(conversation.id, friend);
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
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slideUp max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <ChatBubbleLeftRightIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg sm:text-xl">Messages</h2>
                {totalUnread > 0 && (
                  <p className="text-white/80 text-xs sm:text-sm">{totalUnread} unread</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/90 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all touch-target"
            >
              <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 py-2 px-4 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'messages'
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Messages
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-2 px-4 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'friends'
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Friends
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 sm:p-4 border-b border-gray-100">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'messages' ? 'Search conversations...' : 'Search friends...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-11 pr-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 focus:border-pink-500 focus:ring-0 outline-none text-sm bg-gray-50 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Content */}
        <div ref={listParent} className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent" />
            </div>
          ) : activeTab === 'messages' ? (
            filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-pink-500" />
                </div>
                <p className="font-semibold text-gray-700 mb-1">No conversations yet</p>
                <p className="text-sm text-gray-500">Start chatting with your friends!</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() =>
                    onSelectConversation(conv.id, {
                      id: conv.otherUser.id,
                      username: conv.otherUser.username,
                      avatarUrl: conv.otherUser.avatarUrl,
                    })
                  }
                  className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="relative">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {conv.otherUser.avatarUrl ? (
                        <img
                          src={conv.otherUser.avatarUrl}
                          alt={conv.otherUser.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        conv.otherUser.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[10px] sm:text-xs font-bold">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                        {conv.otherUser.username}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    {conv.lastMessagePreview && (
                      <p
                        className={`text-xs sm:text-sm truncate mt-0.5 ${
                          conv.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                        }`}
                      >
                        {conv.lastMessagePreview}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                <UserGroupIcon className="h-8 w-8 text-pink-500" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">No friends yet</p>
              <p className="text-sm text-gray-500">Add friends while video chatting!</p>
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => handleFriendClick(friend)}
                className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
              >
                <div className="relative">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                    {friend.avatarUrl ? (
                      <img
                        src={friend.avatarUrl}
                        alt={friend.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      friend.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  {friend.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="font-semibold text-gray-900 text-sm sm:text-base block truncate">
                    {friend.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {friend.isOnline ? 'Online' : formatTime(friend.lastInteraction)}
                  </span>
                </div>
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
