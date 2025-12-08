import { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  iconBgClass?: string;
  borderColor?: string;
  className?: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
  iconBgClass = 'bg-gradient-to-br from-pink-500 to-pink-600',
  borderColor = 'border-pink-100',
  className = '',
}: FeatureCardProps) {
  return (
    <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-lg border-2 ${borderColor} p-5 sm:p-8 text-center hover:shadow-xl transition-shadow ${className}`}>
      <div className={`${iconBgClass} w-12 sm:w-16 h-12 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">{title}</h3>
      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

// Specialized variant for numbered steps
interface StepCardProps {
  stepNumber: number;
  title: string;
  description: string;
  color: 'pink' | 'purple' | 'blue' | 'green' | 'orange';
}

const colorClasses = {
  pink: {
    bg: 'bg-gradient-to-br from-pink-500 to-pink-600',
    border: 'border-pink-100',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    border: 'border-purple-100',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    border: 'border-blue-100',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-500 to-green-600',
    border: 'border-green-100',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    border: 'border-orange-100',
  },
};

export function StepCard({ stepNumber, title, description, color }: StepCardProps) {
  const { bg, border } = colorClasses[color];

  return (
    <FeatureCard
      icon={<span className="text-2xl sm:text-3xl font-bold text-white">{stepNumber}</span>}
      title={title}
      description={description}
      iconBgClass={bg}
      borderColor={border}
    />
  );
}

// Compact variant for feature highlights (like "Why Choose Us")
interface CompactFeatureProps {
  icon: ReactNode;
  title: string;
  description: string;
  color: 'pink' | 'purple' | 'blue' | 'green' | 'orange';
}

export function CompactFeature({ icon, title, description, color }: CompactFeatureProps) {
  const { bg } = colorClasses[color];

  return (
    <div className="text-center">
      <div className={`${bg} w-12 sm:w-14 h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-gray-600">{description}</p>
    </div>
  );
}
