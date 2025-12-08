import { ReactNode } from 'react';
import CloseButton from './CloseButton';

interface BaseModalProps {
  children: ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
  closeButtonVariant?: 'default' | 'light' | 'dark';
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
  closeButtonVariant = 'default',
  maxWidth = 'md',
  className = '',
  animate = 'scaleIn',
}: BaseModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div
        className={`relative bg-white rounded-3xl shadow-2xl w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-y-auto ${animationClasses[animate]} ${className}`}
      >
        {showCloseButton && onClose && (
          <CloseButton
            onClick={onClose}
            variant={closeButtonVariant}
            className="absolute top-4 right-4 z-10"
          />
        )}
        {children}
      </div>
    </div>
  );
}
