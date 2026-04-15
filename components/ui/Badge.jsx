// Componente Badge reutilizable con múltiples variantes
import { forwardRef } from 'react';

const Badge = forwardRef(({ 
  children, 
  className = '', 
  variant = 'default',
  size = 'default',
  dot = false,
  ...props 
}, ref) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800 border border-gray-300',
    primary: 'bg-primary-100 text-primary-800 border border-primary-300',
    success: 'bg-green-100 text-green-800 border border-green-300',
    danger: 'bg-red-100 text-red-800 border border-red-300',
    warning: 'bg-amber-100 text-amber-800 border border-amber-300',
    info: 'bg-blue-100 text-blue-800 border border-blue-300',
    purple: 'bg-purple-100 text-purple-800 border border-purple-300',
    pink: 'bg-pink-100 text-pink-800 border border-pink-300',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-1 text-xs sm:text-sm',
    lg: 'px-3 py-1.5 text-sm sm:text-base',
  };

  const dotColors = {
    default: 'bg-gray-500',
    primary: 'bg-primary-500',
    success: 'bg-green-500',
    danger: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
  };

  return (
    <span
      ref={ref}
      className={`
        inline-flex items-center gap-1.5 font-semibold rounded-full
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`}></span>
      )}
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

export default Badge;
