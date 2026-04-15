// Componente Container para layouts responsivos consistentes
import { forwardRef } from 'react';

const Container = forwardRef(({ 
  children, 
  className = '',
  size = 'default',
  padding = 'default',
  ...props 
}, ref) => {
  const sizes = {
    sm: 'max-w-3xl',
    default: 'max-w-7xl',
    lg: 'max-w-[1400px]',
    xl: 'max-w-[1600px]',
    full: 'max-w-full',
  };

  const paddings = {
    none: '',
    sm: 'px-4 py-4',
    default: 'px-4 sm:px-6 lg:px-8 py-4 sm:py-6',
    lg: 'px-4 sm:px-6 lg:px-8 py-6 sm:py-8',
  };

  return (
    <div
      ref={ref}
      className={`
        w-full mx-auto
        ${sizes[size]}
        ${paddings[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
});

Container.displayName = 'Container';

export default Container;

// Componente para secciones con fondo
export function Section({ 
  children, 
  className = '',
  variant = 'default',
  ...props 
}) {
  const variants = {
    default: 'bg-transparent',
    white: 'bg-white',
    gray: 'bg-gray-50',
    gradient: 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200',
  };

  return (
    <section 
      className={`w-full ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

// Componente para páginas completas
export function Page({ children, className = '' }) {
  return (
    <div className={`min-h-screen w-full overflow-x-hidden ${className}`}>
      {children}
    </div>
  );
}

// Componente para contenido principal
export function PageContent({ children, className = '' }) {
  return (
    <main className={`flex-1 overflow-y-auto ${className}`}>
      {children}
    </main>
  );
}
