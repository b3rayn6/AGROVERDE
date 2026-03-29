import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Download, Search, Edit2, Trash2, DollarSign, TrendingDown, Calendar, FileText } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroFecha, setFiltroFecha] = useState({
    inicio: format(new Date(), 'yyyy-MM-dd'),
    fin: format(new Date(), 'yyyy-MM-dd')
  });
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroMoneda, setFiltroMoneda] = useState('todos');

  const [formData, setFormData] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    concepto: '',
    categoria: 'servicios',
    monto: '',
    moneda: 'DOP',
    metodo_pago: 'EFECTIVO',
    proveedor: '',
    numero_factura: '',
    descripcion: '',
    notas: ''
  });

  const [editingId, setEditingId] = useState(null);

  const categorias = [
    { value: 'servicios', label: 'Servicios' },
    { value: 'salarios', label: 'Salarios y Nómina' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
    { value: 'transporte', label: 'Transporte y Flete' },
    { value: 'suministros', label: 'Suministros' },
    { value: 'alquiler', label: 'Alquiler' },
    { value: 'impuestos', label: 'Impuestos' },
    { value: 'electricidad', label: 'Electricidad' },
    { value: 'agua', label: 'Agua' },
    { value: 'internet', label: 'Internet/Teléfono' },
    { value: 'combustible', label: 'Combustible' },
    { value: 'reparaciones', label: 'Reparaciones' },
    { value: 'seguros', label: 'Seguros' },
    { value: 'publicidad', label: 'Publicidad' },
    { value: 'papeleria', label: 'Papelería' },
    { value: 'otros', label: 'Otros' }
  ];

  useEffect(() => {
    cargarGastos();
  }, [filtroFecha, filtroCategoria, filtroMoneda]);

  async function cargarGastos() {
    try {
      setLoading(true);
      let query = supabase
        .from('cuadre_caja')
        .select('*')
        .eq('tipo', 'egreso')
        .gte('fecha', filtroFecha.inicio)
        .lte('fecha', filtroFecha.fin)
        .order('fecha', { ascending: false });

      if (filtroCategoria !== 'todos') {
        query = query.eq('categoria', filtroCategoria);
      }

      if (filtroMoneda !== 'todos') {
        query = query.eq('moneda', filtroMoneda);
      }

      const { data, error } = await query;

      if (error) throw error;

      setGastos(data || []);
    } catch (error) {
      console.error('Error al cargar gastos:', error);
      alert('Error al cargar gastos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.concepto || !formData.monto || parseFloat(formData.monto) <= 0) {
      alert('Por favor complete todos los campos requeridos con valores válidos');
      return;
    }

    try {
      const gastoData = {
        fecha: formData.fecha,
        tipo: 'egreso',
        concepto: formData.concepto,
        categoria: formData.categoria,
        monto: parseFloat(formData.monto),
        moneda: formData.moneda,
        metodo_pago: formData.metodo_pago,
        proveedor: formData.proveedor || null,
        referencia: formData.numero_factura || null,
        descripcion: formData.descripcion || `Gasto - ${formData.concepto}`,
        notas: formData.notas || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('cuadre_caja')
          .update(gastoData)
          .eq('id', editingId);

        if (error) throw error;
        alert('Gasto actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('cuadre_caja')
          .insert([gastoData]);

        if (error) throw error;
        alert('Gasto registrado exitosamente');
      }

      setShowModal(false);
      resetForm();
      cargarGastos();
    } catch (error) {
      console.error('Error al guardar gasto:', error);
      alert('Error al guardar gasto: ' + error.message);
    }
  }

  function resetForm() {
    setFormData({
      fecha: format(new Date(), 'yyyy-MM-dd'),
      concepto: '',
      categoria: 'servicios',
      monto: '',
      moneda: 'DOP',
      metodo_pago: 'EFECTIVO',
      proveedor: '',
      numero_factura: '',
      descripcion: '',
      notas: ''
    });
    setEditingId(null);
  }

  function handleEdit(gasto) {
    setFormData({
      fecha: gasto.fecha,
      concepto: gasto.concepto,
      categoria: gasto.categoria || 'otros',
      monto: gasto.monto.toString(),
      moneda: gasto.moneda,
      metodo_pago: gasto.metodo_pago || 'EFECTIVO',
      proveedor: gasto.proveedor || '',
      numero_factura: gasto.referencia || '',
      descripcion: gasto.descripcion || '',
      notas: gasto.notas || ''
    });
    setEditingId(gasto.id);
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!confirm('¿Está seguro de eliminar este gasto?')) return;

    try {
      const { error } = await supabase
        .from('cuadre_caja')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Gasto eliminado exitosamente');
      cargarGastos();
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      alert('Error al eliminar gasto: ' + error.message);
    }
  }

  const gastosFiltrados = gastos.filter(gasto =>
    gasto.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gasto.proveedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gasto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDOP = gastosFiltrados
    .filter(g => g.moneda === 'DOP')
    .reduce((sum, g) => sum + parseFloat(g.monto), 0);

  const totalUSD = gastosFiltrados
    .filter(g => g.moneda === 'USD')
    .reduce((sum, g) => sum + parseFloat(g.monto), 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Egresos y Gastos</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Gasto
        </button>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-red-100 text-sm font-medium">Total Gastos DOP</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalDOP, 'DOP')}</p>
            </div>
            <TrendingDown className="w-10 h-10 text-red-200" />
          </div>
          <p className="text-red-100 text-xs">{gastosFiltrados.filter(g => g.moneda === 'DOP').length} registros</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-orange-100 text-sm font-medium">Total Gastos USD</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalUSD, 'USD')}</p>
            </div>
            <DollarSign className="w-10 h-10 text-orange-200" />
          </div>
          <p className="text-orange-100 text-xs">{gastosFiltrados.filter(g => g.moneda === 'USD').length} registros</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-2">Total General</p>
              <p className="text-lg font-bold">DOP: {formatCurrency(totalDOP, 'DOP')}</p>
              <p className="text-lg font-bold">USD: {formatCurrency(totalUSD, 'USD')}</p>
            </div>
            <FileText className="w-10 h-10 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={filtroFecha.inicio}
              onChange={(e) => setFiltroFecha({ ...filtroFecha, inicio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
            <input
              type="date"
              value={filtroFecha.fin}
              onChange={(e) => setFiltroFecha({ ...filtroFecha, fin: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="todos">Todas</option>
              {categorias.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
            <select
              value={filtroMoneda}
              onChange={(e) => setFiltroMoneda(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="todos">Todas</option>
              <option value="DOP">Pesos (DOP)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Gastos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    Cargando gastos...
                  </td>
                </tr>
              ) : gastosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No hay gastos registrados
                  </td>
                </tr>
              ) : (
                gastosFiltrados.map((gasto) => (
                  <tr key={gasto.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(gasto.fecha), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{gasto.concepto}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {categorias.find(c => c.value === gasto.categoria)?.label || gasto.categoria}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{gasto.proveedor || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{gasto.metodo_pago}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{gasto.referencia || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right text-red-600">
                      -{formatCurrency(gasto.monto, gasto.moneda)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleEdit(gasto)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(gasto.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingId ? 'Editar Gasto' : 'Nuevo Gasto'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Concepto *
                  </label>
                  <input
                    type="text"
                    value={formData.concepto}
                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ej: Pago de luz"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    {categorias.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moneda *
                  </label>
                  <select
                    value={formData.moneda}
                    onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="DOP">Pesos Dominicanos (RD$)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago *
                  </label>
                  <select
                    value={formData.metodo_pago}
                    onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="TARJETA">Tarjeta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    value={formData.proveedor}
                    onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Nombre del proveedor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. Factura/Referencia
                  </label>
                  <input
                    type="text"
                    value={formData.numero_factura}
                    onChange={(e) => setFormData({ ...formData, numero_factura: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ej: FAC-001"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows="2"
                    placeholder="Descripción del gasto"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows="2"
                    placeholder="Notas adicionales"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                >
                  {editingId ? 'Actualizar' : 'Registrar'} Gasto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
