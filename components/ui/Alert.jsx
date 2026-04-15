// Componente Alert reutilizable con múltiples variantes
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

export default function Alert({ 
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}) {
  const variants = {
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: Info,
      iconColor: 'text-blue-500',
    },
    success: {
      container: 'bg-green-50 border-green-200 text-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-500',
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: AlertCircle,
      iconColor: 'text-amber-500',
    },
    danger: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: XCircle,
      iconColor: 'text-red-500',
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className={`
      relative flex gap-3 p-4 rounded-xl border
      ${config.container}
      ${className}
    `}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} />
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold text-sm sm:text-base mb-1">
            {title}
          </h4>
        )}
        <div className="text-xs sm:text-sm">
          {children}
        </div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
