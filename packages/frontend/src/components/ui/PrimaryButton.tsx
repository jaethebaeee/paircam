import { ReactNode } from 'react';
import Spinner from './Spinner';

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'danger' | 'upgrade';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

const variantClasses = {
  primary: 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-pink-500/30 hover:shadow-pink-500/50',
  danger: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-orange-500/30 hover:shadow-orange-500/50',
  upgrade: 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 shadow-orange-500/30 hover:shadow-orange-500/50',
};

const sizeClasses = {
  sm: 'py-2.5 px-4 text-sm rounded-xl',
  md: 'py-3 sm:py-3.5 px-5 text-sm sm:text-base rounded-xl',
  lg: 'py-4 px-6 text-lg rounded-2xl',
};

export default function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  loadingText = 'Loading...',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        text-white font-bold shadow-lg transition-all duration-200
        transform hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        min-h-[44px] sm:min-h-[48px]
        ${className}
      `}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner size="sm" color="white" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
