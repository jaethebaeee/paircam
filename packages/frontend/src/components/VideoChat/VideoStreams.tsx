import { useState, useEffect } from 'react';
import { VideoCameraSlashIcon } from '@heroicons/react/24/outline';

interface VideoStreamsProps {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  isConnecting: boolean;
  isVideoEnabled: boolean;
  connectionState: RTCPeerConnectionState;
  partnerCountry?: string;
  partnerCountryCode?: string;
  matchedAt?: Date;
}

export default function VideoStreams({
  localVideoRef,
  remoteVideoRef,
  isConnecting,
  isVideoEnabled,
  connectionState,
  partnerCountryCode,
  matchedAt,
}: VideoStreamsProps) {
  const [wasConnecting, setWasConnecting] = useState(true);
  const [showMatchedAnimation, setShowMatchedAnimation] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [localVideoPosition, setLocalVideoPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>('bottom-right');

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (matchedAt && !isConnecting) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - matchedAt.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [matchedAt, isConnecting]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Detect when we just matched
  useEffect(() => {
    if (wasConnecting && !isConnecting && connectionState === 'connected') {
      setShowMatchedAnimation(true);
      setTimeout(() => setShowMatchedAnimation(false), 2000);
    }
    setWasConnecting(isConnecting);
  }, [isConnecting, connectionState, wasConnecting]);

  // Detect remote video stream
  useEffect(() => {
    const videoElement = remoteVideoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      setRemoteVideoReady(true);
      setIsDisconnecting(false);
    };

    const handleEmptied = () => {
      if (remoteVideoReady) {
        setIsDisconnecting(true);
      }
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('emptied', handleEmptied);

    if (videoElement.srcObject) {
      setRemoteVideoReady(true);
      setIsDisconnecting(false);
    }

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('emptied', handleEmptied);
    };
  }, [remoteVideoReady]);

  // Reset when reconnecting
  useEffect(() => {
    if (isConnecting) {
      setIsDisconnecting(false);
      setRemoteVideoReady(false);
      setCallDuration(0);
    }
  }, [isConnecting]);

  // Position classes for local video
  const positionClasses = {
    'bottom-right': 'bottom-28 right-5',
    'bottom-left': 'bottom-28 left-5',
    'top-right': 'top-5 right-5',
    'top-left': 'top-5 left-5',
  };

  // Cycle through positions on click
  const cyclePosition = () => {
    const positions: Array<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'> = ['bottom-right', 'top-right', 'top-left', 'bottom-left'];
    const currentIndex = positions.indexOf(localVideoPosition);
    setLocalVideoPosition(positions[(currentIndex + 1) % positions.length]);
  };

  return (
    <div className="h-full w-full relative bg-neutral-950 overflow-hidden">
      {/* Full-screen Remote Video */}
      <div className="absolute inset-0">
        {isConnecting ? (
          // Clean searching state - Hinge/Airbnb style
          <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center">
            {/* Elegant loading animation */}
            <div className="relative mb-10">
              {/* Outer ring */}
              <div className="w-24 h-24 rounded-full border-2 border-neutral-800 flex items-center justify-center">
                {/* Spinning indicator */}
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-rose-400 animate-spin" style={{ animationDuration: '1.2s' }}></div>
                {/* Inner circle with icon */}
                <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center">
                  <svg className="w-7 h-7 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-white text-xl font-medium tracking-tight">Finding your match</h2>
              <p className="text-neutral-500 text-sm">This usually takes a few seconds</p>
            </div>
          </div>
        ) : isDisconnecting ? (
          // Partner left - clean minimal state
          <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center animate-fadeIn">
            <div className="relative mb-8">
              <div className="w-20 h-20 rounded-full bg-neutral-900 flex items-center justify-center">
                <svg className="w-8 h-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </div>
            </div>
            <h2 className="text-white text-lg font-medium mb-1">They left the chat</h2>
            <p className="text-neutral-500 text-sm">Finding someone new...</p>
          </div>
        ) : (
          <>
            {/* Remote video - full screen */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                remoteVideoReady ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Matched celebration - minimal elegant style */}
            {showMatchedAnimation && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <div className="animate-scaleIn">
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-5 shadow-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-neutral-900 text-lg font-semibold">Connected</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top info bar - clean minimal */}
            <div className="absolute top-0 left-0 right-0 p-4">
              <div className="flex items-center justify-between">
                {/* Partner info - pill style */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-white/90 font-medium text-sm">Stranger</span>
                    {partnerCountryCode && (
                      <span className="text-base">{getFlagEmoji(partnerCountryCode)}</span>
                    )}
                  </div>
                </div>

                {/* Call duration - minimal */}
                {matchedAt && !isConnecting && (
                  <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full">
                    <span className="text-white/90 font-mono text-sm tabular-nums">{formatDuration(callDuration)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Connection state indicator */}
            {connectionState !== 'connected' && connectionState !== 'new' && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2">
                <div className="bg-amber-500/90 backdrop-blur-sm px-4 py-2 rounded-full">
                  <p className="text-white text-sm font-medium capitalize">{connectionState}...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) - Clean card style */}
      <div
        className={`absolute ${positionClasses[localVideoPosition]} z-20 transition-all duration-300 ease-out cursor-pointer`}
        onClick={cyclePosition}
      >
        <div className="relative group">
          <div className="w-28 h-40 sm:w-32 sm:h-44 rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-[1.02]">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />

            {/* Camera off overlay */}
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                <VideoCameraSlashIcon className="h-8 w-8 text-neutral-600" />
              </div>
            )}

            {/* You label - subtle */}
            <div className="absolute bottom-2 left-2">
              <span className="text-white/80 text-xs font-medium bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md">You</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom styles */}
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scaleIn {
          animation: scaleIn 0.25s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// Helper function to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
