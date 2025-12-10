import { useEffect, useState } from 'react';
import { NetworkQuality } from '../../hooks/useNetworkQuality';
import { ExclamationTriangleIcon, WifiIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ConnectionFallbackProps {
  networkQuality: NetworkQuality;
  connectionState: RTCPeerConnectionState;
  isRecovering: boolean;
  recoveryAttempt: number;
  maxAttempts: number;
  onFallbackToAudio: () => void;
  onRetryVideo: () => void;
  onRetryConnection: () => void;
  showRecommendation?: boolean;
}

export default function ConnectionFallback({
  networkQuality,
  connectionState,
  isRecovering,
  recoveryAttempt,
  maxAttempts,
  onFallbackToAudio,
  onRetryVideo,
  onRetryConnection,
  showRecommendation = true,
}: ConnectionFallbackProps) {
  const [dismissed, setDismissed] = useState(false);
  const [fallbackMode, setFallbackMode] = useState<'video' | 'audio-only'>('video');

  // Reset dismissed state when quality changes significantly
  useEffect(() => {
    if (networkQuality === 'offline' || connectionState === 'failed') {
      setDismissed(false);
    }
  }, [networkQuality, connectionState]);

  const handleFallbackToAudio = () => {
    onFallbackToAudio();
    setFallbackMode('audio-only');
  };

  const handleRetryVideo = () => {
    onRetryVideo();
    setFallbackMode('video');
  };

  // Connection failed state
  if (connectionState === 'failed' || (isRecovering && recoveryAttempt > 0)) {
    return (
      <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40 max-w-md mx-4">
        <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 shadow-lg border-l-4 border-red-500">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-800/50 rounded-full">
              {isRecovering ? (
                <ArrowPathIcon className="w-6 h-6 text-red-600 dark:text-red-400 animate-spin" />
              ) : (
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                {isRecovering ? 'Reconnecting...' : 'Connection Lost'}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {isRecovering
                  ? `Attempt ${recoveryAttempt} of ${maxAttempts}. Please wait...`
                  : 'The connection to your chat partner was lost.'}
              </p>

              {!isRecovering && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={onRetryConnection}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    Retry
                  </button>
                  <button
                    onClick={handleFallbackToAudio}
                    className="px-4 py-2 text-sm bg-transparent border border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                  >
                    Try Audio Only
                  </button>
                </div>
              )}

              {isRecovering && recoveryAttempt >= 2 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Consider switching to audio-only mode for a more stable connection.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Offline state
  if (networkQuality === 'offline') {
    return (
      <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40 max-w-md mx-4">
        <div className="bg-slate-800 rounded-xl p-4 shadow-lg border-l-4 border-slate-500">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-slate-700 rounded-full">
              <WifiIcon className="w-6 h-6 text-slate-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">No Internet Connection</h3>
              <p className="text-sm text-slate-300 mt-1">
                Please check your network connection. The call will resume automatically when you're back online.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Poor network quality warning
  if ((networkQuality === 'poor' || networkQuality === 'fair') && showRecommendation && !dismissed) {
    return (
      <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-40 max-w-md mx-4">
        <div className={`rounded-xl p-4 shadow-lg border-l-4 ${
          networkQuality === 'poor'
            ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-500'
            : 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${
              networkQuality === 'poor'
                ? 'bg-orange-100 dark:bg-orange-800/50'
                : 'bg-yellow-100 dark:bg-yellow-800/50'
            }`}>
              <WifiIcon className={`w-6 h-6 ${
                networkQuality === 'poor'
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-yellow-600 dark:text-yellow-400'
              }`} />
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${
                networkQuality === 'poor'
                  ? 'text-orange-900 dark:text-orange-100'
                  : 'text-yellow-900 dark:text-yellow-100'
              }`}>
                {networkQuality === 'poor' ? 'Weak Connection' : 'Connection Quality Reduced'}
              </h3>
              <p className={`text-sm mt-1 ${
                networkQuality === 'poor'
                  ? 'text-orange-700 dark:text-orange-300'
                  : 'text-yellow-700 dark:text-yellow-300'
              }`}>
                {networkQuality === 'poor'
                  ? 'Your connection is unstable. Consider switching to audio-only for a smoother experience.'
                  : 'Video quality has been automatically reduced to improve stability.'}
              </p>

              {fallbackMode === 'video' && networkQuality === 'poor' && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleFallbackToAudio}
                    className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Switch to Audio
                  </button>
                  <button
                    onClick={() => setDismissed(true)}
                    className="px-4 py-2 text-sm bg-transparent border border-orange-600 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/50 transition-colors"
                  >
                    Keep Video
                  </button>
                </div>
              )}

              {fallbackMode === 'audio-only' && (
                <button
                  onClick={handleRetryVideo}
                  className="mt-3 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Retry Video
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
