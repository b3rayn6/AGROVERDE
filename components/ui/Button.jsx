// Componente Button reutilizable con múltiples variantes y tamaños responsivos
import { forwardRef } from 'react';

const Button = forwardRef(({ 
  children, 
  className = '', 
  variant = 'primary',
  size = 'default',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  ...props 
}, ref) => {
  const variants = {
    primary: 'bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-700 hover:to-emerald-700 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/30',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/30',
    info: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/30',
    outline: 'bg-transparent border-2 border-primary-600 text-primary-600 hover:bg-primary-50',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
    link: 'bg-transparent text-primary-600 hover:text-primary-700 hover:underline',
  };

  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs rounded-lg',
    sm: 'px-3 py-2 text-sm rounded-lg',
    default: 'px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base rounded-xl',
    lg: 'px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg rounded-xl',
    xl: 'px-8 py-4 sm:px-10 sm:py-5 text-lg sm:text-xl rounded-2xl',
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    default: 'w-4 h-4 sm:w-5 sm:h-5',
    lg: 'w-5 h-5 sm:w-6 sm:h-6',
    xl: 'w-6 h-6 sm:w-7 sm:h-7',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = (disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5';

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-200
        ${variants[variant]}
        ${sizes[size]}
        ${widthClass}
        ${disabledClass}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <div className={`border-2 border-current border-t-transparent rounded-full animate-spin ${iconSizes[size]}`}></div>
          <span className="hidden sm:inline">Cargando...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className={iconSizes[size]} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className={iconSizes[size]} />}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
