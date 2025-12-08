import {
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  ArrowPathIcon,
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
  isSkipping = false,
  isTextMode = false,
}: VideoControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 pb-8 pt-20 bg-gradient-to-t from-black/60 to-transparent">
      <div className="flex items-center justify-center gap-4">
        {/* Camera */}
        {!isTextMode && (
          <button
            onClick={onToggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isVideoEnabled
                ? 'bg-white/20 text-white'
                : 'bg-white text-neutral-900'
            }`}
          >
            {isVideoEnabled ? (
              <VideoCameraIcon className="w-5 h-5" />
            ) : (
              <VideoCameraSlashIcon className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Mic */}
        {!isTextMode && (
          <button
            onClick={onToggleAudio}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isAudioEnabled
                ? 'bg-white/20 text-white'
                : 'bg-white text-neutral-900'
            }`}
          >
            {isAudioEnabled ? (
              <MicrophoneIcon className="w-5 h-5" />
            ) : (
              <MicrophoneSlashIcon className="w-5 h-5" />
            )}
          </button>
        )}

        {/* End */}
        <button
          onClick={onStopChatting}
          className="w-14 h-14 rounded-full bg-rose-500 text-white flex items-center justify-center"
        >
          <PhoneXMarkIcon className="w-6 h-6 rotate-[135deg]" />
        </button>

        {/* Next */}
        <button
          onClick={onNext}
          disabled={isSkipping}
          className={`h-12 px-6 rounded-full font-medium text-sm flex items-center gap-2 transition-all ${
            isSkipping
              ? 'bg-white/20 text-white/50'
              : 'bg-white text-neutral-900'
          }`}
        >
          <ArrowPathIcon className={`w-5 h-5 ${isSkipping ? 'animate-spin' : ''}`} />
          {isSkipping ? 'Finding...' : 'Next'}
        </button>

        {/* Chat */}
        {!isTextMode && (
          <button
            onClick={onToggleChat}
            className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <ChatBubbleLeftIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
