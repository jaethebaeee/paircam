interface LiveIndicatorProps {
  count: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: {
    container: 'px-2.5 sm:px-4 py-1.5 sm:py-2 text-sm',
    dot: 'h-2.5 w-2.5',
  },
  md: {
    container: 'px-4 sm:px-6 py-2 sm:py-3',
    dot: 'h-3 w-3',
  },
  lg: {
    container: 'px-6 py-3',
    dot: 'h-3.5 w-3.5',
  },
};

export default function LiveIndicator({
  count,
  label = 'online',
  size = 'sm',
  className = '',
}: LiveIndicatorProps) {
  const { container, dot } = sizeClasses[size];

  return (
    <div className={`inline-flex items-center gap-2 sm:gap-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-green-200 ${container} ${className}`}>
      <span className={`relative flex ${dot}`}>
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}></span>
        <span className={`relative inline-flex rounded-full ${dot} bg-green-500`}></span>
      </span>
      <span className="font-semibold text-gray-700">
        <span className="text-green-600">{count.toLocaleString()}</span> {label}
      </span>
    </div>
  );
}

// Variant for larger hero display
interface LiveCountBadgeProps {
  count: number;
  label?: string;
}

export function LiveCountBadge({ count, label = 'users online now' }: LiveCountBadgeProps) {
  return (
    <div className="inline-flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-800 px-6 py-3 rounded-full shadow-lg">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
      </span>
      <span className="font-bold text-2xl text-gray-900">{count.toLocaleString()}</span>
      <span className="font-medium text-gray-600">{label}</span>
    </div>
  );
}
