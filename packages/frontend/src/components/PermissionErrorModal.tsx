interface PermissionErrorModalProps {
  error: string;
  onDismiss: () => void;
  onRetry: () => void;
  onSwitchToAudio?: () => void;
  onSwitchToText?: () => void;
}

export default function PermissionErrorModal({
  error,
  onDismiss,
  onRetry,
  onSwitchToAudio,
  onSwitchToText,
}: PermissionErrorModalProps) {
  const isPermissionDenied = error.includes('denied') || error.includes('Permission');
  const isDeviceNotFound = error.includes('No camera') || error.includes('not found');
  const isDeviceInUse = error.includes('already in use');

  const getTitle = () => {
    if (isPermissionDenied) return 'Camera access needed';
    if (isDeviceNotFound) return 'Camera not found';
    if (isDeviceInUse) return 'Device in use';
    return 'Camera error';
  };

  const getInstructions = () => {
    if (isPermissionDenied) {
      return 'Please allow camera and microphone access in your browser settings, then reload this page.';
    }
    if (isDeviceNotFound) {
      return 'Make sure your camera is connected and not being used by another app.';
    }
    if (isDeviceInUse) {
      return 'Close other apps using your camera and try again.';
    }
    return 'We need access to your camera and microphone for video chat.';
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-neutral-900 mb-2">
            {getTitle()}
          </h2>

          <p className="text-neutral-500 text-sm mb-8 leading-relaxed">
            {getInstructions()}
          </p>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={onRetry}
              className="w-full bg-neutral-900 text-white font-medium py-3.5 rounded-xl hover:bg-neutral-800 transition-colors"
            >
              Try again
            </button>

            {onSwitchToAudio && (
              <button
                onClick={onSwitchToAudio}
                className="w-full bg-neutral-100 text-neutral-900 font-medium py-3.5 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Audio only
              </button>
            )}

            {onSwitchToText && (
              <button
                onClick={onSwitchToText}
                className="w-full bg-neutral-100 text-neutral-900 font-medium py-3.5 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Text chat
              </button>
            )}

            <button
              onClick={onDismiss}
              className="w-full text-neutral-500 font-medium py-3 hover:text-neutral-700 transition-colors text-sm"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
