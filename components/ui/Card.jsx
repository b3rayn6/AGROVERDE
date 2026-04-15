// Componente Card reutilizable con diseño moderno y responsivo
import { forwardRef } from 'react';

const Card = forwardRef(({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'default',
  hover = false,
  ...props 
}, ref) => {
  const variants = {
    default: 'bg-white border border-gray-200 shadow-soft',
    elevated: 'bg-white border border-gray-200 shadow-medium',
    glass: 'bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-soft',
    gradient: 'bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-soft',
  };

  const paddings = {
    none: '',
    sm: 'p-3 sm:p-4',
    default: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const hoverClass = hover ? 'transition-all duration-300 hover:shadow-medium hover:-translate-y-1' : '';

  return (
    <div
      ref={ref}
      className={`rounded-xl ${variants[variant]} ${paddings[padding]} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 sm:mb-6 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg sm:text-xl font-bold text-gray-800 ${className}`}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-600 mt-1 ${className}`}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 ${className}`}>
    {children}
  </div>
);

export default Card;
