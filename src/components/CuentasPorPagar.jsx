import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, DollarSign, TrendingUp, Calendar, Search, X, FileText } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { formatearFechaLocal } from '../lib/dateUtils';
import { generarPDFCuentasPorPagar } from '../lib/pdfGenerator';

export default function CuentasPorPagar() {
  const [facturas, setFacturas] = useState([]);
  const [suplidores, setSuplidores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [formPago, setFormPago] = useState({
    monto: '',
    metodo_pago: 'efectivo',
    fecha: new Date().toISOString().split('T')[0],
    notas: ''
  });

  useEffect(() => {
    cargarDatos();

    // Suscripción a cambios en tiempo real
    const facturasSubscription = supabase
      .channel('facturas-compra-changes-cpp')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facturas_compra' }, () => {
        cargarDatos();
      })
      .subscribe();

    const suplidoresSubscription = supabase
      .channel('suplidores-changes-cpp')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suplidores' }, () => {
        cargarDatos();
      })
      .subscribe();

    const pagosSubscription = supabase
      .channel('pagos-suplidores-changes-cpp')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_suplidores' }, () => {
        cargarDatos();
      })
      .subscribe();

    return () => {
      facturasSubscription.unsubscribe();
      suplidoresSubscription.unsubscribe();
      pagosSubscription.unsubscribe();
    };
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar facturas de compra
      const { data: facturasData, error: facturasError } = await supabase
        .from('facturas_compra')
        .select('*')
        .order('fecha', { ascending: false });

      if (facturasError) throw facturasError;

      // Cargar suplidores
      const { data: suplidoresData, error: suplidoresError } = await supabase
        .from('suplidores')
        .select('*');

      if (suplidoresError) throw suplidoresError;

      // Combinar datos manualmente
      const facturasConSuplidores = facturasData?.map(factura => {
        const suplidor = suplidoresData?.find(s => s.id === factura.suplidor_id);
        return {
          ...factura,
          suplidores: suplidor || null
        };
      }) || [];

      // Cargar pagos realizados
      const { data: pagosData, error: pagosError } = await supabase
        .from('pagos_suplidores')
        .select('*')
        .order('fecha', { ascending: false });

      if (pagosError) {
        console.error('Error al cargar pagos:', pagosError);
        // Continuar sin pagos si hay error
        setPagos([]);
      } else {
        setPagos(pagosData || []);
      }

      console.log('Facturas cargadas:', facturasConSuplidores.length);
      console.log('Suplidores cargados:', suplidoresData?.length);
      console.log('Pagos cargados:', pagosData?.length || 0);

      setFacturas(facturasConSuplidores);

      // Agrupar por suplidor
      const suplidoresMap = {};
      facturasConSuplidores.forEach(factura => {
        if (factura.suplidores) {
          const supId = factura.suplidores.id;
          if (!suplidoresMap[supId]) {
            suplidoresMap[supId] = {
              ...factura.suplidores,
              facturas_pendientes: 0,
              total_pendiente: 0
            };
          }
          if (factura.estado !== 'pagada') {
            suplidoresMap[supId].facturas_pendientes++;
            suplidoresMap[supId].total_pendiente += parseFloat(factura.balance_pendiente || 0);
          }
        }
      });

      setSuplidores(Object.values(suplidoresMap));
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar las cuentas por pagar');
    } finally {
      setLoading(false);
    }
  };

  const abrirModalPago = (factura) => {
    setFacturaSeleccionada(factura);
    setFormPago({
      monto: factura.balance_pendiente?.toString() || '',
      metodo_pago: 'efectivo',
      fecha: new Date().toISOString().split('T')[0],
      notas: ''
    });
    setShowPagoModal(true);
  };

  const registrarPago = async (e) => {
    e.preventDefault();

    if (!facturaSeleccionada) return;

    const monto = parseFloat(formPago.monto);
    const balancePendiente = parseFloat(facturaSeleccionada.balance_pendiente || 0);

    if (monto <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    if (monto > balancePendiente) {
      alert('El monto no puede ser mayor al balance pendiente');
      return;
    }

    try {
      // Registrar el pago
      const { data: pagoData, error: pagoError } = await supabase
        .from('pagos_suplidores')
        .insert({
          factura_compra_id: facturaSeleccionada.id,
          suplidor_id: facturaSeleccionada.suplidor_id,
          monto: monto,
          metodo_pago: formPago.metodo_pago,
          fecha: formPago.fecha,
          notas: formPago.notas
        })
        .select()
        .single();

      if (pagoError) throw pagoError;

      // Registrar movimiento en cuadre de caja (Egreso)
      const { error: cajaError } = await supabase
        .from('cuadre_caja')
        .insert({
          fecha: formPago.fecha,
          tipo_movimiento: 'egreso',
          concepto: 'pago_factura',
          monto: monto,
          metodo_pago: formPago.metodo_pago,
          referencia: facturaSeleccionada.numero_factura,
          descripcion: `Pago de factura ${facturaSeleccionada.numero_factura} a ${facturaSeleccionada.suplidores?.nombre || 'Suplidor'}`,
          cliente_id: null, // Es pago a suplidor
          proveedor: facturaSeleccionada.suplidores?.nombre,
          factura_id: facturaSeleccionada.id,
          divisa: facturaSeleccionada.divisa || 'DOP'
        });

      if (cajaError) {
        console.error('Error al registrar en cuadre de caja:', cajaError);
        // No lanzamos error para no detener el flujo principal, pero logueamos
      }

      // Calcular nuevo balance y estado
      const nuevoBalance = balancePendiente - monto;
      const montoPagado = parseFloat(facturaSeleccionada.monto_pagado || 0) + monto;
      const nuevoEstado = nuevoBalance === 0 ? 'pagada' : 'parcial';

      // Actualizar la factura
      const { error: facturaError } = await supabase
        .from('facturas_compra')
        .update({
          balance_pendiente: nuevoBalance,
          monto_pagado: montoPagado,
          estado: nuevoEstado
        })
        .eq('id', facturaSeleccionada.id);

      if (facturaError) throw facturaError;

      // Actualizar balance del suplidor
      const nuevoBalanceSuplidor = parseFloat(facturaSeleccionada.suplidores.balance_pendiente || 0) - monto;
      const { error: suplidorError } = await supabase
        .from('suplidores')
        .update({ balance_pendiente: nuevoBalanceSuplidor })
        .eq('id', facturaSeleccionada.suplidor_id);

      if (suplidorError) throw suplidorError;

      alert('Pago registrado exitosamente');
      setShowPagoModal(false);
      cargarDatos();
    } catch (error) {
      console.error('Error al registrar pago:', error);
      alert('Error al registrar el pago');
    }
  };

  const facturasFiltradas = facturas.filter(f => {
    const cumpleFiltro = filtroEstado === 'todas' || f.estado === filtroEstado;
    const cumpleBusqueda = busqueda === '' || 
      f.numero_factura?.toLowerCase().includes(busqueda.toLowerCase()) ||
      f.suplidores?.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFiltro && cumpleBusqueda;
  });

  const totalPorPagar = facturas
    .filter(f => f.estado !== 'pagada')
    .reduce((sum, f) => sum + parseFloat(f.balance_pendiente || 0), 0);

  const totalPorPagarUSD = facturas
    .filter(f => f.estado !== 'pagada' && f.divisa === 'USD')
    .reduce((sum, f) => sum + parseFloat(f.balance_pendiente || 0), 0);

  const totalPagado = facturas.reduce((sum, f) => sum + parseFloat(f.monto_pagado || 0), 0);

  const facturasPendientes = facturas.filter(f => f.estado === 'pendiente').length;

  const getDiasTranscurridos = (fecha) => {
    const fechaFactura = new Date(fecha);
    const hoy = new Date();
    const diff = Math.floor((hoy - fechaFactura) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const pagosPorFactura = (facturaId) => {
    return pagos.filter(p => p.factura_compra_id === facturaId);
  };

  const generarReportePDF = () => {
    // Preparar datos para el PDF
    const facturasPendientes = facturas.filter(f => f.estado !== 'pagada');
    
    // Asegurar que todas las facturas tengan la propiedad divisa y suplidor_nombre
    const facturasParaPDF = facturasPendientes.map(factura => ({
      ...factura,
      divisa: factura.divisa || 'DOP', // Asegurar que siempre tenga divisa
      suplidor_nombre: factura.suplidor_nombre || factura.suplidores?.nombre || 'N/A'
    }));
    
    // Debug: verificar divisas antes de generar PDF
    console.log('Facturas para PDF (con divisa):', facturasParaPDF.map(f => ({
      numero: f.numero_factura,
      divisa: f.divisa,
      total: f.total,
      pendiente: f.balance_pendiente
    })));
    
    // Agrupar por suplidor (para uso futuro si se necesita)
    const resumenPorSuplidor = {};
    facturasParaPDF.forEach(factura => {
      if (factura.suplidores) {
        const supId = factura.suplidores.id;
        if (!resumenPorSuplidor[supId]) {
          resumenPorSuplidor[supId] = {
            nombre: factura.suplidores.nombre,
            totalPorPagar: 0,
            facturas: []
          };
        }
        resumenPorSuplidor[supId].totalPorPagar += parseFloat(factura.balance_pendiente || 0);
        resumenPorSuplidor[supId].facturas.push(factura);
      }
    });

    generarPDFCuentasPorPagar(facturasParaPDF, resumenPorSuplidor);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          <div className="text-gray-500 font-medium">Cargando cuentas por pagar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header con efecto glassmorphism */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-xl border border-white/20">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
            Cuentas por Pagar a Suplidores
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 font-medium">Gestión de deudas con proveedores</p>
        </div>
        <button
          onClick={generarReportePDF}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-xl hover:from-red-600 hover:via-red-700 hover:to-red-800 font-semibold transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 text-sm sm:text-base transform"
        >
          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          Generar PDF
        </button>
      </div>

      {/* Resumen General con efectos modernos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="group relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <span className="text-red-100 text-xs sm:text-sm font-semibold bg-white/10 px-3 py-1 rounded-full">Por Pagar</span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">{formatCurrency(totalPorPagar)}</div>
            <div className="text-red-100 text-xs sm:text-sm font-medium">{facturasPendientes} facturas pendientes</div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <span className="text-green-100 text-xs sm:text-sm font-semibold bg-white/10 px-3 py-1 rounded-full">Por Pagar (USD)</span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">{formatCurrency(totalPorPagarUSD, 'USD')}</div>
            <div className="text-green-100 text-xs sm:text-sm font-medium">Facturas en dólares</div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <span className="text-blue-100 text-xs sm:text-sm font-semibold bg-white/10 px-3 py-1 rounded-full">Pagado</span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">{formatCurrency(totalPagado)}</div>
            <div className="text-blue-100 text-xs sm:text-sm font-medium">Total de pagos realizados</div>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-purple-500 via-pink-600 to-rose-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <span className="text-purple-100 text-xs sm:text-sm font-semibold bg-white/10 px-3 py-1 rounded-full">Suplidores</span>
            </div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">{suplidores.length}</div>
            <div className="text-purple-100 text-xs sm:text-sm font-medium">Con cuentas por pagar</div>
          </div>
        </div>
      </div>

      {/* Resumen por Suplidor */}
      {suplidores.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-5 sm:p-7 mb-6 sm:mb-8 border border-white/20">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-5 sm:mb-6 flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
            Resumen por Suplidor
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {suplidores.map(suplidor => (
              <div key={suplidor.id} className="group bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:border-orange-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-sm sm:text-base font-bold text-gray-800 mb-1 group-hover:text-orange-600 transition-colors">{suplidor.nombre}</div>
                    <div className="text-xs sm:text-sm text-gray-500 mb-1">RNC: {suplidor.rnc || 'N/A'}</div>
                    <div className="text-xs sm:text-sm text-gray-500">Tel: {suplidor.telefono || 'N/A'}</div>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center mb-2 bg-orange-50 rounded-lg px-3 py-2">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">Facturas pendientes:</span>
                    <span className="text-xs sm:text-sm font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">{suplidor.facturas_pendientes}</span>
                  </div>
                  <div className="flex justify-between items-center bg-red-50 rounded-lg px-3 py-2">
                    <span className="text-xs sm:text-sm text-gray-600 font-medium">Total por pagar:</span>
                    <span className="text-xs sm:text-sm font-bold text-red-600">{formatCurrency(suplidor.total_pendiente)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros y Búsqueda */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-5 sm:p-6 mb-6 sm:mb-8 border border-white/20">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Buscar por número de factura o suplidor..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => setFiltroEstado('todas')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                filtroEstado === 'todas'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-md'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFiltroEstado('pendiente')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                filtroEstado === 'pendiente'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-md'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFiltroEstado('parcial')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                filtroEstado === 'parcial'
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-md'
              }`}
            >
              Parciales
            </button>
            <button
              onClick={() => setFiltroEstado('pagada')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                filtroEstado === 'pagada'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-md'
              }`}
            >
              Pagadas
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Facturas */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white">
              <tr>
                <th className="px-5 py-4 text-left text-xs sm:text-sm font-bold uppercase tracking-wider">Factura</th>
                <th className="px-5 py-4 text-left text-xs sm:text-sm font-bold uppercase tracking-wider">Suplidor</th>
                <th className="px-5 py-4 text-left text-xs sm:text-sm font-bold uppercase tracking-wider">Fecha</th>
                <th className="px-5 py-4 text-right text-xs sm:text-sm font-bold uppercase tracking-wider">Total</th>
                <th className="px-5 py-4 text-right text-xs sm:text-sm font-bold uppercase tracking-wider">Pagado</th>
                <th className="px-5 py-4 text-right text-xs sm:text-sm font-bold uppercase tracking-wider">Pendiente</th>
                <th className="px-5 py-4 text-center text-xs sm:text-sm font-bold uppercase tracking-wider">Estado</th>
                <th className="px-5 py-4 text-center text-xs sm:text-sm font-bold uppercase tracking-wider">Días</th>
                <th className="px-5 py-4 text-center text-xs sm:text-sm font-bold uppercase tracking-wider">Pagos</th>
                <th className="px-5 py-4 text-center text-xs sm:text-sm font-bold uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {facturasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-gray-400 text-lg">📋</div>
                      <div className="text-gray-500 font-medium">No hay facturas que coincidan con los filtros</div>
                    </div>
                  </td>
                </tr>
              ) : (
                facturasFiltradas.map((factura) => {
                  const dias = getDiasTranscurridos(factura.fecha);
                  const pagosFactura = pagosPorFactura(factura.id);
                  
                  return (
                    <tr key={factura.id} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-200 group">
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                        {factura.numero_factura}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {factura.suplidores?.nombre || 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatearFechaLocal(factura.fecha)}
                      </td>
                      <td className="px-5 py-4 text-sm text-right font-bold text-gray-900">
                        {formatCurrency(factura.total, factura.divisa || 'DOP')}
                      </td>
                      <td className="px-5 py-4 text-sm text-right font-semibold text-green-600">
                        {formatCurrency(factura.monto_pagado || 0, factura.divisa || 'DOP')}
                      </td>
                      <td className="px-5 py-4 text-sm text-right font-bold text-red-600">
                        {formatCurrency(factura.balance_pendiente || 0, factura.divisa || 'DOP')}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${
                          factura.estado === 'pagada'
                            ? 'bg-gradient-to-r from-green-400 to-green-500 text-white'
                            : factura.estado === 'parcial'
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
                            : 'bg-gradient-to-r from-red-400 to-red-500 text-white'
                        }`}>
                          {factura.estado === 'pagada' ? 'Pagada' : factura.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm ${
                          dias > 30 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {dias} días
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 shadow-sm">
                          {pagosFactura.length}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {factura.estado !== 'pagada' && (
                          <button
                            onClick={() => abrirModalPago(factura)}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Cards */}
        <div className="lg:hidden divide-y divide-gray-200">
          {facturasFiltradas.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="text-gray-400 text-4xl">📋</div>
                <div className="text-gray-500 font-medium">No hay facturas que coincidan con los filtros</div>
              </div>
            </div>
          ) : (
            facturasFiltradas.map((factura) => {
              const dias = getDiasTranscurridos(factura.fecha);
              const pagosFactura = pagosPorFactura(factura.id);
              
              return (
                <div key={factura.id} className="p-5 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-200 border-l-4 border-transparent hover:border-orange-500">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <p className="text-base font-bold text-gray-900 mb-1">{factura.numero_factura}</p>
                      <p className="text-sm text-gray-600">{factura.suplidores?.nombre || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${
                        factura.estado === 'pagada'
                          ? 'bg-gradient-to-r from-green-400 to-green-500 text-white'
                          : factura.estado === 'parcial'
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
                          : 'bg-gradient-to-r from-red-400 to-red-500 text-white'
                      }`}>
                        {factura.estado === 'pagada' ? 'Pagada' : factura.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm ${
                        dias > 30 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {dias} días
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4 bg-gray-50 rounded-xl p-3">
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Fecha</p>
                      <p className="font-semibold text-gray-700">{formatearFechaLocal(factura.fecha)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Total</p>
                      <p className="font-bold text-gray-900">{formatCurrency(factura.total, factura.divisa || 'DOP')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Pagado</p>
                      <p className="font-semibold text-green-600">{formatCurrency(factura.monto_pagado || 0, factura.divisa || 'DOP')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Pendiente</p>
                      <p className="font-bold text-red-600">{formatCurrency(factura.balance_pendiente || 0, factura.divisa || 'DOP')}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs mb-1">Pagos</p>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 shadow-sm">
                        {pagosFactura.length}
                      </span>
                    </div>
                  </div>
                  {factura.estado !== 'pagada' && (
                    <button
                      onClick={() => abrirModalPago(factura)}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    >
                      Pagar
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de Pago */}
      {showPagoModal && facturaSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto transform transition-all animate-slideUp border border-gray-200">
            <div className="bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 p-5 sm:p-7 text-white rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold drop-shadow-lg">Registrar Pago</h2>
                <button
                  onClick={() => setShowPagoModal(false)}
                  className="text-white hover:bg-white/20 rounded-xl p-2 transition-all duration-200 hover:scale-110"
                >
                  <X className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-7 bg-gradient-to-br from-gray-50 to-white">
              {/* Información de la Factura */}
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-4 sm:p-5 mb-5 sm:mb-6 shadow-lg border border-gray-200">
                <h3 className="text-sm sm:text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-green-500 to-teal-500 rounded-full"></div>
                  Información de la Factura
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:gap-5">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs sm:text-sm text-gray-500 font-medium mb-1">Factura</div>
                    <div className="text-sm sm:text-base font-bold text-gray-900">{facturaSeleccionada.numero_factura}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs sm:text-sm text-gray-500 font-medium mb-1">Suplidor</div>
                    <div className="text-sm sm:text-base font-bold text-gray-900 break-words">{facturaSeleccionada.suplidores?.nombre}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs sm:text-sm text-gray-500 font-medium mb-1">Total Factura</div>
                    <div className="text-sm sm:text-base font-bold text-gray-900">{formatCurrency(facturaSeleccionada.total, facturaSeleccionada.divisa || 'DOP')}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border-2 border-red-200">
                    <div className="text-xs sm:text-sm text-red-600 font-medium mb-1">Balance Pendiente</div>
                    <div className="text-sm sm:text-base font-bold text-red-600">{formatCurrency(facturaSeleccionada.balance_pendiente, facturaSeleccionada.divisa || 'DOP')}</div>
                  </div>
                </div>
              </div>

              {/* Historial de Pagos */}
              {pagosPorFactura(facturaSeleccionada.id).length > 0 && (
                <div className="mb-5 sm:mb-6">
                  <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                    Historial de Pagos
                  </h3>
                  <div className="space-y-3">
                    {pagosPorFactura(facturaSeleccionada.id).map((pago) => (
                      <div key={pago.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200 shadow-sm">
                        <div>
                          <div className="text-base sm:text-lg font-bold text-green-700 mb-1">{formatCurrency(pago.monto)}</div>
                          <div className="text-xs sm:text-sm text-gray-600 font-medium">
                            {formatearFechaLocal(pago.fecha)} - <span className="capitalize">{pago.metodo_pago}</span>
                          </div>
                        </div>
                        {pago.notas && (
                          <div className="text-xs sm:text-sm text-gray-600 italic break-words bg-white/60 px-3 py-2 rounded-lg">{pago.notas}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulario de Pago */}
              <form onSubmit={registrarPago} className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2">
                      Monto a Pagar *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formPago.monto}
                      onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                      className="w-full px-4 sm:px-5 py-3 text-sm sm:text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white shadow-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2">
                      Método de Pago *
                    </label>
                    <select
                      value={formPago.metodo_pago}
                      onChange={(e) => setFormPago({ ...formPago, metodo_pago: e.target.value })}
                      className="w-full px-4 sm:px-5 py-3 text-sm sm:text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white shadow-sm"
                      required
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="cheque">Cheque</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2">
                    Fecha de Pago *
                  </label>
                  <input
                    type="date"
                    value={formPago.fecha}
                    onChange={(e) => setFormPago({ ...formPago, fecha: e.target.value })}
                    className="w-full px-4 sm:px-5 py-3 text-sm sm:text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2">
                    Notas
                  </label>
                  <textarea
                    value={formPago.notas}
                    onChange={(e) => setFormPago({ ...formPago, notas: e.target.value })}
                    rows="3"
                    className="w-full px-4 sm:px-5 py-3 text-sm sm:text-base border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white shadow-sm resize-none"
                    placeholder="Notas adicionales sobre el pago..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-5">
                  <button
                    type="button"
                    onClick={() => setShowPagoModal(false)}
                    className="w-full sm:flex-1 px-5 sm:px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all duration-300 text-sm sm:text-base shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:flex-1 px-5 sm:px-6 py-3 bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:via-green-700 hover:to-emerald-700 font-bold transition-all duration-300 shadow-xl hover:shadow-2xl text-sm sm:text-base transform hover:scale-[1.02]"
                  >
                    Registrar Pago
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
