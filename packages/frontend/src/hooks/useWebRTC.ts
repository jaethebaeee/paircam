import { useCallback, useEffect, useRef, useState } from 'react';
import { verifyDTLSSRTP, monitorConnectionSecurity } from '../utils/security';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  connectionState: RTCPeerConnectionState;
  error: string | null;
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  createAnswer: (offer: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit>;
  setRemoteDescription: (sdp: RTCSessionDescriptionInit) => Promise<void>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  startLocalStream: (constraints?: MediaStreamConstraints) => Promise<void>;
  toggleAudio: (enabled: boolean) => void;
  toggleVideo: (enabled: boolean) => void;
  endCall: () => void;
}

export function useWebRTC(config: WebRTCConfig, onIceCandidate?: (candidate: RTCIceCandidate) => void): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Create or get peer connection
  const getPeerConnection = useCallback(() => {
    if (peerRef.current) return peerRef.current;

    try {
      const pc = new RTCPeerConnection({ iceServers: config.iceServers });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          onIceCandidate?.(event.candidate);
        }
      };

      pc.onconnectionstatechange = async () => {
        setConnectionState(pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          // ✅ Verify DTLS-SRTP encryption is active
          const isSecure = await verifyDTLSSRTP(pc);
          if (!isSecure && import.meta.env.PROD) {
            console.warn('⚠️  WebRTC connection security could not be verified');
          }
          
          // Start monitoring connection security
          const stopMonitoring = monitorConnectionSecurity(pc, () => {
            console.error('🚨 WebRTC connection security compromised!');
          });
          
          // Store cleanup function
          (pc as any)._securityMonitorCleanup = stopMonitoring;
        }
        
        if (pc.connectionState === 'failed') {
          setError('Connection failed. Attempting to reconnect...');
        }
      };

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      peerRef.current = pc;
      return pc;
    } catch {
      setError('Failed to create peer connection');
      throw new Error('Failed to create peer connection');
    }
  }, [config.iceServers, onIceCandidate]);

  // Start local stream (camera/mic)
  const startLocalStream = useCallback(
    async (constraints: MediaStreamConstraints = { audio: true, video: { width: 1280, height: 720 } }) => {
      try {
        // Stop existing stream first to prevent memory leaks
        if (localStream) {
          localStream.getTracks().forEach(track => {
            track.stop();
            localStream.removeTrack(track);
          });
        }
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setError(null);
      } catch (err) {
        const errorName = err instanceof Error ? err.name : 'UnknownError';
        
        // Provide user-friendly error messages
        let userMessage = 'Failed to access camera/microphone.';
        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          userMessage = 'Camera and microphone access was denied. Please allow access in your browser settings.';
        } else if (errorName === 'NotFoundError') {
          userMessage = 'No camera or microphone found. Please connect a device and try again.';
        } else if (errorName === 'NotReadableError') {
          userMessage = 'Camera or microphone is already in use by another application.';
        }
        
        setError(userMessage);
        throw new Error(userMessage);
      }
    },
    [localStream]
  );

  // Create WebRTC offer
  const createOffer = useCallback(async () => {
    try {
      const pc = getPeerConnection();
      if (!localStream) {
        throw new Error('Local stream not initialized');
      }

      // Add local tracks
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(offer);
      setError(null);
      return offer;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to create offer: ${msg}`);
      throw err;
    }
  }, [getPeerConnection, localStream]);

  // Create WebRTC answer
  const createAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      try {
        const pc = getPeerConnection();
        if (!localStream) {
          throw new Error('Local stream not initialized');
        }

        // Add local tracks
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        setError(null);
        return answer;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Failed to create answer: ${msg}`);
        throw err;
      }
    },
    [getPeerConnection, localStream]
  );

  // Set remote SDP
  const setRemoteDescription = useCallback(async (sdp: RTCSessionDescriptionInit) => {
    try {
      const pc = peerRef.current;
      if (!pc) throw new Error('Peer connection not initialized');
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to set remote description: ${msg}`);
      throw err;
    }
  }, []);

  // Add ICE candidate
  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerRef.current;
      if (!pc) throw new Error('Peer connection not initialized');
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      // Ignore duplicate/invalid candidates
      if (!(err instanceof Error) || !err.message.includes('duplicate')) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Ice candidate error: ${msg}`);
      }
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback((enabled: boolean) => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback((enabled: boolean) => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }, [localStream]);

  // End call cleanup - CRITICAL for preventing memory leaks
  const endCall = useCallback(() => {
    try {
      // Close peer connection properly
      if (peerRef.current) {
        // Stop security monitoring
        if ((peerRef.current as any)._securityMonitorCleanup) {
          (peerRef.current as any)._securityMonitorCleanup();
        }
        
        // Stop all senders
        peerRef.current.getSenders().forEach(sender => {
          if (sender.track) {
            sender.track.stop();
          }
        });
        
        // Stop all receivers
        peerRef.current.getReceivers().forEach(receiver => {
          if (receiver.track) {
            receiver.track.stop();
          }
        });
        
        // Close the connection
        peerRef.current.close();
        peerRef.current = null;
      }

      // Stop local stream tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop();
          localStream.removeTrack(track);
        });
        setLocalStream(null);
      }

      // Stop remote stream tracks
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => {
          track.stop();
          remoteStream.removeTrack(track);
        });
        setRemoteStream(null);
      }

      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      setConnectionState('closed');
      setError(null);
      
      console.log('[WebRTC] Cleanup completed successfully');
    } catch (error) {
      console.error('[WebRTC] Error during cleanup:', error);
    }
  }, [localStream, remoteStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    connectionState,
    error,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    startLocalStream,
    toggleAudio,
    toggleVideo,
    endCall,
  };
}
