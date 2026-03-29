import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Search, AlertCircle, CheckCircle, Calendar, FileText, Users, CreditCard, Download, Trash2, Eye, Receipt, X, Percent } from 'lucide-react';
import { generarPDFCuentasPorCobrar } from '../lib/pdfGeneratorExtras';
import { formatearFechaLocal } from '../lib/dateUtils';
import { formatCurrency } from '../lib/formatters';
import { Input } from './ui/input';
import { Button } from './ui/button';

export default function CuentasPorCobrar() {
  const [cuentas, setCuentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tasaCambio, setTasaCambio] = useState(58);
  const [configId, setConfigId] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [loading, setLoading] = useState(false);
  const [mostrarModalClientes, setMostrarModalClientes] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [cuentasCliente, setCuentasCliente] = useState([]);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [cuentaParaPago, setCuentaParaPago] = useState(null);
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [mostrarModalDesglose, setMostrarModalDesglose] = useState(false);
  const [cuentaParaDesglose, setCuentaParaDesglose] = useState(null);
  const [pagosDesglose, setPagosDesglose] = useState([]);
  const [mostrarModalDesgloseGeneral, setMostrarModalDesgloseGeneral] = useState(false);
  const [desgloseGeneral, setDesgloseGeneral] = useState([]);
  const [pagosPorCuenta, setPagosPorCuenta] = useState({});

  // Función para normalizar el tipo de cuenta
  const normalizarTipo = (tipo, referencia) => {
    if (!tipo) return 'Factura';
    const tipoNormalizado = tipo.trim();
    // AGV con cualquier número
    if (tipoNormalizado.includes('AGV')) return tipoNormalizado;
    // Por defecto, facturas de venta a crédito
    return 'Factura';
  };

  // Función para eliminar duplicados en memoria
  const eliminarDuplicados = (cuentas) => {
    const vistas = new Map();
    const cuentasUnicas = [];

    for (const cuenta of cuentas) {
      const tipoNormalizado = normalizarTipo(cuenta.tipo, cuenta.referencia);
      const clave = `${tipoNormalizado}-${cuenta.referencia}`;

      if (!vistas.has(clave)) {
        vistas.set(clave, true);
        cuentasUnicas.push({ ...cuenta, tipo: tipoNormalizado });
      } else {
        // Si es duplicado, mantener el más reciente
        const existente = cuentasUnicas.find(c => `${normalizarTipo(c.tipo, c.referencia)}-${c.referencia}` === clave);

        if (existente) {
          const fechaExistente = new Date(existente.fecha_emision);
          const fechaNueva = new Date(cuenta.fecha_emision);

          if (fechaNueva > fechaExistente || cuenta.id > existente.id) {
            const indice = cuentasUnicas.indexOf(existente);
            cuentasUnicas[indice] = { ...cuenta, tipo: tipoNormalizado };
          }
        }
      }
    }

    return cuentasUnicas;
  };

  // Función para limpiar duplicados en la base de datos
  const limpiarDuplicadosEnBD = async (cuentas) => {
    const grupos = new Map();

    // Agrupar por tipo normalizado y referencia
    for (const cuenta of cuentas) {
      const tipoNormalizado = normalizarTipo(cuenta.tipo, cuenta.referencia);
      const clave = `${tipoNormalizado}-${cuenta.referencia}`;

      if (!grupos.has(clave)) {
        grupos.set(clave, []);
      }
      grupos.get(clave).push(cuenta);
    }

    // Para cada grupo con duplicados, mantener solo el más reciente
    for (const [clave, grupo] of grupos) {
      if (grupo.length > 1) {
        // Ordenar por fecha descendente y luego por ID descendente
        grupo.sort((a, b) => {
          const fechaA = new Date(a.fecha_emision);
          const fechaB = new Date(b.fecha_emision);
          if (fechaB.getTime() !== fechaA.getTime()) {
            return fechaB - fechaA;
          }
          return b.id - a.id;
        });

        const mantener = grupo[0];
        const tipoNormalizado = normalizarTipo(mantener.tipo, mantener.referencia);

        // Asegurar que el tipo esté normalizado
        if (mantener.tipo !== tipoNormalizado) {
          await supabase
            .from('cuentas_por_cobrar')
            .update({ tipo: tipoNormalizado })
            .eq('id', mantener.id);
        }

        const eliminar = grupo.slice(1);

        for (const duplicado of eliminar) {
          await supabase
            .from('cuentas_por_cobrar')
            .delete()
            .eq('id', duplicado.id);
        }

        console.log(`Eliminados ${eliminar.length} duplicados de ${clave}, mantenido ID: ${mantener.id}`);
      }
    }
  };

  const sincronizarFacturas = async () => {
    try {
      console.log('Iniciando sincronización de facturas...');
      // 1. Obtener todas las facturas de venta
      const { data: facturas, error: errorFacturas } = await supabase
        .from('facturas_venta')
        .select('*, clientes(nombre, cedula)');
      
      if (errorFacturas) throw errorFacturas;

      // 2. Obtener referencias existentes en cuentas_por_cobrar
      const { data: cuentasExistentes, error: errorCuentas } = await supabase
        .from('cuentas_por_cobrar')
        .select('referencia');
      
      if (errorCuentas) throw errorCuentas;

      const referenciasExistentes = new Set(
        cuentasExistentes?.map(c => c.referencia) || []
      );

      // 3. Filtrar facturas faltantes
      const facturasFaltantes = facturas.filter(f => 
        !referenciasExistentes.has(f.numero_factura) &&
        f.tipo_venta !== 'contado' &&
        f.estado !== 'Pagada' &&
        f.estado !== 'pagada' &&
        (f.balance_pendiente === undefined || f.balance_pendiente > 0)
      );

      if (facturasFaltantes.length > 0) {
        console.log(`Sincronizando ${facturasFaltantes.length} facturas faltantes...`);
        
        const nuevasCuentas = facturasFaltantes.map(f => {
          // Si es crédito, usa balance_pendiente
          const montoPendiente = f.balance_pendiente !== undefined ? f.balance_pendiente : f.total;
          
          // Asegurar estado válido (Pendiente o Parcialmente Pagada)
          // La tabla cuentas_por_cobrar usa 'Pendiente' incluso para facturas parciales
          // (se distingue por monto_pendiente < monto_total)
          const estado = 'Pendiente';

          return {
            cliente_id: f.cliente_id,
            cliente: f.clientes?.nombre || 'Cliente Sincronizado',
            cedula: f.clientes?.cedula || '',
            tipo: 'Factura',
            referencia: f.numero_factura,
            monto_total: f.total,
            monto_pendiente: montoPendiente,
            fecha_emision: f.fecha,
            fecha_vencimiento: null,
            estado: estado,
            divisa: f.divisa || 'DOP',
            notas: f.notas || 'Sincronizado automáticamente'
          };
        });

        const { error: errorInsert } = await supabase
          .from('cuentas_por_cobrar')
          .insert(nuevasCuentas);

        if (errorInsert) throw errorInsert;
        console.log('Sincronización completada.');
      } else {
        console.log('Todas las facturas están sincronizadas.');
      }
    } catch (error) {
      console.error('Error en sincronización:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Iniciar carga
      setLoading(true);
      // Sincronizar primero
      await sincronizarFacturas();
      // Luego cargar datos para la vista
      await cargarDatos();
      // El loading se maneja dentro de cargarDatos también, pero aseguramos
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const fetchTasa = async () => {
      const { data } = await supabase
        .from('configuracion_divisa')
        .select('id, tasa_dolar')
        .single();
      if (data) {
        setTasaCambio(data.tasa_dolar);
        setConfigId(data.id);
      }
    };
    fetchTasa();
  }, []);

  const actualizarTasaGlobal = async () => {
    if (!configId) return;
    try {
      const { error } = await supabase
        .from('configuracion_divisa')
        .update({ tasa_dolar: tasaCambio, fecha_actualizacion: new Date() })
        .eq('id', configId);
      
      if (error) throw error;
      alert('Tasa actualizada correctamente');
    } catch (error) {
      console.error('Error updating rate:', error);
      alert('Error al actualizar la tasa');
    }
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar cuentas por cobrar (solo facturas de venta a crédito)
      // Asegurar que se cargue la divisa correctamente
      // Filtrar financiamiento_actualizado y otros tipos no deseados
      const { data: cuentasData, error: errorCuentas } = await supabase
        .from('cuentas_por_cobrar')
        .select('*, clientes(nombre, cedula, telefono, limite_credito, balance_pendiente)')
        .not('tipo', 'ilike', '%financiamiento%') // Excluir explícitamente cualquier tipo de financiamiento
        .not('tipo', 'ilike', '%prestamo%') // Excluir explícitamente préstamos
        .ilike('referencia', 'AGV-%') // Solo permitir facturas con formato AGV-XXX
        .neq('estado', 'Pagada')
        .neq('estado', 'pagada')
        .order('fecha_emision', { ascending: false });

      if (errorCuentas) {
        console.error('Error al cargar cuentas:', errorCuentas);
        throw errorCuentas;
      }

      // Verificar y limpiar duplicados antes de establecer las cuentas
      const cuentasSinDuplicados = eliminarDuplicados(cuentasData || []);
      
      // Si se encontraron duplicados, eliminarlos de la base de datos
      if (cuentasSinDuplicados.length !== (cuentasData || []).length) {
        console.warn(`Se encontraron ${(cuentasData || []).length - cuentasSinDuplicados.length} cuentas duplicadas`);
        await limpiarDuplicadosEnBD(cuentasData || []);
      }

      // Asegurar que todas las cuentas tengan divisa y tipo normalizado
      const cuentasConDivisa = await Promise.all(cuentasSinDuplicados.map(async (cuenta) => {
        const tipoNormalizado = normalizarTipo(cuenta.tipo, cuenta.referencia);
        let cuentaActualizada = { ...cuenta, tipo: tipoNormalizado };

        // Si el tipo no está normalizado, actualizar en BD
        if (cuenta.tipo !== tipoNormalizado) {
          await supabase
            .from('cuentas_por_cobrar')
            .update({ tipo: tipoNormalizado })
            .eq('id', cuenta.id);
        }

        // Si no tiene divisa, intentar obtenerla de la factura original
        if (!cuenta.divisa) {
          const { data: factura } = await supabase
            .from('facturas_venta')
            .select('divisa')
            .eq('numero_factura', cuenta.referencia)
            .single();

          if (factura && factura.divisa) {
            // Actualizar la cuenta con la divisa correcta
            await supabase
              .from('cuentas_por_cobrar')
              .update({ divisa: factura.divisa })
              .eq('id', cuenta.id);

            cuentaActualizada.divisa = factura.divisa;
          }
        }

        // Si no tiene divisa, usar DOP por defecto
        if (!cuentaActualizada.divisa) {
          cuentaActualizada.divisa = 'DOP';
        }

        return cuentaActualizada;
      }));

      setCuentas(cuentasConDivisa);

      // Cargar resumen de clientes
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('*')
        .order('balance_pendiente', { ascending: false });

      setClientes(clientesData || []);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar datos');
    }
    setLoading(false);
  };

  const cuentasFiltradas = cuentas.filter(c => {
    const cumpleBusqueda =
      c.referencia?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.clientes?.nombre?.toLowerCase().includes(busqueda.toLowerCase());

    const cumpleEstado =
      filtroEstado === 'todas' ||
      (filtroEstado === 'pendiente' && c.estado === 'Pendiente') ||
      (filtroEstado === 'parcial' && c.estado === 'Pendiente' && c.monto_pendiente < c.monto_total) ||
      (filtroEstado === 'pagado' && c.estado === 'Pagada');

    // Filtrar por tipo: Factura, AGV, o todos
    const cumpleTipo = filtroTipo === 'todos' ||
                       (filtroTipo === 'Factura' && c.tipo === 'Factura') ||
                       (filtroTipo === 'AGV' && c.tipo && c.tipo.includes('AGV'));

    return cumpleBusqueda && cumpleEstado && cumpleTipo;
  });

  const clientesFiltrados = clientes.filter(c => 
    c.balance_pendiente > 0 && 
    c.nombre?.toLowerCase().includes(busquedaCliente.toLowerCase())
  );

  const totales = cuentas.reduce((acc, c) => {
    // Solo sumar facturas de venta a crédito (tipo 'Factura') y si la divisa es DOP o no está especificada (asumir DOP)
    if (c.tipo === 'Factura' && (!c.divisa || c.divisa === 'DOP')) {
      return {
        total: acc.total + (parseFloat(c.monto_total) || 0),
        cobrado: acc.cobrado + ((parseFloat(c.monto_total) || 0) - (parseFloat(c.monto_pendiente) || 0)),
        pendiente: acc.pendiente + (parseFloat(c.monto_pendiente) || 0)
      };
    }
    return acc;
  }, { total: 0, cobrado: 0, pendiente: 0 });

  const totalesUSD = cuentas.filter(c => c.tipo === 'Factura' && c.divisa === 'USD').reduce((acc, c) => ({
    total: acc.total + (parseFloat(c.monto_total) || 0),
    cobrado: acc.cobrado + ((parseFloat(c.monto_total) || 0) - (parseFloat(c.monto_pendiente) || 0)),
    pendiente: acc.pendiente + (parseFloat(c.monto_pendiente) || 0)
  }), { total: 0, cobrado: 0, pendiente: 0 });

  const diasVencido = (fecha) => {
    const hoy = new Date();
    const fechaEmision = new Date(fecha);
    const diferencia = Math.floor((hoy - fechaEmision) / (1000 * 60 * 60 * 24));
    return diferencia;
  };

  const getTipoBadge = (tipo) => {
    const colors = {
      'Factura': 'bg-blue-100 text-blue-800'
    };
    // Para AGV con cualquier número, usar color gris
    if (tipo && tipo.includes('AGV')) {
      return 'bg-gray-100 text-gray-800';
    }
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  };

  const calcularTotalesCliente = (clienteId, divisa = null) => {
    // Incluir facturas y AGV (pero NO financiamientos)
    const cuentasDelCliente = cuentas.filter(c => {
      if (clienteId) {
        return c.cliente_id === clienteId && (divisa ? c.divisa === divisa : true);
      }
      return divisa ? c.divisa === divisa : true;
    });
    
    // Separar por divisa
    const cuentasDOP = cuentasDelCliente.filter(c => !c.divisa || c.divisa === 'DOP');
    const cuentasUSD = cuentasDelCliente.filter(c => c.divisa === 'USD');
    
    const totalesDOP = cuentasDOP.reduce((acc, c) => ({
      total: acc.total + (parseFloat(c.monto_total) || 0),
      pendiente: acc.pendiente + (parseFloat(c.monto_pendiente) || 0),
      pagado: acc.pagado + ((parseFloat(c.monto_total) || 0) - (parseFloat(c.monto_pendiente) || 0))
    }), { total: 0, pendiente: 0, pagado: 0 });
    
    const totalesUSD = cuentasUSD.reduce((acc, c) => ({
      total: acc.total + (parseFloat(c.monto_total) || 0),
      pendiente: acc.pendiente + (parseFloat(c.monto_pendiente) || 0),
      pagado: acc.pagado + ((parseFloat(c.monto_total) || 0) - (parseFloat(c.monto_pendiente) || 0))
    }), { total: 0, pendiente: 0, pagado: 0 });
    
    return {
      ...totalesDOP,
      totalUSD: totalesUSD.total,
      pendienteUSD: totalesUSD.pendiente,
      pagadoUSD: totalesUSD.pagado,
      tieneUSD: cuentasUSD.length > 0
    };
  };

  const verDetalleCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
    const { data } = await supabase
      .from('cuentas_por_cobrar')
      .select('*')
      .eq('cliente_id', cliente.id)
      .neq('tipo', 'financiamiento_actualizado')
      .order('fecha_emision', { ascending: false });
    setCuentasCliente(data || []);
  };

  const abrirModalPago = (cuenta) => {
    setCuentaParaPago(cuenta);
    setMontoPago(cuenta.monto_pendiente.toString());
    setMostrarModalPago(true);
  };

  const abrirModalDesglose = async (cuenta) => {
    setCuentaParaDesglose(cuenta);
    setMostrarModalDesglose(true);
    
    // Cargar pagos de la cuenta
    try {
      const { data: pagosData, error } = await supabase
        .from('pagos_cuentas_por_cobrar')
        .select('*')
        .eq('cuenta_id', cuenta.id)
        .order('fecha_pago', { ascending: false });
      
      if (error) {
        console.error('Error al cargar pagos:', error);
        setPagosDesglose([]);
      } else {
        setPagosDesglose(pagosData || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setPagosDesglose([]);
    }
  };

  const abrirModalDesgloseGeneral = async () => {
    setMostrarModalDesgloseGeneral(true);
    setLoading(true);
    
    try {
      // Usar las cuentas filtradas directamente
      if (cuentasFiltradas.length === 0) {
        setDesgloseGeneral([]);
        setPagosPorCuenta({});
        setLoading(false);
        return;
      }

      // Establecer las cuentas como desglose general
      setDesgloseGeneral(cuentasFiltradas);

      // Cargar pagos para cada cuenta
      const cuentaIds = cuentasFiltradas.map(c => c.id);
      const pagosMap = {};

      if (cuentaIds.length > 0) {
        const { data: pagosData, error } = await supabase
          .from('pagos_cuentas_por_cobrar')
          .select('*')
          .in('cuenta_id', cuentaIds)
          .order('fecha_pago', { ascending: false });
        
        if (!error && pagosData) {
          // Agrupar pagos por cuenta_id
          pagosData.forEach(pago => {
            if (!pagosMap[pago.cuenta_id]) {
              pagosMap[pago.cuenta_id] = [];
            }
            pagosMap[pago.cuenta_id].push(pago);
          });
        }
      }

      setPagosPorCuenta(pagosMap);
    } catch (error) {
      console.error('Error:', error);
      setDesgloseGeneral([]);
      setPagosPorCuenta({});
    } finally {
      setLoading(false);
    }
  };

  const aplicarInteres = async () => {
    // 1. Identificar facturas vencidas (> 30 dias) con saldo pendiente
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30);
    
    const facturasVencidas = cuentas.filter(c => {
      const fechaEmision = new Date(c.fecha_emision);
      return fechaEmision < fechaLimite && 
             c.monto_pendiente > 0 && 
             c.estado !== 'Pagada' &&
             c.tipo === 'Factura'; 
    });

    if (facturasVencidas.length === 0) {
      alert('No hay facturas con más de 30 días de antigüedad pendientes de pago.');
      return;
    }

    const confirmacion = confirm(
      `Se encontraron ${facturasVencidas.length} facturas con más de 30 días de antigüedad.\n` +
      `Se aplicará un 3% de interés mensual al monto pendiente de cada una.\n\n` +
      `¿Desea continuar?`
    );

    if (!confirmacion) return;

    setLoading(true);
    let contador = 0;

    try {
      for (const factura of facturasVencidas) {
        const interesCalculado = parseFloat(factura.monto_pendiente) * 0.03;
        
        // Actualizar factura
        const nuevoMontoInteres = (parseFloat(factura.monto_interes) || 0) + interesCalculado;
        const nuevoMontoTotal = parseFloat(factura.monto_total) + interesCalculado;
        const nuevoMontoPendiente = parseFloat(factura.monto_pendiente) + interesCalculado;

        const { error } = await supabase
          .from('cuentas_por_cobrar')
          .update({
            monto_interes: nuevoMontoInteres,
            monto_total: nuevoMontoTotal,
            monto_pendiente: nuevoMontoPendiente
          })
          .eq('id', factura.id);

        if (error) throw error;

        // Actualizar balance del cliente
        if (factura.cliente_id) {
             const { data: clienteData } = await supabase
              .from('clientes')
              .select('balance_pendiente')
              .eq('id', factura.cliente_id)
              .single();
            
            if (clienteData) {
                const nuevoBalanceCliente = (parseFloat(clienteData.balance_pendiente) || 0) + interesCalculado;
                await supabase
                  .from('clientes')
                  .update({ balance_pendiente: nuevoBalanceCliente })
                  .eq('id', factura.cliente_id);
            }
        }
        contador++;
      }
      
      alert(`✅ Se aplicó interés exitosamente a ${contador} facturas.`);
      await cargarDatos();
      
    } catch (error) {
      console.error('Error aplicando interés:', error);
      alert('Ocurrió un error al aplicar los intereses: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generarPDFDesgloseGeneral = async () => {
    if (typeof window === 'undefined') {
      console.warn('PDF generation is only supported in browser environment.');
      return;
    }

    setLoading(true);

    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF();
      
      // Cargar pagos para cada cuenta
      const cuentaIds = cuentasFiltradas.map(c => c.id);
      let pagosData = [];
      
      if (cuentaIds.length > 0) {
        const { data } = await supabase
          .from('pagos_cuentas_por_cobrar')
          .select('*')
          .in('cuenta_id', cuentaIds)
          .order('fecha_pago', { ascending: false });
        
        pagosData = data || [];
      }

      // Logo
      const logoUrl = 'https://sensible-spoonbill-485.convex.cloud/api/storage/f2c37282-23ea-45e1-8f03-4f60c1d96017';
      doc.addImage(logoUrl, 'PNG', 14, 10, 60, 20);

      // Información de la empresa
      doc.setFontSize(10);
      doc.text('AGROVERDE/AGV.SRL', 120, 15);
      doc.text('RNC: 133-07456-7', 120, 20);
      doc.text('C/ DUARTE NO 7 VILLA RIVA RD', 120, 25);
      doc.text('TEL: 809 489-9215', 120, 30);

      // Título
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('DESGLOSE GENERAL - CUENTAS POR COBRAR', 105, 45, { align: 'center' });

      // Resumen
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setFillColor(34, 197, 94);
      doc.rect(14, 55, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('RESUMEN', 105, 60, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFont(undefined, 'bold');
      doc.text('Total Cuentas:', 20, 70);
      doc.setFont(undefined, 'normal');
      doc.text(cuentasFiltradas.length.toString(), 70, 70);
      
      doc.setFont(undefined, 'bold');
      doc.text('Total Pagos Registrados:', 20, 77);
      doc.setFont(undefined, 'normal');
      doc.text(pagosData.length.toString(), 80, 77);
      
      const totalPagadoDOP = pagosData
        .filter(p => {
          const cuenta = cuentasFiltradas.find(c => c.id === p.cuenta_id);
          return !cuenta?.divisa || cuenta.divisa === 'DOP';
        })
        .reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
      
      const totalPagadoUSD = pagosData
        .filter(p => {
          const cuenta = cuentasFiltradas.find(c => c.id === p.cuenta_id);
          return cuenta?.divisa === 'USD';
        })
        .reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);

      doc.setFont(undefined, 'bold');
      doc.text('Total Pagado (DOP):', 20, 84);
      doc.setFont(undefined, 'normal');
      doc.text(formatCurrency(totalPagadoDOP, 'DOP'), 70, 84);
      
      if (totalPagadoUSD > 0) {
        doc.setFont(undefined, 'bold');
        doc.text('Total Pagado (USD):', 20, 91);
        doc.setFont(undefined, 'normal');
        doc.text(formatCurrency(totalPagadoUSD, 'USD'), 70, 91);
      }

      // Tabla de cuentas
      const tableData = cuentasFiltradas.map(c => {
        const montoPagado = (parseFloat(c.monto_total) || 0) - (parseFloat(c.monto_pendiente) || 0);
        const pagosCuenta = pagosData.filter(p => p.cuenta_id === c.id);
        return [
          c.tipo,
          c.referencia,
          c.clientes?.nombre || c.cliente || 'N/A',
          formatearFechaLocal(c.fecha_emision),
          formatCurrency(c.monto_total, c.divisa || 'DOP'),
          formatCurrency(montoPagado, c.divisa || 'DOP'),
          formatCurrency(c.monto_pendiente, c.divisa || 'DOP'),
          c.estado,
          pagosCuenta.length.toString()
        ];
      });

      doc.autoTable({
        startY: 100,
        head: [['Tipo', 'Referencia', 'Cliente', 'Fecha', 'Total', 'Pagado', 'Pendiente', 'Estado', 'Pagos']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 6, cellPadding: 1 },
        columnStyles: {
          3: { halign: 'center' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'center' },
          8: { halign: 'center' }
        }
      });

      doc.save(`desglose_general_cuentas_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generarPDFCuenta = async (cuenta) => {
    if (typeof window === 'undefined') {
      console.warn('PDF generation is only supported in browser environment.');
      return;
    }

    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    
    // Cargar pagos de la cuenta
    const { data: pagosData } = await supabase
      .from('pagos_cuentas_por_cobrar')
      .select('*')
      .eq('cuenta_id', cuenta.id)
      .order('fecha_pago', { ascending: false });

    const pagos = pagosData || [];
    const montoPagado = (parseFloat(cuenta.monto_total) || 0) - (parseFloat(cuenta.monto_pendiente) || 0);

    // Logo
    const logoUrl = 'https://sensible-spoonbill-485.convex.cloud/api/storage/f2c37282-23ea-45e1-8f03-4f60c1d96017';
    doc.addImage(logoUrl, 'PNG', 14, 10, 60, 20);

    // Información de la empresa
    doc.setFontSize(10);
    doc.text('AGROVERDE/AGV.SRL', 120, 15);
    doc.text('RNC: 133-07456-7', 120, 20);
    doc.text('C/ DUARTE NO 7 VILLA RIVA RD', 120, 25);
    doc.text('TEL: 809 489-9215', 120, 30);

    // Título
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('DETALLE DE CUENTA POR COBRAR', 105, 45, { align: 'center' });

    // Información de la cuenta
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Tipo:', 14, 60);
    doc.setFont(undefined, 'normal');
    doc.text(cuenta.tipo, 35, 60);
    
    doc.setFont(undefined, 'bold');
    doc.text('Referencia:', 14, 67);
    doc.setFont(undefined, 'normal');
    doc.text(cuenta.referencia, 50, 67);
    
    doc.setFont(undefined, 'bold');
    doc.text('Cliente:', 14, 74);
    doc.setFont(undefined, 'normal');
    doc.text(cuenta.clientes?.nombre || cuenta.cliente || 'N/A', 40, 74);
    
    doc.setFont(undefined, 'bold');
    doc.text('Fecha Emisión:', 14, 81);
    doc.setFont(undefined, 'normal');
    doc.text(formatearFechaLocal(cuenta.fecha_emision), 55, 81);
    
    if (cuenta.fecha_vencimiento) {
      doc.setFont(undefined, 'bold');
      doc.text('Fecha Vencimiento:', 14, 88);
      doc.setFont(undefined, 'normal');
      doc.text(formatearFechaLocal(cuenta.fecha_vencimiento), 65, 88);
    }

    // Resumen de montos
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(34, 197, 94);
    doc.rect(14, 95, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('RESUMEN FINANCIERO', 105, 100, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFont(undefined, 'bold');
    doc.text('Monto Total:', 20, 110);
    doc.setFont(undefined, 'normal');
    doc.text(formatCurrency(cuenta.monto_total, cuenta.divisa || 'DOP'), 70, 110);
    
    doc.setFont(undefined, 'bold');
    doc.text('Monto Pagado:', 20, 117);
    doc.setFont(undefined, 'normal');
    doc.text(formatCurrency(montoPagado, cuenta.divisa || 'DOP'), 70, 117);
    
    doc.setFont(undefined, 'bold');
    doc.text('Monto Pendiente:', 20, 124);
    doc.setFont(undefined, 'normal');
    doc.text(formatCurrency(cuenta.monto_pendiente, cuenta.divisa || 'DOP'), 70, 124);
    
    doc.setFont(undefined, 'bold');
    doc.text('Estado:', 20, 131);
    doc.setFont(undefined, 'normal');
    doc.text(cuenta.estado, 50, 131);

    // Tabla de pagos
    if (pagos.length > 0) {
      const tableData = pagos.map(p => [
        formatearFechaLocal(p.fecha_pago),
        formatCurrency(p.monto, cuenta.divisa || 'DOP'),
        p.metodo_pago || 'N/A'
      ]);

      doc.autoTable({
        startY: 140,
        head: [['Fecha Pago', 'Monto', 'Método de Pago']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'center' }
        }
      });
    } else {
      doc.setFontSize(10);
      doc.text('No se han registrado pagos para esta cuenta.', 14, 140);
    }

    // Notas si existen
    if (cuenta.notas) {
      const finalY = pagos.length > 0 ? doc.lastAutoTable.finalY + 10 : 150;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Notas:', 14, finalY);
      doc.setFont(undefined, 'normal');
      const splitNotas = doc.splitTextToSize(cuenta.notas, 180);
      doc.text(splitNotas, 14, finalY + 7);
    }

    doc.save(`cuenta_por_cobrar_${cuenta.referencia}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const eliminarCuenta = async (cuenta) => {
    const tipoTexto = cuenta.tipo && cuenta.tipo.includes('AGV') ? 'registro AGV' : 'factura';
    const confirmacion = confirm(
      `¿Está seguro de que desea eliminar este ${tipoTexto}?\n\n` +
      `Referencia: ${cuenta.referencia}\n` +
      `Monto Total: ${formatCurrency(cuenta.monto_total, cuenta.divisa || 'DOP')}\n` +
      `Monto Pendiente: ${formatCurrency(cuenta.monto_pendiente, cuenta.divisa || 'DOP')}\n\n` +
      `Esta acción no se puede deshacer.`
    );

    if (!confirmacion) {
      return;
    }

    setLoading(true);

    try {
      // Obtener el monto pendiente antes de eliminar para actualizar el balance del cliente
      const montoPendiente = parseFloat(cuenta.monto_pendiente) || 0;

      // Eliminar la cuenta
      const { error: errorEliminar } = await supabase
        .from('cuentas_por_cobrar')
        .delete()
        .eq('id', cuenta.id);

      if (errorEliminar) {
        throw errorEliminar;
      }

      // Eliminar los pagos asociados a esta cuenta
      await supabase
        .from('pagos_cuentas_por_cobrar')
        .delete()
        .eq('cuenta_id', cuenta.id);

      // Actualizar el balance del cliente restando el monto pendiente
      if (montoPendiente > 0 && cuenta.cliente_id) {
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('balance_pendiente')
          .eq('id', cuenta.cliente_id)
          .single();

        if (clienteData) {
          const nuevoBalance = Math.max(0, (parseFloat(clienteData.balance_pendiente) || 0) - montoPendiente);
          
          await supabase
            .from('clientes')
            .update({ balance_pendiente: nuevoBalance })
            .eq('id', cuenta.cliente_id);
        }
      }

      // Eliminar registros relacionados en cuadre_caja
      await supabase
        .from('cuadre_caja')
        .delete()
        .eq('cuenta_cobrar_id', cuenta.id);

      alert(`✅ ${tipoTexto.charAt(0).toUpperCase() + tipoTexto.slice(1)} eliminada exitosamente`);
      
      // Recargar datos
      await cargarDatos();
      
      // Si hay un cliente seleccionado, actualizar sus cuentas
      if (clienteSeleccionado) {
        await verDetalleCliente(clienteSeleccionado);
      }
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      alert('Error al eliminar la cuenta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };


  const eliminarPago = async (pago) => {
    const confirmacion = confirm(
      '¿Está seguro de eliminar este pago?\n\n' +
      'Esta acción revertirá el monto a la factura y actualizará el balance del cliente.\n' +
      'El registro en Cuadre de Caja también será eliminado.'
    );

    if (!confirmacion) return;

    setLoading(true);
    try {
      // 1. Obtener información actual de la cuenta
      const { data: cuenta, error: errorCuenta } = await supabase
        .from('cuentas_por_cobrar')
        .select('*')
        .eq('id', pago.cuenta_id)
        .single();

      if (errorCuenta) throw errorCuenta;

      const monto = parseFloat(pago.monto);

      // 2. Eliminar el pago
      const { error: errorDelete } = await supabase
        .from('pagos_cuentas_por_cobrar')
        .delete()
        .eq('id', pago.id);

      if (errorDelete) throw errorDelete;

      // 3. Actualizar la factura (revertir monto pendiente)
      const nuevoMontoPendiente = parseFloat(cuenta.monto_pendiente) + monto;
      
      // El estado siempre vuelve a Pendiente si hay deuda, o se mantiene si ya lo estaba.
      // Si estaba Pagada y ahora debe, pasa a Pendiente.
      // Si era Parcial (que es Pendiente en BD), sigue siendo Pendiente.
      const nuevoEstado = 'Pendiente';

      await supabase
        .from('cuentas_por_cobrar')
        .update({
          monto_pendiente: nuevoMontoPendiente,
          estado: nuevoEstado
        })
        .eq('id', cuenta.id);

      // 4. Actualizar balance del cliente
      if (cuenta.cliente_id) {
         const { data: clienteData } = await supabase
          .from('clientes')
          .select('balance_pendiente')
          .eq('id', cuenta.cliente_id)
          .single();

         if (clienteData) {
           await supabase
             .from('clientes')
             .update({
               balance_pendiente: (parseFloat(clienteData.balance_pendiente) || 0) + monto
             })
             .eq('id', cuenta.cliente_id);
         }
      }

      // 5. Eliminar registro correspondiente en Cuadre de Caja
      // Buscamos un registro que coincida en cuenta_cobrar_id, monto y concepto
      // Borramos el más reciente encontrado
      const { data: movimientosCaja } = await supabase
        .from('cuadre_caja')
        .select('id')
        .eq('cuenta_cobrar_id', cuenta.id)
        .eq('monto', monto)
        .eq('concepto', 'pago_factura')
        .order('created_at', { ascending: false })
        .limit(1);

      if (movimientosCaja && movimientosCaja.length > 0) {
        await supabase
          .from('cuadre_caja')
          .delete()
          .eq('id', movimientosCaja[0].id);
      }

      alert('✅ Pago eliminado y factura actualizada exitosamente.');
      
      // Recargar datos generales
      await cargarDatos();
      
      // Recargar lista de pagos en el modal
      const { data: nuevosPagos } = await supabase
        .from('pagos_cuentas_por_cobrar')
        .select('*')
        .eq('cuenta_id', cuenta.id)
        .order('fecha_pago', { ascending: false });
      
      setPagosDesglose(nuevosPagos || []);
      
      // Si hay un cliente seleccionado, actualizar sus datos
      if (clienteSeleccionado) {
        await verDetalleCliente(clienteSeleccionado);
      }

    } catch (error) {
      console.error('Error al eliminar pago:', error);
      alert('Error al eliminar el pago: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const registrarPago = async () => {
    if (!montoPago || parseFloat(montoPago) <= 0) {
      alert('Ingrese un monto válido');
      return;
    }

    if (parseFloat(montoPago) > parseFloat(cuentaParaPago.monto_pendiente)) {
      alert('El monto no puede ser mayor al pendiente');
      return;
    }

    try {
      // Registrar pago
      await supabase.from('pagos_cuentas_por_cobrar').insert({
        cuenta_id: cuentaParaPago.id,
        monto: parseFloat(montoPago),
        metodo_pago: metodoPago,
        fecha_pago: new Date().toISOString()
      });

      // Actualizar cuenta
      const nuevoMontoPendiente = parseFloat(cuentaParaPago.monto_pendiente) - parseFloat(montoPago);
      const nuevoEstado = nuevoMontoPendiente === 0 ? 'Pagada' : 'Pendiente';

      await supabase
        .from('cuentas_por_cobrar')
        .update({
          monto_pendiente: nuevoMontoPendiente,
          estado: nuevoEstado
        })
        .eq('id', cuentaParaPago.id);

      // Actualizar balance del cliente
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('balance_pendiente')
        .eq('id', cuentaParaPago.cliente_id)
        .single();

      await supabase
        .from('clientes')
        .update({
          balance_pendiente: (parseFloat(clienteData.balance_pendiente) || 0) - parseFloat(montoPago)
        })
        .eq('id', cuentaParaPago.cliente_id);

      // Registrar en Cuadre de Caja (verificar duplicados primero)
      const fechaPago = new Date().toISOString().split('T')[0];
      const cuadreData = {
        fecha: fechaPago,
        tipo_movimiento: 'ingreso',
        concepto: 'pago_factura',
        referencia: cuentaParaPago.referencia,
        monto: parseFloat(montoPago),
        metodo_pago: metodoPago,
        descripcion: `Pago de ${cuentaParaPago.tipo} - ${cuentaParaPago.referencia} - Cliente: ${cuentaParaPago.clientes?.nombre || 'N/A'}`,
        cuenta_cobrar_id: cuentaParaPago.id,
        cliente_id: cuentaParaPago.cliente_id,
        divisa: cuentaParaPago.divisa || 'DOP'
      };

      // Verificar si ya existe un registro similar para evitar duplicados
      const { data: registroExistente } = await supabase
        .from('cuadre_caja')
        .select('id')
        .eq('referencia', cuentaParaPago.referencia)
        .eq('concepto', 'pago_factura')
        .eq('fecha', fechaPago)
        .eq('monto', parseFloat(montoPago))
        .eq('divisa', cuentaParaPago.divisa || 'DOP')
        .eq('cuenta_cobrar_id', cuentaParaPago.id)
        .single();

      if (!registroExistente) {
        await supabase.from('cuadre_caja').insert(cuadreData);
      }

      alert('Pago registrado exitosamente');
      setMostrarModalPago(false);
      setMontoPago('');
      cargarDatos();
      if (clienteSeleccionado) {
        verDetalleCliente(clienteSeleccionado);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar pago');
    }
  };

  const generarPDFCliente = async (cliente) => {
    if (typeof window === 'undefined') {
      console.warn('PDF generation is only supported in browser environment.');
      return;
    }

    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    const totales = calcularTotalesCliente(cliente.id);
    const cuentasDelCliente = cuentas.filter(c => c.cliente_id === cliente.id);

    // Logo
    const logoUrl = 'https://sensible-spoonbill-485.convex.cloud/api/storage/f2c37282-23ea-45e1-8f03-4f60c1d96017';
    doc.addImage(logoUrl, 'PNG', 14, 10, 60, 20);

    // Información de la empresa
    doc.setFontSize(10);
    doc.text('AGROVERDE/AGV.SRL', 120, 15);
    doc.text('RNC: 133-07456-7', 120, 20);
    doc.text('C/ DUARTE NO 7 VILLA RIVA RD', 120, 25);
    doc.text('TEL: 809 489-9215', 120, 30);

    // Título
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('REPORTE DE CUENTAS POR COBRAR POR CLIENTE', 105, 45, { align: 'center' });

    // Información del Cliente
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Cliente:', 14, 60);
    doc.setFont(undefined, 'normal');
    doc.text(cliente.nombre, 35, 60);
    
    doc.setFont(undefined, 'bold');
    doc.text('Cédula:', 14, 67);
    doc.setFont(undefined, 'normal');
    doc.text(cliente.cedula || 'N/A', 35, 67);

    // Resumen de totales
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(34, 197, 94);
    doc.rect(14, 75, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('RESUMEN', 105, 80, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.text(`Total: ${formatCurrency(totales.total)}`, 20, 90);
    doc.text(`Pagado: ${formatCurrency(totales.pagado)}`, 20, 97);
    doc.setFont(undefined, 'bold');
    doc.text(`Pendiente: ${formatCurrency(totales.pendiente)}`, 20, 104);

    // Tabla de cuentas
    const tableData = cuentasDelCliente.map(c => {
      const montoPagado = (parseFloat(c.monto_total) || 0) - (parseFloat(c.monto_pendiente) || 0);
      return [
        c.tipo,
        c.referencia,
        new Date(c.fecha_emision).toLocaleDateString(),
        formatCurrency(c.monto_total),
        formatCurrency(montoPagado),
        formatCurrency(c.monto_pendiente),
        c.estado
      ];
    });

    doc.autoTable({
      startY: 115,
      head: [['Tipo', 'Referencia', 'Fecha', 'Total', 'Pagado', 'Pendiente', 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
        6: { halign: 'center' }
      }
    });

    // Fecha de impresión
    const finalY = doc.lastAutoTable.finalY + 10;
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const fechaImpresion = new Date().toLocaleString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Fecha de impresión: ${fechaImpresion}`, 105, pageHeight - 15, { align: 'center' });

    doc.save(`cuentas_por_cobrar_${cliente.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading && !cuentas.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          <div className="text-gray-500 font-medium">Cargando cuentas por cobrar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header con efecto glassmorphism */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-5 sm:p-7 mb-6 sm:mb-8 border border-white/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 shadow-lg">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-3 mb-2">
                <div className="bg-gradient-to-br from-orange-500 to-red-500 p-2 rounded-xl shadow-lg">
                  <DollarSign className="text-white w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                Cuentas por Cobrar
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Gestión de cobros a clientes (Facturas de venta a crédito)</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto items-end">
              <div className="flex flex-col gap-1 w-20 sm:w-24">
                <label className="text-xs font-medium text-gray-500">Tasa USD</label>
                <Input
                  type="number"
                  value={tasaCambio}
                  onChange={(e) => setTasaCambio(parseFloat(e.target.value) || 0)}
                  className="h-9 px-2 text-sm bg-white/50 border-gray-200"
                />
              </div>
              <button
                onClick={() => setMostrarModalClientes(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs sm:text-sm"
              >
                <Users size={16} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Seleccionar Clientes</span>
                <span className="sm:hidden">Clientes</span>
              </button>
              <button
                onClick={aplicarInteres}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs sm:text-sm"
              >
                <Percent size={16} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Aplicar Interés</span>
                <span className="sm:hidden">Interés</span>
              </button>
              <button
                onClick={() => generarPDFCuentasPorCobrar(cuentasFiltradas, totales)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white rounded-xl hover:from-orange-600 hover:via-orange-700 hover:to-red-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs sm:text-sm"
              >
                <FileText size={16} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Generar PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
              <button
                onClick={abrirModalDesgloseGeneral}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs sm:text-sm"
              >
                <Eye size={16} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Ver Desglose</span>
                <span className="sm:hidden">Desglose</span>
              </button>
              <button
                onClick={generarPDFDesgloseGeneral}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs sm:text-sm"
              >
                <Download size={16} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">PDF Desglose</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>

          {/* Resumen General con efectos modernos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:scale-110 transition-transform duration-300">
                    <DollarSign className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <span className="text-blue-100 text-xs sm:text-sm font-semibold bg-white/10 px-3 py-1 rounded-full">Por Cobrar</span>
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">{formatCurrency(totales.total)}</div>
                <div className="text-blue-100 text-xs sm:text-sm font-medium">Total de cuentas por cobrar</div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:scale-110 transition-transform duration-300">
                    <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <span className="text-green-100 text-xs sm:text-sm font-semibold bg-white/10 px-3 py-1 rounded-full">Cobrado</span>
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">{formatCurrency(totales.cobrado)}</div>
                <div className="text-green-100 text-xs sm:text-sm font-medium">Total de pagos recibidos</div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-orange-500 via-red-600 to-rose-700 rounded-2xl p-5 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden sm:col-span-2 lg:col-span-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 group-hover:scale-110 transition-transform duration-300">
                    <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <span className="text-orange-100 text-xs sm:text-sm font-semibold bg-white/10 px-3 py-1 rounded-full">Pendiente</span>
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">{formatCurrency(totales.pendiente + (totalesUSD.pendiente * tasaCambio))}</div>
                <div className="text-orange-100 text-xs sm:text-sm font-medium">Monto pendiente de cobro</div>
              </div>
            </div>
          </div>

          {/* Resumen de Facturas en USD */}
          {totalesUSD.total > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 p-5 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl border-2 border-blue-300 shadow-lg">
              <div className="group bg-white rounded-xl p-4 sm:p-5 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <p className="text-xs sm:text-sm text-blue-600 font-semibold mb-2 flex items-center gap-2">
                  <span className="text-lg">💵</span> Total en USD
                </p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-700">{formatCurrency(totalesUSD.total, 'USD')}</p>
              </div>
              <div className="group bg-white rounded-xl p-4 sm:p-5 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <p className="text-xs sm:text-sm text-green-600 font-semibold mb-2 flex items-center gap-2">
                  <span className="text-lg">💵</span> Cobrado en USD
                </p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-700">{formatCurrency(totalesUSD.cobrado, 'USD')}</p>
              </div>
              <div className="group bg-white rounded-xl p-4 sm:p-5 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 sm:col-span-2 lg:col-span-1">
                <p className="text-xs sm:text-sm text-orange-600 font-semibold mb-2 flex items-center gap-2">
                  <span className="text-lg">💵</span> Pendiente en USD
                </p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-700">{formatCurrency(totalesUSD.pendiente, 'USD')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Resumen por Cliente */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-5 sm:p-7 mb-6 sm:mb-8 border border-white/20">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-5 sm:mb-6 flex items-center gap-2">
            <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full"></div>
            Resumen por Cliente
          </h2>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 text-white">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">Cliente</th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">Cédula</th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider">Límite Crédito</th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider">Balance Pendiente</th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider">Crédito Disponible</th>
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {clientes.filter(c => c.balance_pendiente > 0).map((cliente) => {
                  const creditoDisponible = (cliente.limite_credito || 0) - (cliente.balance_pendiente || 0);
                  const porcentajeUsado = ((cliente.balance_pendiente || 0) / (cliente.limite_credito || 1)) * 100;
                  
                  return (
                    <tr key={cliente.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-200 group">
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">{cliente.nombre}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{cliente.cedula || '-'}</td>
                      <td className="px-5 py-4 text-sm text-right font-medium">{formatCurrency(cliente.limite_credito || 0)}</td>
                      <td className="px-5 py-4 text-sm text-right font-bold text-orange-600">
                        {formatCurrency(cliente.balance_pendiente || 0)}
                      </td>
                      <td className="px-5 py-4 text-sm text-right font-semibold text-green-600">
                        {formatCurrency(creditoDisponible)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${
                          porcentajeUsado >= 90 ? 'bg-gradient-to-r from-red-400 to-red-500 text-white' :
                          porcentajeUsado >= 70 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                          'bg-gradient-to-r from-green-400 to-green-500 text-white'
                        }`}>
                          {porcentajeUsado >= 90 ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                          {porcentajeUsado.toFixed(0)}% usado
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {clientes.filter(c => c.balance_pendiente > 0).map((cliente) => {
              const creditoDisponible = (cliente.limite_credito || 0) - (cliente.balance_pendiente || 0);
              const porcentajeUsado = ((cliente.balance_pendiente || 0) / (cliente.limite_credito || 1)) * 100;
              
              return (
                <div key={cliente.id} className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:border-purple-300">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="text-base font-bold text-gray-900 mb-1">{cliente.nombre}</p>
                      <p className="text-sm text-gray-500">{cliente.cedula || 'Sin cédula'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${
                      porcentajeUsado >= 90 ? 'bg-gradient-to-r from-red-400 to-red-500 text-white' :
                      porcentajeUsado >= 70 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                      'bg-gradient-to-r from-green-400 to-green-500 text-white'
                    }`}>
                      {porcentajeUsado >= 90 ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                      {porcentajeUsado.toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-3">
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Límite Crédito</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(cliente.limite_credito || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Balance Pendiente</p>
                      <p className="font-bold text-orange-600">{formatCurrency(cliente.balance_pendiente || 0)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs mb-1">Crédito Disponible</p>
                      <p className="font-bold text-green-600">{formatCurrency(creditoDisponible)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-5 sm:p-6 mb-6 sm:mb-8 border border-white/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por referencia o cliente..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              />
            </div>
            <div>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white shadow-sm"
              >
                <option value="todos">Todos los tipos</option>
                <option value="Factura">Facturas</option>
                <option value="AGV">AGV</option>
              </select>
            </div>
            <div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white shadow-sm"
              >
                <option value="todas">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="parcial">Parciales</option>
                <option value="pagado">Pagados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de Cuentas por Cobrar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">Tipo</th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">Referencia</th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider">Cliente</th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider">Total</th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider">Pagado</th>
                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider">Pendiente</th>
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider">Vencimiento</th>
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider">Estado</th>
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {cuentasFiltradas.map((cuenta) => {
                  const dias = diasVencido(cuenta.fecha_emision);
                  const diasVencimiento = cuenta.fecha_vencimiento ? diasVencido(cuenta.fecha_vencimiento) : null;
                  const esVencida = diasVencimiento && diasVencimiento > 0 && cuenta.monto_pendiente > 0;
                  const montoPagado = (parseFloat(cuenta.monto_total) || 0) - (parseFloat(cuenta.monto_pendiente) || 0);
                  
                  return (
                    <tr key={cuenta.id} className={`hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-200 group ${esVencida ? 'bg-red-50' : ''}`}>
                      <td className="px-5 py-4">
                        <span className="px-3 py-1.5 text-xs font-bold rounded-full shadow-md bg-gradient-to-r from-blue-400 to-blue-500 text-white">
                          {cuenta.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">{cuenta.referencia}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {formatearFechaLocal(cuenta.fecha_emision)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{cuenta.clientes?.nombre || '-'}</td>
                      <td className="px-5 py-4 text-sm text-right font-bold">
                        {formatCurrency(cuenta.monto_total, cuenta.divisa || 'DOP')}
                        {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                      </td>
                      <td className="px-5 py-4 text-sm text-right font-semibold text-green-600">
                        {formatCurrency(montoPagado, cuenta.divisa || 'DOP')}
                        {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                      </td>
                      <td className="px-5 py-4 text-sm text-right text-orange-600 font-bold">
                        {formatCurrency(cuenta.monto_pendiente, cuenta.divisa || 'DOP')}
                        {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {cuenta.fecha_vencimiento ? (
                          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm ${
                            esVencida ? 'bg-red-100 text-red-700 border border-red-200' :
                            diasVencimiento && diasVencimiento > -7 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                            'bg-green-100 text-green-700 border border-green-200'
                          }`}>
                            <Calendar size={14} />
                            {new Date(cuenta.fecha_vencimiento).toLocaleDateString()}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${
                          cuenta.estado === 'Pagada' ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' :
                          montoPagado > 0 && cuenta.monto_pendiente > 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                          'bg-gradient-to-r from-red-400 to-red-500 text-white'
                        }`}>
                          {cuenta.estado === 'Pagada' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                          {cuenta.estado === 'Pagada' ? 'Pagada' : montoPagado > 0 ? 'Parcial' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => abrirModalDesglose(cuenta)}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                            title="Ver desglose de pagos"
                          >
                            <Eye size={14} />
                            Desglose
                          </button>
                          <button
                            onClick={() => generarPDFCuenta(cuenta)}
                            className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                            title="Generar PDF"
                          >
                            <FileText size={14} />
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="lg:hidden divide-y divide-gray-200">
            {cuentasFiltradas.map((cuenta) => {
              const dias = diasVencido(cuenta.fecha_emision);
              const diasVencimiento = cuenta.fecha_vencimiento ? diasVencido(cuenta.fecha_vencimiento) : null;
              const esVencida = diasVencimiento && diasVencimiento > 0 && cuenta.monto_pendiente > 0;
              const montoPagado = (parseFloat(cuenta.monto_total) || 0) - (parseFloat(cuenta.monto_pendiente) || 0);
              
              return (
                <div key={cuenta.id} className={`p-5 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-200 border-l-4 border-transparent hover:border-orange-500 ${esVencida ? 'bg-red-50' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1.5 text-xs font-bold rounded-full shadow-md bg-gradient-to-r from-blue-400 to-blue-500 text-white">
                          Factura
                        </span>
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${
                          cuenta.estado === 'Pagada' ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' :
                          montoPagado > 0 && cuenta.monto_pendiente > 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                          'bg-gradient-to-r from-red-400 to-red-500 text-white'
                        }`}>
                          {cuenta.estado === 'Pagada' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                          {cuenta.estado === 'Pagada' ? 'Pagada' : montoPagado > 0 ? 'Parcial' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="text-base font-bold text-gray-900 mb-1">{cuenta.referencia}</p>
                      <p className="text-sm text-gray-600">{cuenta.clientes?.nombre || '-'}</p>
                    </div>
                    {cuenta.fecha_vencimiento && (
                      <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm ${
                        esVencida ? 'bg-red-100 text-red-700 border border-red-200' :
                        diasVencimiento && diasVencimiento > -7 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        <Calendar size={12} />
                        {new Date(cuenta.fecha_vencimiento).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4 bg-gray-50 rounded-xl p-3">
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Fecha</p>
                      <p className="font-semibold text-gray-700">{formatearFechaLocal(cuenta.fecha_emision)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Total {cuenta.divisa === 'USD' && <span className="text-blue-600">💵</span>}</p>
                      <p className="font-bold text-gray-900">{formatCurrency(cuenta.monto_total, cuenta.divisa || 'DOP')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Pagado {cuenta.divisa === 'USD' && <span className="text-blue-600">💵</span>}</p>
                      <p className="font-semibold text-green-600">{formatCurrency(montoPagado, cuenta.divisa || 'DOP')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Pendiente {cuenta.divisa === 'USD' && <span className="text-blue-600">💵</span>}</p>
                      <p className="font-bold text-orange-600">{formatCurrency(cuenta.monto_pendiente, cuenta.divisa || 'DOP')}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => abrirModalDesglose(cuenta)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                      title="Ver desglose de pagos"
                    >
                      <Eye size={14} />
                      Ver Desglose
                    </button>
                    <button
                      onClick={() => generarPDFCuenta(cuenta)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                      title="Generar PDF"
                    >
                      <FileText size={14} />
                      PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas */}
        {clientes.some(c => {
          const porcentaje = ((c.balance_pendiente || 0) / (c.limite_credito || 1)) * 100;
          return porcentaje >= 90;
        }) && (
          <div className="mt-4 sm:mt-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5 w-4 h-4 sm:w-5 sm:h-5" />
              <div className="flex-1">
                <h3 className="text-sm sm:text-base font-semibold text-red-800 mb-2">⚠️ Clientes con Crédito Crítico</h3>
                <ul className="space-y-1">
                  {clientes
                    .filter(c => {
                      const porcentaje = ((c.balance_pendiente || 0) / (c.limite_credito || 1)) * 100;
                      return porcentaje >= 90;
                    })
                    .map(c => (
                      <li key={c.id} className="text-xs sm:text-sm text-red-700">
                        <strong>{c.nombre}</strong> ha usado el {(((c.balance_pendiente || 0) / (c.limite_credito || 1)) * 100).toFixed(0)}% de su crédito
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Modal Selección de Clientes */}
        {mostrarModalClientes && !clienteSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="bg-purple-600 text-white p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users size={24} />
                  Seleccionar Cliente
                </h2>
                <button onClick={() => setMostrarModalClientes(false)} className="hover:bg-purple-700 p-1 rounded">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Filtro de búsqueda en modal */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar cliente por nombre..."
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientesFiltrados.map((cliente) => {
                    const totales = calcularTotalesCliente(cliente.id);
                    const numCuentas = cuentas.filter(c => c.cliente_id === cliente.id).length;
                    
                    return (
                      <div
                        key={cliente.id}
                        onClick={() => verDetalleCliente(cliente)}
                        className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-gray-800">{cliente.nombre}</h3>
                            <p className="text-sm text-gray-500">{cliente.cedula || 'Sin cédula'}</p>
                          </div>
                          <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                            {numCuentas} cuenta{numCuentas !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {totales.tieneUSD ? (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Total DOP:</span>
                                <span className="font-medium text-gray-900">{formatCurrency(totales.total, 'DOP')}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Total USD:</span>
                                <span className="font-medium text-blue-600">💵 {formatCurrency(totales.totalUSD, 'USD')}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Pendiente DOP:</span>
                                <span className="font-bold text-orange-600">{formatCurrency(totales.pendiente, 'DOP')}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Pendiente USD:</span>
                                <span className="font-bold text-orange-600">💵 {formatCurrency(totales.pendienteUSD, 'USD')}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Total:</span>
                                <span className="font-medium text-gray-900">{formatCurrency(totales.total, 'DOP')}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Pagado:</span>
                                <span className="font-medium text-green-600">{formatCurrency(totales.pagado, 'DOP')}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Pendiente:</span>
                                <span className="font-bold text-orange-600">{formatCurrency(totales.pendiente, 'DOP')}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {clientesFiltrados.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No se encontraron clientes con ese nombre</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Detalle Cliente */}
        {mostrarModalClientes && clienteSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="bg-purple-600 text-white p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  Cuentas de {clienteSeleccionado.nombre}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => generarPDFCliente(clienteSeleccionado)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center gap-2"
                  >
                    <Download size={18} />
                    PDF
                  </button>
                  <button
                    onClick={() => setClienteSeleccionado(null)}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 rounded-lg text-sm"
                  >
                    Volver a Lista
                  </button>
                  <button
                    onClick={() => setMostrarModalClientes(false)}
                    className="hover:bg-purple-700 p-1 rounded"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Resumen */}
                {(() => {
                  const totalesCliente = calcularTotalesCliente(clienteSeleccionado.id);
                  const tieneUSD = cuentasCliente.some(c => c.divisa === 'USD');
                  
                  return (
                    <div className="mb-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="text-blue-600 w-5 h-5" />
                          <span className="text-sm font-semibold text-blue-900">Tasa de Cambio (USD → DOP):</span>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Input
                            type="number"
                            value={tasaCambio}
                            onChange={(e) => setTasaCambio(parseFloat(e.target.value) || 0)}
                            className="w-24 h-9 text-sm bg-white border-blue-200 focus:border-blue-500"
                          />
                          <Button 
                            size="sm" 
                            onClick={actualizarTasaGlobal}
                            className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 font-medium shadow-sm transition-all hover:shadow-md"
                          >
                            Actualizar Global
                          </Button>
                        </div>
                      </div>

                      {tieneUSD ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="md:col-span-2">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">💵 Totales en Pesos (DOP)</h3>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-600 font-medium">Total DOP</p>
                            <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalesCliente.total, 'DOP')}</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-green-600 font-medium">Pagado DOP</p>
                            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalesCliente.pagado, 'DOP')}</p>
                          </div>
                          <div className="bg-orange-50 p-4 rounded-lg">
                            <p className="text-sm text-orange-600 font-medium">Pendiente DOP</p>
                            <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalesCliente.pendiente, 'DOP')}</p>
                          </div>
                          <div className="md:col-span-2 mt-2">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">💵 Totales en Dólares (USD)</h3>
                          </div>
                          <div className="bg-blue-100 p-4 rounded-lg border-2 border-blue-300">
                            <p className="text-sm text-blue-700 font-medium">Total USD</p>
                            <p className="text-2xl font-bold text-blue-800">💵 {formatCurrency(totalesCliente.totalUSD, 'USD')}</p>
                          </div>
                          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-300">
                            <p className="text-sm text-green-700 font-medium">Pagado USD</p>
                            <p className="text-2xl font-bold text-green-800">💵 {formatCurrency(totalesCliente.pagadoUSD, 'USD')}</p>
                          </div>
                          <div className="bg-orange-100 p-4 rounded-lg border-2 border-orange-300">
                            <p className="text-sm text-orange-700 font-medium">Pendiente USD</p>
                            <p className="text-2xl font-bold text-orange-800">💵 {formatCurrency(totalesCliente.pendienteUSD, 'USD')}</p>
                          </div>
                          
                          <div className="md:col-span-2 mt-4 bg-gradient-to-r from-gray-800 to-gray-900 p-5 rounded-xl text-white shadow-lg">
                            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                              <span className="bg-white/20 p-1 rounded text-xs">CALCULADO</span>
                              Total Global Estimado (DOP + USD convertido)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Total General</p>
                                <p className="text-xl font-bold text-white">
                                  {formatCurrency(totalesCliente.total + (totalesCliente.totalUSD * tasaCambio), 'DOP')}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Pagado General</p>
                                <p className="text-xl font-bold text-green-400">
                                  {formatCurrency(totalesCliente.pagado + (totalesCliente.pagadoUSD * tasaCambio), 'DOP')}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Pendiente General</p>
                                <p className="text-xl font-bold text-orange-400">
                                  {formatCurrency(totalesCliente.pendiente + (totalesCliente.pendienteUSD * tasaCambio), 'DOP')}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-right">Calculado a una tasa de {formatCurrency(tasaCambio, 'DOP')}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-600 font-medium">Total</p>
                            <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalesCliente.total, 'DOP')}</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-green-600 font-medium">Pagado</p>
                            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalesCliente.pagado, 'DOP')}</p>
                          </div>
                          <div className="bg-orange-50 p-4 rounded-lg">
                            <p className="text-sm text-orange-600 font-medium">Pendiente</p>
                            <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalesCliente.pendiente, 'DOP')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Botón Registrar Pago */}
                {cuentasCliente.some(c => c.monto_pendiente > 0) && (
                  <div className="mb-4">
                    <button
                      onClick={() => abrirModalPago(cuentasCliente.find(c => c.monto_pendiente > 0))}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <CreditCard size={20} />
                      Registrar Pago
                    </button>
                  </div>
                )}

                {/* Tabla de Cuentas */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pagado</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {cuentasCliente.map((cuenta) => {
                        const montoPagado = (parseFloat(cuenta.monto_total) || 0) - (parseFloat(cuenta.monto_pendiente) || 0);
                        
                        return (
                          <tr key={cuenta.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTipoBadge(cuenta.tipo)}`}>
                                {cuenta.tipo}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{cuenta.referencia}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {formatearFechaLocal(cuenta.fecha_emision)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium">
                              {formatCurrency(cuenta.monto_total, cuenta.divisa || 'DOP')}
                              {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-green-600">
                              {formatCurrency(montoPagado, cuenta.divisa || 'DOP')}
                              {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-orange-600 font-bold">
                              {formatCurrency(cuenta.monto_pendiente, cuenta.divisa || 'DOP')}
                              {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                cuenta.estado === 'Pagada' ? 'bg-green-100 text-green-800' :
                                montoPagado > 0 && cuenta.monto_pendiente > 0 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {cuenta.estado === 'Pagada' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                {cuenta.estado === 'Pagada' ? 'Pagada' : montoPagado > 0 ? 'Parcial' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {cuenta.monto_pendiente > 0 && (
                                  <button
                                    onClick={() => abrirModalPago(cuenta)}
                                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs flex items-center gap-1"
                                  >
                                    <CreditCard size={14} />
                                    Pagar
                                  </button>
                                )}
                                <button
                                  onClick={() => eliminarCuenta(cuenta)}
                                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs flex items-center gap-1"
                                  title="Eliminar factura"
                                >
                                  <Trash2 size={14} />
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Desglose General de Cuentas */}
        {mostrarModalDesgloseGeneral && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
              <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Receipt size={24} />
                  Desglose General de Cuentas por Cobrar
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={generarPDFDesgloseGeneral}
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 rounded-lg text-sm flex items-center gap-2"
                    disabled={loading}
                  >
                    <Download size={18} />
                    Descargar PDF
                  </button>
                  <button onClick={() => setMostrarModalDesgloseGeneral(false)} className="hover:bg-indigo-700 p-1 rounded">
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Resumen */}
                <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Cuentas:</p>
                      <p className="text-xl font-bold text-gray-900">{desgloseGeneral.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Pagos:</p>
                      <p className="text-xl font-bold text-gray-900">
                        {Object.values(pagosPorCuenta).reduce((sum, pagos) => sum + pagos.length, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total por Cobrar (DOP):</p>
                      <p className="text-xl font-bold text-orange-600">
                        {formatCurrency(
                          desgloseGeneral
                            .filter(c => !c.divisa || c.divisa === 'DOP')
                            .reduce((sum, c) => sum + (parseFloat(c.monto_total) || 0), 0),
                          'DOP'
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pendiente (DOP):</p>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(
                          desgloseGeneral
                            .filter(c => !c.divisa || c.divisa === 'DOP')
                            .reduce((sum, c) => sum + (parseFloat(c.monto_pendiente) || 0), 0),
                          'DOP'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabla de cuentas */}
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Cargando cuentas...</p>
                  </div>
                ) : desgloseGeneral.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pagado</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pagos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {desgloseGeneral.map((cuenta) => {
                          const montoPagado = (parseFloat(cuenta.monto_total) || 0) - (parseFloat(cuenta.monto_pendiente) || 0);
                          const pagosCuenta = pagosPorCuenta[cuenta.id] || [];
                          
                          return (
                            <tr key={cuenta.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTipoBadge(cuenta.tipo)}`}>
                                  {cuenta.tipo}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{cuenta.referencia}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {cuenta.clientes?.nombre || cuenta.cliente || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {formatearFechaLocal(cuenta.fecha_emision)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium">
                                {formatCurrency(cuenta.monto_total, cuenta.divisa || 'DOP')}
                                {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-green-600">
                                {formatCurrency(montoPagado, cuenta.divisa || 'DOP')}
                                {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-orange-600 font-bold">
                                {formatCurrency(cuenta.monto_pendiente, cuenta.divisa || 'DOP')}
                                {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  cuenta.estado === 'Pagada' ? 'bg-green-100 text-green-800' :
                                  montoPagado > 0 && cuenta.monto_pendiente > 0 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {cuenta.estado === 'Pagada' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                  {cuenta.estado === 'Pagada' ? 'Pagada' : montoPagado > 0 ? 'Parcial' : 'Pendiente'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-sm font-medium text-gray-700">{pagosCuenta.length}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan="4" className="px-4 py-3 text-sm font-bold text-gray-900">Totales:</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                            {formatCurrency(
                              desgloseGeneral.reduce((sum, c) => sum + (parseFloat(c.monto_total) || 0), 0),
                              'DOP'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                            {formatCurrency(
                              desgloseGeneral.reduce((sum, c) => {
                                const pagado = (parseFloat(c.monto_total) || 0) - (parseFloat(c.monto_pendiente) || 0);
                                return sum + pagado;
                              }, 0),
                              'DOP'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-orange-600">
                            {formatCurrency(
                              desgloseGeneral.reduce((sum, c) => sum + (parseFloat(c.monto_pendiente) || 0), 0),
                              'DOP'
                            )}
                          </td>
                          <td colSpan="2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No hay cuentas para mostrar con los filtros aplicados.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Desglose de Pagos */}
        {mostrarModalDesglose && cuentaParaDesglose && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Receipt size={24} />
                  Desglose de Pagos - {cuentaParaDesglose.referencia}
                </h2>
                <button onClick={() => setMostrarModalDesglose(false)} className="hover:bg-blue-700 p-1 rounded">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Información de la cuenta */}
                <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Cliente:</p>
                      <p className="font-medium text-gray-900">{cuentaParaDesglose.clientes?.nombre || cuentaParaDesglose.cliente || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tipo:</p>
                      <p className="font-medium text-gray-900">{cuentaParaDesglose.tipo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fecha Emisión:</p>
                      <p className="font-medium text-gray-900">{formatearFechaLocal(cuentaParaDesglose.fecha_emision)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estado:</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        cuentaParaDesglose.estado === 'Pagada' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {cuentaParaDesglose.estado === 'Pagada' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {cuentaParaDesglose.estado}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Monto Total:</p>
                      <p className="font-bold text-gray-900">{formatCurrency(cuentaParaDesglose.monto_total, cuentaParaDesglose.divisa || 'DOP')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Monto Pendiente:</p>
                      <p className="font-bold text-orange-600">{formatCurrency(cuentaParaDesglose.monto_pendiente, cuentaParaDesglose.divisa || 'DOP')}</p>
                    </div>
                  </div>
                </div>

                {/* Tabla de pagos */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Historial de Pagos</h3>
                  {pagosDesglose.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Método de Pago</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {pagosDesglose.map((pago, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {formatearFechaLocal(pago.fecha_pago)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                                {formatCurrency(pago.monto, cuentaParaDesglose.divisa || 'DOP')}
                              </td>
                              <td className="px-4 py-3 text-sm text-center text-gray-700">
                                {pago.metodo_pago || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => eliminarPago(pago)}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                                  title="Eliminar pago"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                          <tr>
                            <td className="px-4 py-3 text-sm font-bold text-gray-900">Total Pagado:</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                              {formatCurrency(
                                pagosDesglose.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0),
                                cuentaParaDesglose.divisa || 'DOP'
                              )}
                            </td>
                            <td colSpan="2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No se han registrado pagos para esta cuenta.</p>
                    </div>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => generarPDFCuenta(cuentaParaDesglose)}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2"
                  >
                    <FileText size={18} />
                    Generar PDF
                  </button>
                  <button
                    onClick={() => setMostrarModalDesglose(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Registrar Pago */}
        {mostrarModalPago && cuentaParaPago && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="bg-green-600 text-white p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <CreditCard size={24} />
                  Registrar Pago
                </h2>
                <button onClick={() => setMostrarModalPago(false)} className="hover:bg-green-700 p-1 rounded">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Referencia: <span className="font-medium text-gray-900">{cuentaParaPago.referencia}</span></p>
                  <p className="text-sm text-gray-600">Monto Pendiente: <span className="font-bold text-orange-600">{formatCurrency(cuentaParaPago.monto_pendiente, cuentaParaPago.divisa || 'DOP')}</span></p>
                  <p className="text-xs text-gray-500 mt-1">Moneda: <span className="font-medium">{cuentaParaPago.divisa === 'USD' ? '🇺🇸 Dólares (USD)' : '🇩🇴 Pesos (DOP)'}</span></p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto a Pagar</label>
                    <input
                      type="number"
                      value={montoPago}
                      onChange={(e) => setMontoPago(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Tarjeta">Tarjeta</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setMostrarModalPago(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={registrarPago}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Registrar Pago
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
