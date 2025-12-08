import { useState, useEffect } from 'react';
import { VideoCameraIcon, VideoCameraSlashIcon, SparklesIcon } from '@heroicons/react/24/outline';
import PartnerInfo from './PartnerInfo';

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
  partnerCountry,
  partnerCountryCode,
  matchedAt,
}: VideoStreamsProps) {
  const [wasConnecting, setWasConnecting] = useState(true);
  const [showMatchedAnimation, setShowMatchedAnimation] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);

  // Detect when we just matched (transition from connecting to connected)
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

    // Check initial state
    if (videoElement.srcObject) {
      setRemoteVideoReady(true);
      setIsDisconnecting(false);
    }

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('emptied', handleEmptied);
    };
  }, [remoteVideoReady]);

  // Reset disconnecting state when reconnecting
  useEffect(() => {
    if (isConnecting) {
      setIsDisconnecting(false);
      setRemoteVideoReady(false);
    }
  }, [isConnecting]);

  return (
    <div className="h-full relative p-2 sm:p-3 md:p-4">
      {/* Mobile: Stack with floating local video / Desktop: Side by side */}
      <div className="h-full lg:grid lg:grid-cols-2 lg:gap-2">
        {/* Remote Video - Full screen on mobile */}
        <div className="relative bg-slate-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl h-full">
          {isConnecting ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center animate-fadeIn">
              {/* Pulsing Circle Animation */}
              <div className="relative mb-4 sm:mb-8">
                {/* Outer ripple */}
                <div className="absolute inset-0 -m-6 sm:-m-8">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-r from-pink-500/30 to-purple-500/30 animate-ping-slow"></div>
                </div>
                {/* Middle ripple */}
                <div className="absolute inset-0 -m-3 sm:-m-4">
                  <div className="w-18 h-18 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-pink-500/40 to-purple-500/40 animate-ping-slower"></div>
                </div>
                {/* Inner circle with icon */}
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-pink-500/50 animate-pulse-gentle">
                  <VideoCameraIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white animate-float" />
                </div>
              </div>

              <div className="text-center space-y-1 sm:space-y-2 animate-fadeIn" style={{ animationDelay: '200ms' }}>
                <p className="text-white text-lg sm:text-xl font-semibold">Searching...</p>
                <p className="text-slate-400 text-xs sm:text-sm">Finding someone for you</p>
                <div className="flex gap-1 justify-center mt-3 sm:mt-4">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          ) : isDisconnecting ? (
            // Partner disconnected - show fade out with message
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm animate-fadeIn z-10">
              <div className="text-center space-y-3 sm:space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-3 sm:mb-4 animate-scale-in">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
                  <p className="text-white text-lg sm:text-xl font-semibold mb-1 sm:mb-2">Partner disconnected</p>
                  <p className="text-slate-400 text-xs sm:text-sm">Finding someone new...</p>
                </div>
                <div className="flex gap-1 justify-center mt-3 sm:mt-4 animate-fadeIn" style={{ animationDelay: '400ms' }}>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-all duration-700 ${
                  remoteVideoReady ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
              />

              {/* Matched Animation Overlay */}
              {showMatchedAnimation && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="animate-scale-fade-out">
                    <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl sm:rounded-3xl px-4 sm:px-8 py-2 sm:py-4 shadow-2xl">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <SparklesIcon className="w-5 h-5 sm:w-8 sm:h-8 text-white animate-spin-slow" />
                        <span className="text-white text-lg sm:text-2xl font-bold">Matched!</span>
                        <SparklesIcon className="w-5 h-5 sm:w-8 sm:h-8 text-white animate-spin-slow" style={{ animationDirection: 'reverse' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <PartnerInfo
                country={partnerCountry}
                countryCode={partnerCountryCode}
                matchedAt={matchedAt}
                className="absolute top-2 left-2 sm:top-4 sm:left-4"
              />
              {connectionState !== 'connected' && (
                <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-yellow-500/90 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full animate-pulse-gentle">
                  <p className="text-white text-[10px] sm:text-xs font-medium capitalize">{connectionState}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Local Video - Floating on mobile, side-by-side on desktop */}
        <div className="absolute bottom-20 right-2 sm:bottom-24 sm:right-3 w-24 h-32 sm:w-32 sm:h-44 lg:static lg:w-full lg:h-full lg:relative bg-slate-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 lg:border-0 z-30">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror transition-all duration-500"
          />
          <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 lg:top-4 lg:left-4 bg-black/50 backdrop-blur-sm px-2 sm:px-3 lg:px-4 py-0.5 sm:py-1 lg:py-2 rounded-full animate-slideInLeft" style={{ animationDelay: '100ms' }}>
            <p className="text-white text-[10px] sm:text-xs lg:text-sm font-medium">You</p>
          </div>

          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center animate-fadeIn">
              <div className="text-center animate-scale-in">
                <div className="relative">
                  <div className="absolute inset-0 -m-2 sm:-m-4 bg-slate-700/20 rounded-full animate-ping-slow"></div>
                  <VideoCameraSlashIcon className="h-8 w-8 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-slate-400 mx-auto mb-1 sm:mb-2 lg:mb-3 relative" />
                </div>
                <p className="text-slate-400 text-[10px] sm:text-xs lg:text-sm font-medium">Camera Off</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
