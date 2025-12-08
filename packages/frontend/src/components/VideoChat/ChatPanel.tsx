import { useState, useEffect, useRef } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { XMarkIcon, PaperAirplaneIcon, FaceSmileIcon } from '@heroicons/react/24/solid';

interface ChatPanelProps {
  messages: Array<{ text: string; isMine: boolean; sender?: string }>;
  onSendMessage: (message: string) => void;
  onClose: () => void;
  isFullScreen?: boolean;
}

// Quick reply suggestions
const QUICK_REPLIES = ['Hey! 👋', 'How are you?', 'Nice to meet you!', 'Where are you from?'];

export default function ChatPanel({ messages, onSendMessage, onClose, isFullScreen = false }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messagesParent] = useAutoAnimate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    // Hide quick replies after first message is sent or received
    if (messages.length > 0) {
      setShowQuickReplies(false);
    }
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleQuickReply = (text: string) => {
    onSendMessage(text);
    setShowQuickReplies(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={
        isFullScreen
          ? 'h-full bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col'
          : 'absolute right-4 bottom-28 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[60vh]'
      }
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-white font-semibold text-sm">Chat</span>
          <span className="text-white/40 text-xs">with Stranger</span>
        </div>
        {!isFullScreen && (
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesParent}
        className={`${isFullScreen ? 'flex-1' : 'h-64'} overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent`}
      >
        {messages.length === 0 && showQuickReplies ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <FaceSmileIcon className="h-12 w-12 text-white/20 mx-auto" />
            </div>
            <p className="text-white/60 text-sm mb-4">Start the conversation!</p>

            {/* Quick replies */}
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  onClick={() => handleQuickReply(reply)}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white/80 px-3 py-2 rounded-full transition-all hover:scale-105"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <FaceSmileIcon className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-sm">No messages yet</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={`${idx}-${msg.text.substring(0, 10)}`}
                className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                    msg.isMine
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-sm'
                      : 'bg-white/10 text-white rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm break-words">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-slate-800/50 border-t border-white/5">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 focus:border-blue-500/50 focus:bg-white/5 outline-none text-white text-sm placeholder:text-white/30 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
