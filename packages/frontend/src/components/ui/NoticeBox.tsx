import { ReactNode } from 'react';

interface NoticeBoxProps {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  variant?: 'warning' | 'info' | 'success' | 'error';
  className?: string;
}

const variantClasses = {
  warning: {
    container: 'bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 border-yellow-200/70',
    iconBg: 'bg-gradient-to-br from-yellow-400 to-orange-500',
    title: 'text-gray-900',
    text: 'text-gray-700',
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-500',
    title: 'text-blue-900',
    text: 'text-blue-800',
  },
  success: {
    container: 'bg-green-50 border-green-200',
    iconBg: 'bg-green-500',
    title: 'text-green-900',
    text: 'text-green-800',
  },
  error: {
    container: 'bg-red-50 border-red-200',
    iconBg: 'bg-red-500',
    title: 'text-red-900',
    text: 'text-red-800',
  },
};

const defaultIcons = {
  warning: (
    <svg className="w-5 sm:w-6 h-5 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 sm:w-6 h-5 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 sm:w-6 h-5 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 sm:w-6 h-5 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

export default function NoticeBox({
  children,
  title,
  icon,
  variant = 'warning',
  className = '',
}: NoticeBoxProps) {
  const styles = variantClasses[variant];
  const displayIcon = icon || defaultIcons[variant];

  return (
    <div className={`rounded-xl sm:rounded-2xl border-2 ${styles.container} p-4 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300 ${className}`}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <div className={`${styles.iconBg} p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-md`}>
            {displayIcon}
          </div>
        </div>
        <div className="flex-1">
          {title && (
            <p className={`text-base sm:text-lg font-bold ${styles.title} mb-1.5 sm:mb-2.5`}>
              {title}
            </p>
          )}
          <div className={`text-xs sm:text-sm ${styles.text} leading-relaxed`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple inline notice for smaller alerts
interface InlineNoticeProps {
  children: ReactNode;
  variant?: 'info' | 'warning' | 'success';
  className?: string;
}

const inlineVariantClasses = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  success: 'bg-green-50 border-green-200 text-green-800',
};

export function InlineNotice({ children, variant = 'info', className = '' }: InlineNoticeProps) {
  return (
    <div className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl border text-center text-[10px] sm:text-xs ${inlineVariantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}
