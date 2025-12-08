import {
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  ArrowPathIcon,
  FlagIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/solid';
import { MicrophoneIcon as MicrophoneSlashIcon } from '@heroicons/react/24/outline';

interface VideoControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onStopChatting: () => void;
  onNext: () => void;
  onToggleChat: () => void;
  onReport: () => void;
  onFriendRequest?: () => void;
  isSkipping?: boolean;
  isTextMode?: boolean;
  isAudioOnlyMode?: boolean;
  onSwitchToAudioOnly?: () => void;
  isConnected?: boolean;
}

export default function VideoControls({
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  onStopChatting,
  onNext,
  onToggleChat,
  onReport,
  isSkipping = false,
  isTextMode = false,
  isConnected = false,
}: VideoControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-50">
      {/* Clean frosted glass background */}
      <div className="bg-black/30 backdrop-blur-xl border-t border-white/5 py-5 px-4">
        <div className="max-w-md mx-auto">
          {/* Main control bar - Hinge/Airbnb style */}
          <div className="flex items-center justify-center gap-3">
            {/* Video Toggle */}
            {!isTextMode && (
              <ControlButton
                onClick={onToggleVideo}
                isOn={isVideoEnabled}
                label={isVideoEnabled ? 'Camera on' : 'Camera off'}
              >
                {isVideoEnabled ? (
                  <VideoCameraIcon className="h-5 w-5" />
                ) : (
                  <VideoCameraSlashIcon className="h-5 w-5" />
                )}
              </ControlButton>
            )}

            {/* Audio Toggle */}
            {!isTextMode && (
              <ControlButton
                onClick={onToggleAudio}
                isOn={isAudioEnabled}
                label={isAudioEnabled ? 'Mic on' : 'Mic off'}
              >
                {isAudioEnabled ? (
                  <MicrophoneIcon className="h-5 w-5" />
                ) : (
                  <MicrophoneSlashIcon className="h-5 w-5" />
                )}
              </ControlButton>
            )}

            {/* End Call Button */}
            <button
              onClick={onStopChatting}
              className="p-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white transition-all duration-200 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 active:scale-95"
              aria-label="End call"
            >
              <PhoneXMarkIcon className="h-6 w-6 rotate-[135deg]" />
            </button>

            {/* Next Button */}
            <button
              onClick={onNext}
              disabled={isSkipping}
              className={`px-6 py-3.5 rounded-full font-medium text-sm transition-all duration-200 shadow-lg active:scale-95 flex items-center gap-2 ${
                isSkipping
                  ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed shadow-none'
                  : 'bg-white text-neutral-900 hover:bg-neutral-100 shadow-white/10 hover:shadow-white/20'
              }`}
              aria-label={isSkipping ? 'Finding...' : 'Next'}
            >
              <ArrowPathIcon
                className={`h-5 w-5 ${isSkipping ? 'animate-spin' : ''}`}
              />
              <span>{isSkipping ? 'Finding...' : 'Next'}</span>
            </button>

            {/* Chat Toggle */}
            {!isTextMode && (
              <ControlButton
                onClick={onToggleChat}
                isOn={true}
                label="Chat"
              >
                <ChatBubbleLeftIcon className="h-5 w-5" />
              </ControlButton>
            )}

            {/* Report */}
            <button
              onClick={onReport}
              disabled={!isConnected}
              className={`p-3 rounded-full transition-all duration-200 ${
                isConnected
                  ? 'text-white/50 hover:text-white/80 hover:bg-white/10'
                  : 'text-white/20 cursor-not-allowed'
              }`}
              aria-label="Report"
            >
              <FlagIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Clean control button component - Hinge/Airbnb style
function ControlButton({
  onClick,
  isOn,
  label,
  children,
}: {
  onClick: () => void;
  isOn: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3.5 rounded-full transition-all duration-200 active:scale-95 ${
        isOn
          ? 'bg-white/10 text-white hover:bg-white/15'
          : 'bg-rose-500/90 text-white hover:bg-rose-500'
      }`}
      aria-label={label}
    >
      {children}
    </button>
  );
}
