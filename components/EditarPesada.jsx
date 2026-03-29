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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Editar Pesada</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
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
                onChange={(e) => setFormData({...formData, numero_pesada: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ej: P-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Productor
              </label>
              <input
                type="text"
                value={formData.nombre_productor}
                onChange={(e) => setFormData({...formData, nombre_productor: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección
              </label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Variedad de Arroz
              </label>
              <input
                type="text"
                value={formData.variedad}
                onChange={(e) => setFormData({...formData, variedad: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                onChange={(e) => setFormData({...formData, cantidad_sacos: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                onChange={(e) => setFormData({...formData, kilos_bruto: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                onChange={(e) => setFormData({...formData, tara: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                onChange={(e) => setFormData({...formData, porcentaje_humedad: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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