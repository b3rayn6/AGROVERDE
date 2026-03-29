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
      <div className={isModal ? "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" : "w-full max-w-4xl mx-auto my-8"}>
        <div className={`bg-white rounded-2xl shadow-xl w-full ${isModal ? 'max-w-4xl max-h-[90vh]' : ''} overflow-y-auto`}>
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Nueva Pesada</h2>
            {isModal && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kilos Neto (Calculado)
                </label>
                <input
                  type="text"
                  value={kilosNeto.toFixed(2)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fanegas (Calculado)
                </label>
                <input
                  type="text"
                  value={fanegas.toFixed(2)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Total (Calculado)
                </label>
                <input
                  type="text"
                  value={formatCurrency(valorTotal)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-medium"
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
              <div className={`mt-6 px-4 py-3 rounded-lg text-sm ${error.includes('localmente')
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'bg-red-50 text-red-600'
                }`}>
                {error}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {isModal ? 'Cancelar' : 'Limpiar Formulario'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Guardando...' : 'Guardar Pesada'}
              </button>
            </div>
          </form>
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
