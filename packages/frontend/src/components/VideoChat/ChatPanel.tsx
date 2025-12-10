import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { XMarkIcon, PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface ChatPanelProps {
  messages: Array<{ text: string; isMine: boolean; sender?: string }>;
  onSendMessage: (message: string) => void;
  onClose: () => void;
  isFullScreen?: boolean;
}

// Icebreaker conversation starters organized by category
const ICEBREAKERS = {
  greetings: ['Hey there!', 'Hi! How are you?', 'Hello!', 'What\'s up?'],
  questions: [
    'Where are you from?',
    'What are you up to today?',
    'What kind of music do you like?',
    'Have you watched any good shows lately?',
    'What\'s your favorite hobby?',
    'Do you have any pets?',
  ],
  fun: [
    'Tell me something interesting about yourself!',
    'What\'s the best thing that happened to you this week?',
    'If you could travel anywhere, where would you go?',
    'What\'s your dream job?',
    'What\'s your favorite food?',
  ],
};

// Get random icebreakers for display
function getRandomIcebreakers(count: number = 4): string[] {
  const allIcebreakers = [
    ...ICEBREAKERS.greetings.slice(0, 2),
    ...ICEBREAKERS.questions,
    ...ICEBREAKERS.fun,
  ];
  const shuffled = allIcebreakers.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function ChatPanel({ messages, onSendMessage, onClose, isFullScreen = false }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [icebreakers] = useState(() => getRandomIcebreakers(4));
  const [showIcebreakers, setShowIcebreakers] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messagesParent] = useAutoAnimate();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Hide icebreakers after first message is sent
  useEffect(() => {
    if (messages.length > 0) {
      setShowIcebreakers(false);
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      inputRef.current?.focus();
    }
  }, [message, onSendMessage]);

  const handleIcebreakerClick = useCallback((icebreaker: string) => {
    onSendMessage(icebreaker);
    setShowIcebreakers(false);
    inputRef.current?.focus();
  }, [onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className={isFullScreen
      ? "h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col"
      : "absolute right-4 bottom-24 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
    }>
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true" />
          <h3 className="text-white font-semibold text-base">Chat</h3>
          <span className="text-white/70 text-xs">({messages.length} messages)</span>
        </div>
        {!isFullScreen && (
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Close chat panel"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div ref={messagesParent} className={`${isFullScreen ? 'flex-1' : 'h-72'} overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/50 custom-scrollbar`}>
        {messages.length === 0 && showIcebreakers ? (
          <div className="text-center py-8">
            <div className="bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-full p-4 w-20 h-20 mx-auto mb-4 shadow-sm">
              <SparklesIcon className="w-12 h-12 text-violet-600 dark:text-violet-400" aria-hidden="true" />
            </div>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">Break the ice!</p>
            <p className="text-sm mt-2 text-gray-500 dark:text-gray-400 max-w-[220px] mx-auto">
              Click a conversation starter or type your own message
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 px-2">
              {icebreakers.map((icebreaker, idx) => (
                <button
                  key={idx}
                  onClick={() => handleIcebreakerClick(icebreaker)}
                  className="text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-full border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95"
                  aria-label={`Send: ${icebreaker}`}
                >
                  {icebreaker}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={`${idx}-${msg.text.substring(0, 10)}-${msg.isMine}`}
                className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${
                    msg.isMine
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                  {msg.sender && (
                    <p className="text-xs mt-1 opacity-75">{msg.sender}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Modern Input Area */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              aria-label="Chat message input"
              className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-gray-200 dark:border-gray-700 focus:border-violet-500 dark:focus:border-violet-400 focus:ring-0 outline-none text-sm bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 text-gray-900 dark:text-gray-100 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            aria-label="Send message"
            className="group relative p-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transform hover:scale-105 active:scale-95 disabled:transform-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
            <PaperAirplaneIcon className="h-5 w-5 relative z-10" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ChatPanel);
