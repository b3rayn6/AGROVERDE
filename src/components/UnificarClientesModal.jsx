import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GitMerge, Search, Check, AlertTriangle, ArrowRight, Save } from 'lucide-react';

export default function UnificarClientesModal({ isOpen, onClose, clientes, onMergeComplete }) {
  const [step, setStep] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [primaryId, setPrimaryId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [finalData, setFinalData] = useState({
    nombre: '',
    cedula: '',
    cedula_rnc: '',
    telefono: '',
    email: '',
    direccion: '',
    limite_credito: 0
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedIds([]);
      setPrimaryId('');
      setSearchTerm('');
      setIsMerging(false);
    }
  }, [isOpen]);

  // When primaryId changes, pre-fill finalData with primary client's data
  useEffect(() => {
    if (primaryId) {
      const primaryClient = clientes.find(c => c.id == primaryId);
      if (primaryClient) {
        setFinalData({
          nombre: primaryClient.nombre || '',
          cedula: primaryClient.cedula || '',
          cedula_rnc: primaryClient.cedula_rnc || '',
          telefono: primaryClient.telefono || '',
          email: primaryClient.email || '',
          direccion: primaryClient.direccion || '',
          limite_credito: parseFloat(primaryClient.limite_credito) || 0
        });
      }
    }
  }, [primaryId, clientes]);

  if (!isOpen) return null;

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cedula && c.cedula.includes(searchTerm)) ||
    (c.cedula_rnc && c.cedula_rnc.includes(searchTerm))
  );

  const selectedClients = clientes.filter(c => selectedIds.includes(c.id));

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selected => selected !== id));
      if (primaryId === id) setPrimaryId('');
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleNextStep1 = () => {
    if (selectedIds.length < 2) {
      alert('Debe seleccionar al menos 2 clientes para unificar.');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!primaryId) {
      alert('Debe seleccionar cuál será el cliente principal.');
      return;
    }
    setStep(3);
  };

  const handleMerge = async () => {
    if (!window.confirm('¿Está seguro de que desea unificar estos clientes? Esta acción NO se puede deshacer. Los clientes duplicados serán eliminados y sus registros se transferirán al principal.')) {
      return;
    }

    setIsMerging(true);
    const duplicates = selectedIds.filter(id => id !== primaryId);

    try {
      // Usar la función RPC para unificar de forma segura
      const { error } = await supabase.rpc('unificar_clientes', {
        primary_client_id: primaryId,
        duplicate_client_ids: duplicates,
        updated_client_data: finalData
      });

      if (error) throw error;
      
      alert('Clientes unificados exitosamente.');
      onMergeComplete();
      onClose();
    } catch (error) {
      console.error('Error al unificar clientes:', error);
      alert('Error al unificar clientes: ' + error.message);
    } finally {
      setIsMerging(false);
    }
  };

  // Helper to quickly copy data from another selected client
  const fillFieldFromClient = (field, value) => {
    setFinalData(prev => ({ ...prev, [field]: value || prev[field] }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <GitMerge className="w-5 h-5" />
            <h2 className="text-xl font-bold">Unificar Clientes Duplicados</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        {/* Steps Progress */}
        <div className="flex border-b bg-gray-50/50">
          {[1, 2, 3].map(num => (
            <div key={num} className={`flex-1 p-3 text-center border-b-2 text-sm sm:text-base font-medium transition-colors ${step === num ? 'border-blue-600 text-blue-600 bg-blue-50/30' : step > num ? 'border-green-500 text-green-600' : 'border-transparent text-gray-400'}`}>
              Paso {num}: {num === 1 ? 'Seleccionar' : num === 2 ? 'Principal' : 'Datos Finales'}
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          
          {/* STEP 1: Select duplicate clients */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Busque y seleccione los clientes que desea fusionar. Debe seleccionar 2 o más.</p>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar clientes por nombre o cédula..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-2 max-h-[40vh] overflow-y-auto border">
                {filteredClientes.map(c => (
                  <label key={c.id} className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg cursor-pointer border-b border-gray-100 last:border-0">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleSelection(c.id)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{c.nombre}</div>
                      <div className="text-xs text-gray-500">
                        {c.cedula ? `Cédula: ${c.cedula} | ` : ''}
                        {c.telefono ? `Tel: ${c.telefono} | ` : ''}
                        {c.email ? `Email: ${c.email}` : ''}
                      </div>
                    </div>
                  </label>
                ))}
                {filteredClientes.length === 0 && (
                  <div className="text-center p-4 text-gray-500 text-sm">No se encontraron clientes</div>
                )}
              </div>
              
              <div className="text-sm font-medium text-blue-700">
                Seleccionados: {selectedIds.length} clientes
              </div>
            </div>
          )}

          {/* STEP 2: Choose primary client */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex gap-3 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p>
                  El cliente principal es aquel que <strong>mantendrá su ID</strong> en la base de datos.
                  Las facturas y saldos de los demás seleccionados se transferirán a este cliente. Los otros clientes serán eliminados.
                </p>
              </div>
              
              <h3 className="font-medium text-gray-900">Seleccione el cliente principal:</h3>
              <div className="grid gap-3">
                {selectedClients.map(c => (
                  <label 
                    key={c.id} 
                    className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer border-2 transition-colors ${primaryId === c.id ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <input 
                      type="radio" 
                      name="primaryClient"
                      checked={primaryId === c.id}
                      onChange={() => setPrimaryId(c.id)}
                      className="mt-1 w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">{c.nombre}</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                        <span className="text-gray-500">Cédula: <span className="text-gray-900 font-medium">{c.cedula || '-'}</span></span>
                        <span className="text-gray-500">RNC: <span className="text-gray-900 font-medium">{c.cedula_rnc || '-'}</span></span>
                        <span className="text-gray-500">Tel: <span className="text-gray-900 font-medium">{c.telefono || '-'}</span></span>
                        <span className="text-gray-500">Email: <span className="text-gray-900 font-medium">{c.email || '-'}</span></span>
                        <span className="text-gray-500 col-span-2">Dir: <span className="text-gray-900 font-medium">{c.direccion || '-'}</span></span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Edit final data */}
          {step === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                Revise y ajuste los datos que tendrá el cliente principal después de la unificación.
                Puede modificar los campos directamente o hacer clic en los botones debajo de cada campo para usar los datos de otro cliente.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Final</label>
                  <input 
                    type="text" 
                    value={finalData.nombre}
                    onChange={e => setFinalData({...finalData, nombre: e.target.value})}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedClients.filter(c => c.nombre && c.nombre !== finalData.nombre).map(c => (
                      <button key={c.id} onClick={() => fillFieldFromClient('nombre', c.nombre)} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        Usar: {c.nombre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cédula */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cédula Final</label>
                  <input 
                    type="text" 
                    value={finalData.cedula}
                    onChange={e => setFinalData({...finalData, cedula: e.target.value})}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedClients.filter(c => c.cedula && c.cedula !== finalData.cedula).map(c => (
                      <button key={c.id} onClick={() => fillFieldFromClient('cedula', c.cedula)} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        Usar: {c.cedula}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono Final</label>
                  <input 
                    type="text" 
                    value={finalData.telefono}
                    onChange={e => setFinalData({...finalData, telefono: e.target.value})}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedClients.filter(c => c.telefono && c.telefono !== finalData.telefono).map(c => (
                      <button key={c.id} onClick={() => fillFieldFromClient('telefono', c.telefono)} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        Usar: {c.telefono}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Final</label>
                  <input 
                    type="email" 
                    value={finalData.email}
                    onChange={e => setFinalData({...finalData, email: e.target.value})}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedClients.filter(c => c.email && c.email !== finalData.email).map(c => (
                      <button key={c.id} onClick={() => fillFieldFromClient('email', c.email)} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        Usar: {c.email}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Límite Crédito */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Límite de Crédito</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={finalData.limite_credito}
                    onChange={e => setFinalData({...finalData, limite_credito: parseFloat(e.target.value) || 0})}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Dirección */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Final</label>
                  <textarea 
                    value={finalData.direccion}
                    onChange={e => setFinalData({...finalData, direccion: e.target.value})}
                    rows={2}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedClients.filter(c => c.direccion && c.direccion !== finalData.direccion).map(c => (
                      <button key={c.id} onClick={() => fillFieldFromClient('direccion', c.direccion)} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        Usar: {c.direccion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 text-orange-800 p-4 rounded-lg text-sm border border-orange-200 flex items-start gap-3 mt-4">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Advertencia Final:</strong>
                  <p>Al unificar, {selectedIds.length - 1} cliente(s) serán borrados y todas sus operaciones se asignarán al cliente {primaryId}.</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="p-4 border-t flex justify-between bg-gray-50 rounded-b-lg">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium">
              Atrás
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium">
              Cancelar
            </button>
          )}

          {step === 1 && (
            <button 
              onClick={handleNextStep1}
              disabled={selectedIds.length < 2}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 text-sm font-medium flex items-center gap-2"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 2 && (
            <button 
              onClick={handleNextStep2}
              disabled={!primaryId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 text-sm font-medium flex items-center gap-2"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 3 && (
            <button 
              onClick={handleMerge}
              disabled={isMerging}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 text-sm font-medium flex items-center gap-2"
            >
              {isMerging ? 'Unificando...' : (
                <>
                  <Save className="w-4 h-4" /> Unificar y Guardar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
