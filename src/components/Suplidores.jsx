import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Plus, Edit2, Trash2, Search, DollarSign, FileText } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';

export default function Suplidores() {
  const [suplidores, setSuplidores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showCuentaPorPagarModal, setShowCuentaPorPagarModal] = useState(false);
  const [showCuentasListModal, setShowCuentasListModal] = useState(false);
  const [suplidorSeleccionado, setSuplidorSeleccionado] = useState(null);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    rnc: '',
    telefono: '',
    direccion: '',
    email: ''
  });
  const [formCuentaPorPagar, setFormCuentaPorPagar] = useState({
    numero_factura: '',
    fecha_factura: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    monto: '',
    descripcion: ''
  });
  const [tasaDolar, setTasaDolar] = useState(58.50);
  const [facturasCompra, setFacturasCompra] = useState([]);

  useEffect(() => {
    cargarSuplidores();
    cargarTasaDolar();
    cargarFacturasCompra();

    // Suscripción a cambios en tiempo real
    const suplidoresSubscription = supabase
      .channel('suplidores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suplidores' }, () => {
        cargarSuplidores();
      })
      .subscribe();

    const facturasSubscription = supabase
      .channel('facturas-compra-changes-suplidores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facturas_compra' }, () => {
        cargarFacturasCompra();
        // También recargamos suplidores porque el balance depende de las facturas
        cargarSuplidores();
      })
      .subscribe();

    return () => {
      suplidoresSubscription.unsubscribe();
      facturasSubscription.unsubscribe();
    };
  }, []);

  const cargarTasaDolar = async () => {
    const { data } = await supabase
      .from('configuracion_divisa')
      .select('tasa_dolar')
      .single();
    if (data) setTasaDolar(data.tasa_dolar);
  };

  const cargarFacturasCompra = async () => {
    const { data, error } = await supabase
      .from('facturas_compra')
      .select('balance_pendiente, divisa')
      .gt('balance_pendiente', 0);
    
    if (!error) setFacturasCompra(data || []);
  };

  const cargarSuplidores = async () => {
    const { data, error } = await supabase
      .from('suplidores')
      .select('*')
      .order('nombre');
    
    if (!error) {
      setSuplidores(data || []);
      // Recargar facturas para tener datos actualizados
      cargarFacturasCompra();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editando) {
      await supabase
        .from('suplidores')
        .update(formData)
        .eq('id', editando.id);
    } else {
      await supabase
        .from('suplidores')
        .insert([formData]);
    }

    setShowModal(false);
    setEditando(null);
    setFormData({
      nombre: '',
      rnc: '',
      telefono: '',
      direccion: '',
      email: ''
    });
    cargarSuplidores();
  };

  const handleEditar = (suplidor) => {
    setEditando(suplidor);
    setFormData({
      nombre: suplidor.nombre,
      rnc: suplidor.rnc || '',
      telefono: suplidor.telefono || '',
      direccion: suplidor.direccion || '',
      email: suplidor.email || ''
    });
    setShowModal(true);
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Eliminar este suplidor?')) {
      await supabase.from('suplidores').delete().eq('id', id);
      cargarSuplidores();
    }
  };

  const handleAgregarCuentaPorPagar = (suplidor) => {
    setSuplidorSeleccionado(suplidor);
    setFormCuentaPorPagar({
      numero_factura: '',
      fecha_factura: new Date().toISOString().split('T')[0],
      fecha_vencimiento: '',
      monto: '',
      descripcion: ''
    });
    setShowCuentaPorPagarModal(true);
  };

  const handleSubmitCuentaPorPagar = async (e) => {
    e.preventDefault();
    
    if (!suplidorSeleccionado) return;

    try {
      // Insertar en facturas_compra
      const { data: factura, error } = await supabase
        .from('facturas_compra')
        .insert([{
          numero_factura: formCuentaPorPagar.numero_factura,
          suplidor_id: suplidorSeleccionado.id,
          fecha: formCuentaPorPagar.fecha_factura,
          total: parseFloat(formCuentaPorPagar.monto),
          balance_pendiente: parseFloat(formCuentaPorPagar.monto),
          estado: 'pendiente',
          notas: formCuentaPorPagar.descripcion,
          subtotal: parseFloat(formCuentaPorPagar.monto),
          itbis: 0,
          aplicar_itbis: false,
          divisa: 'DOP',
          tasa_cambio: 1,
          fecha_vencimiento: formCuentaPorPagar.fecha_vencimiento || null,
          monto_pagado: 0,
          metodo_pago: 'efectivo'
        }])
        .select()
        .single();

      if (error) throw error;

      // Actualizar balance del suplidor
      const { data: suplidorActual } = await supabase
        .from('suplidores')
        .select('balance_pendiente')
        .eq('id', suplidorSeleccionado.id)
        .single();

      if (suplidorActual) {
        await supabase
          .from('suplidores')
          .update({
            balance_pendiente: (suplidorActual.balance_pendiente || 0) + parseFloat(formCuentaPorPagar.monto)
          })
          .eq('id', suplidorSeleccionado.id);
      }

      setShowCuentaPorPagarModal(false);
      setSuplidorSeleccionado(null);
      alert('Cuenta por pagar registrada exitosamente en Facturas de Compra');
      cargarSuplidores();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar cuenta por pagar: ' + error.message);
    }
  };

  const handleVerCuentasPorPagar = async (suplidor) => {
    setSuplidorSeleccionado(suplidor);
    
    // Consultar facturas_compra en lugar de cuentas_por_pagar_suplidores
    const { data, error } = await supabase
      .from('facturas_compra')
      .select('*')
      .eq('suplidor_id', suplidor.id)
      .order('fecha', { ascending: false });
    
    if (!error) {
      // Mapear datos para compatibilidad con la vista existente si es necesario
      // O ajustar la vista para usar los campos de facturas_compra
      setCuentasPorPagar(data || []);
      setShowCuentasListModal(true);
    }
  };

  const handleMarcarComoPagada = async (facturaId) => {
    if (window.confirm('¿Marcar esta cuenta como pagada? Se registrará un egreso de caja por el total pendiente.')) {
      try {
        // Obtener la factura actual con datos del suplidor
        const { data: factura } = await supabase
          .from('facturas_compra')
          .select('*, suplidores(nombre)')
          .eq('id', facturaId)
          .single();

        if (!factura) return;

        const montoPagar = parseFloat(factura.balance_pendiente);
        const fechaHoy = new Date().toISOString().split('T')[0];

        // 1. Registrar el pago en pagos_suplidores
        const { error: pagoError } = await supabase
          .from('pagos_suplidores')
          .insert({
            factura_compra_id: factura.id,
            suplidor_id: factura.suplidor_id,
            monto: montoPagar,
            metodo_pago: 'efectivo', // Asumimos efectivo por defecto en acción rápida
            fecha: fechaHoy,
            notas: 'Pago rápido desde módulo Suplidores'
          });

        if (pagoError) throw pagoError;

        // 2. Registrar egreso en cuadre_caja
        const { error: cajaError } = await supabase
          .from('cuadre_caja')
          .insert({
            fecha: fechaHoy,
            tipo_movimiento: 'egreso',
            concepto: 'pago_factura',
            monto: montoPagar,
            metodo_pago: 'efectivo',
            referencia: factura.numero_factura,
            descripcion: `Pago rápido de factura ${factura.numero_factura} a ${factura.suplidores?.nombre || 'Suplidor'}`,
            cliente_id: null,
            proveedor: factura.suplidores?.nombre,
            factura_id: factura.id,
            divisa: factura.divisa || 'DOP'
          });

        if (cajaError) console.error('Error al registrar en caja:', cajaError);

        // 3. Actualizar factura
        await supabase
          .from('facturas_compra')
          .update({ 
            estado: 'pagada',
            balance_pendiente: 0,
            monto_pagado: (parseFloat(factura.monto_pagado) || 0) + montoPagar
          })
          .eq('id', facturaId);
        
        // 4. Actualizar balance del suplidor
        const { data: suplidor } = await supabase
          .from('suplidores')
          .select('balance_pendiente')
          .eq('id', factura.suplidor_id)
          .single();

        if (suplidor) {
          await supabase
            .from('suplidores')
            .update({
              balance_pendiente: Math.max(0, (parseFloat(suplidor.balance_pendiente) || 0) - montoPagar)
            })
            .eq('id', factura.suplidor_id);
        }

        // Recargar la lista
        if (suplidorSeleccionado) {
          handleVerCuentasPorPagar(suplidorSeleccionado);
        }
        cargarSuplidores();
        alert('Factura marcada como pagada y registrada en caja exitosamente.');
      } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar el estado de la factura: ' + error.message);
      }
    }
  };

  const suplidoresFiltrados = suplidores.filter(s =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    s.rnc?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalBalance = suplidores.reduce((sum, s) => sum + (s.balance_pendiente || 0), 0);
  // Sumar solo las facturas que están en USD
  const totalBalanceUSD = facturasCompra
    .filter(f => f.divisa === 'USD')
    .reduce((sum, f) => sum + (parseFloat(f.balance_pendiente) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <h1 className="text-2xl sm:text-2xl font-bold text-gray-800">Suplidores</h1>
            </div>
            <button
              onClick={() => {
                setEditando(null);
                setFormData({
                  nombre: '',
                  rnc: '',
                  telefono: '',
                  direccion: '',
                  email: ''
                });
                setShowModal(true);
              }}
              className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Nuevo Suplidor
            </button>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-600 font-medium">Total Suplidores</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-700">{suplidores.length}</p>
            </div>
            <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-red-600 font-medium">Balance Total Por Pagar</p>
              <p className="text-xl sm:text-2xl font-bold text-red-700">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-green-600 font-medium">Balance Total Por Pagar (USD)</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700">{formatCurrency(totalBalanceUSD, 'USD')}</p>
            </div>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Buscar por nombre o RNC..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabla Desktop / Cards Mobile */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RNC</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {suplidoresFiltrados.map((suplidor) => (
                  <tr key={suplidor.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm font-medium text-gray-900">{suplidor.nombre}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-700">{suplidor.rnc || '-'}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-700">{suplidor.telefono || '-'}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-700">{suplidor.direccion || '-'}</td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm font-bold text-red-600">
                      {formatCurrency(suplidor.balance_pendiente || 0)}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAgregarCuentaPorPagar(suplidor)}
                          className="text-green-600 hover:text-green-800"
                          title="Agregar Cuenta por Pagar"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleVerCuentasPorPagar(suplidor)}
                          className="text-purple-600 hover:text-purple-800"
                          title="Ver Cuentas"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditar(suplidor)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(suplidor.id)}
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
            {suplidoresFiltrados.map((suplidor) => (
              <div key={suplidor.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{suplidor.nombre}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAgregarCuentaPorPagar(suplidor)}
                      className="text-green-600 hover:text-green-800 p-1"
                      title="Agregar Cuenta por Pagar"
                    >
                      <DollarSign className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleVerCuentasPorPagar(suplidor)}
                      className="text-purple-600 hover:text-purple-800 p-1"
                      title="Ver Cuentas"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditar(suplidor)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEliminar(suplidor.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">RNC</p>
                    <p className="font-medium text-gray-700">{suplidor.rnc || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Teléfono</p>
                    <p className="font-medium text-gray-700">{suplidor.telefono || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Dirección</p>
                    <p className="font-medium text-gray-700">{suplidor.direccion || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Balance</p>
                    <p className="font-bold text-red-600">{formatCurrency(suplidor.balance_pendiente || 0)}</p>
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
                {editando ? 'Editar Suplidor' : 'Nuevo Suplidor'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">RNC</label>
                    <input
                      type="text"
                      value={formData.rnc}
                      onChange={(e) => setFormData({...formData, rnc: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={formData.telefono}
                      onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
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

      {/* Modal Agregar Cuenta por Pagar */}
      {showCuentaPorPagarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
                Agregar Cuenta por Pagar - {suplidorSeleccionado?.nombre}
              </h2>
              <form onSubmit={handleSubmitCuentaPorPagar} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Número de Factura *</label>
                  <input
                    type="text"
                    required
                    value={formCuentaPorPagar.numero_factura}
                    onChange={(e) => setFormCuentaPorPagar({...formCuentaPorPagar, numero_factura: e.target.value})}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Fecha de Factura *</label>
                    <input
                      type="date"
                      required
                      value={formCuentaPorPagar.fecha_factura}
                      onChange={(e) => setFormCuentaPorPagar({...formCuentaPorPagar, fecha_factura: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      value={formCuentaPorPagar.fecha_vencimiento}
                      onChange={(e) => setFormCuentaPorPagar({...formCuentaPorPagar, fecha_vencimiento: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formCuentaPorPagar.monto}
                    onChange={(e) => setFormCuentaPorPagar({...formCuentaPorPagar, monto: e.target.value})}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={formCuentaPorPagar.descripcion}
                    onChange={(e) => setFormCuentaPorPagar({...formCuentaPorPagar, descripcion: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Detalle de la cuenta por pagar..."
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-blue-900 font-bold">
                    💡 Esta es una factura INDEPENDIENTE y SEPARADA
                  </p>
                  <p className="text-xs text-blue-800">
                    <strong>¿Cuándo usar esto?</strong>
                  </p>
                  <ul className="text-xs text-blue-700 ml-4 space-y-1">
                    <li>• Ya ingresaste los productos al inventario manualmente</li>
                    <li>• Es un servicio o gasto (no requiere entrada de inventario)</li>
                    <li>• Solo necesitas registrar la deuda con el suplidor</li>
                  </ul>
                  <p className="text-xs text-blue-800 pt-1">
                    <strong>Efectos:</strong> Se registra en el Libro Diario, suma al balance del suplidor, pero NO afecta el inventario.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-3 sm:pt-4">
                  <button
                    type="submit"
                    className="w-full sm:flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium text-sm sm:text-base"
                  >
                    Registrar Cuenta por Pagar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCuentaPorPagarModal(false);
                      setSuplidorSeleccionado(null);
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

      {/* Modal Lista de Cuentas por Pagar */}
      {showCuentasListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                  Cuentas por Pagar - {suplidorSeleccionado?.nombre}
                </h2>
                <button
                  onClick={() => setShowCuentasListModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-800">
                  <strong>📋 Facturas independientes:</strong> Estas son cuentas registradas manualmente que NO afectan el inventario. Las facturas de compra que SÍ afectan inventario se encuentran en el módulo "Facturas de Compra".
                </p>
              </div>

              {cuentasPorPagar.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay cuentas por pagar registradas</p>
              ) : (
                <div className="space-y-3">
                  {cuentasPorPagar.map((cuenta) => (
                    <div key={cuenta.id} className={`border rounded-lg p-4 ${cuenta.estado === 'pagada' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-gray-900">Factura: {cuenta.numero_factura}</p>
                          <p className="text-sm text-gray-600">Fecha: {new Date(cuenta.fecha).toLocaleDateString()}</p>
                          {cuenta.fecha_vencimiento && (
                            <p className="text-sm text-gray-600">Vence: {new Date(cuenta.fecha_vencimiento).toLocaleDateString()}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-red-600">{formatCurrency(cuenta.total)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            cuenta.estado === 'pagada' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {cuenta.estado === 'pagada' ? 'Pagada' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                      {cuenta.notas && (
                        <p className="text-sm text-gray-700 mb-2">{cuenta.notas}</p>
                      )}
                      {cuenta.estado !== 'pagada' && (
                        <button
                          onClick={() => handleMarcarComoPagada(cuenta.id)}
                          className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        >
                          Marcar como Pagada
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={() => setShowCuentasListModal(false)}
                  className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}