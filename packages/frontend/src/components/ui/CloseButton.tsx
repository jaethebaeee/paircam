import { CloseIcon } from './icons';

interface CloseButtonProps {
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'light' | 'dark';
}

const sizeClasses = {
  sm: 'p-1',
  md: 'p-1.5 sm:p-2',
  lg: 'p-2',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const variantClasses = {
  default: 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
  light: 'text-white/80 hover:text-white hover:bg-white/20',
  dark: 'text-gray-600 hover:text-gray-900 hover:bg-gray-200',
};

export default function CloseButton({
  onClick,
  className = '',
  size = 'md',
  variant = 'default',
}: CloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full transition-all ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      aria-label="Close"
    >
      <CloseIcon className={iconSizes[size]} />
    </button>
  );
}
