/**
 * Connection Statistics Dashboard
 *
 * Displays real-time WebRTC connection metrics for debugging and monitoring
 * - Bandwidth usage and latency
 * - Packet loss and jitter
 * - Video resolution and frame rate
 * - Network quality indicator
 */

import { useEffect, useState, useCallback } from 'react';
import { VideoStats } from '../../utils/codecOptimization';
import { NetworkQuality } from '../../hooks/useNetworkQuality';

interface ConnectionStatsProps {
  getStats: () => Promise<VideoStats>;
  networkQuality: NetworkQuality;
  isVisible?: boolean;
}

export default function ConnectionStats({
  getStats,
  networkQuality,
  isVisible = false,
}: ConnectionStatsProps) {
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch stats every second
  useEffect(() => {
    if (!isVisible && !isExpanded) return;

    const interval = setInterval(async () => {
      try {
        const newStats = await getStats();
        setStats(newStats);
      } catch (err) {
        console.warn('[Stats] Failed to fetch stats:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [getStats, isVisible, isExpanded]);

  const getNetworkQualityColor = useCallback((): string => {
    switch (networkQuality) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'poor':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'offline':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }, [networkQuality]);

  const getHealthStatus = useCallback((): {
    status: 'healthy' | 'warning' | 'poor';
    message: string;
  } => {
    if (!stats) return { status: 'healthy', message: 'Loading...' };

    // Check multiple metrics for overall health
    const issues: string[] = [];

    if (stats.latency > 150) {
      issues.push('High latency');
    }
    if (stats.packetsLost > 50) {
      issues.push('Packet loss');
    }
    if (stats.jitter > 0.1) {
      issues.push('High jitter');
    }
    if (stats.frameRate < 10 && stats.frameRate > 0) {
      issues.push('Low frame rate');
    }

    if (issues.length >= 2) {
      return {
        status: 'poor',
        message: `Issues: ${issues.join(', ')}`,
      };
    } else if (issues.length === 1) {
      return {
        status: 'warning',
        message: issues[0],
      };
    }

    return {
      status: 'healthy',
      message: 'Connection healthy',
    };
  }, [stats]);

  const health = getHealthStatus();

  if (!isVisible && !isExpanded) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {/* Minimized badge */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${getNetworkQualityColor()}`}
          title="Click to expand connection stats"
        >
          {networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1)}
        </button>
      )}

      {/* Expanded panel */}
      {isExpanded && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80 text-sm max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Connection Stats</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-700 text-lg font-bold"
            >
              ✕
            </button>
          </div>

          {/* Network Quality Badge */}
          <div className={`${getNetworkQualityColor()} px-3 py-2 rounded mb-3 border`}>
            <div className="font-medium">
              {networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1)}
            </div>
          </div>

          {/* Health Status */}
          <div
            className={`px-3 py-2 rounded mb-3 border ${
              health.status === 'healthy'
                ? 'bg-green-50 text-green-700 border-green-200'
                : health.status === 'warning'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            <div className="text-xs">{health.message}</div>
          </div>

          {/* Stats Grid */}
          {stats ? (
            <div className="space-y-2">
              {/* Bandwidth */}
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-700">📊 Bandwidth:</span>
                <span className="font-mono font-semibold">
                  {stats.bandwidth.toFixed(2)} Mbps
                </span>
              </div>

              {/* Latency */}
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-700">⏱️ Latency:</span>
                <span className="font-mono font-semibold">
                  {(stats.latency || 0).toFixed(0)} ms
                </span>
              </div>

              {/* Packet Loss */}
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-700">📦 Packets Lost:</span>
                <span className="font-mono font-semibold">
                  {stats.packetsLost || 0}
                </span>
              </div>

              {/* Jitter */}
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-700">📈 Jitter:</span>
                <span className="font-mono font-semibold">
                  {(stats.jitter * 1000).toFixed(0)} ms
                </span>
              </div>

              {/* Video Quality */}
              {stats.frameRate > 0 && (
                <>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">🎥 Resolution:</span>
                    <span className="font-mono font-semibold">
                      {stats.frameWidth}×{stats.frameHeight}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">🎬 Frame Rate:</span>
                    <span className="font-mono font-semibold">
                      {stats.frameRate.toFixed(1)} fps
                    </span>
                  </div>
                </>
              )}

              {/* Data Transferred */}
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                <span className="text-gray-700">⬇️ Received:</span>
                <span className="font-mono font-semibold">
                  {(stats.bytesReceived / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>

              <div className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                <span className="text-gray-700">⬆️ Sent:</span>
                <span className="font-mono font-semibold">
                  {(stats.bytesSent / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <div className="animate-spin inline-block">⏳</div>
              <div className="mt-2">Loading stats...</div>
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-3 pt-2 border-t text-xs text-gray-500 text-center">
            Updates every second
          </div>
        </div>
      )}
    </div>
  );
}
