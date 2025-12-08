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
} from '@heroicons/react/24/solid';

interface VideoControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onStopChatting: () => void;
  onNext: () => void;
  onToggleChat: () => void;
  onReport: () => void;
  onBlock?: () => void;
  onPlayGame?: () => void;
  onFriendRequest?: () => void;
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
  onBlock,
  onPlayGame,
  onFriendRequest,
  isSkipping = false,
  isTextMode = false,
  isAudioOnlyMode = false,
  onSwitchToAudioOnly,
  isConnected = false,
  isGamingMode = false,
}: VideoControlsProps) {
  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      {/* Control Bar with Labels */}
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-[32px] shadow-2xl px-6 py-4 border border-white/10">
        {/* Label Row */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="text-center">
            <div className="text-white text-xs font-semibold mb-1 opacity-90">
              You're in control
            </div>
            <div className="text-gray-400 text-[10px]">
              Stop • Skip • Report anytime
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Video Toggle - Hidden in text mode */}
          {!isTextMode && (
            <div className="relative group">
              <button
                onClick={onToggleVideo}
                className={`relative p-4 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                  isVideoEnabled
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-red-500 hover:bg-red-600 animate-pulse'
                }`}
                aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {isVideoEnabled ? (
                  <VideoCameraIcon className="h-6 w-6 text-white relative z-10" />
                ) : (
                  <VideoCameraSlashIcon className="h-6 w-6 text-white relative z-10" />
                )}
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
                  {isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-black/90"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audio Toggle - Hidden in text mode */}
          {!isTextMode && (
            <div className="relative group">
              <button
                onClick={onToggleAudio}
                className={`relative p-4 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center ${
                  isAudioEnabled
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
                aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <MicrophoneIcon className="h-6 w-6 text-white relative z-10" />
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
                  {isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-black/90"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stop Chatting - Prominent red button */}
          <div className="relative group">
            <button
              onClick={onStopChatting}
              className="relative p-5 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50 transition-all duration-300 transform hover:scale-110 active:scale-95 hover:shadow-red-500/70"
              aria-label="Stop chatting"
            >
              <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <PhoneXMarkIcon className="h-7 w-7 text-white relative z-10 rotate-[135deg]" />
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
              className={`relative p-4 sm:p-4 rounded-full shadow-lg transition-all duration-300 transform min-w-[48px] min-h-[48px] flex items-center justify-center ${
                isSkipping
                  ? 'bg-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-pink-500/50 hover:scale-110 active:scale-95 hover:shadow-pink-500/70'
              }`}
              aria-label={isSkipping ? 'Finding new match, please wait...' : 'Skip to next person'}
            >
              <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <ArrowPathIcon className={`h-6 w-6 text-white relative z-10 transition-transform duration-300 ${
                isSkipping ? 'animate-spin' : 'group-hover:rotate-180'
              }`} />
            </button>
            {/* Tooltip with cooldown explanation */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <div className="bg-black/90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap text-center">
                {isSkipping ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
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
            <div className="relative group">
              <button
                onClick={onToggleChat}
                className="relative p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all duration-300 transform hover:scale-110 active:scale-95"
                aria-label="Toggle chat"
              >
                <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <ChatBubbleLeftIcon className="h-6 w-6 text-white relative z-10" />
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
                  Chat
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-black/90"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Play Game - Only show when connected and in gaming mode */}
          {isConnected && isGamingMode && onPlayGame && (
            <div className="relative group">
              <button
                onClick={onPlayGame}
                className="relative p-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/30 transition-all duration-300 transform hover:scale-110 active:scale-95"
                aria-label="Play game"
              >
                <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-2xl relative z-10">🎮</span>
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
                  Play Trivia Battle
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-black/90"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Friend Request - Only show when connected */}
          {isConnected && onFriendRequest && (
            <div className="relative group">
              <button
                onClick={onFriendRequest}
                className="relative p-4 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all duration-300 transform hover:scale-110 active:scale-95"
                aria-label="Send friend request"
              >
                <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <UserPlusIcon className="h-6 w-6 text-white relative z-10" />
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
                  Add as friend
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-black/90"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Report */}
          <div className="relative group">
            <button
              onClick={onReport}
              className="relative p-4 rounded-full bg-orange-600 hover:bg-orange-700 transition-all duration-300 transform hover:scale-110 active:scale-95"
              aria-label="Report user"
            >
              <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <FlagIcon className="h-6 w-6 text-white relative z-10" />
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
                Report inappropriate behavior
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-black/90"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Block User - Only show when connected */}
          {isConnected && onBlock && (
            <div className="relative group">
              <button
                onClick={onBlock}
                className="relative p-4 rounded-full bg-red-700 hover:bg-red-800 transition-all duration-300 transform hover:scale-110 active:scale-95"
                aria-label="Block user"
              >
                <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <NoSymbolIcon className="h-6 w-6 text-white relative z-10" />
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
                  Block user
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-black/90"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audio-Only Mode Toggle - Only show if not in text mode and callback provided */}
          {!isTextMode && onSwitchToAudioOnly && !isAudioOnlyMode && (
            <div className="relative group">
              <button
                onClick={onSwitchToAudioOnly}
                className="relative p-4 rounded-full bg-blue-600 hover:bg-blue-700 transition-all duration-300 transform hover:scale-110 active:scale-95"
                aria-label="Switch to audio only"
              >
                <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <SpeakerWaveIcon className="h-6 w-6 text-white relative z-10" />
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg">
                  Switch to audio-only
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-black/90"></div>
                  </div>
                </div>
              </div>
            </div>
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

      {/* Secondary Info Bar */}
      <div className="mt-3 text-center">
        <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-sm text-gray-300 px-4 py-2 rounded-full text-xs">
          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Safe & Moderated</span>
          <span className="text-gray-500">•</span>
          <span>Your Safety Matters</span>
        </div>
      </div>
    </div>
  );
}
