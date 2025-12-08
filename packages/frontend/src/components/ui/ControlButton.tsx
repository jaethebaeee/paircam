import { ReactNode } from 'react';

interface ControlButtonProps {
  onClick: () => void;
  tooltip: string;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  showTooltip?: boolean;
}

export default function ControlButton({
  onClick,
  tooltip,
  ariaLabel,
  children,
  className = 'bg-gray-700 hover:bg-gray-600',
  disabled = false,
  showTooltip = true,
}: ControlButtonProps) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative p-3 sm:p-4 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] flex items-center justify-center ${className}`}
        aria-label={ariaLabel}
      >
        <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        {children}
      </button>
      {showTooltip && (
        <div className="hidden sm:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-black/90"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
