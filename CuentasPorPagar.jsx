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
      const { error: pagoError } = await supabase
        .from('pagos_suplidores')
        .insert({
          factura_compra_id: facturaSeleccionada.id,
          suplidor_id: facturaSeleccionada.suplidor_id,
          monto: monto,
          metodo_pago: formPago.metodo_pago,
          fecha: formPago.fecha,
          notas: formPago.notas
        });

      if (pagoError) throw pagoError;

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
        <div className="text-gray-500">Cargando cuentas por pagar...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Cuentas por Pagar a Suplidores</h1>
          <p className="text-xs sm:text-sm text-gray-600">Gestión de deudas con proveedores</p>
        </div>
        <button
          onClick={generarReportePDF}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:from-red-600 hover:to-red-700 font-medium transition-colors shadow-lg text-sm sm:text-base"
        >
          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          Generar PDF
        </button>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
            <span className="text-red-100 text-xs sm:text-sm font-medium">Por Pagar</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold mb-1">{formatCurrency(totalPorPagar)}</div>
          <div className="text-red-100 text-xs sm:text-sm">{facturasPendientes} facturas pendientes</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
            <span className="text-green-100 text-xs sm:text-sm font-medium">Por Pagar (USD)</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold mb-1">{formatCurrency(totalPorPagarUSD, 'USD')}</div>
          <div className="text-green-100 text-xs sm:text-sm">Facturas en dólares</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
            <span className="text-blue-100 text-xs sm:text-sm font-medium">Pagado</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold mb-1">{formatCurrency(totalPagado)}</div>
          <div className="text-blue-100 text-xs sm:text-sm">Total de pagos realizados</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 opacity-80" />
            <span className="text-purple-100 text-xs sm:text-sm font-medium">Suplidores</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold mb-1">{suplidores.length}</div>
          <div className="text-purple-100 text-xs sm:text-sm">Con cuentas por pagar</div>
        </div>
      </div>

      {/* Resumen por Suplidor */}
      {suplidores.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Resumen por Suplidor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {suplidores.map(suplidor => (
              <div key={suplidor.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="text-sm sm:text-base font-semibold text-gray-800 mb-2">{suplidor.nombre}</div>
                <div className="text-xs sm:text-sm text-gray-600 mb-1">RNC: {suplidor.rnc || 'N/A'}</div>
                <div className="text-xs sm:text-sm text-gray-600 mb-2">Tel: {suplidor.telefono || 'N/A'}</div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs sm:text-sm text-gray-600">Facturas pendientes:</span>
                    <span className="text-xs sm:text-sm font-semibold text-orange-600">{suplidor.facturas_pendientes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-600">Total por pagar:</span>
                    <span className="text-xs sm:text-sm font-bold text-red-600">{formatCurrency(suplidor.total_pendiente)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros y Búsqueda */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Buscar por número de factura o suplidor..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroEstado('todas')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                filtroEstado === 'todas'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFiltroEstado('pendiente')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                filtroEstado === 'pendiente'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFiltroEstado('parcial')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                filtroEstado === 'parcial'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Parciales
            </button>
            <button
              onClick={() => setFiltroEstado('pagada')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                filtroEstado === 'pagada'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pagadas
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Facturas */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold">Factura</th>
                <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold">Suplidor</th>
                <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold">Fecha</th>
                <th className="px-4 py-3 text-right text-xs sm:text-sm font-semibold">Total</th>
                <th className="px-4 py-3 text-right text-xs sm:text-sm font-semibold">Pagado</th>
                <th className="px-4 py-3 text-right text-xs sm:text-sm font-semibold">Pendiente</th>
                <th className="px-4 py-3 text-center text-xs sm:text-sm font-semibold">Estado</th>
                <th className="px-4 py-3 text-center text-xs sm:text-sm font-semibold">Días</th>
                <th className="px-4 py-3 text-center text-xs sm:text-sm font-semibold">Pagos</th>
                <th className="px-4 py-3 text-center text-xs sm:text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {facturasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                    No hay facturas que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                facturasFiltradas.map((factura) => {
                  const dias = getDiasTranscurridos(factura.fecha);
                  const pagosFactura = pagosPorFactura(factura.id);
                  
                  return (
                    <tr key={factura.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs sm:text-sm font-medium text-gray-900">
                        {factura.numero_factura}
                      </td>
                      <td className="px-4 py-3 text-xs sm:text-sm text-gray-700">
                        {factura.suplidores?.nombre || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-xs sm:text-sm text-gray-600">
                        {formatearFechaLocal(factura.fecha)}
                      </td>
                      <td className="px-4 py-3 text-xs sm:text-sm text-right font-medium text-gray-900">
                        {formatCurrency(factura.total, factura.divisa || 'DOP')}
                      </td>
                      <td className="px-4 py-3 text-xs sm:text-sm text-right text-green-600">
                        {formatCurrency(factura.monto_pagado || 0, factura.divisa || 'DOP')}
                      </td>
                      <td className="px-4 py-3 text-xs sm:text-sm text-right text-red-600 font-semibold">
                        {formatCurrency(factura.balance_pendiente || 0, factura.divisa || 'DOP')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          factura.estado === 'pagada'
                            ? 'bg-green-100 text-green-800'
                            : factura.estado === 'parcial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {factura.estado === 'pagada' ? 'Pagada' : factura.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          dias > 30 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {dias} días
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                          {pagosFactura.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {factura.estado !== 'pagada' && (
                          <button
                            onClick={() => abrirModalPago(factura)}
                            className="bg-green-500 hover:bg-green-600 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors"
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
            <div className="p-8 text-center text-gray-500">
              No hay facturas que coincidan con los filtros
            </div>
          ) : (
            facturasFiltradas.map((factura) => {
              const dias = getDiasTranscurridos(factura.fecha);
              const pagosFactura = pagosPorFactura(factura.id);
              
              return (
                <div key={factura.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{factura.numero_factura}</p>
                      <p className="text-xs text-gray-500 mt-1">{factura.suplidores?.nombre || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        factura.estado === 'pagada'
                          ? 'bg-green-100 text-green-800'
                          : factura.estado === 'parcial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {factura.estado === 'pagada' ? 'Pagada' : factura.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        dias > 30 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {dias} días
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <p className="text-gray-500">Fecha</p>
                      <p className="font-medium text-gray-700">{formatearFechaLocal(factura.fecha)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total</p>
                      <p className="font-medium text-gray-900">{formatCurrency(factura.total, factura.divisa || 'DOP')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pagado</p>
                      <p className="font-medium text-green-600">{formatCurrency(factura.monto_pagado || 0, factura.divisa || 'DOP')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pendiente</p>
                      <p className="font-bold text-red-600">{formatCurrency(factura.balance_pendiente || 0, factura.divisa || 'DOP')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pagos</p>
                      <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                        {pagosFactura.length}
                      </span>
                    </div>
                  </div>
                  {factura.estado !== 'pagada' && (
                    <button
                      onClick={() => abrirModalPago(factura)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 sm:p-6 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-2xl font-bold">Registrar Pago</h2>
                <button
                  onClick={() => setShowPagoModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 sm:p-2 transition-colors"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Información de la Factura */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <div className="text-xs sm:text-sm text-gray-600">Factura</div>
                    <div className="text-sm sm:text-base font-semibold text-gray-900">{facturaSeleccionada.numero_factura}</div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-gray-600">Suplidor</div>
                    <div className="text-sm sm:text-base font-semibold text-gray-900 break-words">{facturaSeleccionada.suplidores?.nombre}</div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-gray-600">Total Factura</div>
                    <div className="text-sm sm:text-base font-semibold text-gray-900">{formatCurrency(facturaSeleccionada.total, facturaSeleccionada.divisa || 'DOP')}</div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-gray-600">Balance Pendiente</div>
                    <div className="text-sm sm:text-base font-bold text-red-600">{formatCurrency(facturaSeleccionada.balance_pendiente, facturaSeleccionada.divisa || 'DOP')}</div>
                  </div>
                </div>
              </div>

              {/* Historial de Pagos */}
              {pagosPorFactura(facturaSeleccionada.id).length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-3">Historial de Pagos</h3>
                  <div className="space-y-2">
                    {pagosPorFactura(facturaSeleccionada.id).map((pago) => (
                      <div key={pago.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-gray-50 p-3 rounded-lg">
                        <div>
                          <div className="text-sm sm:text-base font-medium text-gray-900">{formatCurrency(pago.monto)}</div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            {formatearFechaLocal(pago.fecha)} - {pago.metodo_pago}
                          </div>
                        </div>
                        {pago.notas && (
                          <div className="text-xs sm:text-sm text-gray-600 italic break-words">{pago.notas}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulario de Pago */}
              <form onSubmit={registrarPago} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Monto a Pagar *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formPago.monto}
                      onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Método de Pago *
                    </label>
                    <select
                      value={formPago.metodo_pago}
                      onChange={(e) => setFormPago({ ...formPago, metodo_pago: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Fecha de Pago *
                  </label>
                  <input
                    type="date"
                    value={formPago.fecha}
                    onChange={(e) => setFormPago({ ...formPago, fecha: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Notas
                  </label>
                  <textarea
                    value={formPago.notas}
                    onChange={(e) => setFormPago({ ...formPago, notas: e.target.value })}
                    rows="3"
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Notas adicionales sobre el pago..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPagoModal(false)}
                    className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm sm:text-base"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 font-medium transition-colors shadow-lg text-sm sm:text-base"
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
