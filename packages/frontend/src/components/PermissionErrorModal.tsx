import { memo } from 'react';

interface PermissionErrorModalProps {
  error: string;
  onDismiss: () => void;
  onRetry: () => void;
  onSwitchToAudio?: () => void;
  onSwitchToText?: () => void;
}

function PermissionErrorModal({
  error,
  onDismiss,
  onRetry,
  onSwitchToAudio,
  onSwitchToText,
}: PermissionErrorModalProps) {
  const isPermissionDenied = error.includes('denied') || error.includes('Permission');
  const isDeviceNotFound = error.includes('No camera') || error.includes('not found');
  const isDeviceInUse = error.includes('already in use');

  const getIcon = () => {
    if (isPermissionDenied) {
      return (
        <svg className="w-16 h-16 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    return (
      <svg className="w-16 h-16 text-orange-500 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  };

  const getInstructions = () => {
    if (isPermissionDenied) {
      const ua = navigator.userAgent;
      const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
      const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/Edg/.test(ua);
      const isFirefox = /Firefox/.test(ua);

      if (isChrome) {
        return (
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-left">
            <li>1. Click the camera icon <span className="inline-block w-4 h-4 align-middle" aria-hidden="true">🎥</span> in the address bar</li>
            <li>2. Select "Always allow" for camera and microphone</li>
            <li>3. Reload this page</li>
          </ol>
        );
      } else if (isSafari) {
        return (
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-left">
            <li>1. Go to Safari → Settings → Websites</li>
            <li>2. Select Camera and Microphone</li>
            <li>3. Set this site to "Allow"</li>
          </ol>
        );
      } else if (isFirefox) {
        return (
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-left">
            <li>1. Click the permissions icon in the address bar</li>
            <li>2. Enable camera and microphone</li>
            <li>3. Reload this page</li>
          </ol>
        );
      }
    }

    if (isDeviceNotFound) {
      return (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please ensure your camera and microphone are properly connected and not being used by another application.
        </p>
      );
    }

    if (isDeviceInUse) {
      return (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your camera or microphone is currently being used by another application. Please close other apps and try again.
        </p>
      );
    }

    return null;
  };

  const getTitle = () => {
    if (isPermissionDenied) return 'Camera Access Denied';
    if (isDeviceNotFound) return 'Camera Not Found';
    if (isDeviceInUse) return 'Device Already in Use';
    return 'Camera Error';
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-modal-title"
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-lg w-full p-8">
        <div className="flex flex-col items-center text-center" role="alert">
          {getIcon()}

          <h2 id="error-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white mt-4 mb-2">
            {getTitle()}
          </h2>

          <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-2xl p-4 mb-6 w-full">
            {getInstructions() || (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                To use video chat, we need access to your camera and microphone.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={onRetry}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25"
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all focus:outline-none focus:ring-2 focus:ring-pink-500/50"
              aria-label="Try requesting permissions again"
            >
              Try Again
            </button>

            {onSwitchToAudio && (
              <button
                onClick={onSwitchToAudio}
                className="w-full bg-blue-500 dark:bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                aria-label="Switch to audio only mode"
              >
                Switch to Audio Only
              </button>
            )}

            {onSwitchToText && (
              <button
                onClick={onSwitchToText}
                className="w-full bg-gray-500 dark:bg-gray-600 text-white font-semibold py-3 rounded-xl hover:bg-gray-600 dark:hover:bg-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-gray-500/50"
                aria-label="Switch to text chat mode"
              >
                Switch to Text Chat
              </button>
            )}

            <button
              onClick={onDismiss}
              className="w-full text-gray-600 dark:text-gray-400 font-medium py-2 hover:text-gray-800 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/30 rounded-xl"
              aria-label="Go back"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(PermissionErrorModal);
