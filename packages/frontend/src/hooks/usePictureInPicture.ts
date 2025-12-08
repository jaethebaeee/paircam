import { useState, useCallback, useEffect, RefObject } from 'react';

export interface UsePictureInPictureReturn {
  isPiPSupported: boolean;
  isPiPActive: boolean;
  togglePiP: () => Promise<void>;
  enterPiP: () => Promise<void>;
  exitPiP: () => Promise<void>;
  error: string | null;
}

/**
 * Hook to manage Picture-in-Picture mode for video elements
 * Allows the remote video to float in a small window while user multitasks
 */
export function usePictureInPicture(
  videoRef: RefObject<HTMLVideoElement>
): UsePictureInPictureReturn {
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if PiP is supported
  const isPiPSupported = typeof document !== 'undefined' &&
    'pictureInPictureEnabled' in document &&
    typeof (document as Document & { pictureInPictureEnabled?: boolean }).pictureInPictureEnabled === 'boolean';

  // Listen for PiP events
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleEnterPiP = () => {
      setIsPiPActive(true);
      setError(null);
    };

    const handleLeavePiP = () => {
      setIsPiPActive(false);
    };

    videoElement.addEventListener('enterpictureinpicture', handleEnterPiP);
    videoElement.addEventListener('leavepictureinpicture', handleLeavePiP);

    // Check initial state
    if (document.pictureInPictureElement === videoElement) {
      setIsPiPActive(true);
    }

    return () => {
      videoElement.removeEventListener('enterpictureinpicture', handleEnterPiP);
      videoElement.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [videoRef]);

  // Exit PiP when component unmounts or video changes
  useEffect(() => {
    return () => {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {
          // Ignore errors on cleanup
        });
      }
    };
  }, []);

  const enterPiP = useCallback(async () => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      setError('Video element not available');
      return;
    }

    if (!isPiPSupported) {
      setError('Picture-in-Picture is not supported in this browser');
      return;
    }

    if (!document.pictureInPictureEnabled) {
      setError('Picture-in-Picture is disabled');
      return;
    }

    // Check if video has a source
    if (!videoElement.srcObject && !videoElement.src) {
      setError('No video stream available');
      return;
    }

    // Check if video is ready
    if (videoElement.readyState < 2) {
      setError('Video is not ready yet');
      return;
    }

    try {
      // Exit any existing PiP first
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }

      await videoElement.requestPictureInPicture();
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enter Picture-in-Picture';

      // Provide user-friendly error messages
      if (message.includes('disallowReturnToOpener')) {
        setError('Please interact with the page first');
      } else if (message.includes('not supported')) {
        setError('Picture-in-Picture not supported for this video');
      } else {
        setError(message);
      }

      console.error('PiP error:', err);
    }
  }, [videoRef, isPiPSupported]);

  const exitPiP = useCallback(async () => {
    if (!document.pictureInPictureElement) {
      setIsPiPActive(false);
      return;
    }

    try {
      await document.exitPictureInPicture();
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to exit Picture-in-Picture';
      setError(message);
      console.error('Exit PiP error:', err);
    }
  }, []);

  const togglePiP = useCallback(async () => {
    if (isPiPActive) {
      await exitPiP();
    } else {
      await enterPiP();
    }
  }, [isPiPActive, enterPiP, exitPiP]);

  return {
    isPiPSupported,
    isPiPActive,
    togglePiP,
    enterPiP,
    exitPiP,
    error,
  };
}
