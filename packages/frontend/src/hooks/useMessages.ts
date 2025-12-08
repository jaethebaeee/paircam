import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const TOKEN_KEY = 'paircam_access_token';

export interface Message {
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

export interface Conversation {
  id: string;
  otherUser: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  lastMessagePreview?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  unreadCount: number;
}

export interface UseMessagesReturn {
  conversations: Conversation[];
  messages: Message[];
  totalUnread: number;
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (recipientId: string, content: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  getOrCreateConversation: (userId: string) => Promise<string>;
}

export function useMessages(): UseMessagesReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTypingState] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  // Initialize socket connection
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(`${API_URL}/messages`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Messages socket connected');
    });

    socket.on('message-received', (message: Message) => {
      // Add to messages if in current conversation
      if (message.conversationId === currentConversationIdRef.current) {
        setMessages((prev) => [...prev, message]);
      }

      // Update conversation preview
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === message.conversationId
            ? {
                ...conv,
                lastMessagePreview:
                  message.content.length > 100
                    ? message.content.substring(0, 100) + '...'
                    : message.content,
                lastMessageAt: message.createdAt,
                lastMessageSenderId: message.senderId,
                unreadCount:
                  message.conversationId === currentConversationIdRef.current
                    ? conv.unreadCount
                    : conv.unreadCount + 1,
              }
            : conv
        )
      );
    });

    socket.on('typing-indicator', ({ conversationId, isTyping }) => {
      if (conversationId === currentConversationIdRef.current) {
        setIsTypingState(isTyping);
      }
    });

    socket.on('messages-read', ({ conversationId }) => {
      if (conversationId === currentConversationIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) => ({ ...msg, status: 'read' as const }))
        );
      }
    });

    socket.on('unread-count', ({ count }) => {
      setTotalUnread(count);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  // API request helper
  const apiRequest = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const token = getToken();
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Request failed: ${response.statusText}`);
      }

      return response.json();
    },
    []
  );

  // Load all conversations
  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiRequest('/messages/conversations');
      setConversations(data.conversations || []);

      // Also load unread count
      const unreadData = await apiRequest('/messages/unread-count');
      setTotalUnread(unreadData.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  // Load messages for a conversation
  const loadMessages = useCallback(
    async (conversationId: string) => {
      try {
        setIsLoading(true);
        setError(null);
        currentConversationIdRef.current = conversationId;

        const data = await apiRequest(`/messages/conversations/${conversationId}`);
        setMessages(data.messages || []);

        // Mark as read
        await apiRequest(`/messages/conversations/${conversationId}/read`, {
          method: 'POST',
        });

        // Update unread count in conversations list
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    },
    [apiRequest]
  );

  // Send a message
  const sendMessage = useCallback(
    async (recipientId: string, content: string) => {
      try {
        setError(null);

        // Send via socket for real-time delivery
        if (socketRef.current) {
          socketRef.current.emit('message-send', { recipientId, content });
        }

        // Also send via REST API for reliability
        const data = await apiRequest('/messages', {
          method: 'POST',
          body: JSON.stringify({ recipientId, content }),
        });

        // Add to local messages
        setMessages((prev) => [...prev, data.message]);

        // Update conversation
        setConversations((prev) => {
          const existing = prev.find((c) => c.id === data.conversation.id);
          if (existing) {
            return prev.map((c) =>
              c.id === data.conversation.id
                ? {
                    ...c,
                    lastMessagePreview:
                      content.length > 100 ? content.substring(0, 100) + '...' : content,
                    lastMessageAt: data.message.createdAt,
                    lastMessageSenderId: data.message.senderId,
                  }
                : c
            );
          }
          return prev;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        throw err;
      }
    },
    [apiRequest]
  );

  // Mark conversation as read
  const markAsRead = useCallback(
    async (conversationId: string) => {
      try {
        await apiRequest(`/messages/conversations/${conversationId}/read`, {
          method: 'POST',
        });

        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
          )
        );
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    },
    [apiRequest]
  );

  // Set typing indicator
  const setTyping = useCallback((conversationId: string, typing: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit(typing ? 'typing-start' : 'typing-stop', {
        conversationId,
      });
    }
  }, []);

  // Get or create conversation with a user
  const getOrCreateConversation = useCallback(
    async (userId: string): Promise<string> => {
      const data = await apiRequest(`/messages/conversation-with/${userId}`);
      return data.id;
    },
    [apiRequest]
  );

  return {
    conversations,
    messages,
    totalUnread,
    isLoading,
    error,
    isTyping,
    loadConversations,
    loadMessages,
    sendMessage,
    markAsRead,
    setTyping,
    getOrCreateConversation,
  };
}
