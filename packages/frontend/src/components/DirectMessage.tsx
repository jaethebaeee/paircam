import { useState, useEffect, useRef, useCallback } from 'react';
import { XMarkIcon, PaperAirplaneIcon, ArrowLeftIcon, CheckIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [messagesParent] = useAutoAnimate();

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Initialize socket and load messages
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Connect to messages namespace
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
        setTimeout(scrollToBottom, 100);
      }
    };

    loadMessages();
  }, [conversationId, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    // Optimistically add message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: currentUserId,
      recipientId: friend.id,
      content,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      const token = getToken();

      // Send via socket
      if (socketRef.current) {
        socketRef.current.emit('message-send', { recipientId: friend.id, content });
      }

      // Send via REST
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientId: friend.id, content }),
      });

      if (response.ok) {
        const data = await response.json();
        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((msg) => (msg.id === optimisticMessage.id ? data.message : msg))
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = () => {
    if (socketRef.current) {
      socketRef.current.emit('typing-start', { conversationId });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing
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

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slideUp h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-white/90 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all touch-target"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shrink-0">
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
            <div className="min-w-0">
              <h3 className="text-white font-bold text-base sm:text-lg truncate">{friend.username}</h3>
              {isTyping && (
                <p className="text-white/80 text-xs sm:text-sm animate-pulse">typing...</p>
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

        {/* Messages */}
        <div ref={messagesParent} className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50/50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-full p-4 w-16 h-16 mb-4">
                <span className="text-3xl block mt-0.5">👋</span>
              </div>
              <p className="font-semibold text-gray-700 mb-1">Start a conversation</p>
              <p className="text-sm text-gray-500">Send a message to {friend.username}!</p>
            </div>
          ) : (
            <>
              {groupedMessages.map((group, groupIdx) => (
                <div key={`group-${groupIdx}`}>
                  {/* Date separator */}
                  <div className="flex items-center justify-center my-4">
                    <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {group.date}
                    </div>
                  </div>

                  {/* Messages */}
                  {group.messages.map((message) => {
                    const isMine = message.senderId === currentUserId;
                    return (
                      <div
                        key={message.id}
                        className={`flex mb-2 sm:mb-3 ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-sm ${
                            isMine
                              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-md'
                              : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                          }`}
                        >
                          <p className="text-sm leading-relaxed break-words">{message.content}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 ${
                              isMine ? 'text-white/70' : 'text-gray-400'
                            }`}
                          >
                            <span className="text-[10px] sm:text-xs">{formatTime(message.createdAt)}</span>
                            {isMine && (
                              message.status === 'read' ? (
                                <CheckCircleIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                              ) : (
                                <CheckIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 bg-white border-t border-gray-200 safe-area-inset-bottom">
          <div className="flex items-center gap-2">
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
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border-2 border-gray-200 focus:border-pink-500 focus:ring-0 outline-none text-sm sm:text-base bg-gray-50 focus:bg-white transition-all placeholder:text-gray-400 input-mobile"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
              className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transform hover:scale-105 active:scale-95 disabled:transform-none touch-target"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent" />
              ) : (
                <PaperAirplaneIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
