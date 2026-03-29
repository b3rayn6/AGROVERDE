import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/formatters';
import { formatearFechaLocal } from '../lib/dateUtils';
import { generateVentaPDF } from '../lib/pdfGenerator';
import { ShoppingCart, Plus, Search, DollarSign, FileText, Printer, CreditCard, Banknote } from 'lucide-react';

export default function VentasDiarias() {
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mercancias, setMercancias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCobrosModal, setShowCobrosModal] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [cobros, setCobros] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const generarPDF = async () => {
    const { generarPDFVentasDiarias } = await import('../lib/pdfGeneratorExtras');
    generarPDFVentasDiarias(ventas);
  };
  
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo_venta: 'contado',
    cliente_id: '',
    cliente_nombre: '',
    metodo_pago: 'efectivo',
    notas: '',
    items: []
  });

  const [nuevoItem, setNuevoItem] = useState({
    mercancia_id: '',
    cantidad: 1,
    precio_unitario: 0
  });

  const [nuevoCobro, setNuevoCobro] = useState({
    fecha_cobro: new Date().toISOString().split('T')[0],
    monto: 0,
    metodo_pago: 'efectivo',
    notas: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [ventasRes, clientesRes, mercanciasRes] = await Promise.all([
        supabase.from('ventas_diarias').select('*').order('fecha', { ascending: false }),
        supabase.from('clientes').select('*').order('nombre'),
        supabase.from('mercancias').select('*').eq('activo', true).order('nombre')
      ]);

      if (ventasRes.error) throw ventasRes.error;
      if (clientesRes.error) throw clientesRes.error;
      if (mercanciasRes.error) throw mercanciasRes.error;

      setVentas(ventasRes.data || []);
      setClientes(clientesRes.data || []);
      setMercancias(mercanciasRes.data || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const agregarItem = () => {
    if (!nuevoItem.mercancia_id || nuevoItem.cantidad <= 0) {
      alert('Seleccione un producto y cantidad válida');
      return;
    }

    const mercancia = mercancias.find(m => m.id === parseInt(nuevoItem.mercancia_id));
    if (!mercancia) return;

    if (mercancia.stock_actual < nuevoItem.cantidad) {
      alert(`Stock insuficiente. Disponible: ${mercancia.stock_actual}`);
      return;
    }

    const precio = nuevoItem.precio_unitario || mercancia.precio_venta;
    const subtotal = nuevoItem.cantidad * precio;

    const item = {
      mercancia_id: mercancia.id,
      producto_nombre: mercancia.nombre,
      cantidad: nuevoItem.cantidad,
      precio_unitario: precio,
      subtotal: subtotal
    };

    setFormData({
      ...formData,
      items: [...formData.items, item]
    });

    setNuevoItem({
      mercancia_id: '',
      cantidad: 1,
      precio_unitario: 0
    });
  };

  const eliminarItem = (index) => {
    const nuevosItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: nuevosItems });
  };

  const calcularTotales = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.subtotal, 0);
    const itbis = subtotal * 0.18;
    const total = subtotal + itbis;
    return { subtotal, itbis, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      alert('Debe agregar al menos un producto');
      return;
    }

    if (formData.tipo_venta === 'credito' && !formData.cliente_id) {
      alert('Debe seleccionar un cliente para ventas a crédito');
      return;
    }

    try {
      const { subtotal, itbis, total } = calcularTotales();
      
      // Generar número de venta
      const { data: ultimaVenta } = await supabase
        .from('ventas_diarias')
        .select('numero_venta')
        .order('id', { ascending: false })
        .limit(1);
      
      const ultimoNumero = ultimaVenta && ultimaVenta.length > 0 
        ? parseInt(ultimaVenta[0].numero_venta.split('-')[1]) 
        : 0;
      const numeroVenta = `VD-${String(ultimoNumero + 1).padStart(6, '0')}`;

      // Determinar estado y balance
      let estado = 'pendiente';
      let balancePendiente = total;
      
      if (formData.tipo_venta === 'contado') {
        estado = 'pagada';
        balancePendiente = 0;
      }

      // Insertar venta
      const { data: ventaData, error: ventaError } = await supabase
        .from('ventas_diarias')
        .insert([{
          fecha: formData.fecha,
          numero_venta: numeroVenta,
          cliente_id: formData.cliente_id || null,
          cliente_nombre: formData.cliente_nombre || 'Cliente General',
          tipo_venta: formData.tipo_venta,
          subtotal,
          itbis,
          total,
          metodo_pago: formData.tipo_venta === 'contado' ? formData.metodo_pago : null,
          estado,
          balance_pendiente: balancePendiente,
          notas: formData.notas
        }])
        .select()
        .single();

      if (ventaError) throw ventaError;

      // Insertar items
      const itemsConVentaId = formData.items.map(item => ({
        venta_id: ventaData.id,
        mercancia_id: item.mercancia_id,
        producto_nombre: item.producto_nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal
      }));

      const { error: itemsError } = await supabase
        .from('ventas_diarias_items')
        .insert(itemsConVentaId);

      if (itemsError) throw itemsError;

      // Actualizar inventario
      for (const item of formData.items) {
        const { error: invError } = await supabase.rpc('actualizar_stock_venta', {
          p_mercancia_id: item.mercancia_id,
          p_cantidad: item.cantidad
        });

        if (invError) {
          // Si no existe la función, actualizar manualmente
          const { data: mercancia } = await supabase
            .from('mercancias')
            .select('stock_actual')
            .eq('id', item.mercancia_id)
            .single();

          if (mercancia) {
            await supabase
              .from('mercancias')
              .update({ stock_actual: mercancia.stock_actual - item.cantidad })
              .eq('id', item.mercancia_id);
          }
        }
      }

      // Si es a crédito, actualizar balance del cliente
      if (formData.tipo_venta === 'credito' && formData.cliente_id) {
        const { data: cliente } = await supabase
          .from('clientes')
          .select('balance_pendiente')
          .eq('id', formData.cliente_id)
          .single();

        if (cliente) {
          await supabase
            .from('clientes')
            .update({ 
              balance_pendiente: (parseFloat(cliente.balance_pendiente) || 0) + total 
            })
            .eq('id', formData.cliente_id);
        }
      }

      // Si es contado, registrar el cobro automáticamente
      if (formData.tipo_venta === 'contado') {
        await supabase
          .from('cobros_ventas')
          .insert([{
            venta_id: ventaData.id,
            fecha_cobro: formData.fecha,
            monto: total,
            metodo_pago: formData.metodo_pago,
            notas: 'Pago al contado'
          }]);
      }

      alert('Venta registrada exitosamente');
      setShowModal(false);
      resetForm();
      cargarDatos();
    } catch (error) {
      console.error('Error al guardar venta:', error);
      alert('Error al guardar venta: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      tipo_venta: 'contado',
      cliente_id: '',
      cliente_nombre: '',
      metodo_pago: 'efectivo',
      notas: '',
      items: []
    });
    setNuevoItem({
      mercancia_id: '',
      cantidad: 1,
      precio_unitario: 0
    });
  };

  const abrirCobros = async (venta) => {
    setVentaSeleccionada(venta);
    
    const { data, error } = await supabase
      .from('cobros_ventas')
      .select('*')
      .eq('venta_id', venta.id)
      .order('fecha_cobro', { ascending: false });

    if (error) {
      console.error('Error al cargar cobros:', error);
      setCobros([]);
    } else {
      setCobros(data || []);
    }

    setShowCobrosModal(true);
  };

  const registrarCobro = async (e) => {
    e.preventDefault();

    if (nuevoCobro.monto <= 0) {
      alert('El monto debe ser mayor a cero');
      return;
    }

    if (nuevoCobro.monto > ventaSeleccionada.balance_pendiente) {
      alert('El monto no puede ser mayor al balance pendiente');
      return;
    }

    try {
      // Insertar cobro
      const { error: cobroError } = await supabase
        .from('cobros_ventas')
        .insert([{
          venta_id: ventaSeleccionada.id,
          fecha_cobro: nuevoCobro.fecha_cobro,
          monto: nuevoCobro.monto,
          metodo_pago: nuevoCobro.metodo_pago,
          notas: nuevoCobro.notas
        }]);

      if (cobroError) throw cobroError;

      // Actualizar venta
      const nuevoBalance = ventaSeleccionada.balance_pendiente - nuevoCobro.monto;
      const montoPagado = (ventaSeleccionada.monto_pagado || 0) + nuevoCobro.monto;
      const nuevoEstado = nuevoBalance === 0 ? 'pagada' : 'parcial';

      const { error: ventaError } = await supabase
        .from('ventas_diarias')
        .update({
          monto_pagado: montoPagado,
          balance_pendiente: nuevoBalance,
          estado: nuevoEstado
        })
        .eq('id', ventaSeleccionada.id);

      if (ventaError) throw ventaError;

      // Actualizar balance del cliente
      if (ventaSeleccionada.cliente_id) {
        const { data: cliente } = await supabase
          .from('clientes')
          .select('balance_pendiente')
          .eq('id', ventaSeleccionada.cliente_id)
          .single();

        if (cliente) {
          await supabase
            .from('clientes')
            .update({ 
              balance_pendiente: Math.max(0, (parseFloat(cliente.balance_pendiente) || 0) - nuevoCobro.monto)
            })
            .eq('id', ventaSeleccionada.cliente_id);
        }
      }

      alert('Cobro registrado exitosamente');
      setNuevoCobro({
        fecha_cobro: new Date().toISOString().split('T')[0],
        monto: 0,
        metodo_pago: 'efectivo',
        notas: ''
      });
      
      setShowCobrosModal(false);
      cargarDatos();
    } catch (error) {
      console.error('Error al registrar cobro:', error);
      alert('Error al registrar cobro');
    }
  };

  const imprimirVenta = async (venta) => {
    try {
      const { data: items } = await supabase
        .from('ventas_diarias_items')
        .select('*')
        .eq('venta_id', venta.id);

      generateVentaPDF(venta, items || []);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar PDF');
    }
  };

  const ventasFiltradas = ventas.filter(v =>
    v.numero_venta?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.cliente_nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totales = {
    totalVentas: ventas.reduce((sum, v) => sum + parseFloat(v.total), 0),
    totalCobrado: ventas.reduce((sum, v) => sum + (parseFloat(v.monto_pagado) || 0), 0),
    porCobrar: ventas.reduce((sum, v) => sum + parseFloat(v.balance_pendiente), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Cargando ventas...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Ventas Diarias</h1>
            <p className="text-sm text-gray-600 mt-1">Consulta de ventas registradas desde Facturas de Venta</p>
            <p className="text-xs text-orange-600 mt-1">
              ℹ️ Las ventas se registran automáticamente desde el módulo de Facturas de Venta
            </p>
          </div>
        </div>
        <button
          onClick={generarPDF}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Printer className="w-5 h-5" />
          Generar PDF
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">Total Ventas</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totales.totalVentas)}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Total Cobrado</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totales.totalCobrado)}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-red-600" />
            <span className="text-sm text-gray-600">Por Cobrar</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totales.porCobrar)}</div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por número de venta o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Divisa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ventasFiltradas.map((venta) => (
                <tr key={venta.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatearFechaLocal(venta.fecha)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {venta.numero_venta}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {venta.cliente_nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      venta.tipo_venta === 'contado' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {venta.tipo_venta === 'contado' ? 'Contado' : 'Crédito'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      venta.divisa === 'USD' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {venta.divisa || 'DOP'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(venta.total, venta.divisa || 'DOP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    {formatCurrency(venta.balance_pendiente, venta.divisa || 'DOP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      venta.estado === 'pagada' 
                        ? 'bg-green-100 text-green-800' 
                        : venta.estado === 'parcial'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {venta.estado === 'pagada' ? 'Pagada' : venta.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => imprimirVenta(venta)}
                        className="text-gray-600 hover:text-gray-800"
                        title="Imprimir"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {venta.tipo_venta === 'credito' && venta.estado !== 'pagada' && (
                        <button
                          onClick={() => abrirCobros(venta)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Registrar Cobro"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cobros */}
      {showCobrosModal && ventaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Registrar Cobro</h2>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Número de Venta</div>
                    <div className="font-semibold">{ventaSeleccionada.numero_venta}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Cliente</div>
                    <div className="font-semibold">{ventaSeleccionada.cliente_nombre}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total</div>
                    <div className="font-semibold">{formatCurrency(ventaSeleccionada.total, ventaSeleccionada.divisa || 'DOP')}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Balance Pendiente</div>
                    <div className="font-semibold text-red-600">{formatCurrency(ventaSeleccionada.balance_pendiente, ventaSeleccionada.divisa || 'DOP')}</div>
                  </div>
                  {ventaSeleccionada.divisa === 'USD' && ventaSeleccionada.tasa_cambio && (
                    <div>
                      <div className="text-sm text-gray-600">Tasa de Cambio</div>
                      <div className="font-semibold">{parseFloat(ventaSeleccionada.tasa_cambio).toFixed(4)} DOP/USD</div>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={registrarCobro} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Cobro *</label>
                    <input
                      type="date"
                      required
                      value={nuevoCobro.fecha_cobro}
                      onChange={(e) => setNuevoCobro({...nuevoCobro, fecha_cobro: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      max={ventaSeleccionada.balance_pendiente}
                      value={nuevoCobro.monto}
                      onChange={(e) => setNuevoCobro({...nuevoCobro, monto: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago *</label>
                    <select
                      required
                      value={nuevoCobro.metodo_pago}
                      onChange={(e) => setNuevoCobro({...nuevoCobro, metodo_pago: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="cheque">Cheque</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                    <input
                      type="text"
                      value={nuevoCobro.notas}
                      onChange={(e) => setNuevoCobro({...nuevoCobro, notas: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCobrosModal(false);
                      setVentaSeleccionada(null);
                      setNuevoCobro({
                        fecha_cobro: new Date().toISOString().split('T')[0],
                        monto: 0,
                        metodo_pago: 'efectivo',
                        notas: ''
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Registrar Cobro
                  </button>
                </div>
              </form>

              {/* Historial de Cobros */}
              {cobros.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="font-semibold mb-3">Historial de Cobros</h3>
                  <div className="space-y-2">
                    {cobros.map((cobro) => (
                      <div key={cobro.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <div>
                          <div className="font-medium">{formatCurrency(cobro.monto)}</div>
                          <div className="text-sm text-gray-600">
                            {formatearFechaLocal(cobro.fecha_cobro)} - {cobro.metodo_pago}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}