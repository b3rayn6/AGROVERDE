import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus, Save, Trash2, Edit2, DollarSign } from 'lucide-react';

export default function GastosFleteModal({ flete, onClose, user }) {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingGasto, setEditingGasto] = useState(null);
  
  const [formData, setFormData] = useState({
    tipo: 'Combustible',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: ''
  });

  const tiposGasto = ['Combustible', 'Peaje', 'Avance de efectivo', 'Otros'];

  useEffect(() => {
    if (flete?.id) {
      cargarGastos();
    }
  }, [flete]);

  const cargarGastos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gastos_flete')
        .select('*')
        .eq('flete_id', flete.id)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setGastos(data || []);
    } catch (error) {
      console.error('Error al cargar gastos:', error);
      alert('Error al cargar gastos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const puedeEditar = () => {
    if (user?.email === 'admin@admin.com') return true;
    const permiso = user?.permisos?.find(p => p.modulos?.codigo === 'fletes' || p.modulos?.codigo === 'flete');
    return permiso?.puede_editar === true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!puedeEditar()) return;

    setLoading(true);
    try {
      const gastoData = {
        flete_id: flete.id,
        tipo: formData.tipo,
        monto: parseFloat(formData.monto),
        fecha: formData.fecha,
        descripcion: formData.descripcion || null
      };

      if (editingGasto) {
        const { error } = await supabase
          .from('gastos_flete')
          .update(gastoData)
          .eq('id', editingGasto.id);

        if (error) throw error;
        alert('Gasto actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('gastos_flete')
          .insert([gastoData]);

        if (error) throw error;
        alert('Gasto registrado exitosamente');
      }

      setFormData({
        tipo: 'Combustible',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: ''
      });
      setEditingGasto(null);
      cargarGastos();
    } catch (error) {
      console.error('Error al guardar gasto:', error);
      alert('Error al guardar gasto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (gasto) => {
    setEditingGasto(gasto);
    setFormData({
      tipo: gasto.tipo,
      monto: gasto.monto.toString(),
      fecha: gasto.fecha,
      descripcion: gasto.descripcion || ''
    });
  };

  const handleDelete = async (id) => {
    if (!puedeEditar()) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar este gasto?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('gastos_flete')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Gasto eliminado exitosamente');
      cargarGastos();
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      alert('Error al eliminar gasto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Gastos de Flete</h2>
              <p className="text-sm text-gray-500">
                Chofer: {flete.chofer} | Placa: {flete.placa} | Fecha: {flete.fecha}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
          {/* Form */}
          {puedeEditar() && (
            <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded-xl border border-gray-200 h-fit">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {editingGasto ? 'Editar Gasto' : 'Nuevo Gasto'}
              </h3>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Gasto</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    {tiposGasto.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (Opcional)</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    rows="2"
                    placeholder="Detalles del gasto..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingGasto ? 'Actualizar' : 'Guardar'}
                  </button>
                  {editingGasto && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGasto(null);
                        setFormData({
                          tipo: 'Combustible',
                          monto: '',
                          fecha: new Date().toISOString().split('T')[0],
                          descripcion: ''
                        });
                      }}
                      className="px-4 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* List */}
          <div className={`w-full ${puedeEditar() ? 'md:w-2/3' : ''} flex flex-col`}>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-4 flex justify-between items-center">
              <span className="font-semibold text-orange-800">Total Gastos:</span>
              <span className="text-2xl font-bold text-orange-600">${totalGastos.toFixed(2)}</span>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Descripción</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Monto</th>
                    {puedeEditar() && (
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {gastos.length === 0 ? (
                    <tr>
                      <td colSpan={puedeEditar() ? 5 : 4} className="px-4 py-8 text-center text-gray-500">
                        No hay gastos registrados para este flete.
                      </td>
                    </tr>
                  ) : (
                    gastos.map((gasto) => (
                      <tr key={gasto.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{gasto.fecha}</td>
                        <td className="px-4 py-3 text-gray-700 font-medium">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            gasto.tipo === 'Combustible' ? 'bg-blue-100 text-blue-800' :
                            gasto.tipo === 'Peaje' ? 'bg-yellow-100 text-yellow-800' :
                            gasto.tipo === 'Avance de efectivo' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {gasto.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{gasto.descripcion || '-'}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-700">
                          ${Number(gasto.monto).toFixed(2)}
                        </td>
                        {puedeEditar() && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit(gasto)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(gasto.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
