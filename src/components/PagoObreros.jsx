import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/authUtils';
import { Users, Search, Edit2, Save, X, FileText, Filter } from 'lucide-react';
import { generarPDFPagosObreros } from '../lib/pdfGenerator';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export default function PagoObreros({ user }) {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros adicionales
  const [filters, setFilters] = useState({
    fechaDesde: '',
    fechaHasta: '',
    montoMin: '',
    montoMax: '',
    estado: 'Todos',
    tipo_pago: 'Todos',
    departamento: '',
    cedula_obrero: ''
  });

  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    cantidad_sacos: '',
    precio_saco: '',
    nombre_obrero: '',
    cedula_obrero: '',
    tipo_pago: 'Efectivo',
    departamento: '',
    estado: 'Pagado'
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
    nombre_obrero: '',
    cedula_obrero: '',
    tipo_pago: 'Efectivo',
    departamento: '',
    estado: 'Pagado'
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
      nombre_obrero: pago.nombre_obrero,
      cedula_obrero: pago.cedula_obrero || '',
      tipo_pago: pago.tipo_pago || 'Efectivo',
      departamento: pago.departamento || '',
      estado: pago.estado || 'Pagado'
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
    nombre_obrero: '',
    cedula_obrero: '',
    tipo_pago: 'Efectivo',
    departamento: '',
    estado: 'Pagado'
    });
  };

  const pagosFiltrados = pagos.filter(pago => {
    const matchName = pago.nombre_obrero?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCedula = filters.cedula_obrero ? pago.cedula_obrero?.includes(filters.cedula_obrero) : true;
    const matchFechaDesde = filters.fechaDesde ? pago.fecha >= filters.fechaDesde : true;
    const matchFechaHasta = filters.fechaHasta ? pago.fecha <= filters.fechaHasta : true;
    const matchMontoMin = filters.montoMin ? parseFloat(pago.total) >= parseFloat(filters.montoMin) : true;
    const matchMontoMax = filters.montoMax ? parseFloat(pago.total) <= parseFloat(filters.montoMax) : true;
    const matchEstado = filters.estado !== 'Todos' ? (pago.estado || 'Pagado') === filters.estado : true;
    const matchTipoPago = filters.tipo_pago !== 'Todos' ? (pago.tipo_pago || 'Efectivo') === filters.tipo_pago : true;
    const matchDepartamento = filters.departamento ? pago.departamento?.toLowerCase().includes(filters.departamento.toLowerCase()) : true;

    return matchName && matchCedula && matchFechaDesde && matchFechaHasta && matchMontoMin && matchMontoMax && matchEstado && matchTipoPago && matchDepartamento;
  });
  
  const totalFiltrado = pagosFiltrados.reduce((sum, pago) => sum + parseFloat(pago.total || 0), 0);

  const handleGenerarPDF = () => {
    if (pagosFiltrados.length === 0) {
      alert('No hay pagos para generar el PDF');
      return;
    }
    generarPDFPagosObreros(pagosFiltrados);
  };

  const resetFilters = () => {
    setFilters({
      fechaDesde: '',
    fechaHasta: '',
    montoMin: '',
    montoMax: '',
    estado: 'Todos',
    tipo_pago: 'Todos',
    departamento: '',
    cedula_obrero: ''
    });
    setSearchTerm('');
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
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input
                type="text"
                value={formData.cedula_obrero}
                onChange={(e) => setFormData({ ...formData, cedula_obrero: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento/Área</label>
              <input
                type="text"
                value={formData.departamento}
                onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pago</label>
              <select
                value={formData.tipo_pago}
                onChange={(e) => setFormData({ ...formData, tipo_pago: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Cheque">Cheque</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="Pagado">Pagado</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            <div className="lg:col-span-3 md:col-span-2 bg-green-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-700">Total a Pagar:</span>
                <span className="text-2xl font-bold text-green-600">
                  ${calcularTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="lg:col-span-3 md:col-span-2 flex gap-2">
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

        {/* Resumen de Filtros */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Resumen de Pagos</h2>
            <div className="text-2xl font-bold text-green-600">
              Total: ${totalFiltrado.toFixed(2)}
            </div>
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Mostrando {pagosFiltrados.length} pago(s) según los filtros aplicados.
          </div>
        </div>

        {/* Lista de Pagos */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <h2 className="text-xl font-bold text-gray-800">Pagos Registrados</h2>
            
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-full md:w-64"
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 transition-colors">
                    <Filter className="w-4 h-4" />
                    <span>Filtros</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <h4 className="font-semibold text-gray-900 border-b pb-2 sticky top-0 bg-white">Opciones de Filtro</h4>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Cédula del Obrero</label>
                      <input
                        type="text"
                        placeholder="Ej. 000-0000000-0"
                        value={filters.cedula_obrero}
                        onChange={(e) => setFilters({...filters, cedula_obrero: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Departamento/Área</label>
                      <input
                        type="text"
                        placeholder="Buscar departamento..."
                        value={filters.departamento}
                        onChange={(e) => setFilters({...filters, departamento: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Fecha de Pago (Rango)</label>
                      <div className="flex flex-col gap-2">
                        <input
                          type="date"
                          value={filters.fechaDesde}
                          onChange={(e) => setFilters({...filters, fechaDesde: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Desde"
                        />
                        <input
                          type="date"
                          value={filters.fechaHasta}
                          onChange={(e) => setFilters({...filters, fechaHasta: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Hasta"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Monto Pagado</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Mínimo"
                          value={filters.montoMin}
                          onChange={(e) => setFilters({...filters, montoMin: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="number"
                          placeholder="Máximo"
                          value={filters.montoMax}
                          onChange={(e) => setFilters({...filters, montoMax: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Estado del Pago</label>
                      <select
                        value={filters.estado}
                        onChange={(e) => setFilters({...filters, estado: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="Todos">Todos</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Pagado">Pagado</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Tipo de Pago</label>
                      <select
                        value={filters.tipo_pago}
                        onChange={(e) => setFilters({...filters, tipo_pago: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="Todos">Todos</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Transferencia">Transferencia</option>
                      </select>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={resetFilters}
                        className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        Limpiar Filtros
                      </button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Obrero</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Depto</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sacos</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prec/Saco</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagosFiltrados.map((pago) => (
                  <tr key={pago.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{pago.fecha}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>{pago.nombre_obrero}</div>
                      {pago.cedula_obrero && <div className="text-xs text-gray-500">{pago.cedula_obrero}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{pago.departamento || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{pago.cantidad_sacos}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">${parseFloat(pago.precio_saco).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">${parseFloat(pago.total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{pago.tipo_pago || 'Efectivo'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (pago.estado || 'Pagado') === 'Pagado' ? 'bg-green-100 text-green-800' :
                        (pago.estado || 'Pagado') === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {pago.estado || 'Pagado'}
                      </span>
                    </td>
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
                No hay pagos registrados que coincidan con los filtros
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
