import { useState, useEffect } from 'react';
import { VideoCameraIcon, VideoCameraSlashIcon, SparklesIcon } from '@heroicons/react/24/outline';

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
      setTimeout(() => setShowMatchedAnimation(false), 2500);
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
    'bottom-right': 'bottom-24 right-4',
    'bottom-left': 'bottom-24 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  // Cycle through positions on click
  const cyclePosition = () => {
    const positions: Array<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'> = ['bottom-right', 'top-right', 'top-left', 'bottom-left'];
    const currentIndex = positions.indexOf(localVideoPosition);
    setLocalVideoPosition(positions[(currentIndex + 1) % positions.length]);
  };

  return (
    <div className="h-full w-full relative bg-black overflow-hidden">
      {/* Full-screen Remote Video */}
      <div className="absolute inset-0">
        {isConnecting ? (
          // Searching animation
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center">
            {/* Animated search rings */}
            <div className="relative mb-8">
              <div className="absolute inset-0 -m-16">
                <div className="w-40 h-40 rounded-full border-2 border-pink-500/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
              </div>
              <div className="absolute inset-0 -m-10">
                <div className="w-28 h-28 rounded-full border-2 border-purple-500/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]"></div>
              </div>
              <div className="absolute inset-0 -m-4">
                <div className="w-16 h-16 rounded-full border-2 border-blue-500/40 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_1s]"></div>
              </div>

              {/* Center icon */}
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-purple-500/50">
                <VideoCameraIcon className="h-8 w-8 text-white" />
              </div>
            </div>

            <div className="text-center space-y-3">
              <h2 className="text-white text-2xl font-bold">Finding someone...</h2>
              <p className="text-slate-400 text-sm">Get ready to meet someone new</p>

              {/* Animated dots */}
              <div className="flex gap-2 justify-center pt-4">
                <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        ) : isDisconnecting ? (
          // Partner left animation
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center animate-fadeIn">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-500/40 animate-bounce">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Partner left</h2>
            <p className="text-slate-400 text-sm mb-6">Finding someone new...</p>
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        ) : (
          <>
            {/* Remote video - full screen */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-all duration-500 ${
                remoteVideoReady ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Matched celebration overlay */}
            {showMatchedAnimation && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 bg-black/20 backdrop-blur-sm animate-fadeIn">
                <div className="animate-[scale-in_0.3s_ease-out]">
                  <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-3xl px-10 py-6 shadow-2xl shadow-purple-500/50">
                    <div className="flex items-center gap-4">
                      <SparklesIcon className="w-10 h-10 text-white animate-pulse" />
                      <div className="text-center">
                        <span className="text-white text-3xl font-bold block">Connected!</span>
                        <span className="text-white/80 text-sm">Say hello 👋</span>
                      </div>
                      <SparklesIcon className="w-10 h-10 text-white animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top info bar */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center justify-between">
                {/* Partner info */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-white font-medium text-sm">Stranger</span>
                    {partnerCountryCode && (
                      <span className="text-lg">{getFlagEmoji(partnerCountryCode)}</span>
                    )}
                  </div>
                </div>

                {/* Call duration */}
                {matchedAt && !isConnecting && (
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-white font-mono text-sm">{formatDuration(callDuration)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Connection state indicator */}
            {connectionState !== 'connected' && connectionState !== 'new' && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2">
                <div className="bg-amber-500/90 backdrop-blur-sm px-4 py-2 rounded-full animate-pulse">
                  <p className="text-white text-sm font-medium capitalize">{connectionState}...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <div
        className={`absolute ${positionClasses[localVideoPosition]} z-20 transition-all duration-300 cursor-move`}
        onClick={cyclePosition}
      >
        <div className="relative group">
          <div className="w-36 h-48 sm:w-44 sm:h-60 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border-2 border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />

            {/* Camera off overlay */}
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                  <VideoCameraSlashIcon className="h-10 w-10 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-500 text-xs font-medium">Camera Off</p>
                </div>
              </div>
            )}

            {/* You label */}
            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-center">
                <span className="text-white text-xs font-medium">You</span>
              </div>
            </div>
          </div>

          {/* Drag hint on hover */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white/60 text-xs bg-black/60 px-2 py-1 rounded-full">Click to move</span>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
        @keyframes scale-in {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
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
