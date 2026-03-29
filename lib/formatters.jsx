// Función para formatear moneda (soporta USD y DOP)
// Formato: $ 1,000.00 o RD$ 1,000.00
export const formatCurrency = (value, currency = 'DOP') => {
  if (value === null || value === undefined || isNaN(value)) {
    return currency === 'USD' ? '$ 0.00' : 'RD$ 0.00';
  }
  
  const number = parseFloat(value);
  
  // Formatear el número con comas y decimales
  const formatted = number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  // Retornar con el prefijo de moneda correcto
  return currency === 'USD' ? `$ ${formatted}` : `RD$ ${formatted}`;
};

// Función para formatear números sin símbolo de moneda
export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00';
  }
  
  const number = parseFloat(value);
  
  return number.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// Función para formatear fechas al formato DD/MM/YYYY sin problemas de zona horaria
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    // Si es una fecha ISO completa, tomar solo la parte de fecha
    const soloFecha = dateString.split('T')[0];
    const [year, month, day] = soloFecha.split('-').map(Number);
    
    // Crear fecha en zona horaria local (sin conversión UTC)
    const date = new Date(year, month - 1, day);
    
    const dayStr = String(date.getDate()).padStart(2, '0');
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const yearStr = date.getFullYear();
    
    return `${dayStr}/${monthStr}/${yearStr}`;
  } catch (error) {
    return dateString;
  }
};
