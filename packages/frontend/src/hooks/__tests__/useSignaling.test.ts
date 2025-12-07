import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSignaling } from '../useSignaling';
import { MockSocket } from '../../test/mocks/socket';

// Store the mock socket instance for testing
let mockSocketInstance: MockSocket;

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    mockSocketInstance = new MockSocket();
    return mockSocketInstance;
  }),
}));

describe('useSignaling', () => {
  const defaultOptions = {
    accessToken: 'mock-access-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should not connect without access token', () => {
      const { result } = renderHook(() =>
        useSignaling({ accessToken: null })
      );

      expect(result.current.socket).toBeNull();
      expect(result.current.connected).toBe(false);
    });

    it('should connect with valid access token', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      // Wait for socket to be created
      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.socket).not.toBeNull();
    });

    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      expect(result.current.matched).toBeNull();
      expect(result.current.queueStatus).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.connectionState.isConnected).toBe(false);
      expect(result.current.connectionState.isReconnecting).toBe(false);
    });
  });

  describe('connection events', () => {
    it('should update connected state on connect', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
      });

      expect(result.current.connected).toBe(true);
      expect(result.current.connectionState.isConnected).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should update state on disconnect', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
      });

      await act(async () => {
        mockSocketInstance._simulateDisconnect('transport close');
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.connectionState.isConnected).toBe(false);
      expect(result.current.connectionState.isReconnecting).toBe(true);
    });

    it('should not auto-reconnect on manual disconnect', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
      });

      await act(async () => {
        mockSocketInstance._simulateDisconnect('io client disconnect');
      });

      expect(result.current.connectionState.isReconnecting).toBe(false);
    });

    it('should handle connection error', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnectionError(new Error('Connection refused'));
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.error).toContain('Connection error');
    });
  });

  describe('queue operations', () => {
    it('should join queue when connected', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
      });

      act(() => {
        result.current.joinQueue('global', 'en', 'male', 'female', ['gaming'], 'casual');
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('join-queue', {
        region: 'global',
        language: 'en',
        gender: 'male',
        genderPreference: 'female',
        interests: ['gaming'],
        queueType: 'casual',
        nativeLanguage: undefined,
        learningLanguage: undefined,
      });
    });

    it('should not join queue when disconnected', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      act(() => {
        result.current.joinQueue();
      });

      expect(mockSocketInstance.emit).not.toHaveBeenCalledWith('join-queue', expect.anything());
    });

    it('should update queue status on queue-joined event', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
        mockSocketInstance._simulateQueueJoined({ position: 5, timestamp: Date.now() });
      });

      expect(result.current.queueStatus).not.toBeNull();
      expect(result.current.queueStatus?.position).toBe(5);
    });

    it('should leave queue', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
      });

      act(() => {
        result.current.leaveQueue();
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('leave-queue');
      expect(result.current.queueStatus).toBeNull();
    });
  });

  describe('matching', () => {
    it('should update matched state on matched event', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));
      const matchData = {
        peerId: 'peer-123',
        sessionId: 'session-456',
        timestamp: Date.now(),
      };

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
        mockSocketInstance._simulateMatched(matchData);
      });

      expect(result.current.matched).toEqual(matchData);
      expect(result.current.queueStatus).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('WebRTC signaling', () => {
    it('should send offer', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));
      const offer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'test-sdp' };

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
      });

      act(() => {
        result.current.sendOffer('session-123', offer);
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('send-offer', {
        sessionId: 'session-123',
        type: 'offer',
        data: offer,
      });
    });

    it('should send answer', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));
      const answer: RTCSessionDescriptionInit = { type: 'answer', sdp: 'test-sdp' };

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
      });

      act(() => {
        result.current.sendAnswer('session-123', answer);
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('send-answer', {
        sessionId: 'session-123',
        type: 'answer',
        data: answer,
      });
    });

    it('should send ICE candidate', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));
      const candidate: RTCIceCandidateInit = { candidate: 'test-candidate', sdpMid: '0' };

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
      });

      act(() => {
        result.current.sendCandidate('session-123', candidate);
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('send-candidate', {
        sessionId: 'session-123',
        type: 'candidate',
        data: candidate,
      });
    });

    it('should call onOffer callback on offer event', async () => {
      const onOfferMock = vi.fn();
      const { result } = renderHook(() =>
        useSignaling({ ...defaultOptions, onOffer: onOfferMock })
      );
      const offerData = {
        sessionId: 'session-123',
        offer: { type: 'offer' as const, sdp: 'test-sdp' },
        from: 'peer-456',
      };

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
        mockSocketInstance._simulateOffer(offerData);
      });

      expect(onOfferMock).toHaveBeenCalledWith(offerData);
    });

    it('should call onAnswer callback on answer event', async () => {
      const onAnswerMock = vi.fn();
      const { result } = renderHook(() =>
        useSignaling({ ...defaultOptions, onAnswer: onAnswerMock })
      );
      const answerData = {
        sessionId: 'session-123',
        answer: { type: 'answer' as const, sdp: 'test-sdp' },
        from: 'peer-456',
      };

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
        mockSocketInstance._simulateAnswer(answerData);
      });

      expect(onAnswerMock).toHaveBeenCalledWith(answerData);
    });

    it('should call onCandidate callback on candidate event', async () => {
      const onCandidateMock = vi.fn();
      const { result } = renderHook(() =>
        useSignaling({ ...defaultOptions, onCandidate: onCandidateMock })
      );
      const candidateData = {
        sessionId: 'session-123',
        candidate: { candidate: 'test', sdpMid: '0', sdpMLineIndex: 0 },
        from: 'peer-456',
      };

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
        mockSocketInstance._simulateCandidate(candidateData);
      });

      expect(onCandidateMock).toHaveBeenCalledWith(candidateData);
    });
  });

  describe('messaging', () => {
    it('should send message', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
      });

      act(() => {
        result.current.sendMessage('session-123', 'Hello!', 'John');
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('send-message', {
        sessionId: 'session-123',
        message: 'Hello!',
        sender: 'John',
        timestamp: expect.any(Number),
      });
    });

    it('should call onMessage callback on message event', async () => {
      const onMessageMock = vi.fn();
      const { result } = renderHook(() =>
        useSignaling({ ...defaultOptions, onMessage: onMessageMock })
      );
      const messageData = {
        sessionId: 'session-123',
        message: 'Hello!',
        from: 'peer-456',
        timestamp: Date.now(),
      };

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
        mockSocketInstance._simulateMessage(messageData);
      });

      expect(onMessageMock).toHaveBeenCalledWith(messageData);
    });

    it('should send reaction', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
      });

      act(() => {
        result.current.sendReaction('session-123', '👍');
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('send-reaction', {
        sessionId: 'session-123',
        emoji: '👍',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('call management', () => {
    it('should end call', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
        mockSocketInstance._simulateMatched({
          peerId: 'peer-123',
          sessionId: 'session-456',
          timestamp: Date.now(),
        });
      });

      act(() => {
        result.current.endCall('session-456');
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('end-call', {
        sessionId: 'session-456',
        wasSkipped: false,
      });
      expect(result.current.matched).toBeNull();
      expect(result.current.queueStatus).toBeNull();
    });

    it('should end call with skip flag', async () => {
      const { result } = renderHook(() => useSignaling(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
      });

      act(() => {
        result.current.endCall('session-456', true);
      });

      expect(mockSocketInstance.emit).toHaveBeenCalledWith('end-call', {
        sessionId: 'session-456',
        wasSkipped: true,
      });
    });

    it('should handle peer disconnected event', async () => {
      const onPeerDisconnectedMock = vi.fn();
      const { result } = renderHook(() =>
        useSignaling({ ...defaultOptions, onPeerDisconnected: onPeerDisconnectedMock })
      );

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
        mockSocketInstance._simulateMatched({
          peerId: 'peer-123',
          sessionId: 'session-456',
          timestamp: Date.now(),
        });
      });

      await act(async () => {
        mockSocketInstance._simulatePeerDisconnected({ sessionId: 'session-456' });
      });

      expect(result.current.matched).toBeNull();
      expect(onPeerDisconnectedMock).toHaveBeenCalledWith({ sessionId: 'session-456' });
    });
  });

  describe('cleanup', () => {
    it('should close socket on unmount', async () => {
      const { result, unmount } = renderHook(() => useSignaling(defaultOptions));

      await act(async () => {
        vi.advanceTimersByTime(10);
        mockSocketInstance._simulateConnect();
      });

      const closeSpy = vi.spyOn(mockSocketInstance, 'close');

      unmount();

      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
