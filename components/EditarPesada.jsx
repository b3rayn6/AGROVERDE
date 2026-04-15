import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/formatters';

export default function EditarPesada({ pesada, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    fecha: pesada.fecha,
    numero_pesada: pesada.numero_pesada || '',
    nombre_productor: pesada.nombre_productor,
    direccion: pesada.direccion || '',
    variedad: pesada.variedad,
    cantidad_sacos: pesada.cantidad_sacos,
    kilos_bruto: pesada.kilos_bruto,
    tara: pesada.tara,
    porcentaje_humedad: pesada.porcentaje_humedad,
    precio_por_fanega: pesada.precio_por_fanega,
    avance_efectivo: pesada.avance_efectivo || 0,
    notas: pesada.notas || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const avanceEfectivo = formData.avance_efectivo ? parseFloat(formData.avance_efectivo) : 0;
      const saldoDisponible = valorTotal - avanceEfectivo;
      
      const { error: updateError } = await supabase
        .from('pesadas')
        .update({
          ...formData,
          kilos_neto: kilosNeto,
          fanegas: fanegas,
          valor_total: valorTotal,
          avance_efectivo: avanceEfectivo,
          saldo_disponible: saldoDisponible
        })
        .eq('id', pesada.id);

      if (updateError) {
        setError('Error al actualizar la pesada');
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Error al actualizar la pesada');
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-200">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Editar Pesada</h2>
              <p className="text-blue-100 text-sm">Modificar datos de la pesada</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 group"
          >
            <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(90vh-88px)]">

        <form onSubmit={handleSubmit} className="p-8">
          {/* Sección: Información General */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
              <h3 className="text-lg font-bold text-gray-800">Información General</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Fecha
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 group-hover:border-gray-300"
                  required
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  Número de Pesada
                  <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={formData.numero_pesada}
                  onChange={(e) => setFormData({...formData, numero_pesada: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 group-hover:border-gray-300"
                  placeholder="Ej: P-001"
                />
              </div>
            </div>
          </div>

          {/* Sección: Datos del Productor */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
              <h3 className="text-lg font-bold text-gray-800">Datos del Productor</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Nombre del Productor
                </label>
                <input
                  type="text"
                  value={formData.nombre_productor}
                  onChange={(e) => setFormData({...formData, nombre_productor: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 group-hover:border-gray-300"
                  required
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 group-hover:border-gray-300"
                />
              </div>

              <div className="group md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Variedad de Arroz
                </label>
                <input
                  type="text"
                  value={formData.variedad}
                  onChange={(e) => setFormData({...formData, variedad: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 group-hover:border-gray-300"
                  required
                />
              </div>
            </div>
          </div>

          {/* Sección: Mediciones y Cálculos */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
              <h3 className="text-lg font-bold text-gray-800">Mediciones y Cálculos</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Cantidad de Sacos
                </label>
                <input
                  type="number"
                  value={formData.cantidad_sacos}
                  onChange={(e) => setFormData({...formData, cantidad_sacos: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 group-hover:border-gray-300"
                  required
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  Kilos Bruto
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.kilos_bruto}
                  onChange={(e) => setFormData({...formData, kilos_bruto: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 group-hover:border-gray-300"
                  required
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                  Tara
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tara}
                  onChange={(e) => setFormData({...formData, tara: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 group-hover:border-gray-300"
                  required
                />
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                <label className="block text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                  </svg>
                  Kilos Neto
                  <span className="ml-auto text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">Calculado</span>
                </label>
                <input
                  type="text"
                  value={kilosNeto.toFixed(2)}
                  className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl bg-white font-bold text-purple-900 text-lg"
                  readOnly
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  % Humedad
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.porcentaje_humedad}
                  onChange={(e) => setFormData({...formData, porcentaje_humedad: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 group-hover:border-gray-300"
                  required
                />
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                <label className="block text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Fanegas
                  <span className="ml-auto text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">Calculado</span>
                </label>
                <input
                  type="text"
                  value={fanegas.toFixed(2)}
                  className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl bg-white font-bold text-purple-900 text-lg"
                  readOnly
                />
              </div>
            </div>
          </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio por Fanega (RD$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.precio_por_fanega}
                onChange={(e) => setFormData({...formData, precio_por_fanega: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                onChange={(e) => setFormData({...formData, avance_efectivo: e.target.value})}
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
                value={`RD$ ${(valorTotal - (parseFloat(formData.avance_efectivo) || 0)).toFixed(2)}`}
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
                onChange={(e) => setFormData({...formData, notas: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Observaciones adicionales..."
                rows="3"
              />
            </div>
          </div>

          {error && (
            <div className="mt-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Actualizando...' : 'Actualizar Pesada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}