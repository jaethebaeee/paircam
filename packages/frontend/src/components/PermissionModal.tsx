import { useState, memo } from 'react';
import {
  VideoCameraIcon,
  MicrophoneIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface PermissionModalProps {
  onPermissionsGranted: () => void;
  onPermissionsDenied: () => void;
}

function PermissionModal({ onPermissionsGranted, onPermissionsDenied }: PermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);

  const requestPermissions = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Check which permissions were granted
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      setCameraGranted(videoTracks.length > 0);
      setMicGranted(audioTracks.length > 0);

      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());

      // If both granted, proceed
      if (videoTracks.length > 0 && audioTracks.length > 0) {
        setTimeout(() => {
          onPermissionsGranted();
        }, 500);
      } else {
        setError('Both camera and microphone permissions are required to use this service.');
      }
    } catch (err) {
      console.error('Permission error:', err);

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera and microphone access was denied. Please allow access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera or microphone found. Please connect a device and try again.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera or microphone is already in use by another application.');
        } else {
          setError(`Failed to access camera/microphone: ${err.message}`);
        }
      } else {
        setError('Failed to access camera and microphone. Please check your browser settings.');
      }

      setIsRequesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-modal-title"
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-scaleIn">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mb-4" aria-hidden="true">
            <ShieldCheckIcon className="w-8 h-8 text-white" />
          </div>
          <h2 id="permission-modal-title" className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Camera & Microphone Access
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We need your permission to enable video and voice chat
          </p>
        </div>

        {/* Permissions List */}
        <div className="space-y-4 mb-6" role="region" aria-label="Permission status">
          <div className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${
            cameraGranted
              ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
          }`}>
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
              cameraGranted ? 'bg-green-500' : 'bg-pink-500'
            }`} aria-hidden="true">
              {cameraGranted ? (
                <CheckCircleIcon className="w-6 h-6 text-white" />
              ) : (
                <VideoCameraIcon className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Camera Access</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Required to show your video to others during calls
              </p>
              {cameraGranted && <span className="sr-only">Granted</span>}
            </div>
          </div>

          <div className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${
            micGranted
              ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
          }`}>
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
              micGranted ? 'bg-green-500' : 'bg-purple-500'
            }`} aria-hidden="true">
              {micGranted ? (
                <CheckCircleIcon className="w-6 h-6 text-white" />
              ) : (
                <MicrophoneIcon className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Microphone Access</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Required for voice communication during calls
              </p>
              {micGranted && <span className="sr-only">Granted</span>}
            </div>
          </div>
        </div>

        {/* Safety Notice */}
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">Safety Reminder</h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                <li>• Never share personal information (address, phone, email)</li>
                <li>• Report inappropriate behavior immediately</li>
                <li>• You can end any call at any time</li>
                <li>• You must be 18 or older to use this service</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 rounded-2xl p-4 mb-6 animate-fadeIn" role="alert">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" aria-hidden="true" />
              <div>
                <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">Permission Error</h4>
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                  <strong>How to fix:</strong> Click the camera icon in your browser's address bar and allow access, then try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">🔒 Your Privacy</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Your camera and microphone will only be active during video calls.
            We do not record, store, or share your video or audio.
            All connections are peer-to-peer and encrypted.
            You can disable your camera or microphone at any time during a call.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onPermissionsDenied}
            className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-gray-500/30"
            disabled={isRequesting}
          >
            Cancel
          </button>
          <button
            onClick={requestPermissions}
            disabled={isRequesting}
            className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-700 hover:to-purple-700 shadow-lg shadow-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-pink-500/50"
          >
            {isRequesting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Requesting...
              </span>
            ) : (
              'Allow Camera & Microphone'
            )}
          </button>
        </div>

        {/* Help Text */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          By continuing, you agree to our{' '}
          <a href="#" className="text-pink-600 dark:text-pink-400 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-pink-600 dark:text-pink-400 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

export default memo(PermissionModal);
