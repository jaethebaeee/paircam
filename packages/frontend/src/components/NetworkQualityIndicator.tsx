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
  type,
  downlink,
  rtt,
  onDegradeToAudio,
  showRecommendation,
}: NetworkQualityIndicatorProps) {
  const getQualityColor = () => {
    switch (quality) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-blue-500';
      case 'fair':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-orange-500';
      case 'offline':
        return 'bg-red-500';
    }
  };

  const getQualityText = () => {
    switch (quality) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Poor';
      case 'offline':
        return 'Offline';
    }
  };

  const getQualityIcon = () => {
    if (quality === 'offline') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
        </svg>
      );
    }

    const bars = quality === 'excellent' ? 4 : quality === 'good' ? 3 : quality === 'fair' ? 2 : 1;
    
    return (
      <div className="flex gap-0.5 items-end">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-1 ${bar <= bars ? 'bg-current' : 'bg-current opacity-30'}`}
            style={{ height: `${bar * 3}px` }}
          />
        ))}
      </div>
    );
  };

  const showWarning = (quality === 'fair' || quality === 'poor') && showRecommendation;

  return (
    <div className="fixed top-20 left-4 z-20">
      {/* Connection indicator */}
      <div className={`${getQualityColor()} text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium backdrop-blur-sm bg-opacity-90`}>
        {getQualityIcon()}
        <div>
          <div className="flex items-center gap-2">
            <span>{getQualityText()}</span>
            {type !== 'unknown' && <span className="text-xs opacity-75">({type.toUpperCase()})</span>}
          </div>
          {downlink !== undefined && (
            <div className="text-xs opacity-75">
              {downlink.toFixed(1)} Mbps {rtt ? `• ${rtt}ms` : ''}
            </div>
          )}
        </div>
      </div>

      {/* Warning/recommendation */}
      {showWarning && (
        <div className="mt-2 bg-yellow-500 text-white px-3 py-3 rounded-lg shadow-lg text-sm max-w-xs">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="font-semibold mb-1">Slow Connection Detected</div>
              <div className="text-xs mb-2">
                {quality === 'poor' 
                  ? 'Your connection is very slow. Consider switching to audio-only mode.' 
                  : 'Video quality has been reduced to improve performance.'}
              </div>
              {onDegradeToAudio && (
                <button
                  onClick={onDegradeToAudio}
                  className="bg-white text-yellow-700 px-3 py-1 rounded text-xs font-semibold hover:bg-yellow-50 transition-colors"
                >
                  Switch to Audio Only
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {quality === 'offline' && (
        <div className="mt-2 bg-red-500 text-white px-3 py-3 rounded-lg shadow-lg text-sm max-w-xs">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-semibold mb-1">No Internet Connection</div>
              <div className="text-xs">
                Please check your network connection and try again.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

