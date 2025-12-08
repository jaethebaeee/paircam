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
      {/* Gradient background */}
      <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          {/* Main control bar */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            {/* Video Toggle */}
            {!isTextMode && (
              <ControlButton
                onClick={onToggleVideo}
                isActive={isVideoEnabled}
                activeColor="bg-white/20"
                inactiveColor="bg-red-500"
                tooltip={isVideoEnabled ? 'Camera off' : 'Camera on'}
              >
                {isVideoEnabled ? (
                  <VideoCameraIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                ) : (
                  <VideoCameraSlashIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                )}
              </ControlButton>
            )}

            {/* Audio Toggle */}
            {!isTextMode && (
              <ControlButton
                onClick={onToggleAudio}
                isActive={isAudioEnabled}
                activeColor="bg-white/20"
                inactiveColor="bg-red-500"
                tooltip={isAudioEnabled ? 'Mute' : 'Unmute'}
              >
                {isAudioEnabled ? (
                  <MicrophoneIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                ) : (
                  <MicrophoneSlashIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                )}
              </ControlButton>
            )}

            {/* Stop Button - Red */}
            <button
              onClick={onStopChatting}
              className="relative p-4 sm:p-5 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-red-500/30"
              aria-label="Stop"
            >
              <PhoneXMarkIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white rotate-[135deg]" />
            </button>

            {/* Next Button - Gradient */}
            <button
              onClick={onNext}
              disabled={isSkipping}
              className={`relative p-4 sm:p-5 rounded-full transition-all duration-200 transform shadow-lg ${
                isSkipping
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 hover:scale-105 active:scale-95 shadow-blue-500/30'
              }`}
              aria-label={isSkipping ? 'Finding...' : 'Next'}
            >
              <ArrowPathIcon
                className={`h-6 w-6 sm:h-7 sm:w-7 text-white ${isSkipping ? 'animate-spin' : ''}`}
              />
            </button>

            {/* Chat Toggle */}
            {!isTextMode && (
              <ControlButton
                onClick={onToggleChat}
                isActive={true}
                activeColor="bg-white/20"
                inactiveColor="bg-white/20"
                tooltip="Chat"
              >
                <ChatBubbleLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </ControlButton>
            )}

            {/* Report */}
            <ControlButton
              onClick={onReport}
              isActive={true}
              activeColor="bg-white/10"
              inactiveColor="bg-white/10"
              tooltip="Report"
              disabled={!isConnected}
            >
              <FlagIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white/70 hover:text-white" />
            </ControlButton>
          </div>

          {/* Status text */}
          <div className="mt-4 text-center">
            {isSkipping ? (
              <p className="text-white/60 text-sm animate-pulse">Finding someone new...</p>
            ) : isConnected ? (
              <p className="text-green-400/80 text-sm flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Connected
              </p>
            ) : (
              <p className="text-white/40 text-xs">Press Next to find someone</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable control button component
function ControlButton({
  onClick,
  isActive,
  activeColor,
  inactiveColor,
  tooltip,
  children,
  disabled = false,
}: {
  onClick: () => void;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  tooltip: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative p-3 sm:p-4 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 backdrop-blur-sm ${
          isActive ? activeColor : inactiveColor
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={tooltip}
      >
        {children}
      </button>

      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
          {tooltip}
        </div>
      </div>
    </div>
  );
}
