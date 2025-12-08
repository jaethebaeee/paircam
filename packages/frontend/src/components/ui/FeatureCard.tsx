import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  variant?: 'pink' | 'purple' | 'blue' | 'green' | 'orange';
  numbered?: number;
  className?: string;
}

const variantClasses = {
  pink: {
    border: 'border-pink-100',
    iconBg: 'bg-gradient-to-br from-pink-500 to-pink-600',
  },
  purple: {
    border: 'border-purple-100',
    iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
  },
  blue: {
    border: 'border-blue-100',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
  },
  green: {
    border: 'border-green-100',
    iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
  },
  orange: {
    border: 'border-orange-100',
    iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
  },
};

export default function FeatureCard({
  icon,
  title,
  description,
  variant = 'pink',
  numbered,
  className,
}: FeatureCardProps) {
  const colors = variantClasses[variant];

  return (
    <div
      className={clsx(
        'bg-white rounded-2xl sm:rounded-3xl shadow-lg border-2 p-5 sm:p-8 text-center hover:shadow-xl transition-shadow',
        colors.border,
        className
      )}
    >
      <div
        className={clsx(
          'w-12 sm:w-16 h-12 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg',
          colors.iconBg
        )}
      >
        {numbered !== undefined ? (
          <span className="text-2xl sm:text-3xl font-bold text-white">{numbered}</span>
        ) : (
          <span className="text-white">{icon}</span>
        )}
      </div>
      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
