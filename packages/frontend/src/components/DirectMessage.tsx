import { useState, useEffect, useRef, useCallback } from 'react';
import { XMarkIcon, PaperAirplaneIcon, ArrowLeftIcon, CheckIcon, FaceSmileIcon } from '@heroicons/react/24/solid';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const TOKEN_KEY = 'paircam_access_token';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  sender?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

interface Friend {
  id: string;
  username: string;
  avatarUrl?: string;
}

interface DirectMessageProps {
  conversationId: string;
  friend: Friend;
  currentUserId: string;
  onClose: () => void;
  onBack: () => void;
}

// Avatar component
function Avatar({ user, size = 'md' }: { user: { username: string; avatarUrl?: string }; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 sm:w-12 sm:h-12 text-sm sm:text-base',
    lg: 'w-14 h-14 text-lg',
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/20`}>
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.username} className="w-full h-full rounded-full object-cover" />
      ) : (
        <span className="drop-shadow-sm">{user.username.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

// Typing indicator animation
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-white rounded-2xl rounded-bl-md border border-gray-200 shadow-sm w-fit">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// Message skeleton loader
function MessageSkeleton({ isMine }: { isMine: boolean }) {
  return (
    <div className={`flex mb-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] px-4 py-3 rounded-2xl ${isMine ? 'bg-gray-200' : 'bg-gray-100'}`}>
        <div className="h-4 w-32 skeleton rounded" />
      </div>
    </div>
  );
}

// Quick reply suggestions
const QUICK_REPLIES = ['Hey! 👋', 'How are you?', "What's up?", '😊'];

export default function DirectMessage({
  conversationId,
  friend,
  currentUserId,
  onClose,
  onBack,
}: DirectMessageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [messagesParent] = useAutoAnimate();

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 50);
  }, []);

  // Initialize socket and load messages
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(`${API_URL}/messages`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('DM socket connected');
    });

    socket.on('message-received', (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      }
    });

    socket.on('typing-indicator', ({ conversationId: convId, isTyping: typing }) => {
      if (convId === conversationId) {
        setIsTyping(typing);
      }
    });

    socket.on('messages-read', ({ conversationId: convId }) => {
      if (convId === conversationId) {
        setMessages((prev) =>
          prev.map((msg) => ({ ...msg, status: 'read' as const }))
        );
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [conversationId, scrollToBottom]);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const token = getToken();
        const response = await fetch(`${API_URL}/messages/conversations/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(data);
          setShowQuickReplies(data.length === 0);

          // Mark as read
          await fetch(`${API_URL}/messages/conversations/${conversationId}/read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setIsLoading(false);
        scrollToBottom('instant');
      }
    };

    loadMessages();
  }, [conversationId, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleSend = async (content?: string) => {
    const messageContent = content || newMessage.trim();
    if (!messageContent || isSending) return;

    setNewMessage('');
    setShowQuickReplies(false);
    setIsSending(true);

    // Optimistically add message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: currentUserId,
      recipientId: friend.id,
      content: messageContent,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      const token = getToken();

      // Send via socket
      if (socketRef.current) {
        socketRef.current.emit('message-send', { recipientId: friend.id, content: messageContent });
      }

      // Send via REST
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientId: friend.id, content: messageContent }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) =>
          prev.map((msg) => (msg.id === optimisticMessage.id ? data.message : msg))
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleTyping = () => {
    if (socketRef.current) {
      socketRef.current.emit('typing-start', { conversationId });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('typing-stop', { conversationId });
        }
      }, 2000);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = '';
  messages.forEach((message) => {
    const msgDate = formatDate(message.createdAt);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [message] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scaleIn h-[85vh] flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600" />
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-white/10 rounded-full blur-xl" />

          <div className="relative px-4 sm:px-5 py-4 flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all duration-200 touch-target backdrop-blur-sm"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar user={friend} size="md" />
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-bold text-base sm:text-lg truncate">{friend.username}</h3>
                <div className="flex items-center gap-1.5">
                  {isTyping ? (
                    <p className="text-white/80 text-xs sm:text-sm flex items-center gap-1">
                      <span className="inline-flex gap-0.5">
                        <span className="w-1 h-1 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-1 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                        <span className="w-1 h-1 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                      </span>
                      typing
                    </p>
                  ) : (
                    <p className="text-white/70 text-xs sm:text-sm">Tap to view profile</p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all duration-200 touch-target backdrop-blur-sm"
            >
              <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesParent} className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white custom-scrollbar">
          {isLoading ? (
            <div className="space-y-3">
              <MessageSkeleton isMine={false} />
              <MessageSkeleton isMine={true} />
              <MessageSkeleton isMine={false} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 flex items-center justify-center shadow-xl shadow-purple-500/30">
                  <span className="text-3xl">👋</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-xs">✨</span>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Say hello to {friend.username}!</h3>
              <p className="text-sm text-gray-500 max-w-[220px]">
                Start the conversation with a friendly message
              </p>
            </div>
          ) : (
            <>
              {groupedMessages.map((group, groupIdx) => (
                <div key={`group-${groupIdx}`}>
                  {/* Date separator */}
                  <div className="flex items-center justify-center my-6">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <div className="bg-white text-gray-500 text-xs font-medium px-4 py-1.5 rounded-full border border-gray-200 shadow-sm mx-4">
                      {group.date}
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                  </div>

                  {/* Messages */}
                  {group.messages.map((message, msgIdx) => {
                    const isMine = message.senderId === currentUserId;
                    const showAvatar = !isMine && (msgIdx === 0 || group.messages[msgIdx - 1]?.senderId === currentUserId);
                    const isLastInGroup = msgIdx === group.messages.length - 1 || group.messages[msgIdx + 1]?.senderId !== message.senderId;

                    return (
                      <div
                        key={message.id}
                        className={`flex mb-1 ${isMine ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-3' : ''}`}
                      >
                        {!isMine && (
                          <div className="w-8 mr-2 flex-shrink-0">
                            {showAvatar && <Avatar user={friend} size="sm" />}
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] px-4 py-2.5 shadow-sm transition-all duration-200 ${
                            isMine
                              ? `bg-gradient-to-br from-pink-500 to-purple-600 text-white ${isLastInGroup ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'}`
                              : `bg-white text-gray-800 border border-gray-100 ${isLastInGroup ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'}`
                          }`}
                        >
                          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
                          {isLastInGroup && (
                            <div className={`flex items-center justify-end gap-1.5 mt-1.5 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                              <span className="text-[10px]">{formatTime(message.createdAt)}</span>
                              {isMine && (
                                <div className="flex -space-x-1">
                                  <CheckIcon className={`h-3 w-3 ${message.status === 'read' ? 'text-white' : 'text-white/50'}`} />
                                  {message.status === 'read' && <CheckIcon className="h-3 w-3 text-white" />}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex mb-3 justify-start">
                  <div className="w-8 mr-2 flex-shrink-0">
                    <Avatar user={friend} size="sm" />
                  </div>
                  <TypingIndicator />
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Quick Replies */}
        {showQuickReplies && messages.length === 0 && !isLoading && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  onClick={() => handleSend(reply)}
                  className="px-4 py-2 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 text-purple-700 text-sm font-medium rounded-full border border-purple-200 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-100 safe-area-inset-bottom">
          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-xl text-gray-400 hover:text-purple-500 hover:bg-purple-50 transition-all duration-200 touch-target">
              <FaceSmileIcon className="h-6 w-6" />
            </button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 outline-none text-sm bg-gray-50 focus:bg-white transition-all duration-200 placeholder:text-gray-400 input-mobile pr-12"
              />
            </div>

            <button
              onClick={() => handleSend()}
              disabled={!newMessage.trim() || isSending}
              className="p-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transform hover:scale-105 active:scale-95 disabled:transform-none touch-target"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <PaperAirplaneIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
