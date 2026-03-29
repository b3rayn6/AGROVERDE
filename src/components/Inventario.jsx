import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Plus, Edit2, Trash2, AlertTriangle, Search, Printer, RotateCcw, Download } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';

export default function Inventario() {
  const [mercancias, setMercancias] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [rotacionInventario, setRotacionInventario] = useState([]);
  const [mostrarRotacion, setMostrarRotacion] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    unidad_medida: '',
    precio_compra: '',
    precio_venta: '',
    precio_1: '',
    precio_2: '',
    precio_3: '',
    stock_actual: '',
    stock_minimo: '',
    activo: true
  });

  useEffect(() => {
    cargarMercancias();
  }, []);

  useEffect(() => {
    if (mercancias.length > 0) {
      cargarRotacionInventario();
    }
  }, [mercancias]);

  const cargarMercancias = async () => {
    const { data, error } = await supabase
      .from('mercancias')
      .select('*')
      .order('nombre');
    
    if (!error) setMercancias(data || []);
  };

  const cargarRotacionInventario = async () => {
    try {
      // Obtener todos los items de venta con información de facturas y mercancías
      const { data: itemsVenta, error: errorItems } = await supabase
        .from('items_factura_venta')
        .select(`
          *,
          facturas_venta(id, fecha),
          mercancias(id, codigo, nombre, categoria, unidad_medida, precio_compra, precio_venta)
        `);

      if (errorItems) {
        console.error('Error al cargar items de venta:', errorItems);
        return;
      }

      // Agrupar ventas por producto
      const ventasPorProducto = {};
      
      itemsVenta?.forEach(item => {
        const mercanciaId = item.mercancias?.id;
        if (!mercanciaId) return;

        if (!ventasPorProducto[mercanciaId]) {
          ventasPorProducto[mercanciaId] = {
            mercancia: item.mercancias,
            cantidadVendida: 0,
            valorVentas: 0,
            numeroVentas: 0
          };
        }

        ventasPorProducto[mercanciaId].cantidadVendida += parseFloat(item.cantidad || 0);
        ventasPorProducto[mercanciaId].valorVentas += parseFloat(item.subtotal || 0);
        ventasPorProducto[mercanciaId].numeroVentas += 1;
      });

      // Calcular rotación para cada producto
      const rotacion = Object.values(ventasPorProducto).map(producto => {
        const mercancia = mercancias.find(m => m.id === producto.mercancia.id);
        const inventarioActual = mercancia ? parseFloat(mercancia.stock_actual || 0) : 0;
        
        // Rotación = Cantidad Vendida / Inventario Actual (si hay inventario)
        const rotacion = inventarioActual > 0 
          ? (producto.cantidadVendida / inventarioActual).toFixed(2)
          : producto.cantidadVendida > 0 ? '∞' : '0';
        
        // Días de inventario = 365 / Rotación (si hay rotación)
        const diasInventario = parseFloat(rotacion) > 0 
          ? (365 / parseFloat(rotacion)).toFixed(1)
          : 'N/A';

        return {
          ...producto,
          inventarioActual,
          rotacion: parseFloat(rotacion) || 0,
          diasInventario: diasInventario !== 'N/A' ? parseFloat(diasInventario) : null,
          rotacionDisplay: rotacion
        };
      });

      // Ordenar por rotación descendente
      rotacion.sort((a, b) => {
        if (a.rotacionDisplay === '∞') return -1;
        if (b.rotacionDisplay === '∞') return 1;
        return b.rotacion - a.rotacion;
      });

      setRotacionInventario(rotacion);
    } catch (error) {
      console.error('Error al cargar rotación de inventario:', error);
    }
  };

  const generarPDF = async () => {
    const { generarPDFInventario } = await import('../lib/pdfGenerator');
    
    // Preparar datos para el PDF
    const productosParaPDF = mercancias.map(m => ({
      codigo: m.codigo,
      nombre: m.nombre,
      categoria: m.categoria,
      cantidad: m.stock_actual,
      unidad_medida: m.unidad_medida,
      precio_compra: m.precio_compra,
      precio_venta: m.precio_venta,
      stock_minimo: m.stock_minimo
    }));
    
    generarPDFInventario(productosParaPDF);
  };

  const generarPDFRotacion = async () => {
    const { generarPDFRotacionInventario } = await import('../lib/pdfGenerator');
    
    // Preparar datos para el PDF de rotación
    const rotacionParaPDF = rotacionInventario.map(r => ({
      codigo: r.mercancia?.codigo || '',
      nombre: r.mercancia?.nombre || '',
      categoria: r.mercancia?.categoria || '',
      unidad_medida: r.mercancia?.unidad_medida || '',
      cantidadVendida: r.cantidadVendida,
      valorVentas: r.valorVentas,
      inventarioActual: r.inventarioActual,
      rotacion: r.rotacionDisplay === '∞' ? '∞' : (parseFloat(r.rotacionDisplay) || 0),
      diasInventario: r.diasInventario || null,
      numeroVentas: r.numeroVentas || 0
    }));
    
    generarPDFRotacionInventario(rotacionParaPDF);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const datos = {
      ...formData,
      precio_compra: parseFloat(formData.precio_compra) || 0,
      precio_venta: parseFloat(formData.precio_venta) || 0,
      precio_1: parseFloat(formData.precio_1) || 0,
      precio_2: parseFloat(formData.precio_2) || 0,
      precio_3: parseFloat(formData.precio_3) || 0,
      stock_actual: parseInt(formData.stock_actual) || 0,
      stock_minimo: parseInt(formData.stock_minimo) || 0
    };

    if (editando) {
      await supabase
        .from('mercancias')
        .update(datos)
        .eq('id', editando.id);
    } else {
      await supabase
        .from('mercancias')
        .insert([datos]);
    }

    setShowModal(false);
    setEditando(null);
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: '',
      unidad_medida: '',
      precio_compra: '',
      precio_venta: '',
      precio_1: '',
      precio_2: '',
      precio_3: '',
      stock_actual: '',
      stock_minimo: '',
      activo: true
    });
    cargarMercancias();
  };

  const handleEditar = (mercancia) => {
    setEditando(mercancia);
    setFormData(mercancia);
    setShowModal(true);
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Eliminar esta mercancía?')) {
      await supabase.from('mercancias').delete().eq('id', id);
      cargarMercancias();
    }
  };

  const mercanciasFiltradas = mercancias.filter(m =>
    m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.categoria?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalValorInventario = mercancias.reduce((sum, m) => 
    sum + (m.stock_actual * m.precio_compra), 0
  );

  const productosStockBajo = mercancias.filter(m => 
    m.stock_actual <= m.stock_minimo && m.activo
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <h1 className="text-2xl sm:text-2xl font-bold text-gray-800">Inventario</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={generarPDF}
                className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
                Generar PDF
              </button>
              <button
                onClick={() => setMostrarRotacion(!mostrarRotacion)}
                className="w-full sm:w-auto bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                Rotación de Inventarios
              </button>
              <button
                onClick={() => {
                  setEditando(null);
                  setFormData({
                    codigo: '',
                    nombre: '',
                    descripcion: '',
                    categoria: '',
                    unidad_medida: '',
                    precio_compra: '',
                    precio_venta: '',
                    precio_1: '',
                    precio_2: '',
                    precio_3: '',
                    stock_actual: '',
                    stock_minimo: '',
                    activo: true
                  });
                  setShowModal(true);
                }}
                className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Nueva Mercancía
              </button>
            </div>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-600 font-medium">Total Productos</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-700">{mercancias.length}</p>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-green-600 font-medium">Valor Inventario</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700">{formatCurrency(totalValorInventario)}</p>
            </div>
            <div className="bg-red-50 p-3 sm:p-4 rounded-lg sm:col-span-2 lg:col-span-1">
              <p className="text-xs sm:text-sm text-red-600 font-medium">Stock Bajo</p>
              <p className="text-xl sm:text-2xl font-bold text-red-700">{productosStockBajo}</p>
            </div>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o categoría..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Sección de Rotación de Inventarios */}
        {mostrarRotacion && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Rotación de Inventarios</h2>
              </div>
              <button
                onClick={generarPDFRotacion}
                className="w-full sm:w-auto bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                Descargar PDF
              </button>
            </div>
            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg">
              <h3 className="text-base font-bold text-purple-800 mb-2">📊 ¿Qué es la Rotación de Inventarios?</h3>
              <p className="text-sm text-gray-700 mb-3">
                La <strong>rotación de inventarios</strong> es un indicador clave que nos muestra cuántas veces se vende completamente el inventario de un producto en un período determinado. 
                Este análisis nos ayuda a entender cómo se están vendiendo los productos y tomar decisiones informadas sobre la gestión de inventario.
              </p>
              <p className="text-sm text-gray-700 font-semibold mb-2">¿Cómo se calcula?</p>
              <p className="text-sm text-gray-700 mb-3">
                <strong>Rotación = Cantidad Vendida ÷ Inventario Actual</strong>
              </p>
              <p className="text-sm text-gray-700 font-semibold mb-2">¿Cómo funciona?</p>
              <ul className="text-sm text-gray-700 space-y-1 mb-3 ml-4">
                <li>• Se analiza el historial de ventas de cada producto</li>
                <li>• Se calcula la cantidad total vendida y el valor de esas ventas</li>
                <li>• Se compara con el inventario actual para determinar la rotación</li>
                <li>• Se calculan los días de inventario restantes basados en el ritmo de venta actual</li>
              </ul>
              <p className="text-sm text-gray-700">
                <strong>💡 Consejo:</strong> Los productos con alta rotación necesitan reposición frecuente, mientras que los de baja rotación pueden requerir estrategias de venta o reducción de stock.
              </p>
            </div>
            
            {/* Tabla de Rotación */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-50 border-b border-purple-200">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Código</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Producto</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Categoría</th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Cant. Vendida</th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Valor Ventas</th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Inventario Actual</th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Rotación</th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Días Inventario</th>
                    <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase"># Ventas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rotacionInventario.length > 0 ? (
                    rotacionInventario.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm font-medium text-gray-900">
                          {item.mercancia?.codigo || '-'}
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-700">
                          {item.mercancia?.nombre || '-'}
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-700">
                          {item.mercancia?.categoria || '-'}
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-right text-gray-700">
                          {item.cantidadVendida.toFixed(2)} {item.mercancia?.unidad_medida || ''}
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-right text-gray-700">
                          {formatCurrency(item.valorVentas)}
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-right text-gray-700">
                          {item.inventarioActual.toFixed(2)} {item.mercancia?.unidad_medida || ''}
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-right">
                          <span className={`font-bold ${
                            item.rotacionDisplay === '∞' ? 'text-green-600' :
                            parseFloat(item.rotacionDisplay) > 12 ? 'text-green-600' :
                            parseFloat(item.rotacionDisplay) > 6 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {item.rotacionDisplay === '∞' ? '∞' : parseFloat(item.rotacionDisplay).toFixed(2)}x
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-right text-gray-700">
                          {item.diasInventario !== null ? `${item.diasInventario.toFixed(1)} días` : 'N/A'}
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-center text-gray-700">
                          {item.numeroVentas}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="px-4 lg:px-6 py-8 text-center text-gray-500">
                        No hay datos de rotación disponibles
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Leyenda */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-2"><strong>Interpretación:</strong></p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• <span className="text-green-600 font-bold">Rotación alta (&gt;12x)</span>: Productos que se venden muy rápido</li>
                <li>• <span className="text-yellow-600 font-bold">Rotación media (6-12x)</span>: Productos con venta regular</li>
                <li>• <span className="text-red-600 font-bold">Rotación baja (&lt;6x)</span>: Productos que se venden lentamente</li>
                <li>• <strong>Días de Inventario:</strong> Cuántos días durará el inventario actual con el ritmo de venta actual</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tabla Desktop / Cards Mobile */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P. Compra</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P. Venta</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mercanciasFiltradas.map((mercancia) => (
                  <tr key={mercancia.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm font-medium text-gray-900">{mercancia.codigo}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-700">{mercancia.nombre}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-700">{mercancia.categoria}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className={mercancia.stock_actual <= mercancia.stock_minimo ? 'text-red-600 font-bold' : 'text-gray-700'}>
                          {mercancia.stock_actual}
                        </span>
                        {mercancia.stock_actual <= mercancia.stock_minimo && (
                          <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-700">{mercancia.unidad_medida}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-700">{formatCurrency(mercancia.precio_compra)}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-700">
                      {formatCurrency(mercancia.precio_1 || mercancia.precio_venta || 0)}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        mercancia.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {mercancia.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditar(mercancia)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(mercancia.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {mercanciasFiltradas.map((mercancia) => (
              <div key={mercancia.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{mercancia.nombre}</p>
                    <p className="text-xs text-gray-500 mt-1">Código: {mercancia.codigo}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditar(mercancia)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEliminar(mercancia.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <p className="text-gray-500">Categoría</p>
                    <p className="font-medium text-gray-700">{mercancia.categoria || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Unidad</p>
                    <p className="font-medium text-gray-700">{mercancia.unidad_medida}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Stock</p>
                    <div className="flex items-center gap-1">
                      <span className={mercancia.stock_actual <= mercancia.stock_minimo ? 'text-red-600 font-bold' : 'text-gray-700'}>
                        {mercancia.stock_actual}
                      </span>
                      {mercancia.stock_actual <= mercancia.stock_minimo && (
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500">Estado</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      mercancia.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {mercancia.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500">P. Compra</p>
                    <p className="font-medium text-gray-700">{formatCurrency(mercancia.precio_compra)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">P. Venta</p>
                    <p className="font-medium text-gray-700">{formatCurrency(mercancia.precio_1 || mercancia.precio_venta || 0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
                {editando ? 'Editar Mercancía' : 'Nueva Mercancía'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Código *</label>
                    <input
                      type="text"
                      required
                      value={formData.codigo}
                      onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <input
                      type="text"
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Unidad de Medida *</label>
                    <input
                      type="text"
                      required
                      value={formData.unidad_medida}
                      onChange={(e) => setFormData({...formData, unidad_medida: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Saco, Litro, Kilo"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Precio Compra (DOP) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.precio_compra}
                      onChange={(e) => setFormData({...formData, precio_compra: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Precio Venta Antiguo (DOP)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.precio_venta}
                      onChange={(e) => setFormData({...formData, precio_venta: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      placeholder="Referencia antigua"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3">Precios de Venta (en DOP)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Precio 1 *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.precio_1}
                        onChange={(e) => setFormData({...formData, precio_1: e.target.value})}
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Precio nivel 1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Precio 2 *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.precio_2}
                        onChange={(e) => setFormData({...formData, precio_2: e.target.value})}
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Precio nivel 2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Precio 3 *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.precio_3}
                        onChange={(e) => setFormData({...formData, precio_3: e.target.value})}
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Precio nivel 3"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">💡 Los precios se convertirán automáticamente a USD usando la tasa de cambio al facturar</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                    <input
                      type="number"
                      value={formData.stock_actual}
                      onChange={(e) => setFormData({...formData, stock_actual: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                    <input
                      type="number"
                      value={formData.stock_minimo}
                      onChange={(e) => setFormData({...formData, stock_minimo: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="activo" className="text-xs sm:text-sm font-medium text-gray-700">
                    Producto Activo
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-3 sm:pt-4">
                  <button
                    type="submit"
                    className="w-full sm:flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base"
                  >
                    {editando ? 'Actualizar' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditando(null);
                    }}
                    className="w-full sm:flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium text-sm sm:text-base"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}