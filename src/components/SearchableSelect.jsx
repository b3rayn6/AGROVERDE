import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

/**
 * Componente de select con búsqueda integrada
 * Muestra todos los elementos en un dropdown y permite filtrar escribiendo
 */
export default function SearchableSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Seleccione una opción...",
  searchPlaceholder = "Buscar...",
  displayField = "nombre", // Campo a mostrar en la lista
  valueField = "id", // Campo del valor
  secondaryField = null, // Campo secundario opcional (ej: código, cédula)
  disabled = false,
  required = false,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Encontrar la opción seleccionada
  const selectedOption = options.find(opt => opt[valueField] === value);

  // Filtrar opciones cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredOptions(options);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = options.filter(opt => {
        const mainField = opt[displayField]?.toString().toLowerCase() || '';
        const secField = secondaryField && opt[secondaryField] 
          ? opt[secondaryField].toString().toLowerCase() 
          : '';
        return mainField.includes(term) || secField.includes(term);
      });
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options, displayField, secondaryField]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enfocar el input de búsqueda al abrir
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option[valueField]);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Botón principal */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full px-4 py-2 text-left border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
          disabled 
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
            : 'bg-white hover:border-gray-400'
        } ${isOpen ? 'border-green-500 ring-2 ring-green-500' : 'border-gray-300'}`}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
            {selectedOption 
              ? `${selectedOption[displayField]}${secondaryField && selectedOption[secondaryField] ? ` (${selectedOption[secondaryField]})` : ''}`
              : placeholder
            }
          </span>
          <div className="flex items-center gap-1">
            {selectedOption && !disabled && (
              <X 
                size={16} 
                className="text-gray-400 hover:text-gray-600"
                onClick={handleClear}
              />
            )}
            <ChevronDown 
              size={18} 
              className={`text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            />
          </div>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Campo de búsqueda */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Lista de opciones */}
          <div className="overflow-y-auto max-h-64">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option[valueField]}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full px-4 py-2 text-left hover:bg-green-50 transition-colors ${
                    option[valueField] === value ? 'bg-green-100 font-medium' : ''
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900">
                      {option[displayField]}
                    </span>
                    {secondaryField && option[secondaryField] && (
                      <span className="text-xs text-gray-500">
                        {option[secondaryField]}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No se encontraron resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
