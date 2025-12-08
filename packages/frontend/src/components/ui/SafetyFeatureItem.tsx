import { ReactNode } from 'react';

interface SafetyFeatureItemProps {
  icon: ReactNode;
  title: string;
  description: string;
  color?: 'green' | 'blue' | 'purple' | 'orange';
}

const colorClasses = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
};

export default function SafetyFeatureItem({
  icon,
  title,
  description,
  color = 'green',
}: SafetyFeatureItemProps) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="flex-shrink-0">
        <div className={`w-8 sm:w-10 h-8 sm:h-10 ${colorClasses[color]} rounded-lg sm:rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-0.5 sm:mb-1">{title}</h3>
        <p className="text-xs sm:text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}
