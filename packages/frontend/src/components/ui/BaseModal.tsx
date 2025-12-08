import { ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BaseModalProps {
  children: ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  className?: string;
  animate?: 'scaleIn' | 'slideUp' | 'fadeIn';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

const animationClasses = {
  scaleIn: 'animate-scaleIn',
  slideUp: 'animate-slideUp',
  fadeIn: 'animate-fadeIn',
};

export default function BaseModal({
  children,
  onClose,
  showCloseButton = false,
  maxWidth = 'md',
  className = '',
  animate = 'scaleIn',
}: BaseModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-y-auto ${animationClasses[animate]} ${className}`}
      >
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
