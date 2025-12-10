import { useState, useCallback, useRef, useEffect } from 'react';

export type RecoveryState = 'stable' | 'recovering' | 'failed';

export interface ConnectionRecoveryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  onRecoveryStart?: () => void;
  onRecoverySuccess?: () => void;
  onRecoveryFailed?: () => void;
  onFallbackToAudio?: () => void;
}

export interface UseConnectionRecoveryReturn {
  recoveryState: RecoveryState;
  attemptCount: number;
  lastError: string | null;
  isRecovering: boolean;
  startRecovery: () => Promise<boolean>;
  resetRecovery: () => void;
  markRecoverySuccess: () => void;
  shouldFallbackToAudio: boolean;
}

export function useConnectionRecovery(
  options: ConnectionRecoveryOptions = {}
): UseConnectionRecoveryReturn {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    onRecoveryStart,
    onRecoverySuccess,
    onRecoveryFailed,
    onFallbackToAudio,
  } = options;

  const [recoveryState, setRecoveryState] = useState<RecoveryState>('stable');
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [shouldFallbackToAudio, setShouldFallbackToAudio] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const startRecovery = useCallback(async (): Promise<boolean> => {
    if (recoveryState === 'recovering') {
      return false; // Already recovering
    }

    cleanup();
    setRecoveryState('recovering');
    setAttemptCount(0);
    onRecoveryStart?.();

    abortControllerRef.current = new AbortController();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (abortControllerRef.current?.signal.aborted) {
        break;
      }

      setAttemptCount(attempt);

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelayMs * Math.pow(2, attempt - 1);

      console.log(`[ConnectionRecovery] Attempt ${attempt}/${maxAttempts}, waiting ${delay}ms`);

      await new Promise<void>((resolve) => {
        timeoutRef.current = setTimeout(resolve, delay);
      });

      if (abortControllerRef.current?.signal.aborted) {
        break;
      }

      // Signal that recovery can be attempted
      // The actual reconnection logic happens in the parent component
      // This hook just manages the retry state

      // Check if we should suggest audio fallback
      if (attempt >= 2) {
        setShouldFallbackToAudio(true);
        onFallbackToAudio?.();
      }
    }

    // If we've exhausted all attempts
    if (attemptCount >= maxAttempts) {
      setRecoveryState('failed');
      setLastError('Connection recovery failed after maximum attempts');
      onRecoveryFailed?.();
      return false;
    }

    return true;
  }, [
    recoveryState,
    maxAttempts,
    baseDelayMs,
    attemptCount,
    cleanup,
    onRecoveryStart,
    onRecoveryFailed,
    onFallbackToAudio,
  ]);

  const resetRecovery = useCallback(() => {
    cleanup();
    setRecoveryState('stable');
    setAttemptCount(0);
    setLastError(null);
    setShouldFallbackToAudio(false);
  }, [cleanup]);

  const markRecoverySuccess = useCallback(() => {
    cleanup();
    setRecoveryState('stable');
    setAttemptCount(0);
    setLastError(null);
    onRecoverySuccess?.();
  }, [cleanup, onRecoverySuccess]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    recoveryState,
    attemptCount,
    lastError,
    isRecovering: recoveryState === 'recovering',
    startRecovery,
    resetRecovery,
    markRecoverySuccess,
    shouldFallbackToAudio,
  };
}
