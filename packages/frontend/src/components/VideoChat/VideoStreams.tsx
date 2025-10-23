import { VideoCameraIcon, VideoCameraSlashIcon } from '@heroicons/react/24/outline';

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
  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-2 p-4">
      {/* Remote Video */}
      <div className="relative bg-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {isConnecting ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="animate-pulse-slow">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center mb-4">
                <VideoCameraIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <p className="text-white text-lg font-medium">Connecting...</p>
            <p className="text-slate-400 text-sm mt-2">Finding someone for you</p>
          </div>
        ) : (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
              <p className="text-white text-sm font-medium">Stranger</p>
            </div>
            {connectionState !== 'connected' && (
              <div className="absolute bottom-4 left-4 bg-yellow-500/90 backdrop-blur-sm px-3 py-1 rounded-full">
                <p className="text-white text-xs font-medium">{connectionState}</p>
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
          className="w-full h-full object-cover mirror"
        />
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
          <p className="text-white text-sm font-medium">You</p>
        </div>
        
        {!isVideoEnabled && (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
            <div className="text-center">
              <VideoCameraSlashIcon className="h-16 w-16 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-400">Camera Off</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
