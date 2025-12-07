import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export default function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-xl',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton-wave',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={clsx(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

// Skeleton group for common patterns
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-white rounded-2xl p-6 shadow-lg', className)}>
      <Skeleton variant="rounded" height={160} className="mb-4" />
      <Skeleton variant="text" width="70%" className="mb-2" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="40%" />
    </div>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton variant="circular" width={size} height={size} />;
}
