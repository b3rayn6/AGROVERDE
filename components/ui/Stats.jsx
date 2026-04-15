// Componente Stats reutilizable para tarjetas de estadísticas
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function Stats({ 
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
  className = '',
}) {
  const variants = {
    default: {
      bg: 'bg-white',
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
    },
    primary: {
      bg: 'bg-gradient-to-br from-primary-50 to-emerald-50',
      iconBg: 'bg-primary-500',
      iconColor: 'text-white',
    },
    success: {
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      iconBg: 'bg-green-500',
      iconColor: 'text-white',
    },
    warning: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      iconBg: 'bg-amber-500',
      iconColor: 'text-white',
    },
    danger: {
      bg: 'bg-gradient-to-br from-red-50 to-pink-50',
      iconBg: 'bg-red-500',
      iconColor: 'text-white',
    },
    info: {
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
      iconBg: 'bg-blue-500',
      iconColor: 'text-white',
    },
  };

  const config = variants[variant];

  return (
    <div className={`
      ${config.bg}
      rounded-xl sm:rounded-2xl p-4 sm:p-6
      shadow-soft border border-gray-200
      hover:shadow-medium transition-all duration-300
      ${className}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2 truncate">
            {title}
          </p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
            {value}
          </p>
          
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
              )}
              <span className={`text-xs sm:text-sm font-semibold ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={`
            ${config.iconBg} ${config.iconColor}
            w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14
            rounded-xl sm:rounded-2xl
            flex items-center justify-center
            flex-shrink-0
            shadow-lg
          `}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
          </div>
        )}
      </div>
    </div>
  );
}

// Grid de estadísticas responsivo
export function StatsGrid({ children, className = '' }) {
  return (
    <div className={`
      grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
      gap-4 sm:gap-6
      ${className}
    `}>
      {children}
    </div>
  );
}
