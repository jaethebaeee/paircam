/**
 * Back Button Component
 * Consistent back navigation across all pages
 */

import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  to?: string;
  label?: string;
  variant?: 'default' | 'light' | 'dark';
  className?: string;
}

export default function BackButton({
  to,
  label = 'Back',
  variant = 'default',
  className = '',
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  const variantStyles = {
    default: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
    light: 'text-white/80 hover:text-white hover:bg-white/10',
    dark: 'text-gray-900 hover:text-gray-700 hover:bg-gray-200',
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${variantStyles[variant]} ${className}`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}

/**
 * Floating Back Button - Fixed position
 */
export function FloatingBackButton({
  to,
  variant = 'default',
}: {
  to?: string;
  variant?: 'default' | 'light';
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed top-4 left-4 z-50 p-3 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
        variant === 'light'
          ? 'bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white'
          : 'bg-gray-900/90 backdrop-blur-sm text-white hover:bg-gray-900'
      }`}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
    </button>
  );
}

/**
 * Cancel Button - For modals and forms
 */
export function CancelButton({
  onClick,
  label = 'Cancel',
  variant = 'default',
  className = '',
}: {
  onClick: () => void;
  label?: string;
  variant?: 'default' | 'danger' | 'subtle';
  className?: string;
}) {
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    subtle: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
  };

  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-xl font-medium transition-all ${variantStyles[variant]} ${className}`}
    >
      {label}
    </button>
  );
}

/**
 * Close Button (X) - For modals
 */
export function CloseButton({
  onClick,
  variant = 'default',
  className = '',
}: {
  onClick: () => void;
  variant?: 'default' | 'light';
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-full transition-all ${
        variant === 'light'
          ? 'text-white/70 hover:text-white hover:bg-white/10'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      } ${className}`}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
