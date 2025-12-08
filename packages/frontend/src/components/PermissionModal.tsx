import { useState } from 'react';
import {
  VideoCameraIcon,
  MicrophoneIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import Spinner from './ui/Spinner';

interface PermissionModalProps {
  onPermissionsGranted: () => void;
  onPermissionsDenied: () => void;
}

export default function PermissionModal({ onPermissionsGranted, onPermissionsDenied }: PermissionModalProps) {
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-scaleIn">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Camera & Microphone Access
          </h2>
          <p className="text-gray-600">
            We need your permission to enable video and voice chat
          </p>
        </div>

        {/* Permissions List */}
        <div className="space-y-4 mb-6">
          <div className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${
            cameraGranted 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
              cameraGranted ? 'bg-green-500' : 'bg-pink-500'
            }`}>
              {cameraGranted ? (
                <CheckCircleIcon className="w-6 h-6 text-white" />
              ) : (
                <VideoCameraIcon className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Camera Access</h3>
              <p className="text-sm text-gray-600">
                Required to show your video to others during calls
              </p>
            </div>
          </div>

          <div className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${
            micGranted 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
              micGranted ? 'bg-green-500' : 'bg-purple-500'
            }`}>
              {micGranted ? (
                <CheckCircleIcon className="w-6 h-6 text-white" />
              ) : (
                <MicrophoneIcon className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Microphone Access</h3>
              <p className="text-sm text-gray-600">
                Required for voice communication during calls
              </p>
            </div>
          </div>
        </div>

        {/* Safety Notice */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Safety Reminder</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
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
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6 animate-fadeIn">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-900 mb-1">Permission Error</h4>
                <p className="text-sm text-red-800">{error}</p>
                <p className="text-xs text-red-700 mt-2">
                  <strong>How to fix:</strong> Click the camera icon in your browser's address bar and allow access, then try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <h4 className="font-semibold text-gray-900 mb-2 text-sm">🔒 Your Privacy</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
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
            className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
            disabled={isRequesting}
          >
            Cancel
          </button>
          <button
            onClick={requestPermissions}
            disabled={isRequesting}
            className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-700 hover:to-purple-700 shadow-lg shadow-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequesting ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="md" color="white" />
                Requesting...
              </span>
            ) : (
              'Allow Camera & Microphone'
            )}
          </button>
        </div>

        {/* Help Text */}
        <p className="text-center text-xs text-gray-500 mt-4">
          By continuing, you agree to our{' '}
          <a href="#" className="text-pink-600 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-pink-600 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

