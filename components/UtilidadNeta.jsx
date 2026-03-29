import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, DollarSign, Calendar, Filter, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { formatearFechaLocal } from '../lib/dateUtils';

export default function UtilidadNeta() {
  const [utilidades, setUtilidades] = useState([]);
  const [resumen, setResumen] = useState({
    totalVentas: 0,
    totalCostos: 0,
    totalUtilidad: 0,
    utilidadContado: 0,
    utilidadCredito: 0,
    utilidadFinanciamiento: 0
  });
  const [desgloseFinanciamientos, setDesgloseFinanciamientos] = useState([]);
  const [filtros, setFiltros] = useState({
    tipo: 'todos',
    fechaInicio: '',
    fechaFin: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarUtilidades();
  }, [filtros]);

  const calcularUtilidadAutomatica = async () => {
    setLoading(true);
    try {
      // Limpiar tabla de utilidad_neta
      await supabase.from('utilidad_neta').delete().neq('id', 0);

      // 1. CALCULAR UTILIDAD DE PRODUCTOS (Facturas de Venta)
      const { data: facturasVenta, error: errorFacturas } = await supabase
        .from('facturas_venta')
        .select(`
          id,
          numero_factura,
          fecha,
          balance_pendiente,
          total,
          divisa,
          tasa_cambio
        `)
        .order('fecha', { ascending: false });

      if (errorFacturas) {
        console.error('Error al cargar facturas:', errorFacturas);
        throw errorFacturas;
      }

      console.log('Facturas encontradas:', facturasVenta?.length || 0);

      let facturasProcesadas = 0;
      let facturasSinItems = 0;

      for (const factura of facturasVenta || []) {
        // Obtener items de la factura por separado para mejor control
        const { data: itemsFactura, error: errorItems } = await supabase
          .from('items_factura_venta')
          .select('cantidad, precio_unitario, subtotal, mercancia_id')
          .eq('factura_venta_id', factura.id);

        if (errorItems) {
          console.error(`Error al cargar items de factura ${factura.numero_factura}:`, errorItems);
          continue;
        }

        if (!itemsFactura || itemsFactura.length === 0) {
          console.warn(`Factura ${factura.numero_factura} no tiene items`);
          facturasSinItems++;
          continue;
        }

        let costoTotal = 0;

        // Calcular costo de cada producto vendido (SIEMPRE en DOP)
        for (const item of itemsFactura) {
          // Obtener precio de compra de la mercancía
          const { data: mercancia, error: errorMercancia } = await supabase
            .from('mercancias')
            .select('precio_compra')
            .eq('id', item.mercancia_id)
            .single();

          if (errorMercancia) {
            console.warn(`Error al obtener mercancía ${item.mercancia_id}:`, errorMercancia);
          }

          const costoUnitario = parseFloat(mercancia?.precio_compra || 0);
          const cantidad = parseFloat(item.cantidad || 0);
          
          if (costoUnitario > 0) {
            costoTotal += costoUnitario * cantidad;
          } else {
            console.warn(`Mercancía ${item.mercancia_id} no tiene precio_compra en factura ${factura.numero_factura}`);
          }
        }

        // Convertir venta a DOP si está en USD
        let ventaTotal = parseFloat(factura.total || 0);
        let descripcionDivisa = '';
        
        if (factura.divisa === 'USD' && factura.tasa_cambio) {
          const totalOriginalUSD = ventaTotal;
          const tasaCambio = parseFloat(factura.tasa_cambio);
          ventaTotal = totalOriginalUSD * tasaCambio;
          descripcionDivisa = ` (USD ${totalOriginalUSD.toFixed(2)} × ${tasaCambio.toFixed(2)} = RD$ ${ventaTotal.toFixed(2)})`;
        }

        const utilidad = ventaTotal - costoTotal;

        // Determinar tipo de venta basándose en balance_pendiente
        // Si balance_pendiente > 0, es crédito; si es 0, es contado
        const esContado = parseFloat(factura.balance_pendiente || 0) === 0;
        // La tabla solo acepta 'producto' o 'financiamiento', así que usamos 'producto'
        // y distinguimos contado/crédito por la descripción
        const tipoVenta = 'producto';
        const tipoVentaDetalle = esContado ? 'contado' : 'credito';

        const datosInsertar = {
          tipo: tipoVenta, // Usar 'producto' porque la tabla solo acepta 'producto' o 'financiamiento'
          referencia_id: factura.id,
          descripcion: `Factura ${factura.numero_factura} - ${esContado ? 'Venta de Contado' : 'Venta a Crédito'}${descripcionDivisa}`,
          venta_total: ventaTotal,
          costo_compra: costoTotal,
          fletes: 0,
          obreros: 0,
          otros_gastos: 0,
          utilidad: utilidad,
          fecha: factura.fecha
        };

        console.log(`Insertando factura ${factura.numero_factura}:`, {
          tipo: tipoVenta,
          tipoDetalle: tipoVentaDetalle,
          balance_pendiente: factura.balance_pendiente,
          ventaTotal,
          costoTotal,
          utilidad
        });

        const { error: errorInsert, data: dataInsertada } = await supabase.from('utilidad_neta').insert(datosInsertar).select();

        if (errorInsert) {
          console.error(`Error al insertar utilidad para factura ${factura.numero_factura}:`, errorInsert);
        } else {
          facturasProcesadas++;
          console.log(`✓ Factura ${factura.numero_factura} insertada correctamente como tipo: ${tipoVenta} (${tipoVentaDetalle})`);
        }
      }

      console.log(`Facturas procesadas: ${facturasProcesadas}, Sin items: ${facturasSinItems}`);

      // Verificar qué se insertó
      const { data: datosInsertados } = await supabase
        .from('utilidad_neta')
        .select('tipo, utilidad, descripcion')
        .order('fecha', { ascending: false });
      
      // Distinguir contado/crédito por la descripción ya que el tipo es 'producto'
      const contadoInsertado = datosInsertados?.filter(d => d.tipo === 'producto' && d.descripcion?.includes('Contado')).reduce((sum, d) => sum + parseFloat(d.utilidad || 0), 0) || 0;
      const creditoInsertado = datosInsertados?.filter(d => d.tipo === 'producto' && d.descripcion?.includes('Crédito')).reduce((sum, d) => sum + parseFloat(d.utilidad || 0), 0) || 0;
      
      console.log('Datos insertados verificados:', {
        totalRegistros: datosInsertados?.length || 0,
        contado: contadoInsertado,
        credito: creditoInsertado,
        registrosContado: datosInsertados?.filter(d => d.tipo === 'producto' && d.descripcion?.includes('Contado')).length || 0,
        registrosCredito: datosInsertados?.filter(d => d.tipo === 'producto' && d.descripcion?.includes('Crédito')).length || 0
      });

      // 2. CALCULAR UTILIDAD DE FINANCIAMIENTOS
      const { data: financiamientos, error: errorFinanciamientos } = await supabase
        .from('financiamientos')
        .select('*');

      if (errorFinanciamientos) {
        console.error('Error al cargar financiamientos:', errorFinanciamientos);
      } else {
        let financiamientosProcesados = 0;
        for (const financiamiento of financiamientos || []) {
          const interesGenerado = parseFloat(financiamiento.interes_generado || 0);

          if (interesGenerado > 0) {
            const { error: errorInsertFin } = await supabase.from('utilidad_neta').insert({
              tipo: 'financiamiento',
              referencia_id: financiamiento.id,
              descripcion: `Financiamiento a ${financiamiento.nombre_cliente} - ${financiamiento.tasa_interes}% interés`,
              venta_total: interesGenerado,
              costo_compra: 0,
              fletes: 0,
              obreros: 0,
              otros_gastos: 0,
              utilidad: interesGenerado,
              fecha: financiamiento.fecha_prestamo
            });

            if (errorInsertFin) {
              console.error(`Error al insertar financiamiento ${financiamiento.id}:`, errorInsertFin);
            } else {
              financiamientosProcesados++;
            }
          }
        }
        console.log(`Financiamientos procesados: ${financiamientosProcesados}`);
      }

      alert(`Utilidad calculada exitosamente.\nFacturas procesadas: ${facturasProcesadas}\nFinanciamientos procesados: ${financiamientos?.filter(f => parseFloat(f.interes_generado || 0) > 0).length || 0}`);
      cargarUtilidades();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al calcular utilidad: ' + error.message);
    }
    setLoading(false);
  };

  const cargarUtilidades = async () => {
    // Primero cargar TODOS los datos para el resumen (sin filtros de tipo)
    let queryResumen = supabase
      .from('utilidad_neta')
      .select('*')
      .order('fecha', { ascending: false });

    if (filtros.fechaInicio) {
      queryResumen = queryResumen.gte('fecha', filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      queryResumen = queryResumen.lte('fecha', filtros.fechaFin);
    }

    const { data: todosLosDatos } = await queryResumen;

    // Luego cargar datos filtrados para la tabla
    let query = supabase
      .from('utilidad_neta')
      .select('*')
      .order('fecha', { ascending: false });

    if (filtros.tipo !== 'todos') {
      if (filtros.tipo === 'producto-contado') {
        query = query.eq('tipo', 'producto').like('descripcion', '%Contado%');
      } else if (filtros.tipo === 'producto-credito') {
        query = query.eq('tipo', 'producto').like('descripcion', '%Crédito%');
      } else {
        query = query.eq('tipo', filtros.tipo);
      }
    }

    if (filtros.fechaInicio) {
      query = query.gte('fecha', filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      query = query.lte('fecha', filtros.fechaFin);
    }

    const { data } = await query;
    setUtilidades(data || []);

    // Calcular resumen usando TODOS los datos (sin filtro de tipo)
    const totalVentas = todosLosDatos?.reduce((sum, u) => sum + parseFloat(u.venta_total || 0), 0) || 0;
    const totalCostos = todosLosDatos?.reduce((sum, u) => sum + parseFloat(u.costo_compra || 0) + parseFloat(u.fletes || 0) + parseFloat(u.obreros || 0) + parseFloat(u.otros_gastos || 0), 0) || 0;
    const totalUtilidad = todosLosDatos?.reduce((sum, u) => sum + parseFloat(u.utilidad || 0), 0) || 0;
    
    // Calcular utilidad por tipo usando TODOS los datos
    // Distinguir contado/crédito por la descripción ya que el tipo es 'producto' para ambos
    const utilidadContado = todosLosDatos?.filter(u => u.tipo === 'producto' && u.descripcion?.includes('Contado')).reduce((sum, u) => sum + parseFloat(u.utilidad || 0), 0) || 0;
    const utilidadCredito = todosLosDatos?.filter(u => u.tipo === 'producto' && u.descripcion?.includes('Crédito')).reduce((sum, u) => sum + parseFloat(u.utilidad || 0), 0) || 0;
    const utilidadFinanciamiento = todosLosDatos?.filter(u => u.tipo === 'financiamiento').reduce((sum, u) => sum + parseFloat(u.utilidad || 0), 0) || 0;

    // Calcular desglose de financiamientos por cliente
    const financiamientosData = todosLosDatos?.filter(u => u.tipo === 'financiamiento') || [];
    const desglosePorCliente = {};
    
    financiamientosData.forEach(fin => {
      // Extraer nombre del cliente de la descripción
      const match = fin.descripcion?.match(/Financiamiento a (.+?) -/);
      const nombreCliente = match ? match[1] : 'Cliente Desconocido';
      
      if (!desglosePorCliente[nombreCliente]) {
        desglosePorCliente[nombreCliente] = {
          nombre: nombreCliente,
          cantidad: 0,
          utilidadTotal: 0,
          financiamientos: []
        };
      }
      
      desglosePorCliente[nombreCliente].cantidad++;
      desglosePorCliente[nombreCliente].utilidadTotal += parseFloat(fin.utilidad || 0);
      desglosePorCliente[nombreCliente].financiamientos.push({
        id: fin.id,
        fecha: fin.fecha,
        descripcion: fin.descripcion,
        utilidad: parseFloat(fin.utilidad || 0)
      });
    });

    // Convertir a array y ordenar por utilidad total descendente
    const desgloseArray = Object.values(desglosePorCliente)
      .map(item => ({
        ...item,
        financiamientos: item.financiamientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      }))
      .sort((a, b) => b.utilidadTotal - a.utilidadTotal);

    setDesgloseFinanciamientos(desgloseArray);

    console.log('Resumen calculado:', {
      totalUtilidad,
      utilidadContado,
      utilidadCredito,
      utilidadFinanciamiento,
      totalRegistros: todosLosDatos?.length || 0,
      registrosContado: todosLosDatos?.filter(u => u.tipo === 'producto' && u.descripcion?.includes('Contado')).length || 0,
      registrosCredito: todosLosDatos?.filter(u => u.tipo === 'producto' && u.descripcion?.includes('Crédito')).length || 0,
      desgloseFinanciamientos: desgloseArray.length
    });

    setResumen({ 
      totalVentas, 
      totalCostos, 
      totalUtilidad,
      utilidadContado,
      utilidadCredito,
      utilidadFinanciamiento
    });
  };

  const getTipoLabel = (utilidad) => {
    // Determinar el tipo basándose en la descripción si es producto
    if (utilidad.tipo === 'producto') {
      if (utilidad.descripcion?.includes('Contado')) {
        return 'Venta de Contado';
      } else if (utilidad.descripcion?.includes('Crédito')) {
        return 'Venta a Crédito';
      }
      return 'Producto';
    }
    return utilidad.tipo === 'financiamiento' ? 'Financiamiento' : utilidad.tipo;
  };

  const getTipoBadge = (utilidad) => {
    // Determinar el color basándose en la descripción si es producto
    if (utilidad.tipo === 'producto') {
      if (utilidad.descripcion?.includes('Contado')) {
        return 'bg-blue-100 text-blue-800';
      } else if (utilidad.descripcion?.includes('Crédito')) {
        return 'bg-purple-100 text-purple-800';
      }
      return 'bg-blue-100 text-blue-800';
    }
    return utilidad.tipo === 'financiamiento' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp className="w-6 h-6" /> Utilidad Neta
        </h2>
        <button
          onClick={calcularUtilidadAutomatica}
          disabled={loading}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          <span className="font-medium">{loading ? 'Calculando...' : 'Calcular Utilidad'}</span>
        </button>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium">Total Ventas</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(resumen.totalVentas)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium">Total Costos</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{formatCurrency(resumen.totalCostos)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Utilidad Neta Total</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(resumen.totalUtilidad)}</p>
        </div>
      </div>

      {/* Resumen por Tipo de Venta */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg border-2 border-blue-300">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium">Utilidad Ventas de Contado</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(resumen.utilidadContado)}</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg border-2 border-purple-300">
          <div className="flex items-center gap-2 text-purple-700 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm font-medium">Utilidad Ventas a Crédito</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(resumen.utilidadCredito)}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg border-2 border-green-300">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Utilidad Financiamientos</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(resumen.utilidadFinanciamiento)}</p>
          <p className="text-xs text-green-600 mt-1">
            {desgloseFinanciamientos.length} {desgloseFinanciamientos.length === 1 ? 'cliente' : 'clientes'}
          </p>
        </div>
      </div>

      {/* Desglose de Utilidad de Financiamientos */}
      {desgloseFinanciamientos.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Desglose de Utilidad de Financiamientos
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Utilidad dividida por cliente ({desgloseFinanciamientos.length} {desgloseFinanciamientos.length === 1 ? 'cliente' : 'clientes'})
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilidad Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% del Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {desgloseFinanciamientos.map((item, index) => {
                  const porcentaje = resumen.utilidadFinanciamiento > 0 
                    ? ((item.utilidadTotal / resumen.utilidadFinanciamiento) * 100).toFixed(2)
                    : '0.00';
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{item.nombre}</span>
                        </div>
                        <div className="mt-1 space-y-1">
                          {item.financiamientos.map((fin, idx) => (
                            <div key={idx} className="text-xs text-gray-500 pl-4 border-l-2 border-green-200">
                              <span className="font-medium">{formatearFechaLocal(fin.fecha)}</span>
                              {' - '}
                              <span className="text-green-600 font-semibold">{formatCurrency(fin.utilidad)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {item.cantidad}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-green-600">
                          {formatCurrency(item.utilidadTotal)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-gray-600">{porcentaje}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">Total</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-200 text-green-900">
                      {desgloseFinanciamientos.reduce((sum, item) => sum + item.cantidad, 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-bold text-green-700">
                      {formatCurrency(resumen.utilidadFinanciamiento)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-bold text-gray-700">100.00%</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-700">Filtros</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="todos">Todos</option>
              <option value="producto-contado">Ventas de Contado</option>
              <option value="producto-credito">Ventas a Crédito</option>
              <option value="financiamiento">Financiamientos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={filtros.fechaInicio}
              onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
            <input
              type="date"
              value={filtros.fechaFin}
              onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Tabla de utilidades */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Venta</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fletes</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Obreros</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {utilidades.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  No hay datos de utilidad. Haz clic en "Calcular Utilidad" para generar los cálculos.
                </td>
              </tr>
            ) : (
              utilidades.map(utilidad => (
                <tr key={utilidad.id} className={
                  utilidad.tipo === 'financiamiento' ? 'bg-green-50' : 
                  (utilidad.tipo === 'producto' && utilidad.descripcion?.includes('Contado')) ? 'bg-blue-50' : 
                  (utilidad.tipo === 'producto' && utilidad.descripcion?.includes('Crédito')) ? 'bg-purple-50' : ''
                }>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatearFechaLocal(utilidad.fecha)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getTipoBadge(utilidad)}`}>
                      {getTipoLabel(utilidad)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{utilidad.descripcion}</td>
                  {utilidad.tipo === 'financiamiento' ? (
                    <>
                      <td className="px-6 py-4 text-sm text-right text-gray-400">-</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-400">-</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-400">-</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-400">-</td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-green-600">{formatCurrency(utilidad.utilidad)}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">{formatCurrency(utilidad.venta_total)}</td>
                      <td className="px-6 py-4 text-sm text-right text-red-600">{formatCurrency(utilidad.costo_compra)}</td>
                      <td className="px-6 py-4 text-sm text-right text-red-600">{formatCurrency(utilidad.fletes)}</td>
                      <td className="px-6 py-4 text-sm text-right text-red-600">{formatCurrency(utilidad.obreros)}</td>
                      <td className="px-6 py-4 text-sm text-right font-bold text-green-600">{formatCurrency(utilidad.utilidad)}</td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}