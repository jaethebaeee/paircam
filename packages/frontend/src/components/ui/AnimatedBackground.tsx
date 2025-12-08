import { useMemo } from 'react';

interface AnimatedBackgroundProps {
  variant?: 'gradient-orbs' | 'grid' | 'dots';
  className?: string;
}

export default function AnimatedBackground({
  variant = 'gradient-orbs',
  className = ''
}: AnimatedBackgroundProps) {
  // Memoize orb positions to prevent re-renders
  const orbs = useMemo(() => [
    { color: 'from-primary-300/25 to-highlight-300/25', size: 'w-72 h-72', position: 'top-0 -left-20', delay: '0s' },
    { color: 'from-secondary-300/20 to-primary-300/20', size: 'w-96 h-96', position: 'top-1/4 -right-32', delay: '2s' },
    { color: 'from-accent-300/20 to-secondary-300/20', size: 'w-80 h-80', position: 'bottom-0 left-1/4', delay: '4s' },
    { color: 'from-secondary-300/15 to-primary-300/15', size: 'w-64 h-64', position: 'bottom-1/4 right-0', delay: '1s' },
  ], []);

  if (variant === 'gradient-orbs') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        {orbs.map((orb, i) => (
          <div
            key={i}
            className={`absolute ${orb.size} ${orb.position} bg-gradient-to-br ${orb.color} rounded-full blur-3xl animate-float-slow`}
            style={{ animationDelay: orb.delay }}
          />
        ))}
        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2EpIi8+PC9zdmc+')]" />
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, rgb(0 0 0) 1px, transparent 1px),
                              linear-gradient(to bottom, rgb(0 0 0) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle, rgb(0 0 0) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>
    );
  }

  return null;
}
