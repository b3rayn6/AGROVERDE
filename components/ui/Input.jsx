// Componente Input reutilizable con diseño moderno y responsivo
import { forwardRef } from 'react';

const Input = forwardRef(({ 
  label,
  error,
  helperText,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  containerClassName = '',
  fullWidth = true,
  ...props 
}, ref) => {
  const widthClass = fullWidth ? 'w-full' : '';
  const errorClass = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500';
  const iconPaddingClass = Icon ? (iconPosition === 'left' ? 'pl-10 sm:pl-12' : 'pr-10 sm:pr-12') : '';

  return (
    <div className={`${widthClass} ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
        )}
        
        <input
          ref={ref}
          className={`
            block ${widthClass} px-3 sm:px-4 py-2.5 sm:py-3
            text-sm sm:text-base text-gray-900
            border ${errorClass}
            rounded-lg sm:rounded-xl
            focus:ring-2 focus:border-transparent
            transition-all duration-200 outline-none
            bg-gray-50 hover:bg-white
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${iconPaddingClass}
            ${className}
          `}
          {...props}
        />
        
        {Icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center pointer-events-none">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1.5 text-xs sm:text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="mt-1.5 text-xs sm:text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
