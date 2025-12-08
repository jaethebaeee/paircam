import { useState, useEffect, useCallback } from 'react';

export type ConnectionErrorType =
  | 'connection_failed'
  | 'ice_failed'
  | 'peer_disconnected'
  | 'timeout'
  | 'reconnecting'
  | 'offline'
  | 'server_error';

interface ConnectionErrorOverlayProps {
  errorType: ConnectionErrorType | null;
  isReconnecting?: boolean;
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  onRetry?: () => void;
  onSkip?: () => void;
  onGoHome?: () => void;
  autoRetryEnabled?: boolean;
  autoRetryDelay?: number;
}

const ERROR_CONFIG: Record<ConnectionErrorType, {
  title: string;
  description: string;
  icon: 'wifi' | 'server' | 'clock' | 'refresh' | 'warning';
  canRetry: boolean;
  canSkip: boolean;
  severity: 'warning' | 'error' | 'info';
}> = {
  connection_failed: {
    title: 'Connection Failed',
    description: 'Unable to establish a video connection. This may be due to network issues or firewall settings.',
    icon: 'wifi',
    canRetry: true,
    canSkip: true,
    severity: 'error',
  },
  ice_failed: {
    title: 'Network Connection Issue',
    description: 'Could not establish a direct connection. You may be behind a strict firewall or NAT.',
    icon: 'warning',
    canRetry: true,
    canSkip: true,
    severity: 'error',
  },
  peer_disconnected: {
    title: 'Partner Disconnected',
    description: 'Your chat partner has left the call. You can find a new match or try reconnecting.',
    icon: 'refresh',
    canRetry: false,
    canSkip: true,
    severity: 'warning',
  },
  timeout: {
    title: 'Connection Timeout',
    description: 'The connection attempt took too long. This might be due to slow network conditions.',
    icon: 'clock',
    canRetry: true,
    canSkip: true,
    severity: 'warning',
  },
  reconnecting: {
    title: 'Reconnecting...',
    description: 'Lost connection. Attempting to reconnect automatically.',
    icon: 'refresh',
    canRetry: false,
    canSkip: false,
    severity: 'info',
  },
  offline: {
    title: 'No Internet Connection',
    description: 'Please check your network connection and try again.',
    icon: 'wifi',
    canRetry: true,
    canSkip: false,
    severity: 'error',
  },
  server_error: {
    title: 'Server Unavailable',
    description: 'Our servers are temporarily unavailable. Please try again in a moment.',
    icon: 'server',
    canRetry: true,
    canSkip: false,
    severity: 'error',
  },
};

export default function ConnectionErrorOverlay({
  errorType,
  isReconnecting = false,
  reconnectAttempt = 0,
  maxReconnectAttempts = 5,
  onRetry,
  onSkip,
  onGoHome,
  autoRetryEnabled = false,
  autoRetryDelay = 5000,
}: ConnectionErrorOverlayProps) {
  const [autoRetryCountdown, setAutoRetryCountdown] = useState<number | null>(null);

  // Auto-retry countdown logic
  useEffect(() => {
    if (!autoRetryEnabled || !errorType || isReconnecting) {
      setAutoRetryCountdown(null);
      return;
    }

    const config = ERROR_CONFIG[errorType];
    if (!config.canRetry) {
      return;
    }

    setAutoRetryCountdown(Math.ceil(autoRetryDelay / 1000));

    const interval = setInterval(() => {
      setAutoRetryCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          onRetry?.();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRetryEnabled, autoRetryDelay, errorType, isReconnecting, onRetry]);

  const handleRetry = useCallback(() => {
    setAutoRetryCountdown(null);
    onRetry?.();
  }, [onRetry]);

  if (!errorType && !isReconnecting) {
    return null;
  }

  const config = isReconnecting
    ? ERROR_CONFIG.reconnecting
    : ERROR_CONFIG[errorType!];

  const getSeverityStyles = () => {
    switch (config.severity) {
      case 'error':
        return {
          bg: 'bg-red-500/95',
          border: 'border-red-400',
          button: 'bg-white text-red-600 hover:bg-red-50',
          secondaryButton: 'bg-red-600 text-white hover:bg-red-700 border-red-400',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/95',
          border: 'border-amber-400',
          button: 'bg-white text-amber-600 hover:bg-amber-50',
          secondaryButton: 'bg-amber-600 text-white hover:bg-amber-700 border-amber-400',
        };
      case 'info':
        return {
          bg: 'bg-blue-500/95',
          border: 'border-blue-400',
          button: 'bg-white text-blue-600 hover:bg-blue-50',
          secondaryButton: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-400',
        };
    }
  };

  const styles = getSeverityStyles();

  const renderIcon = () => {
    const iconClass = 'w-12 h-12 text-white';

    switch (config.icon) {
      case 'wifi':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
            />
          </svg>
        );
      case 'server':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
        );
      case 'clock':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'refresh':
        return (
          <svg
            className={`${iconClass} ${isReconnecting ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`${styles.bg} ${styles.border} border-2 rounded-2xl shadow-2xl max-w-md mx-4 overflow-hidden`}
      >
        {/* Header */}
        <div className="p-6 text-center text-white">
          <div className="mb-4 flex justify-center">{renderIcon()}</div>
          <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
          <p className="text-white/90 text-sm leading-relaxed">{config.description}</p>

          {/* Reconnection progress */}
          {isReconnecting && (
            <div className="mt-4">
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="flex gap-1">
                  {Array.from({ length: maxReconnectAttempts }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i < reconnectAttempt
                          ? 'bg-white'
                          : i === reconnectAttempt
                          ? 'bg-white animate-pulse'
                          : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-white/80">
                  Attempt {reconnectAttempt + 1} of {maxReconnectAttempts}
                </span>
              </div>
            </div>
          )}

          {/* Auto-retry countdown */}
          {autoRetryCountdown !== null && !isReconnecting && (
            <div className="mt-4 text-sm text-white/80">
              Auto-retrying in {autoRetryCountdown}s...
            </div>
          )}
        </div>

        {/* Actions */}
        {(!isReconnecting || reconnectAttempt >= maxReconnectAttempts - 1) && (
          <div className="px-6 pb-6 flex flex-col gap-3">
            {config.canRetry && onRetry && (
              <button
                onClick={handleRetry}
                className={`${styles.button} w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try Again
              </button>
            )}

            {config.canSkip && onSkip && (
              <button
                onClick={onSkip}
                className={`${styles.secondaryButton} w-full py-3 px-4 rounded-xl font-semibold transition-all border flex items-center justify-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                </svg>
                Find New Match
              </button>
            )}

            {onGoHome && (
              <button
                onClick={onGoHome}
                className="text-white/80 hover:text-white text-sm py-2 transition-colors"
              >
                Return to Home
              </button>
            )}
          </div>
        )}

        {/* Troubleshooting tips for specific errors */}
        {(errorType === 'ice_failed' || errorType === 'connection_failed') && (
          <div className="px-6 pb-6 border-t border-white/20 pt-4">
            <details className="text-white/80 text-xs">
              <summary className="cursor-pointer hover:text-white transition-colors font-medium">
                Troubleshooting Tips
              </summary>
              <ul className="mt-2 space-y-1 list-disc list-inside text-white/70">
                <li>Check if your firewall is blocking video calls</li>
                <li>Try disabling your VPN if you&apos;re using one</li>
                <li>Switch to a different network (e.g., mobile data)</li>
                <li>Refresh the page and try again</li>
                <li>Try a different browser (Chrome recommended)</li>
              </ul>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
