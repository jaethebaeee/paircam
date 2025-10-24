import { useState, useEffect, useRef } from 'react';
import { ChatBubbleLeftIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface ChatPanelProps {
  messages: Array<{ text: string; isMine: boolean; sender?: string }>;
  onSendMessage: (message: string) => void;
  onClose: () => void;
  isFullScreen?: boolean;
}

export default function ChatPanel({ messages, onSendMessage, onClose, isFullScreen = false }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className={isFullScreen 
      ? "h-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col"
      : "absolute right-4 bottom-24 w-80 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200"
    }>
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <h3 className="text-white font-semibold text-base">Chat</h3>
        </div>
        {!isFullScreen && (
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white hover:bg-white/20 p-1.5 rounded-full transition-all duration-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* Messages Area */}
      <div className={`${isFullScreen ? 'flex-1' : 'h-72'} overflow-y-auto p-4 space-y-3 bg-gray-50/50`}>
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="bg-white rounded-full p-4 w-20 h-20 mx-auto mb-3 shadow-sm">
              <ChatBubbleLeftIcon className="h-12 w-12 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600">No messages yet</p>
            <p className="text-xs mt-1 text-gray-500">Say hi to start chatting! 👋</p>
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
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
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
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-gray-200 focus:border-pink-500 focus:ring-0 outline-none text-sm bg-gray-50 focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="group relative p-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transform hover:scale-105 active:scale-95 disabled:transform-none"
          >
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <PaperAirplaneIcon className="h-5 w-5 relative z-10" />
          </button>
        </div>
      </div>
    </div>
  );
}
