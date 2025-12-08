import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useSignaling } from '../../hooks/useSignaling';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useNetworkQuality } from '../../hooks/useNetworkQuality';
import { useAdaptiveMediaConstraints } from '../../hooks/useAdaptiveMediaConstraints';
import useGeolocation from '../../hooks/useGeolocation';
import { STUN_SERVERS, DEFAULT_MEDIA_CONSTRAINTS, AUDIO_ONLY_CONSTRAINTS, API_URL } from '../../config/api';
import VideoControls from './VideoControls';
import VideoStreams from './VideoStreams';
import ChatPanel from './ChatPanel';
import NetworkQualityIndicator from '../NetworkQualityIndicator';
import PermissionErrorModal from '../PermissionErrorModal';
import WaitingQueue from '../WaitingQueue';
import ReportModal from '../ReportModal';
import BlockModal from '../BlockModal';
import { blockUser } from '../../api/blocking';

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
  interests?: string[]; // 🆕 Interest tags
  queueType?: 'casual' | 'serious' | 'language' | 'gaming'; // 🆕 Queue type
  nativeLanguage?: string; // 🆕 Native language
  learningLanguage?: string; // 🆕 Learning language
  isTextMode?: boolean;
  initialVideoEnabled?: boolean;
  showWaitingQueue?: boolean;
  onMatched?: () => void;
  onWaitingCancel?: () => void;
}

export default function VideoChat({ 
  onStopChatting, 
  userName, 
  userGender, 
  genderPreference,
  interests = [], // 🆕
  queueType = 'casual', // 🆕
  nativeLanguage, // 🆕
  learningLanguage, // 🆕
  isTextMode = false,
  initialVideoEnabled = true,
  showWaitingQueue = false,
  onMatched,
  onWaitingCancel
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
  const [showReportModal, setShowReportModal] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [matchedAt, setMatchedAt] = useState<Date | undefined>(undefined);
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Geolocation for country flags
  const geoLocation = useGeolocation();

  // Network quality monitoring
  const networkInfo = useNetworkQuality();
  
  // Memoize user preferences to prevent unnecessary re-renders
  const userPreferences = useMemo(() => ({
    video: isVideoEnabled && !isAudioOnlyMode,
    audio: isAudioEnabled,
  }), [isVideoEnabled, isAudioOnlyMode, isAudioEnabled]);
  
  const adaptiveConstraints = useAdaptiveMediaConstraints(networkInfo.quality, userPreferences);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, isTextMode, isAudioOnlyMode, currentQuality]);

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
      signaling.joinQueue('global', 'en', userGender, genderPreference, interests, queueType, nativeLanguage, learningLanguage); // 🆕 Pass new params
    }
  }, [webrtc.localStream, signaling.connected, signaling, userGender, genderPreference, interests, queueType, nativeLanguage, learningLanguage, isTextMode]);

  // Notify parent when matched and track match time
  useEffect(() => {
    if (signaling.matched) {
      setMatchedAt(new Date());
      if (onMatched) {
        onMatched();
      }
    } else {
      setMatchedAt(undefined);
    }
  }, [signaling.matched, onMatched]);

  // Create offer when matched (skip in text mode)
  useEffect(() => {
    if (signaling.matched && !isTextMode && webrtc.localStream) {
      webrtc.createOffer().then((offer) => {
        signaling.sendOffer(signaling.matched!.sessionId, offer);
      });
    }
  }, [signaling.matched, signaling, webrtc, isTextMode]);

  const handleNext = useCallback(() => {
    // Prevent rapid clicking (debounce)
    if (isSkipping) return;
    
    setIsSkipping(true);
    
    if (signaling.matched) {
      signaling.endCall(signaling.matched.sessionId, true); // 🆕 Mark as skipped
    }
    setMessages([]);
    signaling.joinQueue('global', 'en', userGender, genderPreference, interests, queueType, nativeLanguage, learningLanguage); // 🆕 Pass new params
    
    // Clear any existing timeout
    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current);
    }
    
    // Re-enable after 2 seconds
    skipTimeoutRef.current = setTimeout(() => {
      setIsSkipping(false);
      skipTimeoutRef.current = null;
    }, 2000);
  }, [isSkipping, signaling, userGender, genderPreference, interests, queueType, nativeLanguage, learningLanguage]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (skipTimeoutRef.current) {
        clearTimeout(skipTimeoutRef.current);
      }
    };
  }, []);

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

  const handleOpenReport = () => {
    if (!accessToken || !signaling.matched) return;
    setShowReportModal(true);
  };

  const handleSubmitReport = async (reason: string, comment?: string) => {
    try {
      if (!accessToken || !signaling.matched) return;
      setIsReporting(true);
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
      setShowReportModal(false);
      toast.success('Report submitted', {
        description: 'Thank you for helping keep our community safe.',
      });
    } catch (e) {
      console.error(e);
      toast.error('Failed to submit report', {
        description: 'Please try again or contact support.',
      });
    } finally {
      setIsReporting(false);
    }
  };

  const handleOpenBlock = () => {
    if (!accessToken || !signaling.matched) return;
    setShowBlockModal(true);
  };

  const handleSubmitBlock = async (reason: string) => {
    try {
      if (!accessToken || !signaling.matched) return;
      setIsBlocking(true);
      await blockUser(
        accessToken,
        signaling.matched.peerId,
        reason,
        signaling.matched.sessionId,
      );
      setShowBlockModal(false);
      toast.success('User blocked', {
        description: 'You will no longer be matched with this user.',
      });
      // Skip to next user after blocking
      handleNext();
    } catch (e) {
      console.error(e);
      toast.error('Failed to block user', {
        description: 'Please try again.',
      });
    } finally {
      setIsBlocking(false);
    }
  };

  // Show waiting queue while searching for match
  if (showWaitingQueue && !signaling.matched) {
    return (
      <WaitingQueue
        queuePosition={signaling.queueStatus?.position}
        estimatedWaitTime={undefined} // Backend calculates this now
        onCancel={onWaitingCancel || onStopChatting}
      />
    );
  }

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
          partnerCountry={geoLocation.country}
          partnerCountryCode={geoLocation.countryCode}
          matchedAt={matchedAt}
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
        onReport={handleOpenReport}
        onBlock={handleOpenBlock}
        isSkipping={isSkipping}
        isTextMode={isTextMode}
        isAudioOnlyMode={isAudioOnlyMode}
        onSwitchToAudioOnly={handleSwitchToAudioOnly}
        isConnected={!!signaling.matched}
      />

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          onSubmit={handleSubmitReport}
          onClose={() => setShowReportModal(false)}
          isLoading={isReporting}
        />
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <BlockModal
          onBlock={handleSubmitBlock}
          onClose={() => setShowBlockModal(false)}
          isLoading={isBlocking}
        />
      )}

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
