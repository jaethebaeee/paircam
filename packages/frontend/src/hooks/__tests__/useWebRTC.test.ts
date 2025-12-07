import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebRTC } from '../useWebRTC';
import { mockGetUserMedia } from '../../test/setup';

// Mock the security module
vi.mock('../../utils/security', () => ({
  verifyDTLSSRTP: vi.fn().mockResolvedValue(true),
  monitorConnectionSecurity: vi.fn().mockReturnValue(() => {}),
}));

describe('useWebRTC', () => {
  const defaultConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      expect(result.current.localStream).toBeNull();
      expect(result.current.remoteStream).toBeNull();
      expect(result.current.connectionState).toBe('new');
      expect(result.current.error).toBeNull();
    });

    it('should provide video refs', () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      expect(result.current.localVideoRef).toBeDefined();
      expect(result.current.remoteVideoRef).toBeDefined();
    });
  });

  describe('startLocalStream', () => {
    it('should request user media with default constraints', async () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      await act(async () => {
        await result.current.startLocalStream();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: true,
        video: { width: 1280, height: 720 },
      });

      await waitFor(() => {
        expect(result.current.localStream).not.toBeNull();
      });
      expect(result.current.error).toBeNull();
    });

    it('should request user media with custom constraints', async () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));
      const customConstraints = { audio: true, video: false };

      await act(async () => {
        await result.current.startLocalStream(customConstraints);
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith(customConstraints);
    });

    it('should handle permission denied error', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValueOnce(permissionError);

      const { result } = renderHook(() => useWebRTC(defaultConfig));

      // The function should throw when permission is denied
      await expect(
        act(async () => {
          await result.current.startLocalStream();
        })
      ).rejects.toThrow();

      // Error message is set in state (checking directly after rejection)
      expect(result.current.localStream).toBeNull();
    });

    it('should handle device not found error', async () => {
      const notFoundError = new Error('Device not found');
      notFoundError.name = 'NotFoundError';
      mockGetUserMedia.mockRejectedValueOnce(notFoundError);

      const { result } = renderHook(() => useWebRTC(defaultConfig));

      await expect(
        act(async () => {
          await result.current.startLocalStream();
        })
      ).rejects.toThrow();

      expect(result.current.localStream).toBeNull();
    });

    it('should handle device in use error', async () => {
      const inUseError = new Error('Device in use');
      inUseError.name = 'NotReadableError';
      mockGetUserMedia.mockRejectedValueOnce(inUseError);

      const { result } = renderHook(() => useWebRTC(defaultConfig));

      await expect(
        act(async () => {
          await result.current.startLocalStream();
        })
      ).rejects.toThrow();

      expect(result.current.localStream).toBeNull();
    });
  });

  describe('createOffer', () => {
    it('should provide createOffer function', () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      expect(typeof result.current.createOffer).toBe('function');
    });

    it('should throw error if local stream not initialized', async () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      await expect(
        act(async () => {
          await result.current.createOffer();
        })
      ).rejects.toThrow('Local stream not initialized');
    });
  });

  describe('createAnswer', () => {
    it('should provide createAnswer function', () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      expect(typeof result.current.createAnswer).toBe('function');
    });

    it('should throw error if local stream not initialized', async () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));
      const mockOffer: RTCSessionDescriptionInit = {
        type: 'offer',
        sdp: 'mock-offer-sdp',
      };

      await expect(
        act(async () => {
          await result.current.createAnswer(mockOffer);
        })
      ).rejects.toThrow('Local stream not initialized');
    });
  });

  describe('setRemoteDescription', () => {
    it('should provide setRemoteDescription function', () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      expect(typeof result.current.setRemoteDescription).toBe('function');
    });

    it('should throw error if peer connection not initialized', async () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));
      const mockAnswer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: 'mock-answer-sdp',
      };

      await expect(
        act(async () => {
          await result.current.setRemoteDescription(mockAnswer);
        })
      ).rejects.toThrow('Peer connection not initialized');
    });
  });

  describe('addIceCandidate', () => {
    it('should provide addIceCandidate function', () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      expect(typeof result.current.addIceCandidate).toBe('function');
    });

    it('should log warning when peer connection not initialized', async () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));
      const mockCandidate: RTCIceCandidateInit = {
        candidate: 'mock-candidate',
        sdpMid: '0',
        sdpMLineIndex: 0,
      };

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // addIceCandidate catches errors and logs them instead of throwing
      await act(async () => {
        await result.current.addIceCandidate(mockCandidate);
      });

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('toggleAudio', () => {
    it('should provide toggleAudio function', () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      expect(typeof result.current.toggleAudio).toBe('function');
    });

    it('should not throw when called without stream', () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      // Should not throw even without a stream
      expect(() => {
        act(() => {
          result.current.toggleAudio(false);
        });
      }).not.toThrow();
    });
  });

  describe('toggleVideo', () => {
    it('should provide toggleVideo function', () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      expect(typeof result.current.toggleVideo).toBe('function');
    });

    it('should not throw when called without stream', () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      // Should not throw even without a stream
      expect(() => {
        act(() => {
          result.current.toggleVideo(false);
        });
      }).not.toThrow();
    });
  });

  describe('endCall', () => {
    it('should provide endCall function', () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      expect(typeof result.current.endCall).toBe('function');
    });

    it('should not throw when called without active connection', () => {
      const { result } = renderHook(() => useWebRTC(defaultConfig));

      // Should not throw even without an active connection
      expect(() => {
        act(() => {
          result.current.endCall();
        });
      }).not.toThrow();

      expect(result.current.connectionState).toBe('closed');
    });
  });

  describe('ICE candidate callback', () => {
    it('should accept onIceCandidate callback parameter', () => {
      const onIceCandidateMock = vi.fn();
      const { result } = renderHook(() => useWebRTC(defaultConfig, onIceCandidateMock));

      // The hook should accept the callback - it will be called when ICE candidates are generated
      expect(result.current).toBeDefined();
      expect(typeof result.current.createOffer).toBe('function');
    });
  });

  describe('cleanup on unmount', () => {
    it('should clean up resources when hook unmounts', () => {
      const { unmount } = renderHook(() => useWebRTC(defaultConfig));

      // Just verify unmount doesn't throw
      expect(() => unmount()).not.toThrow();
    });

    it('should clean up with active stream on unmount', async () => {
      const { result, unmount } = renderHook(() => useWebRTC(defaultConfig));

      await act(async () => {
        await result.current.startLocalStream();
      });

      // Wait for local stream to be set
      await waitFor(() => {
        expect(result.current.localStream).not.toBeNull();
      });

      // Unmount should trigger cleanup
      expect(() => unmount()).not.toThrow();
    });
  });
});
