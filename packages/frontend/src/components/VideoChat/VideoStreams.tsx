import { useState, useEffect } from 'react';
import { VideoCameraIcon, VideoCameraSlashIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface VideoStreamsProps {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  isConnecting: boolean;
  isVideoEnabled: boolean;
  connectionState: RTCPeerConnectionState;
}

export default function VideoStreams({
  localVideoRef,
  remoteVideoRef,
  isConnecting,
  isVideoEnabled,
  connectionState,
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
    if (remoteVideoRef.current?.srcObject) {
      setRemoteVideoReady(true);
      setIsDisconnecting(false);
    } else if (remoteVideoReady) {
      // Video was there but now gone - partner disconnected
      setIsDisconnecting(true);
    }
  }, [remoteVideoRef.current?.srcObject, remoteVideoReady]);

  // Reset disconnecting state when reconnecting
  useEffect(() => {
    if (isConnecting) {
      setIsDisconnecting(false);
      setRemoteVideoReady(false);
    }
  }, [isConnecting]);

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-2 p-4">
      {/* Remote Video */}
      <div className="relative bg-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {isConnecting ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center animate-fadeIn">
            {/* Pulsing Circle Animation */}
            <div className="relative mb-8">
              {/* Outer ripple */}
              <div className="absolute inset-0 -m-8">
                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-pink-500/30 to-purple-500/30 animate-ping-slow"></div>
              </div>
              {/* Middle ripple */}
              <div className="absolute inset-0 -m-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-500/40 to-purple-500/40 animate-ping-slower"></div>
              </div>
              {/* Inner circle with icon */}
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-pink-500/50 animate-pulse-gentle">
                <VideoCameraIcon className="h-8 w-8 text-white animate-float" />
              </div>
            </div>
            
            <div className="text-center space-y-2 animate-fadeIn" style={{ animationDelay: '200ms' }}>
              <p className="text-white text-xl font-semibold">Searching...</p>
              <p className="text-slate-400 text-sm">Finding someone for you</p>
              <div className="flex gap-1 justify-center mt-4">
                <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        ) : isDisconnecting ? (
          // Partner disconnected - show fade out with message
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm animate-fadeIn z-10">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-4 animate-scale-in">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
                <p className="text-white text-xl font-semibold mb-2">Partner disconnected</p>
                <p className="text-slate-400 text-sm">Finding someone new...</p>
              </div>
              <div className="flex gap-1 justify-center mt-4 animate-fadeIn" style={{ animationDelay: '400ms' }}>
                <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
                  <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-3xl px-8 py-4 shadow-2xl">
                    <div className="flex items-center gap-3">
                      <SparklesIcon className="w-8 h-8 text-white animate-spin-slow" />
                      <span className="text-white text-2xl font-bold">Matched!</span>
                      <SparklesIcon className="w-8 h-8 text-white animate-spin-slow" style={{ animationDirection: 'reverse' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full animate-slideInLeft">
              <p className="text-white text-sm font-medium">Stranger</p>
            </div>
            {connectionState !== 'connected' && (
              <div className="absolute bottom-4 left-4 bg-yellow-500/90 backdrop-blur-sm px-3 py-1 rounded-full animate-pulse-gentle">
                <p className="text-white text-xs font-medium capitalize">{connectionState}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Local Video */}
      <div className="relative bg-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover mirror transition-all duration-500"
        />
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full animate-slideInLeft" style={{ animationDelay: '100ms' }}>
          <p className="text-white text-sm font-medium">You</p>
        </div>
        
        {!isVideoEnabled && (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center animate-fadeIn">
            <div className="text-center animate-scale-in">
              <div className="relative">
                <div className="absolute inset-0 -m-4 bg-slate-700/20 rounded-full animate-ping-slow"></div>
                <VideoCameraSlashIcon className="h-16 w-16 text-slate-400 mx-auto mb-3 relative" />
              </div>
              <p className="text-slate-400 font-medium">Camera Off</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }

        /* Custom Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes scaleFadeOut {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          20% {
            opacity: 1;
            transform: scale(1.1);
          }
          80% {
            opacity: 1;
            transform: scale(1.05);
          }
          100% {
            opacity: 0;
            transform: scale(1.2);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes pingSlow {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes pingSlower {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            opacity: 0.2;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }

        @keyframes pulseGentle {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.05);
          }
        }

        @keyframes spinSlow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.5s ease-out forwards;
        }

        .animate-scale-in {
          animation: scaleIn 0.4s ease-out forwards;
        }

        .animate-scale-fade-out {
          animation: scaleFadeOut 2s ease-out forwards;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-ping-slow {
          animation: pingSlow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .animate-ping-slower {
          animation: pingSlower 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          animation-delay: 0.5s;
        }

        .animate-pulse-gentle {
          animation: pulseGentle 2s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spinSlow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
