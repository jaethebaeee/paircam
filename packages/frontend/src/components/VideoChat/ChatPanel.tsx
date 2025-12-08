import { useState, useEffect, useRef } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface ChatPanelProps {
  messages: Array<{ text: string; isMine: boolean; sender?: string }>;
  onSendMessage: (message: string) => void;
  onClose: () => void;
  isFullScreen?: boolean;
}

// Ice breaker suggestions
const QUICK_REPLIES = ['Hey there!', 'How are you?', 'Nice to meet you', 'Where are you from?'];

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
          ? 'h-full bg-neutral-900 rounded-3xl overflow-hidden flex flex-col'
          : 'absolute right-4 bottom-24 w-80 sm:w-96 bg-neutral-900/95 backdrop-blur-2xl rounded-3xl overflow-hidden flex flex-col max-h-[55vh] shadow-2xl ring-1 ring-white/10'
      }
    >
      {/* Header - Clean minimal */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
          <span className="text-white font-medium text-sm">Chat</span>
        </div>
        {!isFullScreen && (
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 p-1.5 hover:bg-white/5 rounded-lg transition-all"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesParent}
        className={`${isFullScreen ? 'flex-1' : 'h-56'} overflow-y-auto p-4 space-y-3`}
      >
        {messages.length === 0 && showQuickReplies ? (
          <div className="text-center py-6">
            <p className="text-neutral-400 text-sm mb-5">Start the conversation</p>

            {/* Quick replies - Hinge style pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  onClick={() => handleQuickReply(reply)}
                  className="text-sm bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-4 py-2 rounded-full transition-all border border-white/10 hover:border-white/20"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-500 text-sm">No messages yet</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={`${idx}-${msg.text.substring(0, 10)}`}
                className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 ${
                    msg.isMine
                      ? 'bg-rose-500 text-white rounded-2xl rounded-br-md'
                      : 'bg-white/10 text-white rounded-2xl rounded-bl-md'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input - Clean minimal */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-2xl bg-white/5 border-none outline-none text-white text-sm placeholder:text-neutral-500 focus:bg-white/10 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="p-3 rounded-2xl bg-rose-500 text-white hover:bg-rose-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
