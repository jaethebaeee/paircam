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

// Video stream skeleton for loading state
export function VideoStreamSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('relative w-full h-full bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center', className)}>
      <div className="text-center">
        <SkeletonAvatar size={80} />
        <Skeleton variant="text" width={120} height={16} className="mx-auto mt-4 bg-gray-700" />
        <Skeleton variant="text" width={80} height={12} className="mx-auto mt-2 bg-gray-700" />
      </div>
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
    </div>
  );
}

// Chat message skeleton
export function ChatMessageSkeleton({ isRight = false }: { isRight?: boolean }) {
  return (
    <div className={clsx('flex', isRight ? 'justify-end' : 'justify-start')}>
      <div className={clsx(
        'max-w-[75%] rounded-2xl px-4 py-3',
        isRight ? 'bg-pink-100' : 'bg-gray-100'
      )}>
        <Skeleton variant="text" width={Math.floor(Math.random() * 100) + 80} height={14} />
      </div>
    </div>
  );
}
