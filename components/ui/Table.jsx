// Componente Table reutilizable con diseño moderno y responsivo
import { forwardRef } from 'react';

const Table = forwardRef(({ 
  children, 
  className = '',
  responsive = true,
  striped = false,
  hover = true,
  ...props 
}, ref) => {
  const Container = responsive ? 'div' : 'table';
  const containerProps = responsive ? {
    className: 'w-full overflow-x-auto scrollbar-custom rounded-xl border border-gray-200'
  } : {};

  return (
    <Container {...containerProps}>
      <table
        ref={ref}
        className={`
          w-full text-sm text-left
          ${className}
        `}
        {...props}
      >
        {children}
      </table>
    </Container>
  );
});

Table.displayName = 'Table';

export const TableHeader = ({ children, className = '' }) => (
  <thead className={`bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 ${className}`}>
    {children}
  </thead>
);

export const TableBody = ({ children, className = '' }) => (
  <tbody className={`bg-white divide-y divide-gray-200 ${className}`}>
    {children}
  </tbody>
);

export const TableRow = ({ children, className = '', hover = true, onClick }) => {
  const hoverClass = hover ? 'hover:bg-gray-50 transition-colors duration-150' : '';
  const clickableClass = onClick ? 'cursor-pointer' : '';
  
  return (
    <tr 
      className={`${hoverClass} ${clickableClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};

export const TableHead = ({ children, className = '', sortable = false, onSort }) => {
  const sortableClass = sortable ? 'cursor-pointer select-none hover:bg-gray-200' : '';
  
  return (
    <th
      className={`
        px-3 sm:px-4 md:px-6 py-3 sm:py-4
        text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider
        ${sortableClass}
        ${className}
      `}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        )}
      </div>
    </th>
  );
};

export const TableCell = ({ children, className = '', align = 'left' }) => {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];

  return (
    <td className={`
      px-3 sm:px-4 md:px-6 py-3 sm:py-4
      text-xs sm:text-sm text-gray-900
      ${alignClass}
      ${className}
    `}>
      {children}
    </td>
  );
};

// Componente para tablas vacías
export const TableEmpty = ({ message = 'No hay datos disponibles', colSpan = 1 }) => (
  <TableRow hover={false}>
    <TableCell colSpan={colSpan} align="center" className="py-12">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <svg className="w-12 h-12 sm:w-16 sm:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm sm:text-base font-medium">{message}</p>
      </div>
    </TableCell>
  </TableRow>
);

// Componente para estado de carga
export const TableLoading = ({ colSpan = 1, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, index) => (
      <TableRow key={index} hover={false}>
        <TableCell colSpan={colSpan}>
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        </TableCell>
      </TableRow>
    ))}
  </>
);

export default Table;
