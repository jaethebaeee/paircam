import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'floating' | 'filled' | 'underlined';
  showCharCount?: boolean;
  success?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    variant = 'default',
    showCharCount = false,
    success = false,
    className,
    id,
    value,
    maxLength,
    onFocus,
    onBlur,
    ...props
  }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = Boolean(value);
    const charCount = typeof value === 'string' ? value.length : 0;

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    // Floating label variant
    if (variant === 'floating') {
      return (
        <div className="w-full">
          <div className="relative">
            {leftIcon && (
              <div className={clsx(
                'absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200',
                isFocused ? 'text-pink-500' : 'text-gray-400'
              )}>
                {leftIcon}
              </div>
            )}
            <input
              ref={ref}
              id={inputId}
              value={value}
              onFocus={handleFocus}
              onBlur={handleBlur}
              maxLength={maxLength}
              placeholder=" "
              className={clsx(
                'peer w-full px-4 pt-6 pb-2 rounded-xl border-2 bg-white transition-all duration-200',
                'text-base focus:outline-none focus:ring-0',
                leftIcon && 'pl-11',
                rightIcon && 'pr-11',
                error
                  ? 'border-red-500 focus:border-red-500'
                  : success
                    ? 'border-green-500 focus:border-green-500'
                    : 'border-gray-200 hover:border-gray-300 focus:border-pink-500',
                className
              )}
              {...props}
            />
            {label && (
              <label
                htmlFor={inputId}
                className={clsx(
                  'absolute transition-all duration-200 pointer-events-none',
                  leftIcon ? 'left-11' : 'left-4',
                  'peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400',
                  'peer-focus:top-2 peer-focus:text-xs',
                  (hasValue || isFocused) && 'top-2 text-xs',
                  error ? 'peer-focus:text-red-500' : success ? 'peer-focus:text-green-500' : 'peer-focus:text-pink-500',
                  error ? 'text-red-500' : success ? 'text-green-500' : isFocused ? 'text-pink-500' : 'text-gray-500'
                )}
              >
                {label}
              </label>
            )}
            {rightIcon && (
              <div className={clsx(
                'absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none transition-colors duration-200',
                isFocused ? 'text-pink-500' : 'text-gray-400'
              )}>
                {rightIcon}
              </div>
            )}
            {success && !error && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 animate-scaleIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            {error ? (
              <p className="text-sm text-red-600 flex items-center gap-1 animate-fadeIn">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            ) : hint ? (
              <p className="text-sm text-gray-500">{hint}</p>
            ) : (
              <span />
            )}
            {showCharCount && maxLength && (
              <span className={clsx(
                'text-xs font-medium transition-colors',
                charCount >= maxLength ? 'text-orange-500' : 'text-gray-400'
              )}>
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        </div>
      );
    }

    // Filled variant
    if (variant === 'filled') {
      return (
        <div className="w-full">
          {label && (
            <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
              {label}
            </label>
          )}
          <div className="relative group">
            {leftIcon && (
              <div className={clsx(
                'absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200',
                isFocused ? 'text-pink-500' : 'text-gray-400'
              )}>
                {leftIcon}
              </div>
            )}
            <input
              ref={ref}
              id={inputId}
              value={value}
              onFocus={handleFocus}
              onBlur={handleBlur}
              maxLength={maxLength}
              className={clsx(
                'w-full px-4 py-3 rounded-xl border-0 transition-all duration-200',
                'text-base placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-offset-0',
                leftIcon && 'pl-11',
                rightIcon && 'pr-11',
                error
                  ? 'bg-red-50 focus:ring-red-500'
                  : success
                    ? 'bg-green-50 focus:ring-green-500'
                    : 'bg-gray-100 hover:bg-gray-150 focus:bg-white focus:ring-pink-500',
                className
              )}
              {...props}
            />
            {rightIcon && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
                {rightIcon}
              </div>
            )}
          </div>
          {error && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1 animate-fadeIn">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          {hint && !error && <p className="mt-1.5 text-sm text-gray-500">{hint}</p>}
        </div>
      );
    }

    // Underlined variant
    if (variant === 'underlined') {
      return (
        <div className="w-full">
          {label && (
            <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
              {label}
            </label>
          )}
          <div className="relative">
            {leftIcon && (
              <div className={clsx(
                'absolute inset-y-0 left-0 flex items-center pointer-events-none transition-colors duration-200',
                isFocused ? 'text-pink-500' : 'text-gray-400'
              )}>
                {leftIcon}
              </div>
            )}
            <input
              ref={ref}
              id={inputId}
              value={value}
              onFocus={handleFocus}
              onBlur={handleBlur}
              maxLength={maxLength}
              className={clsx(
                'w-full px-0 py-2 border-0 border-b-2 bg-transparent transition-all duration-200',
                'text-base placeholder:text-gray-400',
                'focus:outline-none focus:ring-0',
                leftIcon && 'pl-7',
                rightIcon && 'pr-7',
                error
                  ? 'border-red-500 focus:border-red-500'
                  : success
                    ? 'border-green-500 focus:border-green-500'
                    : 'border-gray-200 hover:border-gray-300 focus:border-pink-500',
                className
              )}
              {...props}
            />
            {rightIcon && (
              <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none text-gray-400">
                {rightIcon}
              </div>
            )}
          </div>
          {error && (
            <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1 animate-fadeIn">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          {hint && !error && <p className="mt-1.5 text-sm text-gray-500">{hint}</p>}
        </div>
      );
    }

    // Default variant
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative group">
          {leftIcon && (
            <div className={clsx(
              'absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200',
              isFocused ? 'text-pink-500' : 'text-gray-400'
            )}>
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            maxLength={maxLength}
            className={clsx(
              'w-full px-4 py-3 rounded-xl border-2 bg-white transition-all duration-200',
              'text-base placeholder:text-gray-400',
              'focus:outline-none focus:ring-0',
              leftIcon && 'pl-11',
              rightIcon && 'pr-11',
              error
                ? 'border-red-500 focus:border-red-500'
                : success
                  ? 'border-green-500 focus:border-green-500'
                  : 'border-gray-200 hover:border-gray-300 focus:border-pink-500 group-hover:shadow-md',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400">
              {rightIcon}
            </div>
          )}
          {success && !error && !rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 animate-scaleIn">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          {error ? (
            <p className="text-sm text-red-600 flex items-center gap-1 animate-fadeIn">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          ) : hint ? (
            <p className="text-sm text-gray-500">{hint}</p>
          ) : (
            <span />
          )}
          {showCharCount && maxLength && (
            <span className={clsx(
              'text-xs font-medium transition-colors',
              charCount >= maxLength ? 'text-orange-500' : 'text-gray-400'
            )}>
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

// Search Input with built-in icon
export function SearchInput({
  placeholder = 'Search...',
  className,
  ...props
}: Omit<InputProps, 'leftIcon'>) {
  return (
    <Input
      placeholder={placeholder}
      leftIcon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      className={className}
      {...props}
    />
  );
}

// Password Input with toggle visibility
export function PasswordInput({
  className,
  ...props
}: Omit<InputProps, 'type' | 'rightIcon'>) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        className={clsx('pr-11', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        tabIndex={-1}
      >
        {showPassword ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}
