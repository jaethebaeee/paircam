import { useState, useEffect } from 'react';
import { getFlagUrl } from '../../hooks/useGeolocation';

interface PartnerInfoProps {
  country?: string;
  countryCode?: string;
  matchedAt?: Date;
  className?: string;
}

function ChatDuration({ startTime }: { startTime: Date }) {
  const [duration, setDuration] = useState('0:00');

  useEffect(() => {
    const updateDuration = () => {
      const diff = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="ml-auto flex items-center gap-1 sm:gap-1.5 text-white/60 text-[10px] sm:text-xs">
      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-mono">{duration}</span>
    </div>
  );
}

export default function PartnerInfo({ country, countryCode, matchedAt, className = '' }: PartnerInfoProps) {
  const displayCountry = country || 'Unknown Location';
  const flagUrl = getFlagUrl(countryCode || 'XX', 'w40');

  return (
    <div className={`flex items-center gap-2 sm:gap-3 bg-black/60 backdrop-blur-md px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl animate-slideInLeft ${className}`}>
      {/* Country Flag */}
      <div className="relative">
        <img
          src={flagUrl}
          alt={`${displayCountry} flag`}
          className="w-6 h-4 sm:w-8 sm:h-6 object-cover rounded shadow-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://flagcdn.com/w40/un.png';
          }}
        />
        {/* Online indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full border-2 border-black/60 animate-pulse" />
      </div>

      {/* Partner Info */}
      <div className="flex flex-col">
        <span className="text-white text-xs sm:text-sm font-semibold">Stranger</span>
        <span className="text-white/70 text-[10px] sm:text-xs">{displayCountry}</span>
      </div>

      {/* Chat Duration (if matched) */}
      {matchedAt && <ChatDuration startTime={matchedAt} />}
    </div>
  );
}
