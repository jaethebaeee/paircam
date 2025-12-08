import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'premium' | 'new' | 'live' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-700 border border-gray-200',
  success: 'bg-green-100 text-green-700 border border-green-200',
  warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  error: 'bg-red-100 text-red-700 border border-red-200',
  info: 'bg-blue-100 text-blue-700 border border-blue-200',
  premium: 'bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 text-white shadow-lg shadow-orange-400/30',
  new: 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/30',
  live: 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30',
  outline: 'bg-transparent text-gray-700 border-2 border-gray-300 hover:border-gray-400',
};

const dotColors = {
  default: 'bg-gray-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  premium: 'bg-yellow-300',
  new: 'bg-pink-300',
  live: 'bg-white',
  outline: 'bg-gray-500',
};

const sizeClasses = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export default function Badge({
  variant = 'default',
  size = 'sm',
  dot = false,
  pulse = false,
  icon,
  removable = false,
  onRemove,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full transition-all duration-200',
        variantClasses[variant],
        sizeClasses[size],
        pulse && 'animate-pulse',
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {(variant === 'live' || pulse) && (
            <span className={clsx(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              dotColors[variant]
            )} />
          )}
          <span
            className={clsx('relative inline-flex rounded-full h-2 w-2', dotColors[variant])}
            aria-hidden="true"
          />
        </span>
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 transition-colors"
          aria-label="Remove"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

// Count Badge for notifications
export function CountBadge({
  count,
  max = 99,
  variant = 'error',
  className,
}: {
  count: number;
  max?: number;
  variant?: BadgeProps['variant'];
  className?: string;
}) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge
      variant={variant}
      size="xs"
      className={clsx('min-w-[18px] justify-center', className)}
    >
      {displayCount}
    </Badge>
  );
}

// Status Badge with icon
export function StatusBadge({
  status,
  className,
}: {
  status: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}) {
  const config = {
    online: { variant: 'success' as const, label: 'Online', dot: true },
    offline: { variant: 'default' as const, label: 'Offline', dot: true },
    away: { variant: 'warning' as const, label: 'Away', dot: true },
    busy: { variant: 'error' as const, label: 'Busy', dot: true },
  };

  const { variant, label, dot } = config[status];

  return (
    <Badge variant={variant} dot={dot} pulse={status === 'online'} className={className}>
      {label}
    </Badge>
  );
}

// Tag Badge for categories
export function TagBadge({
  children,
  onRemove,
  className,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      size="sm"
      removable={Boolean(onRemove)}
      onRemove={onRemove}
      className={clsx('hover:bg-gray-100 cursor-default', className)}
    >
      {children}
    </Badge>
  );
}

// Premium/VIP Badge with shimmer effect
export function PremiumBadge({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm',
        'bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 text-white',
        'shadow-lg shadow-orange-400/30 relative overflow-hidden',
        className
      )}
    >
      <span className="text-base">⭐</span>
      <span>Premium</span>
      {/* Shimmer effect */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
    </span>
  );
}

// Live Badge with pulse animation
export function LiveBadge({ className }: { className?: string }) {
  return (
    <Badge variant="live" dot className={clsx('uppercase tracking-wider font-bold', className)}>
      Live
    </Badge>
  );
}

// New Badge with gradient
export function NewBadge({ className }: { className?: string }) {
  return (
    <Badge variant="new" size="xs" className={clsx('uppercase tracking-wider font-bold', className)}>
      New
    </Badge>
  );
}
