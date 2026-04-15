import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/authUtils';
import { savePesadaLocal } from '../lib/localStorage';
import { formatCurrency } from '../lib/formatters';
import ModalFleteObreros from './ModalFleteObreros';

export default function NuevaPesada({ onClose, onSuccess, user, isModal = true }) {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    numero_pesada: '',
    cliente_id: '',
    nombre_productor: '',
    direccion: '',
    variedad: '',
    cantidad_sacos: '',
    kilos_bruto: '',
    tara: '',
    porcentaje_humedad: '',
    precio_por_fanega: '',
    avance_efectivo: '',
    notas: ''
  });
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientesLoading, setClientesLoading] = useState(true);
  const [showFleteModal, setShowFleteModal] = useState(false);
  const [savedPesada, setSavedPesada] = useState(null);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      const { data, error: err } = await supabase
        .from('clientes')
        .select('id, nombre')
        .order('nombre');
      
      if (err) throw err;
      setClientes(data || []);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    } finally {
      setClientesLoading(false);
    }
  };

  const handleClienteSeleccionado = (clienteId) => {
    if (clienteId) {
      const cliente = clientes.find(c => String(c.id) === String(clienteId));
      if (cliente) {
        setFormData({
          ...formData,
          cliente_id: clienteId,
          nombre_productor: cliente.nombre
        });
      }
    } else {
      setFormData({
        ...formData,
        cliente_id: '',
        nombre_productor: ''
      });
    }
  };

  const kilosNeto = formData.kilos_bruto && formData.tara
    ? parseFloat(formData.kilos_bruto) - parseFloat(formData.tara)
    : 0;

  const fanegas = kilosNeto > 0 && formData.porcentaje_humedad
    ? kilosNeto / parseFloat(formData.porcentaje_humedad)
    : 0;

  const valorTotal = fanegas > 0 && formData.precio_por_fanega
    ? fanegas * parseFloat(formData.precio_por_fanega)
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user || !user.id) {
        setError('Error de sesión. Por favor cierra sesión y vuelve a entrar.');
        setLoading(false);
        return;
      }

      const userId = await getUserId(user);
      if (!userId) {
        setError('Error al obtener el ID de usuario. Por favor, verifica que estés autenticado correctamente.');
        setLoading(false);
        return;
      }

      // Convertir todos los valores numéricos a números antes de enviar
      const avanceEfectivo = formData.avance_efectivo ? parseFloat(formData.avance_efectivo) : 0;
      const saldoDisponible = parseFloat(valorTotal.toFixed(2)) - avanceEfectivo;
      
      const pesadaData = {
        fecha: formData.fecha,
        numero_pesada: formData.numero_pesada?.trim() || null,
        cliente_id: formData.cliente_id ? parseInt(formData.cliente_id, 10) : null,
        nombre_productor: formData.nombre_productor.trim(),
        direccion: formData.direccion?.trim() || null,
        variedad: formData.variedad.trim(),
        cantidad_sacos: parseInt(formData.cantidad_sacos, 10),
        kilos_bruto: parseFloat(formData.kilos_bruto),
        tara: parseFloat(formData.tara),
        kilos_neto: parseFloat(kilosNeto.toFixed(2)),
        porcentaje_humedad: parseFloat(formData.porcentaje_humedad),
        fanegas: parseFloat(fanegas.toFixed(2)),
        precio_por_fanega: parseFloat(formData.precio_por_fanega),
        valor_total: parseFloat(valorTotal.toFixed(2)),
        avance_efectivo: avanceEfectivo,
        saldo_disponible: saldoDisponible,
        notas: formData.notas?.trim() || null,
        user_id: userId
      };

      // Validar que todos los valores numéricos sean válidos
      if (isNaN(pesadaData.cantidad_sacos) || pesadaData.cantidad_sacos <= 0) {
        setError('La cantidad de sacos debe ser un número mayor a 0');
        setLoading(false);
        return;
      }
      if (isNaN(pesadaData.kilos_bruto) || pesadaData.kilos_bruto <= 0) {
        setError('Los kilos brutos deben ser un número mayor a 0');
        setLoading(false);
        return;
      }
      if (isNaN(pesadaData.tara) || pesadaData.tara < 0) {
        setError('La tara debe ser un número mayor o igual a 0');
        setLoading(false);
        return;
      }
      if (isNaN(pesadaData.porcentaje_humedad) || pesadaData.porcentaje_humedad <= 0) {
        setError('El porcentaje de humedad debe ser un número mayor a 0');
        setLoading(false);
        return;
      }
      if (isNaN(pesadaData.precio_por_fanega) || pesadaData.precio_por_fanega <= 0) {
        setError('El precio por fanega debe ser un número mayor a 0');
        setLoading(false);
        return;
      }

      // Intentar guardar en Supabase directamente
      try {
        const { data: insertData, error: insertError } = await supabase
          .from('pesadas')
          .insert([pesadaData])
          .select();

        if (insertError) {
          console.error('❌ Error al guardar en Supabase:', insertError);

          // Si es un error de conexión o red, guardar localmente
          if (insertError.code === 'PGRST116' || insertError.message?.includes('fetch') || insertError.message?.includes('network')) {
            await savePesadaLocal(pesadaData);
            setError('Error de conexión. Guardado localmente. Se sincronizará cuando haya internet.');
            setTimeout(() => onSuccess(), 2000);
          } else {
            // Mostrar el error real de Supabase
            setError(`Error al guardar: ${insertError.message || insertError.code || 'Error desconocido'}`);
          }
        } else {
          console.log('✅ Pesada guardada exitosamente:', insertData);
          // Mostrar modal de flete y obreros
          setSavedPesada({
            ...pesadaData,
            id: insertData[0].id
          });
          setShowFleteModal(true);
        }
      } catch (networkError) {
        // Error de red, guardar localmente
        console.error('❌ Error de red:', networkError);
        await savePesadaLocal(pesadaData);
        setError('Error de conexión. Guardado localmente. Se sincronizará cuando haya internet.');
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (err) {
      console.error('❌ Error general:', err);
      setError(`Error inesperado: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFleteModalClose = () => {
    setShowFleteModal(false);
    onSuccess();
  };

  return (
    <>
      <div className={isModal ? "fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" : "w-full max-w-4xl mx-auto my-8"}>
        <div className={`bg-gradient-to-br from-white via-gray-50 to-white rounded-3xl shadow-2xl w-full ${isModal ? 'max-w-5xl max-h-[90vh]' : ''} overflow-hidden border border-gray-200 animate-scaleIn`}>
          <div className="sticky top-0 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 px-8 py-5 flex items-center justify-between shadow-lg relative overflow-hidden animate-gradient bg-[length:200%_100%]">
            <div className="absolute inset-0 bg-white opacity-10"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-lg hover-scale">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg">Nueva Pesada</h2>
                <p className="text-green-100 text-sm drop-shadow">Registro de pesada de arroz</p>
              </div>
            </div>
            {isModal && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 group relative z-10 hover-scale"
              >
                <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-88px)] scrollbar-modal">
          <form onSubmit={handleSubmit} className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Fecha
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 group-hover:border-gray-300 hover:shadow-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Pesada (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.numero_pesada}
                  onChange={(e) => setFormData({ ...formData, numero_pesada: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ej: P-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Cliente
                </label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => handleClienteSeleccionado(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={clientesLoading}
                >
                  <option value="">-- Seleccionar cliente o ingreso manual --</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Selecciona un cliente de la lista o déjalo en blanco para ingreso manual
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Productor
                </label>
                <input
                  type="text"
                  value={formData.nombre_productor}
                  onChange={(e) => setFormData({ ...formData, nombre_productor: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                    formData.cliente_id 
                      ? 'border-green-400 bg-green-50 focus:ring-2 focus:ring-green-500 focus:border-green-500 font-medium text-green-900' 
                      : 'border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent'
                  }`}
                  placeholder="Juan Pérez"
                  required
                />
                <p className={`text-xs mt-1 ${formData.cliente_id ? 'text-green-600' : 'text-gray-500'}`}>
                  {formData.cliente_id ? '✓ Se llenó automáticamente del cliente seleccionado' : 'Ingresa el nombre del productor'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Calle Principal #45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variedad de Arroz
                </label>
                <input
                  type="text"
                  value={formData.variedad}
                  onChange={(e) => setFormData({ ...formData, variedad: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Juma 67"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad de Sacos
                </label>
                <input
                  type="number"
                  value={formData.cantidad_sacos}
                  onChange={(e) => setFormData({ ...formData, cantidad_sacos: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kilos Bruto
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.kilos_bruto}
                  onChange={(e) => setFormData({ ...formData, kilos_bruto: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="5500.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tara
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tara}
                  onChange={(e) => setFormData({ ...formData, tara: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="50.00"
                  required
                />
              </div>

              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-xl p-4 border-2 border-purple-300 shadow-md hover-lift">
                <label className="block text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                  <div className="p-1 bg-purple-200 rounded-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Kilos Neto
                  <span className="ml-auto text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-bold">Calculado</span>
                </label>
                <input
                  type="text"
                  value={kilosNeto.toFixed(2)}
                  className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl bg-white font-bold text-purple-900 text-lg shadow-inner"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Porcentaje de Humedad
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.porcentaje_humedad}
                  onChange={(e) => setFormData({ ...formData, porcentaje_humedad: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="14.5"
                  required
                />
              </div>

              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-xl p-4 border-2 border-purple-300 shadow-md hover-lift">
                <label className="block text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                  <div className="p-1 bg-purple-200 rounded-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Fanegas
                  <span className="ml-auto text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-bold">Calculado</span>
                </label>
                <input
                  type="text"
                  value={fanegas.toFixed(2)}
                  className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl bg-white font-bold text-purple-900 text-lg shadow-inner"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio por Fanega (RD$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.precio_por_fanega}
                  onChange={(e) => setFormData({ ...formData, precio_por_fanega: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="1800.00"
                  required
                />
              </div>

              <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 rounded-xl p-4 border-2 border-amber-300 shadow-md hover-lift">
                <label className="block text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                  <div className="p-1 bg-amber-200 rounded-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Valor Total
                  <span className="ml-auto text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-bold">Calculado</span>
                </label>
                <input
                  type="text"
                  value={formatCurrency(valorTotal)}
                  className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl bg-white font-bold text-amber-900 text-xl shadow-inner"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avance de Efectivo (Opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.avance_efectivo}
                  onChange={(e) => setFormData({ ...formData, avance_efectivo: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dinero entregado al productor al momento de la pesada
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saldo a Pagar (Calculado)
                </label>
                <input
                  type="text"
                  value={formatCurrency(valorTotal - (parseFloat(formData.avance_efectivo) || 0))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-blue-50 font-bold text-blue-700"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este es el saldo que quedará disponible para compensar con cuentas por cobrar
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas (Opcional)
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Observaciones adicionales..."
                  rows="3"
                />
              </div>
            </div>

            {error && (
              <div className={`mt-6 px-5 py-4 rounded-xl text-sm flex items-start gap-3 animate-scaleIn shadow-lg ${error.includes('localmente')
                ? 'bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 text-orange-800 border-2 border-orange-300'
                : 'bg-gradient-to-r from-red-50 via-rose-50 to-pink-50 text-red-700 border-2 border-red-300'
                }`}>
                <div className={`p-2 rounded-lg ${error.includes('localmente') ? 'bg-orange-200' : 'bg-red-200'}`}>
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="flex-1 font-medium">{error}</span>
              </div>
            )}

            <div className="flex gap-4 mt-8 pt-6 border-t-2 border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 hover:border-gray-400 hover:shadow-md transition-all duration-200 font-semibold flex items-center justify-center gap-2 group"
              >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="group-hover:scale-105 transition-transform">{isModal ? 'Cancelar' : 'Limpiar Formulario'}</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 text-white px-6 py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg hover:shadow-2xl hover:scale-105 group relative overflow-hidden animate-gradient bg-[length:200%_100%]"
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <Save className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300 relative z-10" />
                <span className="relative z-10">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </span>
                  ) : 'Guardar Pesada'}
                </span>
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>

      {showFleteModal && savedPesada && (
        <ModalFleteObreros
          pesada={savedPesada}
          user={user}
          onClose={handleFleteModalClose}
          onSuccess={handleFleteModalClose}
        />
      )}
    </>
  );
}
