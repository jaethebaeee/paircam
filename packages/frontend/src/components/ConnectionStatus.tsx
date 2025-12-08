import { useState, useEffect } from 'react';
import { healthApi } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

export default function ConnectionStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');
  const [isVisible, setIsVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout;

    const checkConnection = async () => {
      try {
        const { connected } = await healthApi.check();

        if (!isMounted) return;

        if (connected) {
          if (connectionState !== 'connected') {
            setConnectionState('connected');
            // Show "connected" briefly then hide
            setIsVisible(true);
            setTimeout(() => {
              if (isMounted) setIsVisible(false);
            }, 2000);
          }
          setRetryCount(0);
        } else {
          throw new Error('Not connected');
        }
      } catch {
        if (!isMounted) return;

        if (retryCount < 3) {
          setConnectionState('reconnecting');
          setIsVisible(true);
          setRetryCount((prev) => prev + 1);

          // Exponential backoff retry
          const delay = Math.pow(2, retryCount) * 1000;
          retryTimeout = setTimeout(checkConnection, delay);
        } else {
          setConnectionState('disconnected');
          setIsVisible(true);
        }
      }
    };

    // Initial check after a short delay
    const initialTimeout = setTimeout(checkConnection, 1000);

    // Periodic health checks every 30 seconds
    const checkInterval = setInterval(checkConnection, 30000);

    // Also check on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkConnection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check on online/offline events
    const handleOnline = () => {
      setRetryCount(0);
      checkConnection();
    };

    const handleOffline = () => {
      setConnectionState('disconnected');
      setIsVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      clearTimeout(initialTimeout);
      clearTimeout(retryTimeout);
      clearInterval(checkInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionState, retryCount]);

  const handleRetry = () => {
    setRetryCount(0);
    setConnectionState('reconnecting');
  };

  const statusConfig = {
    connected: {
      bg: 'bg-green-50 border-green-200',
      icon: 'text-green-500',
      text: 'text-green-700',
      message: 'Connected',
    },
    reconnecting: {
      bg: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-500',
      text: 'text-yellow-700',
      message: 'Reconnecting...',
    },
    disconnected: {
      bg: 'bg-red-50 border-red-200',
      icon: 'text-red-500',
      text: 'text-red-700',
      message: 'Connection lost',
    },
  };

  const config = statusConfig[connectionState];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${config.bg} border rounded-full px-4 py-2 shadow-lg flex items-center gap-2`}
        >
          {connectionState === 'connected' && (
            <svg className={`w-4 h-4 ${config.icon}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}

          {connectionState === 'reconnecting' && (
            <svg className={`w-4 h-4 ${config.icon} animate-spin`} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}

          {connectionState === 'disconnected' && (
            <svg className={`w-4 h-4 ${config.icon}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}

          <span className={`text-sm font-medium ${config.text}`}>
            {config.message}
          </span>

          {connectionState === 'disconnected' && (
            <button
              onClick={handleRetry}
              className="ml-2 text-sm font-semibold text-red-600 hover:text-red-700 underline"
            >
              Retry
            </button>
          )}

          {connectionState === 'connected' && (
            <button
              onClick={() => setIsVisible(false)}
              className={`ml-1 ${config.icon} hover:opacity-70`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
