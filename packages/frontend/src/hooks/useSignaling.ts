import { useCallback, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export interface MatchData {
  peerId: string;
  sessionId: string;
  timestamp: number;
}

export interface QueueStatus {
  position: number;
  timestamp: number;
}

export interface UseSignalingReturn {
  socket: Socket | null;
  connected: boolean;
  matched: MatchData | null;
  queueStatus: QueueStatus | null;
  error: string | null;
  joinQueue: (
    region?: string,
    language?: string,
    gender?: string,
    genderPreference?: string,
    interests?: string[],
    queueType?: 'casual' | 'serious' | 'language' | 'gaming',
    nativeLanguage?: string,
    learningLanguage?: string
  ) => void;
  leaveQueue: () => void;
  sendOffer: (sessionId: string, offer: RTCSessionDescriptionInit) => void;
  sendAnswer: (sessionId: string, answer: RTCSessionDescriptionInit) => void;
  sendCandidate: (sessionId: string, candidate: RTCIceCandidateInit) => void;
  sendMessage: (sessionId: string, message: string, sender?: string) => void;
  sendReaction: (sessionId: string, emoji: string) => void;
  endCall: (sessionId: string, wasSkipped?: boolean) => void;
}

interface UseSignalingOptions {
  accessToken: string | null;
  onOffer?: (data: { sessionId: string; offer: RTCSessionDescriptionInit; from: string }) => void;
  onAnswer?: (data: { sessionId: string; answer: RTCSessionDescriptionInit; from: string }) => void;
  onCandidate?: (data: { sessionId: string; candidate: RTCIceCandidateInit; from: string }) => void;
  onMessage?: (data: { sessionId: string; message: string; from: string; timestamp: number; sender?: string }) => void;
  onReaction?: (data: { sessionId: string; emoji: string; from: string; timestamp: number }) => void;
  onPeerDisconnected?: (data: { sessionId: string }) => void;
  onCallEnded?: (data: { sessionId: string }) => void;
}

export function useSignaling(options: UseSignalingOptions): UseSignalingReturn {
  const { accessToken } = options;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [matched, setMatched] = useState<MatchData | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use refs for callbacks to avoid recreating socket
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  useEffect(() => {
    // Don't connect without token
    if (!accessToken) {
      return;
    }

    // Create socket connection with /signaling namespace and JWT auth
    const newSocket = io(`${API_URL}/signaling`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: { token: `Bearer ${accessToken}` },
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      // Provide user-friendly error messages
      let message = 'Connection error. Please try again.';
      if (err.message.includes('timeout')) {
        message = 'Connection timed out. Check your internet connection.';
      } else if (err.message.includes('unauthorized') || err.message.includes('401')) {
        message = 'Authentication failed. Please refresh the page.';
      } else if (err.message.includes('xhr poll error')) {
        message = 'Unable to reach server. Check your internet connection.';
      }
      setError(message);
      setConnected(false);
    });

    // Handle reconnection attempts
    newSocket.on('reconnect_attempt', (attemptNumber) => {
      setError(`Reconnecting... (attempt ${attemptNumber}/5)`);
    });

    newSocket.on('reconnect_failed', () => {
      setError('Failed to reconnect. Please refresh the page.');
    });

    newSocket.on('reconnect', () => {
      setError(null);
    });

    // Connection confirmed
    newSocket.on('connected', (data: { deviceId: string; timestamp: number }) => {
      console.log('Connection confirmed by server:', data);
    });

    // Queue events
    newSocket.on('queue-joined', (data: QueueStatus) => {
      console.log('Joined queue:', data);
      setQueueStatus(data);
    });

    newSocket.on('queue-update', (data: { position: number; estimatedWaitTime: number }) => {
      console.log('Queue position updated:', data);
      setQueueStatus(prev => ({
        ...prev,
        position: data.position,
        timestamp: Date.now(),
      } as QueueStatus));
    });

    newSocket.on('queue-left', (data: { timestamp: number }) => {
      console.log('Left queue:', data);
      setQueueStatus(null);
    });

    // Match found
    newSocket.on('matched', (data: MatchData) => {
      console.log('Matched with peer:', data);
      setMatched(data);
      setQueueStatus(null);
      setError(null);
    });

    // WebRTC signaling events
    newSocket.on('offer', (data: { sessionId: string; offer: RTCSessionDescriptionInit; from: string }) => {
      console.log('Received offer:', data);
      callbacksRef.current.onOffer?.(data);
    });

    newSocket.on('answer', (data: { sessionId: string; answer: RTCSessionDescriptionInit; from: string }) => {
      console.log('Received answer:', data);
      callbacksRef.current.onAnswer?.(data);
    });

    newSocket.on('candidate', (data: { sessionId: string; candidate: RTCIceCandidateInit; from: string }) => {
      console.log('Received ICE candidate:', data);
      callbacksRef.current.onCandidate?.(data);
    });

    // Communication events
    newSocket.on('message', (data: { sessionId: string; message: string; from: string; timestamp: number }) => {
      console.log('Received message:', data);
      callbacksRef.current.onMessage?.(data);
    });

    newSocket.on('reaction', (data: { sessionId: string; emoji: string; from: string; timestamp: number }) => {
      console.log('Received reaction:', data);
      callbacksRef.current.onReaction?.(data);
    });

    // Call end events
    newSocket.on('peer-disconnected', (data: { sessionId: string }) => {
      console.log('Peer disconnected:', data);
      setMatched(null);
      callbacksRef.current.onPeerDisconnected?.(data);
    });

    newSocket.on('call-ended', (data: { sessionId: string }) => {
      console.log('Call ended:', data);
      setMatched(null);
      callbacksRef.current.onCallEnded?.(data);
    });

    // Error event
    newSocket.on('error', (err: unknown) => {
      console.error('Socket error:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Socket error';
      setError(message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [accessToken]);

  // Join matchmaking queue
  const joinQueue = useCallback(
    (
      region: string = 'global',
      language: string = 'en',
      gender?: string,
      genderPreference?: string,
      interests?: string[],
      queueType?: 'casual' | 'serious' | 'language' | 'gaming',
      nativeLanguage?: string,
      learningLanguage?: string
    ) => {
      if (socket?.connected) {
        console.log('Joining queue:', { region, language, gender, genderPreference, interests, queueType, nativeLanguage, learningLanguage });
        socket.emit('join-queue', {
          region,
          language,
          gender,
          genderPreference,
          interests, // 🆕
          queueType, // 🆕
          nativeLanguage, // 🆕
          learningLanguage, // 🆕
        });
      } else {
        console.warn('Cannot join queue: socket not connected');
      }
    },
    [socket]
  );

  // Leave matchmaking queue
  const leaveQueue = useCallback(() => {
    if (socket?.connected) {
      console.log('Leaving queue');
      socket.emit('leave-queue');
      setQueueStatus(null);
    }
  }, [socket]);

  // Send WebRTC offer
  const sendOffer = useCallback(
    (sessionId: string, offer: RTCSessionDescriptionInit) => {
      if (socket?.connected) {
        console.log('Sending offer for session:', sessionId);
        socket.emit('send-offer', {
          sessionId,
          type: 'offer',
          data: offer,
        });
      } else {
        console.warn('Cannot send offer: socket not connected');
      }
    },
    [socket]
  );

  // Send WebRTC answer
  const sendAnswer = useCallback(
    (sessionId: string, answer: RTCSessionDescriptionInit) => {
      if (socket?.connected) {
        console.log('Sending answer for session:', sessionId);
        socket.emit('send-answer', {
          sessionId,
          type: 'answer',
          data: answer,
        });
      } else {
        console.warn('Cannot send answer: socket not connected');
      }
    },
    [socket]
  );

  // Send ICE candidate
  const sendCandidate = useCallback(
    (sessionId: string, candidate: RTCIceCandidateInit) => {
      if (socket?.connected) {
        socket.emit('send-candidate', {
          sessionId,
          type: 'candidate',
          data: candidate,
        });
      }
    },
    [socket]
  );

  // Send text message
  const sendMessage = useCallback(
    (sessionId: string, message: string, sender?: string) => {
      if (socket?.connected) {
        console.log('Sending message for session:', sessionId);
        socket.emit('send-message', {
          sessionId,
          message,
          sender,
          timestamp: Date.now(),
        });
      } else {
        console.warn('Cannot send message: socket not connected');
      }
    },
    [socket]
  );

  // Send reaction
  const sendReaction = useCallback(
    (sessionId: string, emoji: string) => {
      if (socket?.connected) {
        console.log('Sending reaction for session:', sessionId);
        socket.emit('send-reaction', {
          sessionId,
          emoji,
          timestamp: Date.now(),
        });
      }
    },
    [socket]
  );

  // End call
  const endCall = useCallback(
    (sessionId: string, wasSkipped: boolean = false) => {
      if (socket?.connected) {
        console.log('Ending call for session:', sessionId, { wasSkipped });
        socket.emit('end-call', { sessionId, wasSkipped }); // 🆕 Send skip status
        setMatched(null);
        setQueueStatus(null);
      }
    },
    [socket]
  );

  return {
    socket,
    connected,
    matched,
    queueStatus,
    error,
    joinQueue,
    leaveQueue,
    sendOffer,
    sendAnswer,
    sendCandidate,
    sendMessage,
    sendReaction,
    endCall,
  };
}

