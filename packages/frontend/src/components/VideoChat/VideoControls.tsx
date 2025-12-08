import { useState } from 'react';
import {
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  ArrowPathIcon,
  FlagIcon,
  ChatBubbleLeftIcon,
  SpeakerWaveIcon,
  UserPlusIcon,
  NoSymbolIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/solid';
import ControlButton from '../ui/ControlButton';
import { CheckCircleIcon, SpinnerIcon } from '../ui/icons';

const REACTION_EMOJIS = ['👋', '😂', '❤️', '🔥', '👍', '😮', '🎉', '💀'];

interface VideoControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onStopChatting: () => void;
  onNext: () => void;
  onToggleChat: () => void;
  onReport: () => void;
  onPlayGame?: () => void;
  onFriendRequest?: () => void;
  onBlockUser?: () => void;
  onSendReaction?: (emoji: string) => void;
  isSkipping?: boolean;
  isTextMode?: boolean;
  isAudioOnlyMode?: boolean;
  onSwitchToAudioOnly?: () => void;
  isConnected?: boolean;
  isGamingMode?: boolean;
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
  onPlayGame,
  onFriendRequest,
  onBlockUser,
  onSendReaction,
  isSkipping = false,
  isTextMode = false,
  isAudioOnlyMode = false,
  onSwitchToAudioOnly,
  isConnected = false,
  isGamingMode = false,
}: VideoControlsProps) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-50 w-full px-2 sm:px-0 sm:w-auto">
      {/* Control Bar with Labels */}
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl sm:rounded-[32px] shadow-2xl px-3 sm:px-6 py-3 sm:py-4 border border-white/10 max-w-full overflow-x-auto">
        {/* Label Row - Hidden on mobile for space */}
        <div className="hidden sm:flex items-center justify-center gap-3 mb-3">
          <div className="text-center">
            <div className="text-white text-xs font-semibold mb-1 opacity-90">
              You're in control
            </div>
            <div className="text-gray-400 text-[10px]">
              Stop • Skip • Report anytime
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {/* Video Toggle - Hidden in text mode */}
          {!isTextMode && (
            <ControlButton
              onClick={onToggleVideo}
              tooltip={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              ariaLabel={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              className={isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600 animate-pulse'}
            >
              {isVideoEnabled ? (
                <VideoCameraIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white relative z-10" />
              ) : (
                <VideoCameraSlashIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white relative z-10" />
              )}
            </ControlButton>
          )}

          {/* Audio Toggle - Hidden in text mode */}
          {!isTextMode && (
            <ControlButton
              onClick={onToggleAudio}
              tooltip={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              ariaLabel={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              className={isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}
            >
              <MicrophoneIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white relative z-10" />
            </ControlButton>
          )}

          {/* Stop Chatting - Prominent red button */}
          <div className="relative group">
            <button
              onClick={onStopChatting}
              className="relative p-3.5 sm:p-5 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50 transition-all duration-300 transform hover:scale-110 active:scale-95 hover:shadow-red-500/70 min-h-[48px] min-w-[48px] sm:min-h-[56px] sm:min-w-[56px] flex items-center justify-center"
              aria-label="Stop chatting"
            >
              <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <PhoneXMarkIcon className="h-5 w-5 sm:h-7 sm:w-7 text-white relative z-10 rotate-[135deg]" />
            </button>
            <div className="hidden sm:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
                Stop chatting
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-black/90"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Next - Pink/Purple refresh button with enhanced animation */}
          <div className="relative group">
            <button
              onClick={onNext}
              disabled={isSkipping}
              className={`relative p-3 sm:p-4 rounded-full shadow-lg transition-all duration-300 transform min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] flex items-center justify-center ${
                isSkipping
                  ? 'bg-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-pink-500/50 hover:scale-110 active:scale-95 hover:shadow-pink-500/70'
              }`}
              aria-label={isSkipping ? 'Finding new match, please wait...' : 'Skip to next person'}
            >
              <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <ArrowPathIcon className={`h-5 w-5 sm:h-6 sm:w-6 text-white relative z-10 transition-transform duration-300 ${
                isSkipping ? 'animate-spin' : 'group-hover:rotate-180'
              }`} />
            </button>
            <div className="hidden sm:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <div className="bg-black/90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap text-center">
                {isSkipping ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <SpinnerIcon className="h-3 w-3" />
                      Finding new match...
                    </span>
                    <span className="text-gray-400 text-[10px] block mt-0.5">2 sec cooldown</span>
                  </>
                ) : (
                  'Next person'
                )}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-black/90"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat - Hidden in text mode since chat is always visible */}
          {!isTextMode && (
            <ControlButton
              onClick={onToggleChat}
              tooltip="Chat"
              ariaLabel="Toggle chat"
            >
              <ChatBubbleLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white relative z-10" />
            </ControlButton>
          )}

          {/* Play Game - Only show when connected and in gaming mode */}
          {isConnected && isGamingMode && onPlayGame && (
            <ControlButton
              onClick={onPlayGame}
              tooltip="Play Trivia Battle"
              ariaLabel="Play game"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/30"
            >
              <span className="text-xl sm:text-2xl relative z-10">🎮</span>
            </ControlButton>
          )}

          {/* Friend Request - Only show when connected */}
          {isConnected && onFriendRequest && (
            <ControlButton
              onClick={onFriendRequest}
              tooltip="Add as friend"
              ariaLabel="Send friend request"
              className="bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30"
            >
              <UserPlusIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white relative z-10" />
            </ControlButton>
          )}

          {/* Report */}
          <ControlButton
            onClick={onReport}
            tooltip="Report inappropriate behavior"
            ariaLabel="Report user"
            className="bg-orange-600 hover:bg-orange-700"
          >
            <FlagIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white relative z-10" />
          </ControlButton>

          {/* Block User - Only show when connected */}
          {isConnected && onBlockUser && (
            <ControlButton
              onClick={onBlockUser}
              tooltip="Block this user"
              ariaLabel="Block user"
              className="bg-red-700 hover:bg-red-800"
            >
              <NoSymbolIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white relative z-10" />
            </ControlButton>
          )}

          {/* Reactions - Only show when connected */}
          {isConnected && onSendReaction && (
            <div className="relative group">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className={`relative p-3 sm:p-4 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] flex items-center justify-center ${
                  showReactions
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                aria-label="Send reaction"
              >
                <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <FaceSmileIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white relative z-10" />
              </button>
              {/* Reactions Picker */}
              {showReactions && (
                <div className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 animate-fadeIn">
                  <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl px-3 py-2 shadow-2xl border border-white/10 flex gap-1">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onSendReaction(emoji);
                          setShowReactions(false);
                        }}
                        className="p-2 hover:bg-white/10 rounded-xl transition-all hover:scale-125 active:scale-95 text-xl sm:text-2xl min-w-[40px] min-h-[40px] flex items-center justify-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-8 border-transparent border-t-gray-900/95"></div>
                  </div>
                </div>
              )}
              {/* Tooltip - Hidden when picker is open */}
              {!showReactions && (
                <div className="hidden sm:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
                    Send reaction
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-black/90"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audio-Only Mode Toggle - Only show if not in text mode and callback provided */}
          {!isTextMode && onSwitchToAudioOnly && !isAudioOnlyMode && (
            <ControlButton
              onClick={onSwitchToAudioOnly}
              tooltip="Switch to audio-only"
              ariaLabel="Switch to audio only"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <SpeakerWaveIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white relative z-10" />
            </ControlButton>
          )}
        </div>

        {/* Audio-Only Mode Indicator */}
        {isAudioOnlyMode && (
          <div className="mt-3 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400 text-blue-200 px-3 py-1.5 rounded-full text-xs font-medium">
              <SpeakerWaveIcon className="h-4 w-4" />
              Audio-Only Mode
            </div>
          </div>
        )}
      </div>

      {/* Secondary Info Bar - Hidden on mobile for space */}
      <div className="hidden sm:block mt-3 text-center">
        <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-sm text-gray-300 px-4 py-2 rounded-full text-xs">
          <CheckCircleIcon className="w-4 h-4 text-green-400" />
          <span>Safe & Moderated</span>
          <span className="text-gray-500">•</span>
          <span>Your Safety Matters</span>
        </div>
      </div>
    </div>
  );
}
