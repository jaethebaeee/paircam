import { useMemo, useEffect, useRef } from 'react';

interface AnimatedBackgroundProps {
  variant?: 'gradient-orbs' | 'grid' | 'dots' | 'particles' | 'aurora' | 'mesh';
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export default function AnimatedBackground({
  variant = 'gradient-orbs',
  className = '',
  intensity = 'medium'
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle animation effect
  useEffect(() => {
    if (variant !== 'particles') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particleCount = intensity === 'low' ? 30 : intensity === 'high' ? 100 : 60;
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      hue: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        hue: Math.random() * 60 + 280, // Purple to pink range
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, i) => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 70%, 60%, ${particle.opacity})`;
        ctx.fill();

        // Draw connections
        particles.slice(i + 1).forEach(other => {
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `hsla(300, 70%, 60%, ${0.15 * (1 - distance / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [variant, intensity]);
  // Memoize orb positions to prevent re-renders
  const orbs = useMemo(() => [
    { color: 'from-pink-400/30 to-purple-400/30', size: 'w-72 h-72', position: 'top-0 -left-20', delay: '0s' },
    { color: 'from-blue-400/20 to-cyan-400/20', size: 'w-96 h-96', position: 'top-1/4 -right-32', delay: '2s' },
    { color: 'from-purple-400/25 to-pink-400/25', size: 'w-80 h-80', position: 'bottom-0 left-1/4', delay: '4s' },
    { color: 'from-indigo-400/20 to-blue-400/20', size: 'w-64 h-64', position: 'bottom-1/4 right-0', delay: '1s' },
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

  if (variant === 'particles') {
    return (
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 pointer-events-none ${className}`}
      />
    );
  }

  if (variant === 'aurora') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <div className="absolute inset-0">
          {/* Aurora layers */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-purple-500/10 to-transparent animate-aurora-1" />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-pink-500/10 to-transparent animate-aurora-2" />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-blue-500/10 to-transparent animate-aurora-3" />
          {/* Glow effect */}
          <div className="absolute top-0 left-1/4 w-1/2 h-1/3 bg-gradient-radial from-purple-400/20 to-transparent blur-3xl animate-pulse" />
          <div className="absolute top-1/4 right-1/4 w-1/3 h-1/4 bg-gradient-radial from-pink-400/15 to-transparent blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>
    );
  }

  if (variant === 'mesh') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="meshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
            </linearGradient>
            <pattern id="meshPattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="1.5" fill="url(#meshGradient)" className="animate-pulse" />
              <line x1="0" y1="30" x2="60" y2="30" stroke="url(#meshGradient)" strokeWidth="0.5" opacity="0.3" />
              <line x1="30" y1="0" x2="30" y2="60" stroke="url(#meshGradient)" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#meshPattern)" />
        </svg>
        {/* Floating gradient blobs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '2s' }} />
      </div>
    );
  }

  return null;
}
