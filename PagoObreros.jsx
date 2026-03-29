import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/authUtils';
import { Users, Search, Edit2, Save, X, FileText } from 'lucide-react';
import { generarPDFPagosObreros } from '../lib/pdfGenerator';

export default function PagoObreros({ user }) {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    cantidad_sacos: '',
    precio_saco: '',
    nombre_obrero: ''
  });

  useEffect(() => {
    if (user?.id) {
      cargarPagos();
    }
  }, [user]);

  // Check if user can edit pagos (only admin@admin.com)
  const puedeEditar = () => {
    return user?.email === 'admin@admin.com';
  };

  const cargarPagos = async () => {
    if (!user?.id) {
      console.error('No hay usuario autenticado');
      return;
    }

    try {
      // Load ALL pagos for all users (no user_id filter)
      const { data, error } = await supabase
        .from('pagos_obreros')
        .select('*')
        .order('fecha', { ascending: true });

      if (error) throw error;
      setPagos(data || []);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
      alert('Error al cargar los pagos: ' + error.message);
    }
  };

  const calcularTotal = () => {
    const sacos = parseFloat(formData.cantidad_sacos) || 0;
    const precio = parseFloat(formData.precio_saco) || 0;
    return sacos * precio;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.id) {
      alert('Error: No hay usuario autenticado');
      return;
    }

    setLoading(true);

    try {
      // Obtener el user_id correcto
      const userId = await getUserId(user);
      if (!userId) {
        alert('Error al obtener el ID de usuario');
        setLoading(false);
        return;
      }

      const total = calcularTotal();
      const dataToSave = { ...formData, total, user_id: userId };

      if (editingId) {
        const { error } = await supabase
          .from('pagos_obreros')
          .update(dataToSave)
          .eq('id', editingId)
          .eq('user_id', userId);

        if (error) throw error;
        alert('Pago actualizado exitosamente');
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from('pagos_obreros')
          .insert([dataToSave]);

        if (error) throw error;
        alert('Pago registrado exitosamente');
      }

      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        cantidad_sacos: '',
        precio_saco: '',
        nombre_obrero: ''
      });
      cargarPagos();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar el pago: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pago) => {
    setFormData({
      fecha: pago.fecha,
      cantidad_sacos: pago.cantidad_sacos,
      precio_saco: pago.precio_saco,
      nombre_obrero: pago.nombre_obrero
    });
    setEditingId(pago.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      cantidad_sacos: '',
      precio_saco: '',
      nombre_obrero: ''
    });
  };

  const pagosFiltrados = pagos.filter(pago =>
    pago.nombre_obrero?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGenerarPDF = () => {
    if (pagosFiltrados.length === 0) {
      alert('No hay pagos para generar el PDF');
      return;
    }
    generarPDFPagosObreros(pagosFiltrados);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 p-3 rounded-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Pago de Obreros</h1>
                <p className="text-gray-600">Gestiona los pagos a obreros</p>
              </div>
            </div>
            <button
              onClick={handleGenerarPDF}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Generar PDF
            </button>
          </div>
        </div>

        {/* Formulario - Solo visible para admin@admin.com */}
        {puedeEditar() && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingId ? 'Editar Pago' : 'Nuevo Pago'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Obrero</label>
              <input
                type="text"
                value={formData.nombre_obrero}
                onChange={(e) => setFormData({ ...formData, nombre_obrero: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Sacos</label>
              <input
                type="number"
                step="0.01"
                value={formData.cantidad_sacos}
                onChange={(e) => setFormData({ ...formData, cantidad_sacos: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio por Saco</label>
              <input
                type="number"
                step="0.01"
                value={formData.precio_saco}
                onChange={(e) => setFormData({ ...formData, precio_saco: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div className="md:col-span-2 bg-green-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-700">Total a Pagar:</span>
                <span className="text-2xl font-bold text-green-600">
                  ${calcularTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Guardando...' : editingId ? 'Actualizar Pago' : 'Registrar Pago'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors font-semibold flex items-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Cancelar
                </button>
              )}
            </div>
          </form>
          </div>
        )}

        {/* Lista de Pagos */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Pagos Registrados</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre de obrero..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-80"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nombre Obrero</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sacos</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Precio/Saco</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagosFiltrados.map((pago) => (
                  <tr key={pago.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{pago.fecha}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{pago.nombre_obrero}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{pago.cantidad_sacos}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">${parseFloat(pago.precio_saco).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">${parseFloat(pago.total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      {puedeEditar() && (
                        <button
                          onClick={() => handleEdit(pago)}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagosFiltrados.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay pagos registrados
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
