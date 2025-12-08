import { ReactNode, useEffect, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  headerVariant?: 'default' | 'success' | 'danger' | 'warning';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  footer?: ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

const headerVariantClasses = {
  default: 'bg-gradient-to-r from-pink-500 to-purple-600',
  success: 'bg-gradient-to-r from-green-500 to-emerald-500',
  danger: 'bg-gradient-to-r from-red-500 to-pink-500',
  warning: 'bg-gradient-to-r from-yellow-500 to-orange-500',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size = 'md',
  headerVariant = 'default',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  footer,
}: ModalProps) {
  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={clsx(
          'bg-white rounded-3xl w-full overflow-hidden shadow-2xl animate-scaleIn max-h-[90vh] flex flex-col',
          sizeClasses[size]
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={clsx(
              'px-6 py-4 flex items-center justify-between shrink-0',
              headerVariantClasses[headerVariant]
            )}
          >
            <div className="flex items-center gap-3">
              {icon && (
                <div className="bg-white/20 p-2 rounded-xl">
                  {icon}
                </div>
              )}
              {title && (
                <div>
                  <h2 id="modal-title" className="text-white font-bold text-lg">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-white/80 text-xs">{subtitle}</p>
                  )}
                </div>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all"
                aria-label="Close modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 pb-6 pt-0 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
