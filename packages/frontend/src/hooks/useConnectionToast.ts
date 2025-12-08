import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface ToastOptions {
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const TOAST_MESSAGES = {
  // Connection states
  connecting: {
    type: 'loading' as ToastType,
    message: 'Connecting to partner...',
    duration: Infinity,
  },
  connected: {
    type: 'success' as ToastType,
    message: 'Connected! Starting video chat.',
    duration: 3000,
  },
  disconnected: {
    type: 'warning' as ToastType,
    message: 'Connection lost. Searching for new match...',
    duration: 4000,
  },
  reconnecting: {
    type: 'loading' as ToastType,
    message: 'Reconnecting...',
    duration: Infinity,
  },
  reconnected: {
    type: 'success' as ToastType,
    message: 'Reconnected successfully!',
    duration: 3000,
  },

  // Errors
  connection_failed: {
    type: 'error' as ToastType,
    message: 'Connection failed. Please try again.',
    duration: 5000,
  },
  ice_failed: {
    type: 'error' as ToastType,
    message: 'Network issue detected. Check firewall settings.',
    duration: 5000,
  },
  timeout: {
    type: 'warning' as ToastType,
    message: 'Connection timed out. Retrying...',
    duration: 4000,
  },
  offline: {
    type: 'error' as ToastType,
    message: 'No internet connection. Please check your network.',
    duration: Infinity,
  },
  online: {
    type: 'success' as ToastType,
    message: 'Back online!',
    duration: 3000,
  },
  server_error: {
    type: 'error' as ToastType,
    message: 'Server unavailable. Retrying...',
    duration: 5000,
  },

  // Queue states
  queue_joined: {
    type: 'info' as ToastType,
    message: 'Searching for a match...',
    duration: 3000,
  },
  match_found: {
    type: 'success' as ToastType,
    message: 'Match found! Connecting...',
    duration: 3000,
  },
  queue_timeout: {
    type: 'warning' as ToastType,
    message: 'Taking longer than usual. Keep waiting?',
    duration: 10000,
  },

  // Peer events
  peer_disconnected: {
    type: 'info' as ToastType,
    message: 'Partner left the chat.',
    duration: 3000,
  },
  peer_skipped: {
    type: 'info' as ToastType,
    message: 'Partner skipped. Finding new match...',
    duration: 3000,
  },

  // Media errors
  camera_denied: {
    type: 'error' as ToastType,
    message: 'Camera access denied. Check browser permissions.',
    duration: 5000,
  },
  mic_denied: {
    type: 'error' as ToastType,
    message: 'Microphone access denied. Check browser permissions.',
    duration: 5000,
  },
  device_in_use: {
    type: 'warning' as ToastType,
    message: 'Camera/mic in use by another app.',
    duration: 5000,
  },

  // Rate limiting
  rate_limited: {
    type: 'warning' as ToastType,
    message: 'Too many requests. Please wait a moment.',
    duration: 5000,
  },
};

export type ToastKey = keyof typeof TOAST_MESSAGES;

export function useConnectionToast() {
  const activeToasts = useRef<Map<string, string | number>>(new Map());

  const showToast = useCallback((key: ToastKey, options?: ToastOptions) => {
    const config = TOAST_MESSAGES[key];

    // Dismiss previous toast of same key
    const existingId = activeToasts.current.get(key);
    if (existingId) {
      toast.dismiss(existingId);
    }

    const toastOptions = {
      duration: options?.duration ?? config.duration,
      dismissible: options?.dismissible ?? config.duration !== Infinity,
      action: options?.action,
    };

    let toastId: string | number;

    switch (config.type) {
      case 'success':
        toastId = toast.success(config.message, toastOptions);
        break;
      case 'error':
        toastId = toast.error(config.message, toastOptions);
        break;
      case 'warning':
        toastId = toast.warning(config.message, toastOptions);
        break;
      case 'loading':
        toastId = toast.loading(config.message, toastOptions);
        break;
      case 'info':
      default:
        toastId = toast.info(config.message, toastOptions);
        break;
    }

    activeToasts.current.set(key, toastId);
    return toastId;
  }, []);

  const dismissToast = useCallback((key: ToastKey) => {
    const toastId = activeToasts.current.get(key);
    if (toastId) {
      toast.dismiss(toastId);
      activeToasts.current.delete(key);
    }
  }, []);

  const dismissAll = useCallback(() => {
    activeToasts.current.forEach((id) => toast.dismiss(id));
    activeToasts.current.clear();
  }, []);

  const showCustomToast = useCallback(
    (
      type: ToastType,
      message: string,
      options?: ToastOptions
    ) => {
      const toastOptions = {
        duration: options?.duration ?? 4000,
        dismissible: options?.dismissible ?? true,
        action: options?.action,
      };

      switch (type) {
        case 'success':
          return toast.success(message, toastOptions);
        case 'error':
          return toast.error(message, toastOptions);
        case 'warning':
          return toast.warning(message, toastOptions);
        case 'loading':
          return toast.loading(message, toastOptions);
        case 'info':
        default:
          return toast.info(message, toastOptions);
      }
    },
    []
  );

  // Convenience methods for common scenarios
  const showConnectionError = useCallback(
    (errorMessage?: string, onRetry?: () => void) => {
      return showCustomToast('error', errorMessage || 'Connection failed', {
        duration: 6000,
        action: onRetry
          ? {
              label: 'Retry',
              onClick: onRetry,
            }
          : undefined,
      });
    },
    [showCustomToast]
  );

  const showReconnecting = useCallback(
    (attempt: number, maxAttempts: number) => {
      return showCustomToast(
        'loading',
        `Reconnecting... (${attempt}/${maxAttempts})`,
        { duration: Infinity }
      );
    },
    [showCustomToast]
  );

  return {
    showToast,
    dismissToast,
    dismissAll,
    showCustomToast,
    showConnectionError,
    showReconnecting,
  };
}
