import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, DollarSign, Calendar, Filter, RefreshCw, FileText, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [mostrarDesglose, setMostrarDesglose] = useState(false);
  const [todosLosDatos, setTodosLosDatos] = useState([]);

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
    setTodosLosDatos(todosLosDatos || []);

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

  // Calcular porcentaje de ganancia
  const calcularPorcentajeGanancia = (utilidad, ventas) => {
    if (!ventas || ventas === 0 || !utilidad || utilidad === 0) return 0;
    return (utilidad / ventas) * 100;
  };

  // Generar PDF de ganancias por tipo
  const generarPDFGanancias = async (tipo) => {
    if (typeof window === 'undefined') {
      console.warn('PDF generation is only supported in browser environment.');
      return;
    }

    // Obtener datos filtrados por tipo
    let query = supabase
      .from('utilidad_neta')
      .select('*')
      .order('fecha', { ascending: false });

    if (filtros.fechaInicio) {
      query = query.gte('fecha', filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      query = query.lte('fecha', filtros.fechaFin);
    }

    let datosFiltrados = [];
    let titulo = '';
    let utilidadTotal = 0;
    let ventasTotal = 0;

    if (tipo === 'contado') {
      query = query.eq('tipo', 'producto').like('descripcion', '%Contado%');
      titulo = 'Utilidad Ventas de Contado';
      utilidadTotal = resumen.utilidadContado;
    } else if (tipo === 'credito') {
      query = query.eq('tipo', 'producto').like('descripcion', '%Crédito%');
      titulo = 'Utilidad Ventas a Crédito';
      utilidadTotal = resumen.utilidadCredito;
    } else if (tipo === 'financiamiento') {
      query = query.eq('tipo', 'financiamiento');
      titulo = 'Utilidad Financiamientos';
      utilidadTotal = resumen.utilidadFinanciamiento;
    }

    const { data } = await query;
    datosFiltrados = data || [];

    // Calcular ventas totales para este tipo
    if (tipo === 'financiamiento') {
      // Para financiamientos, usar el total prestado desde la tabla financiamientos
      let queryFinanciamientos = supabase
        .from('financiamientos')
        .select('monto_prestado, fecha_prestamo');

      if (filtros.fechaInicio) {
        queryFinanciamientos = queryFinanciamientos.gte('fecha_prestamo', filtros.fechaInicio);
      }

      if (filtros.fechaFin) {
        queryFinanciamientos = queryFinanciamientos.lte('fecha_prestamo', filtros.fechaFin);
      }

      const { data: financiamientos } = await queryFinanciamientos;
      ventasTotal = financiamientos?.reduce((sum, f) => sum + parseFloat(f.monto_prestado || 0), 0) || 0;
    } else {
      ventasTotal = datosFiltrados.reduce((sum, u) => sum + parseFloat(u.venta_total || 0), 0);
    }
    const porcentajeGanancia = calcularPorcentajeGanancia(utilidadTotal, ventasTotal);

    const formatCurrency = (value) => {
      if (value === null || value === undefined || isNaN(value)) {
        return 'RD$ 0.00';
      }
      const number = parseFloat(value);
      const formatted = number.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return `RD$ ${formatted}`;
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${titulo}</title>
        <style>
          @media print {
            @page { margin: 1cm; }
            body { margin: 0; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 30px;
            border-bottom: 3px solid #16a34a;
            padding-bottom: 15px;
          }
          .logo {
            flex-shrink: 0;
          }
          .logo img {
            height: 120px;
            width: auto;
            object-fit: contain;
          }
          .header-content {
            flex: 1;
            text-align: center;
          }
          .header h1 {
            color: #16a34a;
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
          }
          .resumen {
            background-color: #dcfce7;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
          .resumen h2 {
            margin: 0 0 10px 0;
            font-size: 18px;
            color: #666;
          }
          .resumen p {
            margin: 5px 0;
            font-size: 24px;
            font-weight: bold;
            color: #16a34a;
          }
          .porcentaje {
            font-size: 18px;
            color: #059669;
            margin-top: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background-color: #16a34a;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <img src="https://sensible-spoonbill-485.convex.cloud/api/storage/f2c37282-23ea-45e1-8f03-4f60c1d96017" alt="Agroverde">
          </div>
          <div class="header-content">
            <h1>${titulo}</h1>
            <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
          </div>
        </div>

        <div class="resumen">
          <h2>Utilidad Total</h2>
          <p>${formatCurrency(utilidadTotal)}</p>
          <div class="porcentaje">% Ganancia: ${porcentajeGanancia.toFixed(2)}%</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Venta</th>
              <th>Costo</th>
              <th>Utilidad</th>
            </tr>
          </thead>
          <tbody>
            ${datosFiltrados.map(u => `
              <tr>
                <td>${new Date(u.fecha).toLocaleDateString('es-ES')}</td>
                <td>${u.descripcion || 'N/A'}</td>
                <td>${formatCurrency(u.venta_total)}</td>
                <td>${formatCurrency(u.costo_compra || 0)}</td>
                <td style="font-weight: bold; color: #16a34a;">${formatCurrency(u.utilidad)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
        </div>
      </body>
      </html>
    `;

    const ventana = window.open('', '_blank');
    ventana.document.write(html);
    ventana.document.close();
    ventana.print();
  };

  // Calcular ventas totales por tipo para porcentajes (usando todos los datos, no solo los filtrados)
  const [ventasPorTipo, setVentasPorTipo] = useState({
    contado: 0,
    credito: 0,
    financiamiento: 0
  });

  useEffect(() => {
    const calcularVentasPorTipo = async () => {
      let queryTodos = supabase
        .from('utilidad_neta')
        .select('*')
        .order('fecha', { ascending: false });

      if (filtros.fechaInicio) {
        queryTodos = queryTodos.gte('fecha', filtros.fechaInicio);
      }

      if (filtros.fechaFin) {
        queryTodos = queryTodos.lte('fecha', filtros.fechaFin);
      }

      const { data: todosLosDatos } = await queryTodos;

      const ventasContado = todosLosDatos
        ?.filter(u => u.tipo === 'producto' && u.descripcion?.includes('Contado'))
        .reduce((sum, u) => sum + parseFloat(u.venta_total || 0), 0) || 0;
      
      const ventasCredito = todosLosDatos
        ?.filter(u => u.tipo === 'producto' && u.descripcion?.includes('Crédito'))
        .reduce((sum, u) => sum + parseFloat(u.venta_total || 0), 0) || 0;
      
      // Para financiamientos, calcular el total prestado desde la tabla financiamientos
      // en lugar de usar venta_total (que es el interes_generado)
      let queryFinanciamientos = supabase
        .from('financiamientos')
        .select('monto_prestado, fecha_prestamo');

      if (filtros.fechaInicio) {
        queryFinanciamientos = queryFinanciamientos.gte('fecha_prestamo', filtros.fechaInicio);
      }

      if (filtros.fechaFin) {
        queryFinanciamientos = queryFinanciamientos.lte('fecha_prestamo', filtros.fechaFin);
      }

      const { data: financiamientos } = await queryFinanciamientos;
      const ventasFinanciamiento = financiamientos
        ?.reduce((sum, f) => sum + parseFloat(f.monto_prestado || 0), 0) || 0;

      setVentasPorTipo({
        contado: ventasContado,
        credito: ventasCredito,
        financiamiento: ventasFinanciamiento
      });
    };

    calcularVentasPorTipo();
  }, [filtros.fechaInicio, filtros.fechaFin, resumen]);

  const porcentajeContado = calcularPorcentajeGanancia(resumen.utilidadContado, ventasPorTipo.contado);
  const porcentajeCredito = calcularPorcentajeGanancia(resumen.utilidadCredito, ventasPorTipo.credito);
  const porcentajeFinanciamiento = calcularPorcentajeGanancia(resumen.utilidadFinanciamiento, ventasPorTipo.financiamiento);

  if (loading && utilidades.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          <div className="text-gray-500 font-medium">Calculando utilidad neta...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header con efecto glassmorphism */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-5 sm:p-7 mb-6 sm:mb-8 border border-white/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 shadow-lg">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-3 mb-2">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-xl shadow-lg">
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                Utilidad Neta
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Análisis de ganancias y rentabilidad</p>
            </div>
            <button
              onClick={calcularUtilidadAutomatica}
              disabled={loading}
              className="w-full sm:w-auto bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl hover:from-green-600 hover:via-green-700 hover:to-emerald-700 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Calculando...' : 'Calcular Utilidad'}</span>
            </button>
          </div>

          {/* Resumen Principal con efectos modernos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Total Ventas */}
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <span className="text-blue-100 text-xs sm:text-sm font-semibold bg-white/10 px-3 py-1 rounded-full">Total Ventas</span>
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">{formatCurrency(resumen.totalVentas)}</div>
                <div className="text-blue-100 text-xs sm:text-sm font-medium">Ingresos totales</div>
              </div>
            </div>

            {/* Total Costos */}
            <div className="group relative bg-gradient-to-br from-red-500 via-red-600 to-rose-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <span className="text-red-100 text-xs sm:text-sm font-semibold bg-white/10 px-3 py-1 rounded-full">Total Costos</span>
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">{formatCurrency(resumen.totalCostos)}</div>
                <div className="text-red-100 text-xs sm:text-sm font-medium">Gastos totales</div>
              </div>
            </div>

            {/* Utilidad Neta Total */}
            <div className="group relative bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden sm:col-span-2 lg:col-span-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <span className="text-green-100 text-xs sm:text-sm font-semibold bg-white/10 px-3 py-1 rounded-full">Utilidad Neta</span>
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">{formatCurrency(resumen.totalUtilidad)}</div>
                <div className="text-green-100 text-xs sm:text-sm font-medium">Ganancia total</div>
              </div>
            </div>
          </div>

          {/* Desglose de Costos */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-5 sm:p-6 mb-6 sm:mb-8 border border-white/20">
            <button
              onClick={() => setMostrarDesglose(!mostrarDesglose)}
              className="w-full flex items-center justify-between gap-2 text-gray-700 hover:text-green-600 font-semibold transition-colors p-3 rounded-xl hover:bg-green-50"
            >
              <div className="flex items-center gap-2">
                {mostrarDesglose ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                <span>Ver desglose paso a paso</span>
              </div>
            </button>

            {mostrarDesglose && (
              <div className="mt-4 p-5 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                  Desglose de Costos
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <div className="text-xs sm:text-sm text-gray-500 font-medium mb-1">Costo de Compra</div>
                    <div className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(todosLosDatos.reduce((sum, u) => sum + parseFloat(u.costo_compra || 0), 0))}</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <div className="text-xs sm:text-sm text-gray-500 font-medium mb-1">Fletes</div>
                    <div className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(todosLosDatos.reduce((sum, u) => sum + parseFloat(u.fletes || 0), 0))}</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <div className="text-xs sm:text-sm text-gray-500 font-medium mb-1">Obreros</div>
                    <div className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(todosLosDatos.reduce((sum, u) => sum + parseFloat(u.obreros || 0), 0))}</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <div className="text-xs sm:text-sm text-gray-500 font-medium mb-1">Otros Gastos</div>
                    <div className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(todosLosDatos.reduce((sum, u) => sum + parseFloat(u.otros_gastos || 0), 0))}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resumen por Tipo de Venta */}
        <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
          {/* Utilidad Ventas de Contado */}
          <div className="group bg-gradient-to-br from-blue-50 to-indigo-100 p-6 sm:p-7 rounded-2xl border-2 border-blue-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-blue-700 mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                  Utilidad Ventas de Contado
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-blue-900 mb-2">{formatCurrency(resumen.utilidadContado)}</p>
                <p className="text-lg sm:text-xl font-semibold text-blue-700 bg-white/60 px-4 py-2 rounded-xl inline-block">
                  % Ganancia: {porcentajeContado.toFixed(2)}%
                </p>
              </div>
              <button
                onClick={() => generarPDFGanancias('contado')}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
              >
                <FileText className="w-5 h-5" />
                PDF Ganancias
              </button>
            </div>
          </div>

          {/* Utilidad Ventas a Crédito */}
          <div className="group bg-gradient-to-br from-purple-50 to-pink-100 p-6 sm:p-7 rounded-2xl border-2 border-purple-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-purple-700 mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                  Utilidad Ventas a Crédito
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-purple-900 mb-2">{formatCurrency(resumen.utilidadCredito)}</p>
                <p className="text-lg sm:text-xl font-semibold text-purple-700 bg-white/60 px-4 py-2 rounded-xl inline-block">
                  % Ganancia: {porcentajeCredito.toFixed(2)}%
                </p>
              </div>
              <button
                onClick={() => generarPDFGanancias('credito')}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-5 py-3 rounded-xl hover:from-purple-600 hover:to-purple-700 flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
              >
                <FileText className="w-5 h-5" />
                PDF Ganancias
              </button>
            </div>
          </div>

          {/* Utilidad Financiamientos */}
          <div className="group bg-gradient-to-br from-green-50 to-emerald-100 p-6 sm:p-7 rounded-2xl border-2 border-green-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-green-700 mb-3 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                  Utilidad Financiamientos
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-green-900 mb-2">{formatCurrency(resumen.utilidadFinanciamiento)}</p>
                <p className="text-lg sm:text-xl font-semibold text-green-700 bg-white/60 px-4 py-2 rounded-xl inline-block">
                  % Ganancia: {porcentajeFinanciamiento.toFixed(2)}%
                </p>
                <p className="text-sm text-green-600 mt-2">
                  {desgloseFinanciamientos.length} {desgloseFinanciamientos.length === 1 ? 'cliente' : 'clientes'}
                </p>
              </div>
              <button
                onClick={() => generarPDFGanancias('financiamiento')}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-3 rounded-xl hover:from-green-600 hover:to-green-700 flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
              >
                <FileText className="w-5 h-5" />
                PDF Ganancias
              </button>
            </div>
          </div>
        </div>

        {/* Desglose de Utilidad de Financiamientos */}
        {desgloseFinanciamientos.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-5 sm:p-6 mb-6 sm:mb-8 border border-white/20">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Desglose de Utilidad de Financiamientos
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Utilidad dividida por cliente ({desgloseFinanciamientos.length} {desgloseFinanciamientos.length === 1 ? 'cliente' : 'clientes'})
              </p>
            </div>
            <div className="overflow-x-auto mt-4">
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

        {/* Filtros y Tabla - Solo se muestra si hay datos */}
        {utilidades.length > 0 && (
          <>
            {/* Filtros */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-5 sm:p-6 mb-6 sm:mb-8 border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-xl">
                  <Filter className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-gray-800 text-lg">Filtros</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tipo</label>
                  <select
                    value={filtros.tipo}
                    onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white shadow-sm"
                  >
                    <option value="todos">Todos</option>
                    <option value="producto-contado">Ventas de Contado</option>
                    <option value="producto-credito">Ventas a Crédito</option>
                    <option value="financiamiento">Financiamientos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Fecha Inicio</label>
                  <input
                    type="date"
                    value={filtros.fechaInicio}
                    onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Fecha Fin</label>
                  <input
                    type="date"
                    value={filtros.fechaFin}
                    onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Tabla de utilidades */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">Fecha</th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">Tipo</th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">Descripción</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider">Venta</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider">Costo</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider">Fletes</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider">Obreros</th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider">Utilidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {utilidades.map(utilidad => (
                      <tr key={utilidad.id} className={`hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 group ${
                        utilidad.tipo === 'financiamiento' ? 'bg-green-50' : 
                        (utilidad.tipo === 'producto' && utilidad.descripcion?.includes('Contado')) ? 'bg-blue-50' : 
                        (utilidad.tipo === 'producto' && utilidad.descripcion?.includes('Crédito')) ? 'bg-purple-50' : ''
                      }`}>
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                          {formatearFechaLocal(utilidad.fecha)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-md ${
                            utilidad.tipo === 'producto' && utilidad.descripcion?.includes('Contado') ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' :
                            utilidad.tipo === 'producto' && utilidad.descripcion?.includes('Crédito') ? 'bg-gradient-to-r from-purple-400 to-purple-500 text-white' :
                            utilidad.tipo === 'financiamiento' ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' :
                            'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                          }`}>
                            {getTipoLabel(utilidad)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-900">{utilidad.descripcion}</td>
                        {utilidad.tipo === 'financiamiento' ? (
                          <>
                            <td className="px-5 py-4 text-sm text-right text-gray-400">-</td>
                            <td className="px-5 py-4 text-sm text-right text-gray-400">-</td>
                            <td className="px-5 py-4 text-sm text-right text-gray-400">-</td>
                            <td className="px-5 py-4 text-sm text-right text-gray-400">-</td>
                            <td className="px-5 py-4 text-sm text-right font-bold text-green-600">{formatCurrency(utilidad.utilidad)}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-5 py-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(utilidad.venta_total)}</td>
                            <td className="px-5 py-4 text-sm text-right font-medium text-red-600">{formatCurrency(utilidad.costo_compra)}</td>
                            <td className="px-5 py-4 text-sm text-right font-medium text-red-600">{formatCurrency(utilidad.fletes)}</td>
                            <td className="px-5 py-4 text-sm text-right font-medium text-red-600">{formatCurrency(utilidad.obreros)}</td>
                            <td className="px-5 py-4 text-sm text-right font-bold text-green-600">{formatCurrency(utilidad.utilidad)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {utilidades.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center border border-white/20">
            <div className="flex flex-col items-center gap-4">
              <div className="text-gray-400 text-5xl">📊</div>
              <p className="text-gray-500 text-lg font-medium">
                No hay datos de utilidad. Haz clic en "Calcular Utilidad" para generar los cálculos.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}