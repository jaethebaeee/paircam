import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  shape: 'square' | 'circle' | 'triangle' | 'star';
  duration: number;
  delay: number;
}

interface ConfettiProps {
  isActive: boolean;
  duration?: number;
  particleCount?: number;
  colors?: string[];
  spread?: number;
  origin?: { x: number; y: number };
  onComplete?: () => void;
}

const defaultColors = [
  '#ec4899', // pink-500
  '#8b5cf6', // purple-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
];

function ConfettiPieceComponent({ piece }: { piece: ConfettiPiece }) {
  const shapeStyles: Record<string, React.CSSProperties> = {
    square: { width: 10, height: 10, borderRadius: 2 },
    circle: { width: 10, height: 10, borderRadius: '50%' },
    triangle: {
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      borderLeft: '5px solid transparent',
      borderRight: '5px solid transparent',
      borderBottom: `10px solid ${piece.color}`,
    },
    star: { width: 10, height: 10, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
  };

  return (
    <div
      className="confetti-piece"
      style={{
        position: 'fixed',
        left: `${piece.x}%`,
        top: -20,
        transform: `scale(${piece.scale}) rotate(${piece.rotation}deg)`,
        backgroundColor: piece.shape !== 'triangle' ? piece.color : undefined,
        animation: `confetti-fall ${piece.duration}s ease-out ${piece.delay}s forwards`,
        zIndex: 9999,
        pointerEvents: 'none',
        ...shapeStyles[piece.shape],
      }}
    />
  );
}

export default function Confetti({
  isActive,
  duration = 3000,
  particleCount = 50,
  colors = defaultColors,
  spread = 100,
  origin = { x: 50, y: 0 },
  onComplete,
}: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setPieces([]);
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    const shapes: Array<'square' | 'circle' | 'triangle' | 'star'> = ['square', 'circle', 'triangle', 'star'];
    const newPieces: ConfettiPiece[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: origin.x + (Math.random() - 0.5) * spread,
      y: origin.y,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      duration: 2 + Math.random() * 2,
      delay: Math.random() * 0.5,
    }));

    setPieces(newPieces);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setPieces([]);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [isActive, particleCount, colors, spread, origin.x, origin.y, duration, onComplete]);

  if (!isVisible || pieces.length === 0) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
      {pieces.map((piece) => (
        <ConfettiPieceComponent key={piece.id} piece={piece} />
      ))}
    </>,
    document.body
  );
}

// Celebration burst effect
export function CelebrationBurst({
  isActive,
  onComplete,
}: {
  isActive: boolean;
  onComplete?: () => void;
}) {
  return (
    <>
      <Confetti
        isActive={isActive}
        particleCount={80}
        origin={{ x: 25, y: 50 }}
        spread={60}
        onComplete={onComplete}
      />
      <Confetti
        isActive={isActive}
        particleCount={80}
        origin={{ x: 75, y: 50 }}
        spread={60}
      />
    </>
  );
}

// Success celebration with checkmark animation
export function SuccessCelebration({
  isActive,
  message = 'Success!',
  onComplete,
}: {
  isActive: boolean;
  message?: string;
  onComplete?: () => void;
}) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShowContent(true);
      const timer = setTimeout(() => {
        setShowContent(false);
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isActive && !showContent) return null;

  return createPortal(
    <>
      <Confetti isActive={isActive} particleCount={100} />
      <div
        className={clsx(
          'fixed inset-0 z-50 flex items-center justify-center pointer-events-none',
          showContent ? 'animate-fadeIn' : 'animate-fadeOut'
        )}
      >
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center animate-scaleIn shadow-2xl shadow-green-500/50">
            <svg
              className="w-12 h-12 text-white animate-[checkmark_0.5s_ease-out_0.2s_forwards]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ strokeDasharray: 100, strokeDashoffset: 100 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white drop-shadow-lg animate-slideUp">
            {message}
          </h2>
        </div>
      </div>
      <style>{`
        @keyframes checkmark {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fadeOut {
          to {
            opacity: 0;
          }
        }
      `}</style>
    </>,
    document.body
  );
}

// Emoji rain effect
export function EmojiRain({
  isActive,
  emojis = ['❤️', '🎉', '✨', '🌟', '💫', '🎊'],
  count = 30,
  duration = 4000,
  onComplete,
}: {
  isActive: boolean;
  emojis?: string[];
  count?: number;
  duration?: number;
  onComplete?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  const emojiPieces = useMemo(() => {
    if (!isActive) return [];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      size: 20 + Math.random() * 20,
    }));
  }, [isActive, count, emojis]);

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isActive, duration, onComplete]);

  if (!isVisible) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes emoji-fall {
          0% {
            transform: translateY(-50px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
      {emojiPieces.map((piece) => (
        <div
          key={piece.id}
          style={{
            position: 'fixed',
            left: `${piece.x}%`,
            top: 0,
            fontSize: piece.size,
            animation: `emoji-fall ${piece.duration}s ease-out ${piece.delay}s forwards`,
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {piece.emoji}
        </div>
      ))}
    </>,
    document.body
  );
}

// Fireworks effect
export function Fireworks({
  isActive,
  onComplete,
}: {
  isActive: boolean;
  onComplete?: () => void;
}) {
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    if (!isActive) {
      setBursts([]);
      return;
    }

    const createBurst = () => ({
      id: Date.now() + Math.random(),
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 40,
    });

    // Create initial bursts
    setBursts([createBurst(), createBurst(), createBurst()]);

    // Add more bursts over time
    const interval = setInterval(() => {
      setBursts(prev => [...prev.slice(-5), createBurst()]);
    }, 500);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setBursts([]);
      onComplete?.();
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isActive, onComplete]);

  if (bursts.length === 0) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes firework-burst {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
      `}</style>
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className="fixed pointer-events-none"
          style={{
            left: `${burst.x}%`,
            top: `${burst.y}%`,
            zIndex: 9999,
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: defaultColors[i % defaultColors.length],
                transform: `rotate(${i * 30}deg) translateY(-40px)`,
                animation: 'firework-burst 1s ease-out forwards',
                animationDelay: `${Math.random() * 0.2}s`,
              }}
            />
          ))}
        </div>
      ))}
    </>,
    document.body
  );
}
