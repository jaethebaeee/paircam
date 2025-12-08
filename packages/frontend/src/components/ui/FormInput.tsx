import { InputHTMLAttributes, ReactNode } from 'react';
import { CheckCircleIcon } from './icons';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  error?: string;
  showError?: boolean;
  showSuccess?: boolean;
  required?: boolean;
  helperText?: ReactNode;
  characterCount?: { current: number; max: number };
}

export default function FormInput({
  label,
  error,
  showError = false,
  showSuccess = false,
  required = false,
  helperText,
  characterCount,
  ...inputProps
}: FormInputProps) {
  const hasError = showError && error;

  return (
    <div className="space-y-2 sm:space-y-3">
      {(label || characterCount) && (
        <div className="flex items-center justify-between gap-3">
          {label && (
            <label className="block text-sm font-semibold text-gray-900">
              {label} {required && <span className="text-pink-600">*</span>}
            </label>
          )}
          {characterCount && (
            <span className={`text-xs sm:text-sm font-medium transition-colors ${
              characterCount.current === characterCount.max ? 'text-orange-600' : 'text-gray-500'
            }`}>
              {characterCount.current}/{characterCount.max}
            </span>
          )}
        </div>
      )}
      <div className="relative group">
        <input
          {...inputProps}
          aria-invalid={hasError ? 'true' : undefined}
          aria-required={required ? 'true' : undefined}
          className={`w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 ${
            hasError
              ? 'border-red-400 bg-red-50/30 focus:border-red-500'
              : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 focus:border-pink-500'
          } focus:ring-4 focus:ring-pink-100 outline-none text-sm sm:text-base transition-all duration-200 placeholder:text-gray-400 shadow-sm hover:shadow-md`}
        />
        {showSuccess && !hasError && inputProps.value && (
          <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-green-500 animate-scaleIn">
            <CheckCircleIcon className="w-4 sm:w-5 h-4 sm:h-5" />
          </div>
        )}
      </div>
      {hasError && (
        <p className="text-xs sm:text-sm text-red-600 flex items-center gap-2 animate-fadeIn" role="alert">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helperText && !hasError && (
        <p className="text-xs sm:text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
