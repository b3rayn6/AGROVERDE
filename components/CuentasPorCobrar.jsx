import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Search, AlertCircle, CheckCircle, Calendar, FileText, Users, X, CreditCard, Download, TrendingUp, Trash2 } from 'lucide-react';
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
      'Financiamiento': 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200',
      'Factura': 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200',
      'Otro': 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200'
    };
    return colors[tipo] || 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200';
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

  const eliminarFacturaDuplicada = async (numeroFactura) => {
    if (!confirm(`¿Está seguro de eliminar la factura duplicada ${numeroFactura}?\n\nEsta acción eliminará:\n- La factura de venta\n- La cuenta por cobrar asociada\n- Los items de la factura\n- Los registros relacionados\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    setLoading(true);
    try {
      // Buscar la factura por número (puede haber múltiples si hay duplicados)
      const { data: facturas, error: errorFactura } = await supabase
        .from('facturas_venta')
        .select('*')
        .eq('numero_factura', numeroFactura);

      if (errorFactura) {
        throw new Error(`Error al buscar la factura: ${errorFactura.message}`);
      }

      if (!facturas || facturas.length === 0) {
        throw new Error(`No se encontró la factura ${numeroFactura}`);
      }

      // Procesar todas las facturas encontradas (por si hay duplicados)
      for (const factura of facturas) {
        // Obtener items de la factura para devolver al inventario
        const { data: items } = await supabase
          .from('items_factura_venta')
          .select('mercancia_id, cantidad')
          .eq('factura_venta_id', factura.id);

        // Devolver productos al inventario
        for (const item of items || []) {
          const { data: mercancia } = await supabase
            .from('mercancias')
            .select('stock_actual')
            .eq('id', item.mercancia_id)
            .single();

          if (mercancia) {
            await supabase
              .from('mercancias')
              .update({ stock_actual: mercancia.stock_actual + item.cantidad })
              .eq('id', item.mercancia_id);
          }
        }

        // Si era a crédito, restar del balance del cliente
        if (factura.balance_pendiente > 0) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('balance_pendiente')
            .eq('id', factura.cliente_id)
            .single();

          if (cliente) {
            await supabase
              .from('clientes')
              .update({ balance_pendiente: Math.max(0, cliente.balance_pendiente - factura.balance_pendiente) })
              .eq('id', factura.cliente_id);
          }
        }

        // Eliminar cuenta por cobrar asociada
        const { data: cuentaPorCobrar } = await supabase
          .from('cuentas_por_cobrar')
          .select('id')
          .eq('referencia', numeroFactura)
          .in('tipo', ['Factura', 'factura_venta', 'factura']);

        if (cuentaPorCobrar && cuentaPorCobrar.length > 0) {
          for (const cuenta of cuentaPorCobrar) {
            // Eliminar pagos asociados
            await supabase
              .from('pagos_cuentas_por_cobrar')
              .delete()
              .eq('cuenta_id', cuenta.id);

            // Eliminar registros en cuadre_caja
            await supabase
              .from('cuadre_caja')
              .delete()
              .eq('cuenta_cobrar_id', cuenta.id);

            // Eliminar la cuenta por cobrar
            await supabase
              .from('cuentas_por_cobrar')
              .delete()
              .eq('id', cuenta.id);
          }
        }

        // Eliminar cobros asociados
        await supabase
          .from('cobros_clientes')
          .delete()
          .eq('factura_venta_id', factura.id);

        // Eliminar ventas diarias
        await supabase
          .from('ventas_diarias')
          .delete()
          .eq('factura_venta_id', factura.id);

        // Finalmente, eliminar la factura
        await supabase
          .from('facturas_venta')
          .delete()
          .eq('id', factura.id);
      }

      alert(`✅ Factura(s) ${numeroFactura} eliminada(s) exitosamente (${facturas.length} factura(s) eliminada(s))`);
      await cargarDatos();
      
      if (clienteSeleccionado) {
        await verDetalleCliente(clienteSeleccionado);
      }
    } catch (error) {
      console.error('Error al eliminar factura duplicada:', error);
      alert('Error al eliminar la factura: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const eliminarCuenta = async (cuenta) => {
    const tipoTexto = cuenta.tipo === 'Factura' ? 'factura' : 'financiamiento';
    const confirmacion = confirm(
      `¿Está seguro de que desea eliminar esta ${tipoTexto}?\n\n` +
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
    
    // Separar cuentas por divisa
    const cuentasDOP = cuentasDelCliente.filter(c => !c.divisa || c.divisa === 'DOP');
    const cuentasUSD = cuentasDelCliente.filter(c => c.divisa === 'USD');
    const tieneUSD = cuentasUSD.length > 0;

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
    let yPos = 75;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(34, 197, 94);
    doc.rect(14, yPos, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('RESUMEN', 105, yPos + 5, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    
    if (tieneUSD) {
      // Mostrar totales en DOP
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('PESOS DOMINICANOS (DOP):', 20, yPos + 15);
      doc.setFont(undefined, 'normal');
      doc.text(`Total: ${formatCurrency(totales.total, 'DOP')}`, 20, yPos + 22);
      doc.text(`Pagado: ${formatCurrency(totales.pagado, 'DOP')}`, 20, yPos + 29);
      doc.setFont(undefined, 'bold');
      doc.text(`Pendiente: ${formatCurrency(totales.pendiente, 'DOP')}`, 20, yPos + 36);
      
      // Mostrar totales en USD
      doc.setFont(undefined, 'bold');
      doc.text('DÓLARES (USD):', 110, yPos + 15);
      doc.setFont(undefined, 'normal');
      doc.text(`Total: ${formatCurrency(totales.totalUSD, 'USD')}`, 110, yPos + 22);
      doc.text(`Pagado: ${formatCurrency(totales.pagadoUSD, 'USD')}`, 110, yPos + 29);
      doc.setFont(undefined, 'bold');
      doc.text(`Pendiente: ${formatCurrency(totales.pendienteUSD, 'USD')}`, 110, yPos + 36);
      yPos = yPos + 50;
    } else {
      // Solo DOP
      doc.text(`Total: ${formatCurrency(totales.total, 'DOP')}`, 20, yPos + 15);
      doc.text(`Pagado: ${formatCurrency(totales.pagado, 'DOP')}`, 20, yPos + 22);
      doc.setFont(undefined, 'bold');
      doc.text(`Pendiente: ${formatCurrency(totales.pendiente, 'DOP')}`, 20, yPos + 29);
      yPos = yPos + 40;
    }

    // Tabla de cuentas
    const tableData = cuentasDelCliente.map(c => {
      const montoPagado = (parseFloat(c.monto_total) || 0) - (parseFloat(c.monto_pendiente) || 0);
      const divisa = c.divisa || 'DOP';
      return [
        c.tipo,
        c.referencia,
        new Date(c.fecha_emision).toLocaleDateString(),
        formatCurrency(c.monto_total, divisa),
        formatCurrency(montoPagado, divisa),
        formatCurrency(c.monto_pendiente, divisa),
        c.estado
      ];
    });

    doc.autoTable({
      startY: yPos,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 mb-4 sm:mb-6 animate-slideUp">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                  <DollarSign className="text-white w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                Cuentas por Cobrar
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-2 ml-1">Gestión de cobros a clientes (Financiamientos y Facturas)</p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => setMostrarModalClientes(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base font-medium"
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
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base font-medium"
                title="Limpiar facturas duplicadas y normalizar tipos"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
                Limpiar Duplicados
              </button>
              <button
                onClick={() => eliminarFacturaDuplicada('AGV-144')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
                title="Eliminar factura duplicada AGV-144"
              >
                <Trash2 size={18} className="sm:w-5 sm:h-5" />
                {loading ? 'Eliminando...' : 'Eliminar AGV-144'}
              </button>
              <button
                onClick={calcularInteresesTodosClientes}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                <TrendingUp size={18} className="sm:w-5 sm:h-5" />
                {loading ? 'Calculando...' : 'Calcular Intereses'}
              </button>
              <button
                onClick={() => generarPDFCuentasPorCobrar(cuentasFiltradas, totales)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base font-medium"
              >
                <FileText size={18} className="sm:w-5 sm:h-5" />
                Generar PDF
              </button>
            </div>
          </div>

          {/* Resumen General */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl shadow-xl text-white transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-100">Total por Cobrar</p>
                <div className="p-2 bg-white/20 rounded-lg">
                  <DollarSign size={20} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(totales.total)}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-5 rounded-2xl shadow-xl text-white transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-100">Total Cobrado</p>
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle size={20} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(totales.cobrado)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-5 rounded-2xl shadow-xl text-white transform hover:scale-105 transition-all duration-300 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-100">Pendiente</p>
                <div className="p-2 bg-white/20 rounded-lg">
                  <AlertCircle size={20} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(totales.pendiente)}</p>
            </div>
          </div>

          {/* Resumen de Facturas en USD */}
          {totalesUSD.total > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5 bg-gradient-to-br from-cyan-50 to-blue-100 rounded-2xl border-2 border-cyan-200 shadow-lg">
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md transform hover:scale-105 transition-all duration-300">
                <p className="text-xs sm:text-sm text-blue-600 font-semibold mb-1 flex items-center gap-1">
                  <span className="text-lg">💵</span> Total en USD
                </p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700">{formatCurrency(totalesUSD.total, 'USD')}</p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md transform hover:scale-105 transition-all duration-300">
                <p className="text-xs sm:text-sm text-green-600 font-semibold mb-1 flex items-center gap-1">
                  <span className="text-lg">💵</span> Cobrado en USD
                </p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">{formatCurrency(totalesUSD.cobrado, 'USD')}</p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md transform hover:scale-105 transition-all duration-300 sm:col-span-2 lg:col-span-1">
                <p className="text-xs sm:text-sm text-orange-600 font-semibold mb-1 flex items-center gap-1">
                  <span className="text-lg">💵</span> Pendiente en USD
                </p>
                <p className="text-xl sm:text-2xl font-bold text-orange-700">{formatCurrency(totalesUSD.pendiente, 'USD')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Resumen por Cliente */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 mb-4 sm:mb-6 animate-slideUp">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="text-indigo-600" size={24} />
            Resumen por Cliente
          </h2>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider">Cédula</th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider">Límite Crédito</th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider">Balance Pendiente</th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider">Crédito Disponible</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {clientes.filter(c => c.balance_pendiente > 0).map((cliente) => {
                  const creditoDisponible = (cliente.limite_credito || 0) - (cliente.balance_pendiente || 0);
                  const porcentajeUsado = ((cliente.balance_pendiente || 0) / (cliente.limite_credito || 1)) * 100;
                  
                  return (
                    <tr key={cliente.id} className="hover:bg-indigo-50 transition-colors duration-200">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{cliente.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{cliente.cedula || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(cliente.limite_credito || 0)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-orange-600">
                        {formatCurrency(cliente.balance_pendiente || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                        {formatCurrency(creditoDisponible)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                          porcentajeUsado >= 90 ? 'bg-red-100 text-red-800 border border-red-200' :
                          porcentajeUsado >= 70 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          'bg-green-100 text-green-800 border border-green-200'
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
                <div key={cliente.id} className="border border-gray-200 rounded-xl p-4 hover:bg-indigo-50 hover:shadow-md transition-all duration-300 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{cliente.nombre}</p>
                      <p className="text-xs text-gray-500 mt-1">{cliente.cedula || 'Sin cédula'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${
                      porcentajeUsado >= 90 ? 'bg-red-100 text-red-800 border border-red-200' :
                      porcentajeUsado >= 70 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                      'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                      {porcentajeUsado >= 90 ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                      {porcentajeUsado.toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Límite Crédito</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(cliente.limite_credito || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Balance Pendiente</p>
                      <p className="font-semibold text-orange-600">{formatCurrency(cliente.balance_pendiente || 0)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500">Crédito Disponible</p>
                      <p className="font-semibold text-green-600">{formatCurrency(creditoDisponible)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 mb-4 sm:mb-6 animate-slideUp">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por referencia o cliente..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            <div>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              >
                <option value="todos">Todos los tipos</option>
                <option value="Financiamiento">Financiamientos</option>
                <option value="Factura">Facturas</option>
              </select>
            </div>
            <div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 text-sm sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              >
                <option value="todas">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="parcial">Parciales</option>
                <option value="pagado">Pagados</option>
              </select>
            </div>
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border border-gray-300 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 shadow-sm">
              <label className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={mostrarIntereses}
                  onChange={(e) => setMostrarIntereses(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Con Intereses</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tabla de Cuentas por Cobrar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden animate-slideUp">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider">Referencia</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider">Total</th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider">Pagado</th>
                  <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider">Pendiente</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider">Vencimiento</th>
                  <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {cuentasFiltradas.map((cuenta) => {
                  const dias = diasVencido(cuenta.fecha_emision);
                  const diasVencimiento = cuenta.fecha_vencimiento ? diasVencido(cuenta.fecha_vencimiento) : null;
                  const esVencida = diasVencimiento && diasVencimiento > 0 && cuenta.monto_pendiente > 0;
                  const montoPagado = (parseFloat(cuenta.monto_total) || 0) - (parseFloat(cuenta.monto_pendiente) || 0);
                  
                  return (
                    <tr key={cuenta.id} className={`hover:bg-indigo-50 transition-colors duration-200 ${esVencida ? 'bg-red-50 border-l-4 border-red-500' : ''}`}>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${getTipoBadge(cuenta.tipo)}`}>
                          {cuenta.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{cuenta.referencia}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatearFechaLocal(cuenta.fecha_emision)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{cuenta.clientes?.nombre || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        {formatCurrency(cuenta.monto_total, cuenta.divisa || 'DOP')}
                        {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                        {formatCurrency(montoPagado, cuenta.divisa || 'DOP')}
                        {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-orange-600 font-bold">
                        {formatCurrency(cuenta.monto_pendiente, cuenta.divisa || 'DOP')}
                        {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {cuenta.fecha_vencimiento ? (
                          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                            esVencida ? 'bg-red-100 text-red-800 border border-red-200' :
                            diasVencimiento && diasVencimiento > -7 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                            'bg-green-100 text-green-800 border border-green-200'
                          }`}>
                            <Calendar size={14} />
                            {new Date(cuenta.fecha_vencimiento).toLocaleDateString()}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                          cuenta.estado === 'Pagada' ? 'bg-green-100 text-green-800 border border-green-200' :
                          montoPagado > 0 && cuenta.monto_pendiente > 0 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          'bg-red-100 text-red-800 border border-red-200'
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
                <div key={cuenta.id} className={`p-4 hover:bg-indigo-50 transition-all duration-200 ${esVencida ? 'bg-red-50 border-l-4 border-red-500' : 'bg-white'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${getTipoBadge(cuenta.tipo)}`}>
                          {cuenta.tipo}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${
                          cuenta.estado === 'Pagada' ? 'bg-green-100 text-green-800 border border-green-200' :
                          montoPagado > 0 && cuenta.monto_pendiente > 0 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {cuenta.estado === 'Pagada' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                          {cuenta.estado === 'Pagada' ? 'Pagada' : montoPagado > 0 ? 'Parcial' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{cuenta.referencia}</p>
                      <p className="text-xs text-gray-500 mt-1">{cuenta.clientes?.nombre || '-'}</p>
                    </div>
                    {cuenta.fecha_vencimiento && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${
                        esVencida ? 'bg-red-100 text-red-800 border border-red-200' :
                        diasVencimiento && diasVencimiento > -7 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                        'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                        <Calendar size={12} />
                        {new Date(cuenta.fecha_vencimiento).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Fecha</p>
                      <p className="font-semibold text-gray-700">{formatearFechaLocal(cuenta.fecha_emision)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total {cuenta.divisa === 'USD' && <span className="text-blue-600">💵</span>}</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(cuenta.monto_total, cuenta.divisa || 'DOP')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pagado {cuenta.divisa === 'USD' && <span className="text-blue-600">💵</span>}</p>
                      <p className="font-semibold text-green-600">{formatCurrency(montoPagado, cuenta.divisa || 'DOP')}</p>
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
          <div className="mt-4 sm:mt-6 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-4 sm:p-5 shadow-lg animate-slideUp">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="text-red-600 w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm sm:text-base font-bold text-red-800 mb-2">⚠️ Clientes con Crédito Crítico</h3>
                <ul className="space-y-1.5">
                  {clientes
                    .filter(c => {
                      const porcentaje = ((c.balance_pendiente || 0) / (c.limite_credito || 1)) * 100;
                      return porcentaje >= 90;
                    })
                    .map(c => (
                      <li key={c.id} className="text-xs sm:text-sm text-red-700 font-medium">
                        <strong className="font-bold">{c.nombre}</strong> ha usado el {(((c.balance_pendiente || 0) / (c.limite_credito || 1)) * 100).toFixed(0)}% de su crédito
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Modal Selección de Clientes */}
        {mostrarModalClientes && !clienteSeleccionado && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-slideUp">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-5 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Users size={24} />
                  </div>
                  Seleccionar Cliente
                </h2>
                <button onClick={() => setMostrarModalClientes(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
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
                        className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-500 hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer bg-white"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-gray-800">{cliente.nombre}</h3>
                            <p className="text-sm text-gray-500">{cliente.cedula || 'Sin cédula'}</p>
                          </div>
                          <span className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full border border-purple-200 shadow-sm">
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-slideUp">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-5 flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  Cuentas de {clienteSeleccionado.nombre}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => generarPDFCliente(clienteSeleccionado)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 font-medium"
                  >
                    <Download size={18} />
                    PDF
                  </button>
                  <button
                    onClick={() => setClienteSeleccionado(null)}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-all duration-300"
                  >
                    Volver a Lista
                  </button>
                  <button
                    onClick={() => setMostrarModalClientes(false)}
                    className="hover:bg-white/20 p-2 rounded-lg transition-colors"
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
                          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300">
                            <p className="text-sm font-medium text-blue-100 mb-1">Total</p>
                            <p className="text-2xl font-bold">{formatCurrency(totalesCliente.total, 'DOP')}</p>
                          </div>
                          <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-5 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300">
                            <p className="text-sm font-medium text-green-100 mb-1">Pagado</p>
                            <p className="text-2xl font-bold">{formatCurrency(totalesCliente.pagado, 'DOP')}</p>
                          </div>
                          <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-5 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-300">
                            <p className="text-sm font-medium text-orange-100 mb-1">Pendiente</p>
                            <p className="text-2xl font-bold">{formatCurrency(totalesCliente.pendiente, 'DOP')}</p>
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
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <CreditCard size={20} />
                      Registrar Pago
                    </button>
                  </div>
                )}

                {/* Tabla de Cuentas */}
                <div className="overflow-x-auto rounded-xl">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider">Referencia</th>
                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider">Total</th>
                        <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider">Pagado</th>
                        <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider">Pendiente</th>
                        <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider">Estado</th>
                        <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {cuentasCliente.map((cuenta) => {
                        const montoPagado = (parseFloat(cuenta.monto_total) || 0) - (parseFloat(cuenta.monto_pendiente) || 0);
                        
                        return (
                          <tr key={cuenta.id} className="hover:bg-indigo-50 transition-colors duration-200">
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm ${getTipoBadge(cuenta.tipo)}`}>
                                {cuenta.tipo}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{cuenta.referencia}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {formatearFechaLocal(cuenta.fecha_emision)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold">
                              {formatCurrency(cuenta.monto_total, cuenta.divisa || 'DOP')}
                              {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                              {formatCurrency(montoPagado, cuenta.divisa || 'DOP')}
                              {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-orange-600 font-bold">
                              {formatCurrency(cuenta.monto_pendiente, cuenta.divisa || 'DOP')}
                              {cuenta.divisa === 'USD' && <span className="ml-1 text-xs text-blue-600">💵</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                                cuenta.estado === 'Pagada' ? 'bg-green-100 text-green-800 border border-green-200' :
                                montoPagado > 0 && cuenta.monto_pendiente > 0 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                'bg-red-100 text-red-800 border border-red-200'
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
                                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all duration-300 text-xs flex items-center gap-1 font-semibold shadow-sm hover:shadow-md"
                                  >
                                    <CreditCard size={14} />
                                    Pagar
                                  </button>
                                )}
                                <button
                                  onClick={() => eliminarCuenta(cuenta)}
                                  className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition-all duration-300 text-xs flex items-center gap-1 font-semibold shadow-sm hover:shadow-md"
                                  title={`Eliminar ${cuenta.tipo === 'Factura' ? 'factura' : 'financiamiento'}`}
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

        {/* Modal Registrar Pago */}
        {mostrarModalPago && cuentaParaPago && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slideUp">
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-5 flex justify-between items-center rounded-t-2xl">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CreditCard size={24} />
                  </div>
                  Registrar Pago
                </h2>
                <button onClick={() => setMostrarModalPago(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
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
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={registrarPago}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
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
