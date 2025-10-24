import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSignaling } from '../../hooks/useSignaling';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useNetworkQuality } from '../../hooks/useNetworkQuality';
import { useAdaptiveMediaConstraints } from '../../hooks/useAdaptiveMediaConstraints';
import { STUN_SERVERS, DEFAULT_MEDIA_CONSTRAINTS, AUDIO_ONLY_CONSTRAINTS, API_URL } from '../../config/api';
import VideoControls from './VideoControls';
import VideoStreams from './VideoStreams';
import ChatPanel from './ChatPanel';
import NetworkQualityIndicator from '../NetworkQualityIndicator';
import PermissionErrorModal from '../PermissionErrorModal';

type TurnCredentials = {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
};

interface VideoChatProps {
  onStopChatting: () => void;
  userName: string;
  userGender?: string;
  genderPreference?: string;
  isTextMode?: boolean;
  initialVideoEnabled?: boolean;
}

export default function VideoChat({ 
  onStopChatting, 
  userName, 
  userGender, 
  genderPreference, 
  isTextMode = false,
  initialVideoEnabled = true 
}: VideoChatProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(isTextMode ? false : initialVideoEnabled);
  const [isAudioEnabled, setIsAudioEnabled] = useState(!isTextMode);
  const [showChat, setShowChat] = useState(isTextMode); // Auto-show chat in text mode
  const [messages, setMessages] = useState<Array<{ text: string; isMine: boolean; sender?: string }>>([]);
  const [turnCredentials, setTurnCredentials] = useState<TurnCredentials | null>(null);
  const [isSkipping, setIsSkipping] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isAudioOnlyMode, setIsAudioOnlyMode] = useState(false);
  const [currentQuality] = useState<'auto' | 'high' | 'low'>('auto'); // Future: allow user to manually override

  // Network quality monitoring
  const networkInfo = useNetworkQuality();
  const adaptiveConstraints = useAdaptiveMediaConstraints(networkInfo.quality, {
    video: isVideoEnabled && !isAudioOnlyMode,
    audio: isAudioEnabled,
  });

  // Auth
  const { accessToken, authenticate } = useAuth();

  // Signaling
  const signaling = useSignaling({
    accessToken,
    onOffer: async (data) => {
      const answer = await webrtc.createAnswer(data.offer);
      signaling.sendAnswer(data.sessionId, answer);
    },
    onAnswer: async (data) => {
      await webrtc.setRemoteDescription(data.answer);
    },
    onCandidate: async (data) => {
      await webrtc.addIceCandidate(data.candidate);
    },
    onMessage: (data) => {
      setMessages((prev) => [...prev, { 
        text: data.message, 
        isMine: false,
        sender: data.sender || 'Stranger'
      }]);
    },
    onPeerDisconnected: () => {
      handleNext();
    },
  });

  // WebRTC
  const webrtc = useWebRTC(
    {
      iceServers: turnCredentials
        ? [...STUN_SERVERS, ...turnCredentials.urls.map((url: string) => ({
            urls: url,
            username: turnCredentials.username,
            credential: turnCredentials.credential,
          }))]
        : STUN_SERVERS,
    },
    (candidate) => {
      if (signaling.matched) {
        signaling.sendCandidate(signaling.matched.sessionId, candidate);
      }
    }
  );

  // Initialize
  useEffect(() => {
    authenticate();
  }, [authenticate]);

  // Start local stream with adaptive quality (skip in text mode)
  useEffect(() => {
    if (accessToken && !isTextMode) {
      const constraints = isAudioOnlyMode 
        ? AUDIO_ONLY_CONSTRAINTS 
        : currentQuality === 'auto'
          ? { audio: adaptiveConstraints.audio, video: adaptiveConstraints.video }
          : DEFAULT_MEDIA_CONSTRAINTS;

      webrtc.startLocalStream(constraints).catch((error) => {
        setPermissionError(error.message || 'Failed to access camera/microphone');
      });
    }
  }, [accessToken, webrtc, isTextMode, isAudioOnlyMode, currentQuality, adaptiveConstraints]);

  // Fetch TURN credentials
  useEffect(() => {
    if (accessToken) {
      fetch(`${API_URL}/turn/credentials`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
        .then((res) => res.json())
        .then(setTurnCredentials)
        .catch(console.error);
    }
  }, [accessToken]);

  // Join queue when ready (in text mode, skip waiting for local stream)
  useEffect(() => {
    const canJoinQueue = isTextMode 
      ? signaling.connected && !signaling.matched
      : webrtc.localStream && signaling.connected && !signaling.matched;
      
    if (canJoinQueue) {
      signaling.joinQueue('global', 'en', userGender, genderPreference);
    }
  }, [webrtc.localStream, signaling.connected, signaling, userGender, genderPreference, isTextMode]);

  // Create offer when matched (skip in text mode)
  useEffect(() => {
    if (signaling.matched && !isTextMode && webrtc.localStream) {
      webrtc.createOffer().then((offer) => {
        signaling.sendOffer(signaling.matched!.sessionId, offer);
      });
    }
  }, [signaling.matched, signaling, webrtc, isTextMode]);

  const handleNext = () => {
    // Prevent rapid clicking (debounce)
    if (isSkipping) return;
    
    setIsSkipping(true);
    
    if (signaling.matched) {
      signaling.endCall(signaling.matched.sessionId);
    }
    setMessages([]);
    signaling.joinQueue('global', 'en', userGender, genderPreference);
    
    // Re-enable after 2 seconds
    setTimeout(() => setIsSkipping(false), 2000);
  };

  const handleStopChatting = () => {
    if (signaling.matched) {
      signaling.endCall(signaling.matched.sessionId);
    }
    if (!isTextMode) {
      webrtc.endCall();
    }
    onStopChatting();
  };

  const handleSendMessage = (message: string) => {
    if (signaling.matched && message.trim()) {
      signaling.sendMessage(signaling.matched.sessionId, message, userName);
      setMessages((prev) => [...prev, { 
        text: message, 
        isMine: true,
        sender: userName
      }]);
    }
  };

  const handleToggleVideo = () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    webrtc.toggleVideo(newState);
  };

  const handleToggleAudio = () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    webrtc.toggleAudio(newState);
  };

  const handleSwitchToAudioOnly = useCallback(() => {
    setIsAudioOnlyMode(true);
    setIsVideoEnabled(false);
    webrtc.toggleVideo(false);
    setPermissionError(null);
  }, [webrtc]);

  const handleSwitchToTextOnly = useCallback(() => {
    if (signaling.matched) {
      signaling.endCall(signaling.matched.sessionId);
    }
    webrtc.endCall();
    onStopChatting();
    // Parent should handle switching to text mode
  }, [signaling, webrtc, onStopChatting]);

  const handleRetryPermissions = useCallback(() => {
    setPermissionError(null);
    const constraints = isAudioOnlyMode ? AUDIO_ONLY_CONSTRAINTS : DEFAULT_MEDIA_CONSTRAINTS;
    webrtc.startLocalStream(constraints).catch((error) => {
      setPermissionError(error.message || 'Failed to access camera/microphone');
    });
  }, [webrtc, isAudioOnlyMode]);

  const handleReport = async () => {
    try {
      if (!accessToken || !signaling.matched) return;
      const reason = window.prompt('Report reason (e.g., harassment, inappropriate_content, spam, other):', 'other') || 'other';
      const comment = window.prompt('Optional comment:', '') || undefined;
      const res = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          reportedPeerId: signaling.matched.peerId,
          sessionId: signaling.matched.sessionId,
          reason,
          comment,
        }),
      });
      if (!res.ok) throw new Error('Failed to submit report');
      alert('Report submitted. Thank you.');
    } catch (e) {
      console.error(e);
      alert('Failed to submit report.');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-slate-900 relative">
      {/* Network Quality Indicator */}
      {!isTextMode && (
        <NetworkQualityIndicator
          quality={networkInfo.quality}
          type={networkInfo.type}
          downlink={networkInfo.downlink}
          rtt={networkInfo.rtt}
          onDegradeToAudio={handleSwitchToAudioOnly}
          showRecommendation={!isAudioOnlyMode}
        />
      )}

      {/* Permission Error Modal */}
      {permissionError && (
        <PermissionErrorModal
          error={permissionError}
          onDismiss={() => setPermissionError(null)}
          onRetry={handleRetryPermissions}
          onSwitchToAudio={handleSwitchToAudioOnly}
          onSwitchToText={handleSwitchToTextOnly}
        />
      )}

      {isTextMode ? (
        // Text-only mode UI
        <div className="h-full flex items-center justify-center p-4">
          <div className="max-w-4xl w-full h-[600px]">
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              onClose={() => {}} // Can't close in text mode
              isFullScreen={true}
            />
          </div>
        </div>
      ) : (
        // Video mode UI
        <VideoStreams
          localVideoRef={webrtc.localVideoRef}
          remoteVideoRef={webrtc.remoteVideoRef}
          isConnecting={!signaling.matched}
          isVideoEnabled={isVideoEnabled && !isAudioOnlyMode}
          connectionState={webrtc.connectionState}
        />
      )}

      <VideoControls
        isVideoEnabled={isVideoEnabled && !isAudioOnlyMode}
        isAudioEnabled={isAudioEnabled}
        onToggleVideo={handleToggleVideo}
        onToggleAudio={handleToggleAudio}
        onStopChatting={handleStopChatting}
        onNext={handleNext}
        onToggleChat={() => setShowChat(!showChat)}
        onReport={handleReport}
        isSkipping={isSkipping}
        isTextMode={isTextMode}
        isAudioOnlyMode={isAudioOnlyMode}
        onSwitchToAudioOnly={handleSwitchToAudioOnly}
      />

      {!isTextMode && showChat && (
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          onClose={() => setShowChat(false)}
          isFullScreen={false}
        />
      )}
    </div>
  );
}
