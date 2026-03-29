import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Search, AlertCircle, CheckCircle, Calendar, FileText, Users, X, CreditCard, Download, TrendingUp, Eye } from 'lucide-react';
import { generarPDFCuentasPorCobrar } from '../lib/pdfGeneratorExtras';
import { formatearFechaLocal } from '../lib/dateUtils';
import { formatCurrency } from '../lib/formatters';

export default function CuentasPorCobrar() {
  const [cuentas, setCuentas] = useState([]);
  const [clientes, setClientes] = useState([]);
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
  const [mostrarIntereses, setMostrarIntereses] = useState(true);
  const [mostrarModalDesglose, setMostrarModalDesglose] = useState(false);
  const [tipoDesglose, setTipoDesglose] = useState(null); // 'cobrado' o 'pendiente'

  // Función para normalizar el tipo de cuenta
  const normalizarTipo = (tipo) => {
    // Normalizar tipos de factura a "Factura"
    if (tipo === 'factura_venta' || tipo === 'Factura' || tipo === 'factura') {
      return 'Factura';
    }
    return tipo;
  };

  // Función para eliminar duplicados en memoria
  const eliminarDuplicados = (cuentas) => {
    const vistas = new Map();
    const cuentasUnicas = [];

    for (const cuenta of cuentas) {
      // Normalizar tipo y crear clave única basada en referencia (sin importar el tipo si es factura)
      const tipoNormalizado = normalizarTipo(cuenta.tipo);
      // Para facturas, usar solo la referencia como clave única
      const clave = tipoNormalizado === 'Factura' 
        ? `Factura-${cuenta.referencia}`
        : `${tipoNormalizado}-${cuenta.referencia}`;
      
      if (!vistas.has(clave)) {
        vistas.set(clave, true);
        // Normalizar el tipo antes de agregar
        cuentasUnicas.push({ ...cuenta, tipo: tipoNormalizado });
      } else {
        // Si es duplicado, mantener el más reciente (mayor ID o fecha más reciente)
        const existente = cuentasUnicas.find(c => {
          const tipoExistente = normalizarTipo(c.tipo);
          const claveExistente = tipoExistente === 'Factura' 
            ? `Factura-${c.referencia}`
            : `${tipoExistente}-${c.referencia}`;
          return claveExistente === clave;
        });
        
        if (existente) {
          const fechaExistente = new Date(existente.fecha_emision);
          const fechaNueva = new Date(cuenta.fecha_emision);
          
          // Si la nueva cuenta es más reciente o tiene mayor ID, reemplazar
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
    
    // Agrupar por referencia (normalizando tipos de factura)
    for (const cuenta of cuentas) {
      const tipoNormalizado = normalizarTipo(cuenta.tipo);
      // Para facturas, agrupar solo por referencia
      const clave = tipoNormalizado === 'Factura' 
        ? `Factura-${cuenta.referencia}`
        : `${tipoNormalizado}-${cuenta.referencia}`;
      
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

        // Mantener el primero (más reciente) y normalizar su tipo a "Factura" si es factura
        const mantener = grupo[0];
        const tipoMantener = normalizarTipo(mantener.tipo);
        
        // Actualizar el tipo del registro mantenido si es necesario
        if (mantener.tipo !== tipoMantener) {
          await supabase
            .from('cuentas_por_cobrar')
            .update({ tipo: tipoMantener })
            .eq('id', mantener.id);
        }
        
        const eliminar = grupo.slice(1);

        for (const duplicado of eliminar) {
          await supabase
            .from('cuentas_por_cobrar')
            .delete()
            .eq('id', duplicado.id);
        }

        console.log(`Eliminados ${eliminar.length} duplicados de ${clave}, mantenido ID: ${mantener.id} con tipo: ${tipoMantener}`);
      }
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar cuentas por cobrar (incluye financiamientos y facturas)
      // Asegurar que se cargue la divisa correctamente
      const { data: cuentasData, error: errorCuentas } = await supabase
        .from('cuentas_por_cobrar')
        .select('*, clientes(nombre, cedula, telefono, limite_credito, balance_pendiente)')
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
      // Si una cuenta no tiene divisa pero es una factura, intentar obtenerla de la factura original
      const cuentasConDivisa = await Promise.all(cuentasSinDuplicados.map(async (cuenta) => {
        const tipoNormalizado = normalizarTipo(cuenta.tipo);
        let cuentaActualizada = { ...cuenta, tipo: tipoNormalizado };
        
        // Si el tipo cambió, actualizar en BD
        if (cuenta.tipo !== tipoNormalizado) {
          await supabase
            .from('cuentas_por_cobrar')
            .update({ tipo: tipoNormalizado })
            .eq('id', cuenta.id);
        }
        
        if (!cuenta.divisa && tipoNormalizado === 'Factura') {
          // Intentar obtener la divisa de la factura original
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

    const cumpleTipo =
      filtroTipo === 'todos' ||
      c.tipo === filtroTipo;

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
      'Financiamiento': 'bg-green-100 text-green-800',
      'Factura': 'bg-blue-100 text-blue-800',
      'Otro': 'bg-gray-100 text-gray-800'
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  };

  const calcularTotalesCliente = (clienteId, divisa = null) => {
    // Solo incluir facturas de venta a crédito
    const cuentasDelCliente = cuentas.filter(c => {
      if (c.tipo !== 'Factura') return false;
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
      .order('fecha_emision', { ascending: false });
    setCuentasCliente(data || []);
  };

  const abrirModalPago = (cuenta) => {
    setCuentaParaPago(cuenta);
    setMontoPago(cuenta.monto_pendiente.toString());
    setMostrarModalPago(true);
  };

  const calcularInteresesTodosClientes = async () => {
    if (!confirm('¿Deseas calcular los intereses diarios de todos los financiamientos activos?\n\nEsto actualizará las cuentas por cobrar con los intereses acumulados hasta el día de hoy.')) {
      return;
    }

    setLoading(true);

    try {
      // Cargar todos los financiamientos activos
      const { data: financiamientos, error: errorFinanciamientos } = await supabase
        .from('financiamientos')
        .select('*')
        .in('estado', ['Activo', 'Atrasado'])
        .gt('balance_pendiente', 0);

      if (errorFinanciamientos) {
        throw errorFinanciamientos;
      }

      if (!financiamientos || financiamientos.length === 0) {
        alert('No hay financiamientos activos para calcular intereses');
        setLoading(false);
        return;
      }

      const hoy = new Date();
      let cuentasGeneradas = 0;
      let interesesTotales = 0;

      // Calcular intereses para cada financiamiento
      for (const financiamiento of financiamientos) {
        const fechaPrestamo = new Date(financiamiento.fecha_prestamo);
        
        // Calcular días transcurridos desde el préstamo hasta hoy
        const diasTranscurridos = Math.floor((hoy - fechaPrestamo) / (1000 * 60 * 60 * 24));
        
        if (diasTranscurridos <= 0) continue;

        // Calcular interés diario
        const montoPrestado = parseFloat(financiamiento.monto_prestado) || 0;
        const tasaMensual = parseFloat(financiamiento.tasa_interes) || 0;
        const interesMensual = montoPrestado * (tasaMensual / 100);
        const interesDiario = interesMensual / 30;
        
        // Calcular interés acumulado al día de hoy
        const interesAcumuladoActual = interesDiario * diasTranscurridos;
        const totalActualizado = montoPrestado + interesAcumuladoActual;

        // Solo generar cuenta si hay interés acumulado
        if (interesAcumuladoActual > 0) {
          // Verificar si ya existe una cuenta actualizada hoy
          const fechaHoy = new Date().toISOString().split('T')[0];
          const { data: cuentaExistente } = await supabase
            .from('cuentas_por_cobrar')
            .select('id')
            .eq('referencia', `FIN-${financiamiento.id}-ACT-${fechaHoy}`)
            .single();

          if (!cuentaExistente) {
            // Calcular monto pendiente: balance pendiente original + interés acumulado adicional
            const balancePendienteOriginal = parseFloat(financiamiento.balance_pendiente) || 0;
            const montoPendiente = balancePendienteOriginal + interesAcumuladoActual;

            // Crear cuenta por cobrar actualizada solo con el interés adicional acumulado
            const { error: errorCuenta } = await supabase
              .from('cuentas_por_cobrar')
              .insert([{
                cliente_id: financiamiento.cliente_id,
                cliente: financiamiento.nombre_cliente,
                cedula: financiamiento.cedula_cliente || '',
                tipo: 'financiamiento_actualizado',
                referencia: `FIN-${financiamiento.id}-ACT-${fechaHoy}`,
                fecha_emision: fechaHoy,
                monto_total: interesAcumuladoActual,
                monto_pendiente: interesAcumuladoActual,
                estado: 'Pendiente',
                divisa: 'DOP',
                notas: `Interés diario: RD$ ${interesDiario.toFixed(2)}. Días transcurridos: ${diasTranscurridos} días. Interés acumulado desde fecha de préstamo hasta hoy: RD$ ${interesAcumuladoActual.toFixed(2)}.`
              }]);

            if (!errorCuenta) {
              cuentasGeneradas++;
              interesesTotales += interesAcumuladoActual;
            }
          }
        }
      }

      // Recargar datos
      await cargarDatos();

      alert(`✅ Cálculo de intereses completado:\n\n- Financiamientos procesados: ${financiamientos.length}\n- Cuentas generadas: ${cuentasGeneradas}\n- Intereses totales calculados: RD$ ${interesesTotales.toFixed(2)}`);
    } catch (error) {
      console.error('Error al calcular intereses:', error);
      alert('Error al calcular intereses: ' + error.message);
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

  const obtenerCuentasDesglose = (tipo) => {
    if (tipo === 'total') {
      // Solo facturas de venta a crédito (Total por Cobrar)
      return cuentas.filter(c => {
        return c.tipo === 'Factura' && (!c.divisa || c.divisa === 'DOP');
      });
    } else if (tipo === 'cobrado') {
      // Solo facturas con monto pagado (cobrado)
      return cuentas.filter(c => {
        if (c.tipo !== 'Factura') return false;
        const montoPagado = (parseFloat(c.monto_total) || 0) - (parseFloat(c.monto_pendiente) || 0);
        return montoPagado > 0 && (!c.divisa || c.divisa === 'DOP');
      });
    } else if (tipo === 'pendiente') {
      // Solo facturas con monto pendiente
      return cuentas.filter(c => {
        if (c.tipo !== 'Factura') return false;
        const montoPendiente = parseFloat(c.monto_pendiente) || 0;
        return montoPendiente > 0 && (!c.divisa || c.divisa === 'DOP');
      });
    }
    return [];
  };

  const verDesglose = (tipo) => {
    setTipoDesglose(tipo);
    setMostrarModalDesglose(true);
  };

  const generarPDFDesglose = async (tipo) => {
    if (typeof window === 'undefined') {
      console.warn('PDF generation is only supported in browser environment.');
      return;
    }

    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    const cuentasDesglose = obtenerCuentasDesglose(tipo);
    const titulo = tipo === 'total' ? 'DESGLOSE DE TOTAL POR COBRAR' : 
                   tipo === 'cobrado' ? 'DESGLOSE DE TOTAL COBRADO' : 
                   'DESGLOSE DE TOTAL PENDIENTE';
    const total = tipo === 'total' ? totales.total : 
                  tipo === 'cobrado' ? totales.cobrado : 
                  totales.pendiente;

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
    doc.text(titulo, 105, 45, { align: 'center' });

    // Fecha de generación
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-DO')}`, 14, 55);

    // Total
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(34, 197, 94);
    doc.rect(14, 60, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`Total: ${formatCurrency(total)}`, 105, 65, { align: 'center' });

    // Tabla de cuentas
    const tableData = cuentasDesglose.map(c => {
      const montoPagado = (parseFloat(c.monto_total) || 0) - (parseFloat(c.monto_pendiente) || 0);
      const montoPendiente = parseFloat(c.monto_pendiente) || 0;
      
      if (tipo === 'total') {
        return [
          c.tipo,
          c.referencia,
          c.clientes?.nombre || '-',
          formatearFechaLocal(c.fecha_emision),
          formatCurrency(c.monto_total),
          formatCurrency(montoPagado),
          formatCurrency(montoPendiente),
          c.estado
        ];
      } else if (tipo === 'cobrado') {
        return [
          c.tipo,
          c.referencia,
          c.clientes?.nombre || '-',
          formatearFechaLocal(c.fecha_emision),
          formatCurrency(c.monto_total),
          formatCurrency(montoPagado),
          c.estado
        ];
      } else {
        return [
          c.tipo,
          c.referencia,
          c.clientes?.nombre || '-',
          formatearFechaLocal(c.fecha_emision),
          formatCurrency(c.monto_total),
          formatCurrency(montoPendiente),
          c.estado
        ];
      }
    });

    const headers = tipo === 'total' 
      ? [['Tipo', 'Referencia', 'Cliente', 'Fecha', 'Total', 'Cobrado', 'Pendiente', 'Estado']]
      : tipo === 'cobrado' 
      ? [['Tipo', 'Referencia', 'Cliente', 'Fecha', 'Total', 'Cobrado', 'Estado']]
      : [['Tipo', 'Referencia', 'Cliente', 'Fecha', 'Total', 'Pendiente', 'Estado']];

    doc.setTextColor(0, 0, 0);
    doc.autoTable({
      startY: 75,
      head: headers,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: tipo === 'total' ? {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
        7: { halign: 'center' }
      } : {
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
        6: { halign: 'center' }
      }
    });

    const nombreArchivo = tipo === 'total'
      ? `desglose_total_por_cobrar_${new Date().toISOString().split('T')[0]}.pdf`
      : tipo === 'cobrado' 
      ? `desglose_total_cobrado_${new Date().toISOString().split('T')[0]}.pdf`
      : `desglose_total_pendiente_${new Date().toISOString().split('T')[0]}.pdf`;
    
    doc.save(nombreArchivo);
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

    doc.save(`cuentas_por_cobrar_${cliente.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
                <DollarSign className="text-orange-600 w-6 h-6 sm:w-8 sm:h-8" />
                Cuentas por Cobrar
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Gestión de cobros a clientes (Financiamientos y Facturas)</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setMostrarModalClientes(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
              >
                <Users size={18} className="sm:w-5 sm:h-5" />
                Seleccionar Clientes
              </button>
              <button
                onClick={async () => {
                  if (confirm('¿Desea limpiar facturas duplicadas y normalizar tipos en Cuentas por Cobrar?\n\nEsto eliminará duplicados y convertirá todos los tipos "factura_venta" a "Factura".')) {
                    setLoading(true);
                    try {
                      const { data: todasLasCuentas } = await supabase
                        .from('cuentas_por_cobrar')
                        .select('*')
                        .order('fecha_emision', { ascending: false });
                      
                      // Primero normalizar todos los tipos de factura a "Factura"
                      const cuentasFactura = todasLasCuentas?.filter(c => 
                        c.tipo === 'factura_venta' || c.tipo === 'factura'
                      ) || [];
                      
                      for (const cuenta of cuentasFactura) {
                        await supabase
                          .from('cuentas_por_cobrar')
                          .update({ tipo: 'Factura' })
                          .eq('id', cuenta.id);
                      }
                      
                      // Luego limpiar duplicados
                      await limpiarDuplicadosEnBD(todasLasCuentas || []);
                      
                      alert(`Duplicados limpiados exitosamente.\n${cuentasFactura.length} tipos normalizados a "Factura".`);
                      cargarDatos();
                    } catch (error) {
                      console.error('Error:', error);
                      alert('Error al limpiar duplicados: ' + error.message);
                    }
                    setLoading(false);
                  }
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
                title="Limpiar facturas duplicadas y normalizar tipos"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
                Limpiar Duplicados
              </button>
              <button
                onClick={calcularInteresesTodosClientes}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
                disabled={loading}
              >
                <TrendingUp size={18} className="sm:w-5 sm:h-5" />
                {loading ? 'Calculando...' : 'Calcular Intereses'}
              </button>
              <button
                onClick={() => generarPDFCuentasPorCobrar(cuentasFiltradas, totales)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm sm:text-base"
              >
                <FileText size={18} className="sm:w-5 sm:h-5" />
                Generar PDF
              </button>
            </div>
          </div>

          {/* Resumen General */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-blue-600 font-medium">Total por Cobrar</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-700 mb-3">{formatCurrency(totales.total)}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => verDesglose('total')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                  title="Ver desglose de total por cobrar"
                >
                  <Eye size={16} />
                  <span>Ver Desglose</span>
                </button>
                <button
                  onClick={() => generarPDFDesglose('total')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-800 transition-colors shadow-sm"
                  title="Descargar PDF del desglose"
                >
                  <Download size={16} />
                  <span>PDF</span>
                </button>
              </div>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-green-600 font-medium">Total Cobrado</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700 mb-3">{formatCurrency(totales.cobrado)}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => verDesglose('cobrado')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
                  title="Ver desglose de total cobrado"
                >
                  <Eye size={16} />
                  <span>Ver Desglose</span>
                </button>
                <button
                  onClick={() => generarPDFDesglose('cobrado')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-700 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-green-800 transition-colors shadow-sm"
                  title="Descargar PDF del desglose"
                >
                  <Download size={16} />
                  <span>PDF</span>
                </button>
              </div>
            </div>
            <div className="bg-orange-50 p-3 sm:p-4 rounded-lg sm:col-span-2 lg:col-span-1">
              <p className="text-xs sm:text-sm text-orange-600 font-medium">Pendiente</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-700 mb-3">{formatCurrency(totales.pendiente)}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => verDesglose('pendiente')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm"
                  title="Ver desglose de total pendiente"
                >
                  <Eye size={16} />
                  <span>Ver Desglose</span>
                </button>
                <button
                  onClick={() => generarPDFDesglose('pendiente')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-700 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-orange-800 transition-colors shadow-sm"
                  title="Descargar PDF del desglose"
                >
                  <Download size={16} />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Resumen de Facturas en USD */}
          {totalesUSD.total > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-4 bg-blue-100 rounded-lg border-2 border-blue-300">
              <div className="bg-white p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-600 font-medium">💵 Total en USD</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700">{formatCurrency(totalesUSD.total, 'USD')}</p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-green-600 font-medium">💵 Cobrado en USD</p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">{formatCurrency(totalesUSD.cobrado, 'USD')}</p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-lg sm:col-span-2 lg:col-span-1">
                <p className="text-xs sm:text-sm text-orange-600 font-medium">💵 Pendiente en USD</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-700">{formatCurrency(totalesUSD.pendiente, 'USD')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Resumen por Cliente */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Resumen por Cliente</h2>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cédula</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Límite Crédito</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance Pendiente</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Crédito Disponible</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clientes.filter(c => c.balance_pendiente > 0).map((cliente) => {
                  const creditoDisponible = (cliente.limite_credito || 0) - (cliente.balance_pendiente || 0);
                  const porcentajeUsado = ((cliente.balance_pendiente || 0) / (cliente.limite_credito || 1)) * 100;
                  
                  return (
                    <tr key={cliente.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{cliente.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{cliente.cedula || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right">{formatCurrency(cliente.limite_credito || 0)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">
                        {formatCurrency(cliente.balance_pendiente || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">
                        {formatCurrency(creditoDisponible)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          porcentajeUsado >= 90 ? 'bg-red-100 text-red-800' :
                          porcentajeUsado >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
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
          <div className="md:hidden space-y-3">
            {clientes.filter(c => c.balance_pendiente > 0).map((cliente) => {
              const creditoDisponible = (cliente.limite_credito || 0) - (cliente.balance_pendiente || 0);
              const porcentajeUsado = ((cliente.balance_pendiente || 0) / (cliente.limite_credito || 1)) * 100;
              
              return (
                <div key={cliente.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cliente.nombre}</p>
                      <p className="text-xs text-gray-500 mt-1">{cliente.cedula || 'Sin cédula'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      porcentajeUsado >= 90 ? 'bg-red-100 text-red-800' :
                      porcentajeUsado >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {porcentajeUsado >= 90 ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                      {porcentajeUsado.toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Límite Crédito</p>
                      <p className="font-medium text-gray-900">{formatCurrency(cliente.limite_credito || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Balance Pendiente</p>
                      <p className="font-medium text-orange-600">{formatCurrency(cliente.balance_pendiente || 0)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500">Crédito Disponible</p>
                      <p className="font-medium text-green-600">{formatCurrency(creditoDisponible)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por referencia o cliente..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="todos">Todos los tipos</option>\n                <option value="Financiamiento">Financiamientos</option>
                <option value="Factura">Facturas</option>
              </select>
            </div>
            <div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="todas">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="parcial">Parciales</option>
                <option value="pagado">Pagados</option>
              </select>
            </div>
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
              <label className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={mostrarIntereses}
                  onChange={(e) => setMostrarIntereses(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span>Con Intereses</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tabla de Cuentas por Cobrar */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pagado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cuentasFiltradas.map((cuenta) => {
                  const dias = diasVencido(cuenta.fecha_emision);
                  const diasVencimiento = cuenta.fecha_vencimiento ? diasVencido(cuenta.fecha_vencimiento) : null;
                  const esVencida = diasVencimiento && diasVencimiento > 0 && cuenta.monto_pendiente > 0;
                  const montoPagado = (parseFloat(cuenta.monto_total) || 0) - (parseFloat(cuenta.monto_pendiente) || 0);
                  
                  return (
                    <tr key={cuenta.id} className={`hover:bg-gray-50 ${esVencida ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTipoBadge(cuenta.tipo)}`}>
                          {cuenta.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{cuenta.referencia}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatearFechaLocal(cuenta.fecha_emision)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{cuenta.clientes?.nombre || '-'}</td>
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
                        {cuenta.fecha_vencimiento ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            esVencida ? 'bg-red-100 text-red-800' :
                            diasVencimiento && diasVencimiento > -7 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            <Calendar size={14} />
                            {new Date(cuenta.fecha_vencimiento).toLocaleDateString()}
                          </span>
                        ) : '-'}
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
                <div key={cuenta.id} className={`p-4 hover:bg-gray-50 ${esVencida ? 'bg-red-50' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTipoBadge(cuenta.tipo)}`}>
                          {cuenta.tipo}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          cuenta.estado === 'Pagada' ? 'bg-green-100 text-green-800' :
                          montoPagado > 0 && cuenta.monto_pendiente > 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {cuenta.estado === 'Pagada' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                          {cuenta.estado === 'Pagada' ? 'Pagada' : montoPagado > 0 ? 'Parcial' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{cuenta.referencia}</p>
                      <p className="text-xs text-gray-500 mt-1">{cuenta.clientes?.nombre || '-'}</p>
                    </div>
                    {cuenta.fecha_vencimiento && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        esVencida ? 'bg-red-100 text-red-800' :
                        diasVencimiento && diasVencimiento > -7 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        <Calendar size={12} />
                        {new Date(cuenta.fecha_vencimiento).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Fecha</p>
                      <p className="font-medium text-gray-700">{formatearFechaLocal(cuenta.fecha_emision)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total {cuenta.divisa === 'USD' && <span className="text-blue-600">💵</span>}</p>
                      <p className="font-medium text-gray-900">{formatCurrency(cuenta.monto_total, cuenta.divisa || 'DOP')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pagado {cuenta.divisa === 'USD' && <span className="text-blue-600">💵</span>}</p>
                      <p className="font-medium text-green-600">{formatCurrency(montoPagado, cuenta.divisa || 'DOP')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pendiente {cuenta.divisa === 'USD' && <span className="text-blue-600">💵</span>}</p>
                      <p className="font-bold text-orange-600">{formatCurrency(cuenta.monto_pendiente, cuenta.divisa || 'DOP')}</p>
                    </div>
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
                              {cuenta.monto_pendiente > 0 && (
                                <button
                                  onClick={() => abrirModalPago(cuenta)}
                                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                                >
                                  Pagar
                                </button>
                              )}
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

        {/* Modal Desglose */}
        {mostrarModalDesglose && tipoDesglose && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className={`${
                tipoDesglose === 'total' ? 'bg-blue-600' : 
                tipoDesglose === 'cobrado' ? 'bg-green-600' : 
                'bg-orange-600'
              } text-white p-4 flex justify-between items-center`}>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Eye size={24} />
                  Desglose de {
                    tipoDesglose === 'total' ? 'Total por Cobrar' : 
                    tipoDesglose === 'cobrado' ? 'Total Cobrado' : 
                    'Total Pendiente'
                  }
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => generarPDFDesglose(tipoDesglose)}
                    className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <Download size={18} />
                    Descargar PDF
                  </button>
                  <button onClick={() => setMostrarModalDesglose(false)} className="hover:bg-opacity-80 p-1 rounded">
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Resumen */}
                <div className={`${
                  tipoDesglose === 'total' ? 'bg-blue-50' : 
                  tipoDesglose === 'cobrado' ? 'bg-green-50' : 
                  'bg-orange-50'
                } p-4 rounded-lg mb-4`}>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Total {
                      tipoDesglose === 'total' ? 'por Cobrar' : 
                      tipoDesglose === 'cobrado' ? 'Cobrado' : 
                      'Pendiente'
                    }:
                  </p>
                  <p className={`text-2xl font-bold ${
                    tipoDesglose === 'total' ? 'text-blue-700' : 
                    tipoDesglose === 'cobrado' ? 'text-green-700' : 
                    'text-orange-700'
                  }`}>
                    {formatCurrency(
                      tipoDesglose === 'total' ? totales.total : 
                      tipoDesglose === 'cobrado' ? totales.cobrado : 
                      totales.pendiente
                    )}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {obtenerCuentasDesglose(tipoDesglose).length} cuenta(s) encontrada(s)
                  </p>
                </div>

                {/* Tabla de Cuentas */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        {tipoDesglose === 'total' && (
                          <>
                            <th className="px-4 py-3 text-right text-xs font-medium text-green-600 uppercase">Cobrado</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-orange-600 uppercase">Pendiente</th>
                          </>
                        )}
                        {tipoDesglose !== 'total' && (
                          <th className={`px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase ${tipoDesglose === 'cobrado' ? 'text-green-600' : 'text-orange-600'}`}>
                            {tipoDesglose === 'cobrado' ? 'Cobrado' : 'Pendiente'}
                          </th>
                        )}
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {obtenerCuentasDesglose(tipoDesglose).map((cuenta) => {
                        const montoPagado = (parseFloat(cuenta.monto_total) || 0) - (parseFloat(cuenta.monto_pendiente) || 0);
                        const montoPendiente = parseFloat(cuenta.monto_pendiente) || 0;
                        
                        return (
                          <tr key={cuenta.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTipoBadge(cuenta.tipo)}`}>
                                {cuenta.tipo}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{cuenta.referencia}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{cuenta.clientes?.nombre || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {formatearFechaLocal(cuenta.fecha_emision)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium">
                              {formatCurrency(cuenta.monto_total, cuenta.divisa || 'DOP')}
                            </td>
                            {tipoDesglose === 'total' && (
                              <>
                                <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                                  {formatCurrency(montoPagado, cuenta.divisa || 'DOP')}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-orange-600 font-bold">
                                  {formatCurrency(montoPendiente, cuenta.divisa || 'DOP')}
                                </td>
                              </>
                            )}
                            {tipoDesglose !== 'total' && (
                              <td className={`px-4 py-3 text-sm text-right font-bold ${tipoDesglose === 'cobrado' ? 'text-green-600' : 'text-orange-600'}`}>
                                {formatCurrency(tipoDesglose === 'cobrado' ? montoPagado : montoPendiente, cuenta.divisa || 'DOP')}
                              </td>
                            )}
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {obtenerCuentasDesglose(tipoDesglose).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No hay cuentas para mostrar en este desglose</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
