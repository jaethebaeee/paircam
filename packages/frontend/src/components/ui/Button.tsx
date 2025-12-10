import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import Spinner from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses = {
  primary: `
    bg-gradient-to-r from-violet-600 to-purple-600 text-white
    hover:from-violet-700 hover:to-purple-700
    shadow-lg shadow-violet-500/20
    hover:shadow-xl hover:shadow-violet-500/25
    focus:ring-violet-500/50
  `,
  secondary: `
    bg-gray-900 text-white
    hover:bg-gray-800
    shadow-lg shadow-gray-900/15
    hover:shadow-xl hover:shadow-gray-900/20
    focus:ring-gray-500/50
  `,
  danger: `
    bg-red-600 text-white
    hover:bg-red-700
    shadow-lg shadow-red-500/20
    hover:shadow-xl hover:shadow-red-500/25
    focus:ring-red-500/50
  `,
  ghost: `
    bg-transparent text-gray-700
    hover:bg-gray-100 hover:text-gray-900
    focus:ring-gray-300/50
  `,
  outline: `
    bg-white border-2 border-gray-200 text-gray-700
    hover:border-gray-300 hover:bg-gray-50
    focus:ring-gray-300/50
  `,
};

const sizeClasses = {
  sm: 'px-4 py-2 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center font-semibold rounded-xl',
          'transition-all duration-200 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
          !isDisabled && 'active:scale-[0.97]',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <Spinner size={size === 'lg' ? 'md' : 'sm'} color="current" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0 -ml-0.5">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0 -mr-0.5">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
