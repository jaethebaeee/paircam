import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const variantClasses = {
  default: 'bg-white shadow-lg border border-gray-100',
  glass: 'bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl',
  elevated: 'bg-white shadow-xl shadow-gray-200/50',
  bordered: 'bg-white border-2 border-gray-200',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', hover = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-2xl transition-all duration-300',
          variantClasses[variant],
          paddingClasses[padding],
          hover && 'hover:shadow-2xl hover:-translate-y-1',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
