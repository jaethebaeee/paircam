import { ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
  className?: string;
}

export default function Tooltip({ text, children, className = '' }: TooltipProps) {
  return (
    <div className={`relative group ${className}`}>
      {children}
      <div className="hidden sm:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-black/90"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
