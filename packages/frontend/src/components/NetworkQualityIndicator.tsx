import { NetworkQuality, ConnectionType } from '../hooks/useNetworkQuality';

interface NetworkQualityIndicatorProps {
  quality: NetworkQuality;
  type: ConnectionType;
  downlink?: number;
  rtt?: number;
  onDegradeToAudio?: () => void;
  showRecommendation?: boolean;
}

export default function NetworkQualityIndicator({
  quality,
  onDegradeToAudio,
  showRecommendation,
}: NetworkQualityIndicatorProps) {
  const showWarning = (quality === 'fair' || quality === 'poor') && showRecommendation;

  if (quality === 'excellent' || quality === 'good') {
    return null; // Don't show anything for good connections
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
      {quality === 'offline' ? (
        <div className="bg-neutral-900/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-sm font-medium">No connection</span>
        </div>
      ) : showWarning ? (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 max-w-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-sm font-medium text-neutral-900">Slow connection</span>
          </div>
          <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
            {quality === 'poor'
              ? 'Your connection is slow. Try switching to audio only.'
              : 'Video quality reduced to improve performance.'}
          </p>
          {onDegradeToAudio && quality === 'poor' && (
            <button
              onClick={onDegradeToAudio}
              className="w-full text-sm font-medium text-neutral-900 bg-neutral-100 hover:bg-neutral-200 py-2.5 rounded-xl transition-colors"
            >
              Switch to audio
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
