import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'bordered' | 'neon' | 'aurora' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  glow?: boolean;
}

const variantClasses = {
  default: 'bg-white shadow-lg border border-gray-100',
  glass: 'bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl',
  elevated: 'bg-white shadow-xl shadow-gray-200/50',
  bordered: 'bg-white border-2 border-gray-200',
  neon: 'bg-gray-900/95 backdrop-blur-xl border border-pink-500/50 shadow-2xl shadow-pink-500/20',
  aurora: 'bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 backdrop-blur-xl border border-white/20 shadow-2xl',
  gradient: 'bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-white shadow-2xl shadow-purple-500/25',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', hover = false, glow = false, className, children, ...props }, ref) => {
    const isNeon = variant === 'neon';
    const isGradient = variant === 'gradient';

    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-2xl transition-all duration-300 relative overflow-hidden',
          variantClasses[variant],
          paddingClasses[padding],
          hover && 'hover:shadow-2xl hover:-translate-y-1 cursor-pointer',
          glow && 'animate-glow-pulse',
          isNeon && 'text-white',
          className
        )}
        {...props}
      >
        {/* Animated border for neon variant */}
        {isNeon && (
          <div className="absolute inset-0 rounded-2xl border border-pink-500/30 animate-pulse pointer-events-none" />
        )}

        {/* Shimmer effect for gradient variant */}
        {isGradient && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
        )}

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);

Card.displayName = 'Card';

// Feature Card with icon and glow effect
export function FeatureCard({
  icon,
  title,
  description,
  gradient = 'from-pink-500 to-purple-600',
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient?: string;
  className?: string;
}) {
  return (
    <Card variant="glass" hover className={clsx('group', className)}>
      <div className={clsx(
        'w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4',
        'group-hover:scale-110 transition-transform duration-300',
        'shadow-lg',
        gradient
      )}>
        <div className="text-white">{icon}</div>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </Card>
  );
}

// Stats Card with animated counter effect
export function StatsCard({
  value,
  label,
  icon,
  trend,
  className,
}: {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}) {
  return (
    <Card variant="elevated" hover className={clsx('text-center', className)}>
      {icon && (
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-purple-600">
          {icon}
        </div>
      )}
      <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-gray-500 mt-1">{label}</div>
      {trend && (
        <div className={clsx(
          'mt-2 text-sm font-medium',
          trend.isPositive ? 'text-green-600' : 'text-red-600'
        )}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </div>
      )}
    </Card>
  );
}

// Profile Card with avatar and action buttons
export function ProfileCard({
  avatar,
  name,
  subtitle,
  actions,
  className,
}: {
  avatar: string | React.ReactNode;
  name: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card variant="glass" className={clsx('text-center', className)}>
      <div className="relative inline-block mb-4">
        {typeof avatar === 'string' ? (
          <img
            src={avatar}
            alt={name}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-xl"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white shadow-xl">
            {avatar}
          </div>
        )}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-900">{name}</h3>
      {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
      {actions && <div className="mt-4 flex gap-2 justify-center">{actions}</div>}
    </Card>
  );
}

export default Card;
