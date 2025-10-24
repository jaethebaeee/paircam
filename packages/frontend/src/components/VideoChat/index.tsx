import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSignaling } from '../../hooks/useSignaling';
import { useWebRTC } from '../../hooks/useWebRTC';
import { STUN_SERVERS, DEFAULT_MEDIA_CONSTRAINTS, API_URL } from '../../config/api';
import VideoControls from './VideoControls';
import VideoStreams from './VideoStreams';
import ChatPanel from './ChatPanel';

type TurnCredentials = {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
};

interface VideoChatProps {
  onEndCall: () => void;
  userName: string;
  userGender?: string;
  genderPreference?: string;
}

export default function VideoChat({ onEndCall, userName, userGender, genderPreference }: VideoChatProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Array<{ text: string; isMine: boolean; sender?: string }>>([]);
  const [turnCredentials, setTurnCredentials] = useState<TurnCredentials | null>(null);
  const [isSkipping, setIsSkipping] = useState(false);

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

  // Start local stream
  useEffect(() => {
    if (accessToken) {
      webrtc.startLocalStream(DEFAULT_MEDIA_CONSTRAINTS);
    }
  }, [accessToken, webrtc]);

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

  // Join queue when ready
  useEffect(() => {
    if (webrtc.localStream && signaling.connected && !signaling.matched) {
      signaling.joinQueue('global', 'en', userGender, genderPreference);
    }
  }, [webrtc.localStream, signaling.connected, signaling, userGender, genderPreference]);

  // Create offer when matched
  useEffect(() => {
    if (signaling.matched && webrtc.localStream) {
      webrtc.createOffer().then((offer) => {
        signaling.sendOffer(signaling.matched!.sessionId, offer);
      });
    }
  }, [signaling.matched, signaling, webrtc]);

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

  const handleEndCall = () => {
    if (signaling.matched) {
      signaling.endCall(signaling.matched.sessionId);
    }
    webrtc.endCall();
    onEndCall();
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
      <VideoStreams
        localVideoRef={webrtc.localVideoRef}
        remoteVideoRef={webrtc.remoteVideoRef}
        isConnecting={!signaling.matched}
        isVideoEnabled={isVideoEnabled}
        connectionState={webrtc.connectionState}
      />

      <VideoControls
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        onToggleVideo={handleToggleVideo}
        onToggleAudio={handleToggleAudio}
        onEndCall={handleEndCall}
        onNext={handleNext}
        onToggleChat={() => setShowChat(!showChat)}
        onReport={handleReport}
        isSkipping={isSkipping}
      />

      {showChat && (
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
