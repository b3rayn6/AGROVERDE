// Utilidades para manejo correcto de fechas sin problemas de zona horaria

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD sin problemas de zona horaria
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const getFechaActual = () => {
  // Crear fecha en zona horaria local sin conversión UTC
  const hoy = new Date();
  // Ajustar para obtener la fecha local correcta
  const offsetMs = hoy.getTimezoneOffset() * 60 * 1000;
  const fechaLocal = new Date(hoy.getTime() - offsetMs);
  
  const year = fechaLocal.getFullYear();
  const month = String(fechaLocal.getMonth() + 1).padStart(2, '0');
  const day = String(fechaLocal.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convierte una fecha de formato YYYY-MM-DD a objeto Date sin problemas de zona horaria
 * @param {string} fechaStr - Fecha en formato YYYY-MM-DD
 * @returns {Date} Objeto Date
 */
export const stringToDate = (fechaStr) => {
  const [year, month, day] = fechaStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Convierte un objeto Date a formato YYYY-MM-DD sin problemas de zona horaria
 * @param {Date} date - Objeto Date
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const dateToString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formatea una fecha para mostrar en formato legible (DD/MM/YYYY)
 * @param {string} fechaStr - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha en formato DD/MM/YYYY
 */
export const formatearFecha = (fechaStr) => {
  if (!fechaStr) return '';
  const [year, month, day] = fechaStr.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Obtiene la fecha y hora actual en formato ISO para timestamps
 * @returns {string} Fecha y hora en formato ISO
 */
export const getTimestampActual = () => {
  return new Date().toISOString();
};

/**
 * Formatea una fecha de la base de datos sin problemas de zona horaria
 * @param {string} fechaStr - Fecha en formato YYYY-MM-DD o ISO
 * @param {string} locale - Locale para el formato (default: 'es-DO')
 * @returns {string} Fecha formateada
 */
export const formatearFechaLocal = (fechaStr, locale = 'es-DO') => {
  if (!fechaStr) return '';
  
  // Si es una fecha ISO completa, tomar solo la parte de fecha
  const soloFecha = fechaStr.split('T')[0];
  const [year, month, day] = soloFecha.split('-').map(Number);
  
  // Crear fecha en zona horaria local (sin conversión UTC)
  const fecha = new Date(year, month - 1, day);
  
  return fecha.toLocaleDateString(locale);
};
