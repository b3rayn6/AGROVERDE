import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, X, AlertTriangle, Check, Search } from 'lucide-react';

export default function UnificarChoferesModal({ isOpen, onClose, onUnificados }) {
  const [choferesList, setChoferesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChoferes, setSelectedChoferes] = useState([]);
  const [mainChofer, setMainChofer] = useState(null);
  const [unificando, setUnificando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarChoferes();
      setSelectedChoferes([]);
      setMainChofer(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  const cargarChoferes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fletes')
        .select('chofer, id');

      if (error) throw error;

      // Agrupar y contar
      const conteo = {};
      data.forEach(flete => {
        if (!flete.chofer) return;
        const c = flete.chofer.trim().toUpperCase();
        if (!conteo[c]) {
          conteo[c] = { nombre: flete.chofer.trim(), count: 0, variantes: new Set([flete.chofer.trim()]) };
        }
        conteo[c].count += 1;
        conteo[c].variantes.add(flete.chofer.trim());
      });

      const lista = Object.values(conteo)
        .sort((a, b) => b.count - a.count)
        .map(c => ({
          nombre: c.nombre,
          variantes: Array.from(c.variantes),
          count: c.count,
          id: c.nombre
        }));

      setChoferesList(lista);
    } catch (error) {
      console.error('Error al cargar choferes:', error);
      alert('Error al cargar la lista de choferes');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChofer = (chofer) => {
    if (selectedChoferes.some(c => c.id === chofer.id)) {
      setSelectedChoferes(selectedChoferes.filter(c => c.id !== chofer.id));
      if (mainChofer?.id === chofer.id) setMainChofer(null);
    } else {
      const newSelected = [...selectedChoferes, chofer];
      setSelectedChoferes(newSelected);
      if (newSelected.length === 1) setMainChofer(chofer); // Auto-select first as main
    }
  };

  const handleUnificar = async () => {
    if (selectedChoferes.length < 2) {
      alert('Debes seleccionar al menos dos choferes para unificar.');
      return;
    }
    if (!mainChofer) {
      alert('Debes seleccionar cuál será el chofer principal.');
      return;
    }

    const secundarios = selectedChoferes.filter(c => c.id !== mainChofer.id);
    const nombresSecundarios = secundarios.flatMap(c => c.variantes);
    const nombrePrincipal = mainChofer.nombre;

    const confirmMessage = `¿Estás seguro de unificar los siguientes choferes bajo el nombre "${nombrePrincipal}"?\n\nSecundarios que serán reemplazados:\n${nombresSecundarios.join(', ')}\n\nEsta acción actualizará todos los fletes asociados y no se puede deshacer.`;
    
    if (!window.confirm(confirmMessage)) return;

    setUnificando(true);
    try {
      const { error } = await supabase
        .from('fletes')
        .update({ chofer: nombrePrincipal })
        .in('chofer', nombresSecundarios);

      if (error) throw error;

      alert('Choferes unificados exitosamente.');
      if (onUnificados) onUnificados(); // Recargar datos parent
      onClose();
    } catch (error) {
      console.error('Error al unificar choferes:', error);
      alert('Hubo un error al unificar los choferes: ' + error.message);
    } finally {
      setUnificando(false);
    }
  };

  if (!isOpen) return null;

  const choferesFiltrados = choferesList.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    selectedChoferes.some(sel => sel.id === c.id) // Siempre mostrar los seleccionados
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Unificar Choferes</h2>
              <p className="text-sm text-gray-500">Combina registros de un mismo chofer guardado con nombres diferentes</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-6 gap-6">
          
          {/* Columna Izquierda: Lista para seleccionar */}
          <div className="flex-1 border rounded-lg overflow-hidden flex flex-col max-h-full">
            <div className="bg-gray-50 p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Selecciona choferes a unificar
              </h3>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar chofer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Cargando choferes...</div>
              ) : (
                <div className="space-y-1">
                  {choferesFiltrados.map((chofer) => {
                    const isSelected = selectedChoferes.some(c => c.id === chofer.id);
                    return (
                      <div 
                        key={chofer.id}
                        onClick={() => handleSelectChofer(chofer)}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            readOnly
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span className={`font-medium ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>
                            {chofer.nombre}
                          </span>
                        </div>
                        <span className={`text-sm px-2 py-1 rounded-full ${isSelected ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                          {chofer.count} {chofer.count === 1 ? 'registro' : 'fletes'}
                        </span>
                      </div>
                    );
                  })}
                  {choferesFiltrados.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">No se encontraron choferes</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Selección del principal */}
          <div className="w-full md:w-1/3 flex flex-col gap-4 max-h-full">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-1 flex flex-col overflow-hidden">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Elige el Principal
              </h3>
              <p className="text-sm text-blue-600 mb-4">
                El nombre seleccionado será el definitivo.
              </p>
              
              {selectedChoferes.length === 0 ? (
                <div className="text-sm text-blue-400/80 italic text-center py-8 border-2 border-dashed border-blue-200 rounded-lg">
                  Selecciona al menos dos choferes en la lista
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto pr-1">
                  {selectedChoferes.map((chofer) => (
                    <label key={`main-${chofer.id}`} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${mainChofer?.id === chofer.id ? 'bg-white border-blue-500 shadow-sm' : 'bg-white/50 border-blue-100 hover:bg-white'}`}>
                      <input 
                        type="radio" 
                        name="mainChofer"
                        checked={mainChofer?.id === chofer.id}
                        onChange={() => setMainChofer(chofer)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className={`font-medium ${mainChofer?.id === chofer.id ? 'text-blue-800' : 'text-gray-700'}`}>
                          {chofer.nombre}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{chofer.count} fletes actuales</div>
                      </div>
                      {mainChofer?.id === chofer.id && (
                        <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-medium">
                          Principal
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {selectedChoferes.length > 1 && mainChofer && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 shrink-0">
                <h4 className="font-semibold text-orange-800 flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  Resumen de acción
                </h4>
                <div className="text-sm text-orange-800 space-y-2 mb-4">
                  <p className="flex justify-between">
                    <span>Chofer principal:</span>
                    <strong className="font-bold">{mainChofer.nombre}</strong>
                  </p>
                  <p className="flex justify-between border-t border-orange-200 pt-2">
                    <span>Fletes totales:</span>
                    <strong className="font-bold">{selectedChoferes.reduce((sum, c) => sum + c.count, 0)}</strong>
                  </p>
                </div>
                
                <button
                  onClick={handleUnificar}
                  disabled={unificando}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2 shadow-sm"
                >
                  {unificando ? 'Unificando registros...' : 'Confirmar Unificación'}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
