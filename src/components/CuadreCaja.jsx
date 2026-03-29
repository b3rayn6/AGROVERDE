import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Download, Calendar, DollarSign, TrendingUp, TrendingDown, Filter, Edit, Trash2, CreditCard, X, CheckCircle2, Truck, User } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { getFechaActual } from '../lib/dateUtils';

export default function CuadreCaja() {
  const [movimientos, setMovimientos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [suplidores, setSuplidores] = useState([]);
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([]);
  const [facturasCompra, setFacturasCompra] = useState([]);
  const [financiamientos, setFinanciamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPagoMultipleModal, setShowPagoMultipleModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [fechaInicio, setFechaInicio] = useState(getFechaActual());
  const [fechaFin, setFechaFin] = useState(getFechaActual());
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroConcepto, setFiltroConcepto] = useState('todos');
  const [filtroCliente, setFiltroCliente] = useState('');

  // Estados para pago múltiple
  const [pagoMultiple, setPagoMultiple] = useState({
    tipo_operacion: 'cobro', // 'cobro' (clientes) o 'pago' (suplidores)
    cliente_id: '',
    suplidor_id: '',
    monto_disponible: '',
    metodo_pago: 'efectivo',
    referencia: '',
    descripcion: '',
    divisa: 'DOP',
    fecha: getFechaActual(),
    facturas_seleccionadas: [],
    financiamientos_seleccionados: [],
    facturas_suplidores_seleccionadas: []
  });

  const [formData, setFormData] = useState({
    fecha: getFechaActual(),
    tipo_movimiento: 'ingreso',
    concepto: 'deposito',
    monto: '',
    metodo_pago: 'efectivo',
    referencia: '',
    descripcion: '',
    cliente_id: '',
    cuenta_cobrar_id: '',
    divisa: 'DOP'
  });

  useEffect(() => {
    cargarDatos();

    // Suscripción a cambios en tiempo real
    const cuadreSubscription = supabase
      .channel('cuadre-caja-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuadre_caja' }, () => {
        cargarDatos();
      })
      .subscribe();

    const cuentasSubscription = supabase
      .channel('cuentas-cobrar-changes-caja')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuentas_por_cobrar' }, () => {
        cargarDatos();
      })
      .subscribe();

    const facturasSubscription = supabase
      .channel('facturas-compra-changes-caja')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facturas_compra' }, () => {
        cargarDatos();
      })
      .subscribe();

    const financiamientosSubscription = supabase
      .channel('financiamientos-changes-caja')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financiamientos' }, () => {
        cargarDatos();
      })
      .subscribe();

    return () => {
      cuadreSubscription.unsubscribe();
      cuentasSubscription.unsubscribe();
      facturasSubscription.unsubscribe();
      financiamientosSubscription.unsubscribe();
    };
  }, [fechaInicio, fechaFin, filtroTipo, filtroConcepto]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar movimientos con filtros
      // NOTA: Primero cargamos TODOS los registros sin filtro de fecha para capturar los que no tienen fecha
      let query = supabase
        .from('cuadre_caja')
        .select('*')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo_movimiento', filtroTipo);
      }

      if (filtroConcepto !== 'todos') {
        query = query.eq('concepto', filtroConcepto);
      }

      const { data: movimientosData, error: movimientosError } = await query;

      if (movimientosError) throw movimientosError;

      // Cargar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre');

      if (clientesError) throw clientesError;

      // Cargar suplidores
      const { data: suplidoresData, error: suplidoresError } = await supabase
        .from('suplidores')
        .select('*')
        .order('nombre');

      if (suplidoresError) throw suplidoresError;

      // Cargar cuentas por cobrar pendientes
      const { data: cuentasData, error: cuentasError } = await supabase
        .from('cuentas_por_cobrar')
        .select('*, clientes(nombre)')
        .gt('monto_pendiente', 0)
        .neq('tipo', 'financiamiento_actualizado')
        .order('fecha_emision', { ascending: false });

      if (cuentasError) throw cuentasError;

      // Cargar financiamientos pendientes
      const { data: financiamientosData, error: financiamientosError } = await supabase
        .from('financiamientos')
        .select('*, clientes(nombre)')
        .gt('balance_pendiente', 0)
        .order('fecha_prestamo', { ascending: false });

      if (financiamientosError) throw financiamientosError;

      // Cargar facturas de compra (cuentas por pagar) pendientes
      const { data: facturasCompraData, error: facturasCompraError } = await supabase
        .from('facturas_compra')
        .select('*, suplidores(nombre)')
        .gt('balance_pendiente', 0)
        .neq('estado', 'pagada')
        .order('fecha', { ascending: false });

      if (facturasCompraError) throw facturasCompraError;

      // Asegurar que todos los movimientos tengan divisa y fecha
      const movimientosConDivisaYFecha = (movimientosData || []).map(m => {
        // Si no hay divisa o es null/undefined, usar DOP
        const divisaFinal = (m.divisa && m.divisa !== null && m.divisa !== undefined) ? m.divisa : 'DOP';

        // Si no hay fecha o es null/undefined, usar created_at o fecha actual
        let fechaFinal = m.fecha;
        if (!fechaFinal || fechaFinal === null || fechaFinal === undefined) {
          // Si hay created_at, extraer solo la fecha
          if (m.created_at) {
            fechaFinal = m.created_at.split('T')[0];
            console.log('Movimiento sin fecha encontrado:', m.referencia, 'Asignando fecha desde created_at:', fechaFinal);
          } else {
            // Si no hay created_at, usar fecha actual
            fechaFinal = getFechaActual();
            console.log('Movimiento sin fecha ni created_at:', m.referencia, 'Asignando fecha actual:', fechaFinal);
          }
        }

        // Log para depuración
        if (!m.divisa || m.divisa === null || m.divisa === undefined) {
          console.log('Movimiento sin divisa encontrado:', m.referencia, 'Asignando DOP');
        }

        return {
          ...m,
          divisa: divisaFinal,
          fecha: fechaFinal
        };
      });

      // Aplicar filtro de fecha en el frontend
      const movimientosFiltrados = movimientosConDivisaYFecha.filter(m => {
        const fechaMovimiento = m.fecha;
        return fechaMovimiento >= fechaInicio && fechaMovimiento <= fechaFin;
      });

      console.log('Movimientos cargados con divisas y fechas:', movimientosFiltrados.map(m => ({ referencia: m.referencia, concepto: m.concepto, divisa: m.divisa, fecha: m.fecha })));
      setMovimientos(movimientosFiltrados);
      setClientes(clientesData || []);
      setSuplidores(suplidoresData || []);
      setCuentasPorCobrar(cuentasData || []);
      setFacturasCompra(facturasCompraData || []);
      setFinanciamientos(financiamientosData || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotales = () => {
    // Solo contar movimientos que explícitamente tienen la divisa correspondiente
    const ingresosUSD = movimientos
      .filter(m => m.tipo_movimiento === 'ingreso' && m.divisa === 'USD')
      .reduce((sum, m) => sum + parseFloat(m.monto), 0);

    const egresoUSD = movimientos
      .filter(m => m.tipo_movimiento === 'egreso' && m.divisa === 'USD')
      .reduce((sum, m) => sum + parseFloat(m.monto), 0);

    const ingresosDOP = movimientos
      .filter(m => m.tipo_movimiento === 'ingreso' && (m.divisa === 'DOP' || !m.divisa))
      .reduce((sum, m) => sum + parseFloat(m.monto), 0);

    const egresosDOP = movimientos
      .filter(m => m.tipo_movimiento === 'egreso' && (m.divisa === 'DOP' || !m.divisa))
      .reduce((sum, m) => sum + parseFloat(m.monto), 0);

    const saldoUSD = ingresosUSD - egresoUSD;
    const saldoDOP = ingresosDOP - egresosDOP;

    return { ingresosUSD, egresoUSD, saldoUSD, ingresosDOP, egresosDOP, saldoDOP };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    // Validar que si es pago_factura con cuenta_cobrar_id, el monto no exceda el pendiente
    if (formData.concepto === 'pago_factura' && formData.cuenta_cobrar_id) {
      const cuentaSeleccionada = cuentasPorCobrar.find(c => c.id === parseInt(formData.cuenta_cobrar_id));
      if (cuentaSeleccionada && parseFloat(formData.monto) > parseFloat(cuentaSeleccionada.monto_pendiente)) {
        alert('El monto no puede ser mayor al pendiente de la cuenta');
        return;
      }
    }

    try {
      const dataToSave = {
        fecha: formData.fecha,
        tipo_movimiento: formData.tipo_movimiento,
        concepto: formData.concepto,
        monto: parseFloat(formData.monto),
        metodo_pago: formData.metodo_pago,
        referencia: formData.referencia,
        descripcion: formData.descripcion,
        cliente_id: formData.cliente_id || null,
        cuenta_cobrar_id: formData.cuenta_cobrar_id || null,
        divisa: formData.divisa || 'DOP'
      };

      let error;
      if (editando) {
        // Actualizar movimiento existente
        const result = await supabase
          .from('cuadre_caja')
          .update(dataToSave)
          .eq('id', editando.id);
        error = result.error;
      } else {
        // Crear nuevo movimiento
        const result = await supabase.from('cuadre_caja').insert([dataToSave]);
        error = result.error;

        // Si es un pago de factura con cuenta_cobrar_id, actualizar la cuenta por cobrar
        if (!error && formData.concepto === 'pago_factura' && formData.cuenta_cobrar_id) {
          const cuentaSeleccionada = cuentasPorCobrar.find(c => c.id === parseInt(formData.cuenta_cobrar_id));
          
          if (cuentaSeleccionada) {
            const nuevoMontoPendiente = parseFloat(cuentaSeleccionada.monto_pendiente) - parseFloat(formData.monto);
            const nuevoEstado = nuevoMontoPendiente === 0 ? 'Pagada' : 'Pendiente';

            // Actualizar cuenta por cobrar
            await supabase
              .from('cuentas_por_cobrar')
              .update({
                monto_pendiente: nuevoMontoPendiente,
                estado: nuevoEstado
              })
              .eq('id', cuentaSeleccionada.id);

            // Actualizar balance del cliente
            if (cuentaSeleccionada.cliente_id) {
              const { data: clienteData } = await supabase
                .from('clientes')
                .select('balance_pendiente')
                .eq('id', cuentaSeleccionada.cliente_id)
                .single();

              if (clienteData) {
                await supabase
                  .from('clientes')
                  .update({
                    balance_pendiente: (parseFloat(clienteData.balance_pendiente) || 0) - parseFloat(formData.monto)
                  })
                  .eq('id', cuentaSeleccionada.cliente_id);
              }
            }

            // Registrar pago en la tabla pagos_cuentas_por_cobrar
            await supabase.from('pagos_cuentas_por_cobrar').insert({
              cuenta_id: cuentaSeleccionada.id,
              monto: parseFloat(formData.monto),
              metodo_pago: formData.metodo_pago,
              fecha_pago: new Date().toISOString()
            });
          }
        }
      }

      if (error) throw error;

      alert(editando ? 'Movimiento actualizado exitosamente' : 'Movimiento registrado exitosamente');
      setShowModal(false);
      setEditando(null);
      setFormData({
        fecha: getFechaActual(),
        tipo_movimiento: 'ingreso',
        concepto: 'deposito',
        monto: '',
        metodo_pago: 'efectivo',
        referencia: '',
        descripcion: '',
        cliente_id: '',
        cuenta_cobrar_id: '',
        divisa: 'DOP'
      });
      cargarDatos();
    } catch (error) {
      console.error('Error al guardar movimiento:', error);
      alert('Error al guardar movimiento: ' + error.message);
    }
  };

  const handleEditar = (movimiento) => {
    setEditando(movimiento);
    setFormData({
      fecha: movimiento.fecha,
      tipo_movimiento: movimiento.tipo_movimiento,
      concepto: movimiento.concepto,
      monto: movimiento.monto.toString(),
      metodo_pago: movimiento.metodo_pago || 'efectivo',
      referencia: movimiento.referencia || '',
      descripcion: movimiento.descripcion || '',
      cliente_id: movimiento.cliente_id || '',
      cuenta_cobrar_id: movimiento.cuenta_cobrar_id || '',
      divisa: movimiento.divisa || 'DOP'
    });
    setShowModal(true);
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Está seguro de eliminar este movimiento?')) return;

    try {
      const { error } = await supabase
        .from('cuadre_caja')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Movimiento eliminado exitosamente');
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar movimiento:', error);
      alert('Error al eliminar movimiento: ' + error.message);
    }
  };

  const handlePagoMultiple = async (e) => {
    e.preventDefault();

    console.log('Iniciando pago múltiple:', pagoMultiple);

    if (!pagoMultiple.monto_disponible || parseFloat(pagoMultiple.monto_disponible) <= 0) {
      alert('El monto disponible debe ser mayor a 0');
      return;
    }

    if (pagoMultiple.tipo_operacion === 'cobro') {
      // VALIDACIÓN COBROS (CLIENTES)
      if (!pagoMultiple.cliente_id) {
        alert('Debe seleccionar un cliente');
        return;
      }

      if (pagoMultiple.facturas_seleccionadas.length === 0 && pagoMultiple.financiamientos_seleccionados.length === 0) {
        alert('Debe seleccionar al menos una factura o financiamiento para pagar');
        return;
      }
    } else {
      // VALIDACIÓN PAGOS (SUPLIDORES)
      if (!pagoMultiple.suplidor_id) {
        alert('Debe seleccionar un suplidor');
        return;
      }

      if (pagoMultiple.facturas_suplidores_seleccionadas.length === 0) {
        alert('Debe seleccionar al menos una factura de compra para pagar');
        return;
      }
    }

    try {
      if (pagoMultiple.tipo_operacion === 'cobro') {
        // --- LOGICA DE COBRO A CLIENTES (EXISTENTE) ---
        // PASO 1: Registrar el ingreso por el monto disponible
        const cliente = clientes.find(c => c.id === parseInt(pagoMultiple.cliente_id));
        const nombreCliente = cliente ? cliente.nombre : 'Cliente';

        await supabase.from('cuadre_caja').insert({
          fecha: pagoMultiple.fecha,
          tipo_movimiento: 'ingreso',
          concepto: 'deposito',
          monto: parseFloat(pagoMultiple.monto_disponible),
          metodo_pago: pagoMultiple.metodo_pago,
          referencia: pagoMultiple.referencia || `ING-${nombreCliente}`,
          descripcion: `Ingreso para pago de facturas/financiamientos de ${nombreCliente}`,
          cliente_id: parseInt(pagoMultiple.cliente_id),
          divisa: pagoMultiple.divisa
        });

        console.log('Ingreso registrado:', pagoMultiple.monto_disponible, pagoMultiple.divisa);

        let montoRestante = parseFloat(pagoMultiple.monto_disponible);

        console.log('Monto disponible inicial:', montoRestante);

        // PASO 2: Procesar pagos de facturas
        for (const facturaId of pagoMultiple.facturas_seleccionadas) {
          if (montoRestante <= 0) break;

          const factura = cuentasPorCobrar.find(c => c.id === facturaId);
          if (!factura) continue;

          const montoPagar = Math.min(montoRestante, parseFloat(factura.monto_pendiente));
          const nuevoMontoPendiente = parseFloat(factura.monto_pendiente) - montoPagar;
          const nuevoEstado = nuevoMontoPendiente === 0 ? 'Pagada' : 'Pendiente';

          console.log('Pagando factura:', factura.referencia, 'Monto:', montoPagar, 'Nuevo pendiente:', nuevoMontoPendiente);

          // Actualizar cuenta por cobrar
          await supabase
            .from('cuentas_por_cobrar')
            .update({
              monto_pendiente: nuevoMontoPendiente,
              estado: nuevoEstado
            })
            .eq('id', factura.id);

          // Actualizar balance del cliente
          if (factura.cliente_id) {
            const { data: clienteData } = await supabase
              .from('clientes')
              .select('balance_pendiente')
              .eq('id', factura.cliente_id)
              .single();

            if (clienteData) {
              await supabase
                .from('clientes')
                .update({
                  balance_pendiente: (parseFloat(clienteData.balance_pendiente) || 0) - montoPagar
                })
                .eq('id', factura.cliente_id);
            }
          }

          // Registrar movimiento en cuadre de caja
          await supabase.from('cuadre_caja').insert({
            fecha: pagoMultiple.fecha,
            tipo_movimiento: 'egreso',
            concepto: 'pago_factura',
            monto: montoPagar,
            metodo_pago: pagoMultiple.metodo_pago,
            referencia: factura.referencia,
            descripcion: `Pago de factura ${factura.referencia} con ingreso por caja`,
            cliente_id: factura.cliente_id,
            cuenta_cobrar_id: factura.id,
            divisa: pagoMultiple.divisa
          });

          montoRestante -= montoPagar;
          console.log('Monto restante después de factura:', montoRestante);
        }

        // Procesar pagos de financiamientos
        for (const financiamientoId of pagoMultiple.financiamientos_seleccionados) {
          if (montoRestante <= 0) break;

          const financiamiento = financiamientos.find(f => f.id === financiamientoId);
          if (!financiamiento) continue;

          const montoPagar = Math.min(montoRestante, parseFloat(financiamiento.balance_pendiente));
          const nuevoBalancePendiente = parseFloat(financiamiento.balance_pendiente) - montoPagar;
          const nuevoEstado = nuevoBalancePendiente === 0 ? 'Pagado' : 'Pendiente';

          console.log('Pagando financiamiento:', financiamiento.id, 'Monto:', montoPagar, 'Nuevo pendiente:', nuevoBalancePendiente);

          // Actualizar financiamiento
          await supabase
            .from('financiamientos')
            .update({
              balance_pendiente: nuevoBalancePendiente,
              estado: nuevoEstado
            })
            .eq('id', financiamiento.id);

          // Registrar pago en la tabla pagos_financiamientos
          await supabase.from('pagos_financiamientos').insert({
            financiamiento_id: financiamiento.id,
            monto_pagado: montoPagar,
            balance_actualizado: nuevoBalancePendiente,
            fecha_pago: new Date().toISOString()
          });

          // Registrar movimiento en cuadre de caja
          await supabase.from('cuadre_caja').insert({
            fecha: pagoMultiple.fecha,
            tipo_movimiento: 'egreso',
            concepto: 'pago_financiamiento',
            monto: montoPagar,
            metodo_pago: pagoMultiple.metodo_pago,
            referencia: `FIN-${financiamiento.id}`,
            descripcion: `Pago de financiamiento a ${financiamiento.nombre_cliente} con ingreso por caja`,
            cliente_id: financiamiento.cliente_id,
            divisa: pagoMultiple.divisa
          });

          montoRestante -= montoPagar;
          console.log('Monto restante después de financiamiento:', montoRestante);
        }
        
        alert(`Pago múltiple procesado exitosamente. Monto utilizado: ${formatCurrency(parseFloat(pagoMultiple.monto_disponible) - montoRestante, pagoMultiple.divisa)}`);

      } else {
        // --- LOGICA DE PAGO A SUPLIDORES (NUEVO) ---
        const suplidor = suplidores.find(s => s.id === parseInt(pagoMultiple.suplidor_id));
        const nombreSuplidor = suplidor ? suplidor.nombre : 'Suplidor';

        // En pagos a suplidores, NO creamos un ingreso. Usamos el dinero que YA existe en caja.
        // Pero el concepto del modal parece ser "Pagar con Ingreso por Caja", lo cual es confuso.
        // Si es "Pagar con Ingreso", significa que entra dinero y sale dinero.
        // Pero si estamos pagando a un suplidor, normalmente es dinero que SALE de caja.
        // Asumiremos que es un EGRESO de caja (Pago directo).
        // Sin embargo, la lógica anterior de Clientes hacía: Ingreso (Deposito) -> Egreso (Pago Factura). Esto es "cruce".
        // Para Suplidores, el usuario dijo: "usando los ingresos ingresados". Esto suena a usar el saldo de caja.
        // O tal vez quiere decir que se registre el pago como un egreso de caja normal.
        // La UI actual de "Pagar con Ingreso" hace Ingreso y luego Egreso (neto 0 en caja, pero registra transacciones).
        // Si aplico esto a suplidores: Entra dinero (¿De dónde?) y sale al suplidor.
        // Si el usuario quiere "pagar esas facturas de Suplidores usando los ingresos ingresados", significa:
        // Tomar dinero DE LA CAJA (que vino de ingresos) para pagar. Esto es un EGRESO simple.
        // Pero el modal se llama "Pagar con Ingreso".
        // Voy a asumir que para Suplidores es un EGRESO DE CAJA DIRECTO (Pago), no un cruce.
        // Pero para mantener consistencia con el modal, usaré el monto disponible como el límite a pagar.
        
        // CORRECCIÓN: El modal actual se diseñó para "Ingresa dinero el cliente X y con eso paga sus facturas".
        // Para suplidores, es "Saco dinero de la caja para pagar facturas".
        // Si uso este mismo modal, el flujo "Ingreso -> Egreso" NO tiene sentido para suplidores (a menos que el suplidor me de dinero).
        // El usuario dijo: "permite pagar esas facturas de Suplidores usando los ingresos ingresados".
        // Interpretación: Usar el SALDO de caja (ingresos previos) para pagar.
        // Por tanto, solo registraré EGRESOS.

        let montoRestante = parseFloat(pagoMultiple.monto_disponible); // Monto que "voy a usar" de la caja

        for (const facturaId of pagoMultiple.facturas_suplidores_seleccionadas) {
          if (montoRestante <= 0) break;

          const factura = facturasCompra.find(f => f.id === facturaId);
          if (!factura) continue;

          const montoPagar = Math.min(montoRestante, parseFloat(factura.balance_pendiente));
          const nuevoBalance = parseFloat(factura.balance_pendiente) - montoPagar;
          const nuevoEstado = nuevoBalance === 0 ? 'pagada' : 'parcial';
          const montoPagadoTotal = (parseFloat(factura.monto_pagado) || 0) + montoPagar;

          console.log('Pagando factura suplidor:', factura.numero_factura, 'Monto:', montoPagar);

          // 1. Actualizar factura de compra
          await supabase
            .from('facturas_compra')
            .update({
              balance_pendiente: nuevoBalance,
              monto_pagado: montoPagadoTotal,
              estado: nuevoEstado
            })
            .eq('id', factura.id);

          // 2. Actualizar balance del suplidor
          if (factura.suplidor_id) {
            const { data: suplidorData } = await supabase
              .from('suplidores')
              .select('balance_pendiente')
              .eq('id', factura.suplidor_id)
              .single();

            if (suplidorData) {
              await supabase
                .from('suplidores')
                .update({
                  balance_pendiente: (parseFloat(suplidorData.balance_pendiente) || 0) - montoPagar
                })
                .eq('id', factura.suplidor_id);
            }
          }

          // 3. Registrar pago en pagos_suplidores
          await supabase.from('pagos_suplidores').insert({
            factura_compra_id: factura.id,
            suplidor_id: factura.suplidor_id,
            fecha: pagoMultiple.fecha,
            monto: montoPagar,
            metodo_pago: pagoMultiple.metodo_pago,
            referencia: pagoMultiple.referencia,
            notas: `Pago desde Cuadre de Caja: ${pagoMultiple.descripcion}`
          });

          // 4. Registrar EGRESO en cuadre_caja
          await supabase.from('cuadre_caja').insert({
            fecha: pagoMultiple.fecha,
            tipo_movimiento: 'egreso',
            // Revisando conceptos: pago_factura, pago_financiamiento, venta_contado, deposito, retiro, gasto, caja_chica, otro
            // Usaremos 'gasto' y en descripción aclaramos. O 'otro'.
            concepto: 'otro', 
            monto: montoPagar,
            metodo_pago: pagoMultiple.metodo_pago,
            referencia: factura.numero_factura,
            descripcion: `Pago a Suplidor ${nombreSuplidor} - Factura ${factura.numero_factura}`,
            cliente_id: null, // Es suplidor
            proveedor: nombreSuplidor, // Si existe campo proveedor
            factura_id: factura.id, // Si existe campo factura_id
            divisa: pagoMultiple.divisa
          });

          montoRestante -= montoPagar;
        }

        alert(`Pagos a proveedores procesados exitosamente.`);
      }

      setShowPagoMultipleModal(false);
      setPagoMultiple({
        tipo_operacion: 'cobro',
        cliente_id: '',
        suplidor_id: '',
        monto_disponible: '',
        metodo_pago: 'efectivo',
        referencia: '',
        descripcion: '',
        divisa: 'DOP',
        fecha: getFechaActual(),
        facturas_seleccionadas: [],
        financiamientos_seleccionados: [],
        facturas_suplidores_seleccionadas: []
      });
      cargarDatos();
    } catch (error) {
      console.error('Error al procesar operación:', error);
      alert('Error al procesar operación: ' + error.message);
    }
  };

  const toggleFacturaSeleccionada = (facturaId) => {
    setPagoMultiple(prev => {
      const yaSeleccionada = prev.facturas_seleccionadas.includes(facturaId);
      return {
        ...prev,
        facturas_seleccionadas: yaSeleccionada
          ? prev.facturas_seleccionadas.filter(id => id !== facturaId)
          : [...prev.facturas_seleccionadas, facturaId]
      };
    });
  };

  const toggleFinanciamientoSeleccionado = (financiamientoId) => {
    setPagoMultiple(prev => {
      const yaSeleccionado = prev.financiamientos_seleccionados.includes(financiamientoId);
      return {
        ...prev,
        financiamientos_seleccionados: yaSeleccionado
          ? prev.financiamientos_seleccionados.filter(id => id !== financiamientoId)
          : [...prev.financiamientos_seleccionados, financiamientoId]
      };
    });
  };

  const toggleFacturaSuplidorSeleccionada = (facturaId) => {
    setPagoMultiple(prev => {
      const yaSeleccionada = prev.facturas_suplidores_seleccionadas.includes(facturaId);
      return {
        ...prev,
        facturas_suplidores_seleccionadas: yaSeleccionada
          ? prev.facturas_suplidores_seleccionadas.filter(id => id !== facturaId)
          : [...prev.facturas_suplidores_seleccionadas, facturaId]
      };
    });
  };

  const calcularTotalSeleccionado = () => {
    if (pagoMultiple.tipo_operacion === 'pago') {
      let total = 0;
      pagoMultiple.facturas_suplidores_seleccionadas.forEach(facturaId => {
        const factura = facturasCompra.find(f => f.id === facturaId);
        if (factura) total += parseFloat(factura.balance_pendiente);
      });
      return total;
    }

    let totalFacturas = 0;
    let totalFinanciamientos = 0;

    pagoMultiple.facturas_seleccionadas.forEach(facturaId => {
      const factura = cuentasPorCobrar.find(c => c.id === facturaId);
      if (factura) totalFacturas += parseFloat(factura.monto_pendiente);
    });

    pagoMultiple.financiamientos_seleccionados.forEach(financiamientoId => {
      const financiamiento = financiamientos.find(f => f.id === financiamientoId);
      if (financiamiento) totalFinanciamientos += parseFloat(financiamiento.balance_pendiente);
    });

    return totalFacturas + totalFinanciamientos;
  };

  const corregirDivisasIncorrectas = async () => {
    try {
      // Buscar todos los registros de venta_contado que tienen USD pero deberían tener DOP
      // basado en la factura correspondiente
      const { data: movimientosUSD } = await supabase
        .from('cuadre_caja')
        .select('id, referencia, divisa, concepto')
        .eq('concepto', 'venta_contado')
        .eq('divisa', 'USD');

      if (movimientosUSD && movimientosUSD.length > 0) {
        console.log('Encontrados', movimientosUSD.length, 'registros con USD que pueden necesitar corrección');
        
        for (const movimiento of movimientosUSD) {
          // Buscar la factura correspondiente para verificar su divisa
          const { data: factura } = await supabase
            .from('facturas_venta')
            .select('divisa')
            .eq('numero_factura', movimiento.referencia)
            .single();

          if (factura && factura.divisa === 'DOP') {
            console.log('Corrigiendo registro', movimiento.referencia, 'de USD a DOP');
            await supabase
              .from('cuadre_caja')
              .update({ divisa: 'DOP' })
              .eq('id', movimiento.id);
          }
        }
        
        alert('Corrección de divisas completada. Recarga la página para ver los cambios.');
        cargarDatos();
      }
    } catch (error) {
      console.error('Error al corregir divisas:', error);
      alert('Error al corregir divisas: ' + error.message);
    }
  };

  const generarPDF = async () => {
    if (typeof window === 'undefined') {
      console.warn('PDF generation is only supported in browser environment.');
      return;
    }

    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    const totales = calcularTotales();

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
    doc.text('CUADRE DE CAJA', 105, 45, { align: 'center' });

    // Período
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Período: ${fechaInicio} al ${fechaFin}`, 105, 52, { align: 'center' });

    // Resumen de totales
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(34, 197, 94);
    doc.rect(14, 60, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('RESUMEN', 105, 65, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.text(`Ingresos USD: ${formatCurrency(totales.ingresosUSD, 'USD')}`, 20, 75);
    doc.text(`Egresos USD: ${formatCurrency(totales.egresoUSD, 'USD')}`, 20, 82);
    doc.setFont(undefined, 'bold');
    doc.text(`Saldo USD: ${formatCurrency(totales.saldoUSD, 'USD')}`, 20, 89);
    doc.setFont(undefined, 'normal');
    doc.text(`Ingresos DOP: ${formatCurrency(totales.ingresosDOP, 'DOP')}`, 20, 96);
    doc.text(`Egresos DOP: ${formatCurrency(totales.egresosDOP, 'DOP')}`, 20, 103);
    doc.setFont(undefined, 'bold');
    doc.text(`Saldo DOP: ${formatCurrency(totales.saldoDOP, 'DOP')}`, 20, 110);

    // Tabla de movimientos
    const tableData = movimientos.map(m => [
      m.fecha,
      m.tipo_movimiento === 'ingreso' ? 'Ingreso' : 'Egreso',
      m.concepto.replace('_', ' ').toUpperCase(),
      m.metodo_pago?.toUpperCase() || '-',
      m.referencia || '-',
      formatCurrency(m.monto, m.divisa || 'DOP')
    ]);

    doc.autoTable({
      startY: 117,
      head: [['Fecha', 'Tipo', 'Concepto', 'Método', 'Referencia', 'Monto']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        5: { halign: 'right', fontStyle: 'bold' }
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

    doc.save(`cuadre_caja_${fechaInicio}_${fechaFin}.pdf`);
  };

  const totales = calcularTotales();

  const movimientosFiltrados = movimientos.filter(movimiento => {
    if (!filtroCliente) return true;
    
    const termino = filtroCliente.toLowerCase();
    
    // Buscar nombre del cliente
    let nombreCliente = '';
    if (movimiento.cliente_id) {
      const cliente = clientes.find(c => c.id === movimiento.cliente_id);
      if (cliente) nombreCliente = cliente.nombre.toLowerCase();
    }
    
    // Buscar nombre del proveedor
    let nombreProveedor = '';
    if (movimiento.proveedor) {
      nombreProveedor = movimiento.proveedor.toLowerCase();
    }
    
    return nombreCliente.includes(termino) || nombreProveedor.includes(termino);
  });

  const conceptoLabels = {
    pago_factura: 'Pago de Factura',
    pago_financiamiento: 'Pago de Financiamiento',
    venta_contado: 'Venta de Contado',
    deposito: 'Depósito',
    retiro: 'Retiro',
    gasto: 'Gasto',
    caja_chica: 'Caja Chica',
    otro: 'Otro'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Cuadre de Caja</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo Movimiento
          </button>
          <button
            onClick={() => setShowPagoMultipleModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
            title="Pagar facturas y financiamientos con ingreso por caja"
          >
            <CreditCard size={20} />
            Pagar con Ingreso
          </button>
          <button
            onClick={corregirDivisasIncorrectas}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center gap-2"
            title="Corregir registros que tienen USD pero deberían tener DOP"
          >
            <Edit size={20} />
            Corregir Divisas
          </button>
          <button
            onClick={generarPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download size={20} />
            Generar PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar Cliente
            </label>
            <div className="relative">
              <input
                type="text"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                placeholder="Nombre del cliente..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} className="text-gray-400" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="todos">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="egreso">Egresos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concepto
            </label>
            <select
              value={filtroConcepto}
              onChange={(e) => setFiltroConcepto(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="todos">Todos</option>
              <option value="pago_factura">Pago de Factura</option>
              <option value="pago_financiamiento">Pago de Financiamiento</option>
              <option value="venta_contado">Venta de Contado</option>
              <option value="deposito">Depósito</option>
              <option value="retiro">Retiro</option>
              <option value="gasto">Gasto</option>
              <option value="caja_chica">Caja Chica</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Resumen USD */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-green-100 text-sm font-medium">Ingresos USD</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totales.ingresosUSD, 'USD')}</p>
            </div>
            <TrendingUp size={40} className="text-green-200" />
          </div>
          <div className="border-t border-green-400 pt-2">
            <p className="text-green-100 text-xs">Egresos: {formatCurrency(totales.egresoUSD, 'USD')}</p>
            <p className="text-white text-lg font-bold mt-1">Saldo: {formatCurrency(totales.saldoUSD, 'USD')}</p>
          </div>
        </div>

        {/* Resumen DOP */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-blue-100 text-sm font-medium">Ingresos DOP</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totales.ingresosDOP, 'DOP')}</p>
            </div>
            <TrendingUp size={40} className="text-blue-200" />
          </div>
          <div className="border-t border-blue-400 pt-2">
            <p className="text-blue-100 text-xs">Egresos: {formatCurrency(totales.egresosDOP, 'DOP')}</p>
            <p className="text-white text-lg font-bold mt-1">Saldo: {formatCurrency(totales.saldoDOP, 'DOP')}</p>
          </div>
        </div>

        {/* Resumen Total */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-2">Resumen General</p>
              <div className="space-y-1">
                <p className="text-sm">USD: <span className="font-bold">{formatCurrency(totales.saldoUSD, 'USD')}</span></p>
                <p className="text-sm">DOP: <span className="font-bold">{formatCurrency(totales.saldoDOP, 'DOP')}</span></p>
              </div>
            </div>
            <DollarSign size={40} className="text-purple-200" />
          </div>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Concepto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Divisa
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movimientosFiltrados.map((movimiento) => (
                <tr key={movimiento.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movimiento.fecha}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      movimiento.tipo_movimiento === 'ingreso'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {movimiento.tipo_movimiento === 'ingreso' ? 'Ingreso' : 'Egreso'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {conceptoLabels[movimiento.concepto]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movimiento.metodo_pago?.toUpperCase() || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movimiento.referencia || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {movimiento.descripcion || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      (movimiento.divisa || 'DOP') === 'USD' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {movimiento.divisa || 'DOP'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${
                    movimiento.tipo_movimiento === 'ingreso' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movimiento.tipo_movimiento === 'ingreso' ? '+' : '-'}{formatCurrency(movimiento.monto, movimiento.divisa || 'DOP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleEditar(movimiento)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleEliminar(movimiento.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para pago múltiple */}
      {showPagoMultipleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Gestión de Pagos y Cobros</h2>
              <button
                onClick={() => {
                  setShowPagoMultipleModal(false);
                  setPagoMultiple({
                    tipo_operacion: 'cobro',
                    cliente_id: '',
                    suplidor_id: '',
                    monto_disponible: '',
                    metodo_pago: 'efectivo',
                    referencia: '',
                    descripcion: '',
                    divisa: 'DOP',
                    fecha: getFechaActual(),
                    facturas_seleccionadas: [],
                    financiamientos_seleccionados: [],
                    facturas_suplidores_seleccionadas: []
                  });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex mb-6 border-b border-gray-200">
              <button
                className={`flex-1 py-3 text-center font-bold text-lg transition-colors ${
                  pagoMultiple.tipo_operacion === 'cobro'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setPagoMultiple(prev => ({ ...prev, tipo_operacion: 'cobro' }))}
              >
                <div className="flex items-center justify-center gap-2">
                  <User size={20} />
                  Cobrar a Clientes (Ingreso)
                </div>
              </button>
              <button
                className={`flex-1 py-3 text-center font-bold text-lg transition-colors ${
                  pagoMultiple.tipo_operacion === 'pago'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setPagoMultiple(prev => ({ ...prev, tipo_operacion: 'pago' }))}
              >
                <div className="flex items-center justify-center gap-2">
                  <Truck size={20} />
                  Pagar a Suplidores (Egreso)
                </div>
              </button>
            </div>

            <form onSubmit={handlePagoMultiple}>
              {/* Información del pago */}
              <div className={`border rounded-lg p-4 mb-6 ${pagoMultiple.tipo_operacion === 'cobro' ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                <h3 className={`text-lg font-semibold mb-3 ${pagoMultiple.tipo_operacion === 'cobro' ? 'text-blue-900' : 'text-red-900'}`}>Información de {pagoMultiple.tipo_operacion === 'cobro' ? 'Cobro' : 'Pago'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      value={pagoMultiple.fecha}
                      onChange={(e) => setPagoMultiple({ ...pagoMultiple, fecha: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {pagoMultiple.tipo_operacion === 'cobro' ? 'Cliente *' : 'Suplidor *'}
                    </label>
                    <select
                      value={pagoMultiple.tipo_operacion === 'cobro' ? pagoMultiple.cliente_id : pagoMultiple.suplidor_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (pagoMultiple.tipo_operacion === 'cobro') {
                          setPagoMultiple({ ...pagoMultiple, cliente_id: val });
                        } else {
                          setPagoMultiple({ ...pagoMultiple, suplidor_id: val });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {pagoMultiple.tipo_operacion === 'cobro' ? (
                        clientes.map(cliente => (
                          <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                        ))
                      ) : (
                        suplidores.map(suplidor => (
                          <option key={suplidor.id} value={suplidor.id}>{suplidor.nombre}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto a {pagoMultiple.tipo_operacion === 'cobro' ? 'Recibir' : 'Pagar'} *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={pagoMultiple.monto_disponible}
                      onChange={(e) => setPagoMultiple({ ...pagoMultiple, monto_disponible: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Moneda *
                    </label>
                    <select
                      value={pagoMultiple.divisa}
                      onChange={(e) => setPagoMultiple({ ...pagoMultiple, divisa: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="DOP">🇩🇴 Pesos (DOP)</option>
                      <option value="USD">🇺🇸 Dólares (USD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de Pago *
                    </label>
                    <select
                      value={pagoMultiple.metodo_pago}
                      onChange={(e) => setPagoMultiple({ ...pagoMultiple, metodo_pago: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="cheque">Cheque</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Referencia
                    </label>
                    <input
                      type="text"
                      value={pagoMultiple.referencia}
                      onChange={(e) => setPagoMultiple({ ...pagoMultiple, referencia: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="No. Referencia/Cheque"
                    />
                  </div>
                </div>
              </div>

              {pagoMultiple.tipo_operacion === 'cobro' ? (
                <>
                  {/* ... Lógica de facturas de clientes (ya existente) ... */}
                  {/* Facturas pendientes del cliente */}
                  {pagoMultiple.cliente_id && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-green-600" />
                        Facturas Pendientes
                      </h3>
                      <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seleccionar</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {cuentasPorCobrar
                              .filter(c => c.cliente_id === parseInt(pagoMultiple.cliente_id))
                              .map(factura => (
                                <tr
                                  key={factura.id}
                                  className={`hover:bg-gray-50 cursor-pointer ${
                                    pagoMultiple.facturas_seleccionadas.includes(factura.id) ? 'bg-green-50' : ''
                                  }`}
                                  onClick={() => toggleFacturaSeleccionada(factura.id)}
                                >
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={pagoMultiple.facturas_seleccionadas.includes(factura.id)}
                                      onChange={() => toggleFacturaSeleccionada(factura.id)}
                                      className="w-4 h-4 text-green-600 rounded"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{factura.referencia}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{factura.tipo}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{factura.fecha_emision}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                                    {formatCurrency(factura.monto_pendiente, factura.divisa || 'DOP')}
                                  </td>
                                </tr>
                              ))}
                            {cuentasPorCobrar.filter(c => c.cliente_id === parseInt(pagoMultiple.cliente_id)).length === 0 && (
                              <tr>
                                <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                                  No hay facturas pendientes para este cliente
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Financiamientos pendientes del cliente */}
                  {pagoMultiple.cliente_id && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-blue-600" />
                        Financiamientos Pendientes
                      </h3>
                      <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seleccionar</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Financiamiento</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Préstamo</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto Original</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {financiamientos
                              .filter(f => f.cliente_id === parseInt(pagoMultiple.cliente_id))
                              .map(financiamiento => (
                                <tr
                                  key={financiamiento.id}
                                  className={`hover:bg-gray-50 cursor-pointer ${
                                    pagoMultiple.financiamientos_seleccionados.includes(financiamiento.id) ? 'bg-blue-50' : ''
                                  }`}
                                  onClick={() => toggleFinanciamientoSeleccionado(financiamiento.id)}
                                >
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={pagoMultiple.financiamientos_seleccionados.includes(financiamiento.id)}
                                      onChange={() => toggleFinanciamientoSeleccionado(financiamiento.id)}
                                      className="w-4 h-4 text-blue-600 rounded"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">FIN-{financiamiento.id}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{financiamiento.fecha_prestamo}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{financiamiento.fecha_vencimiento}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                    {formatCurrency(financiamiento.total_pagar, 'DOP')}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                                    {formatCurrency(financiamiento.balance_pendiente, 'DOP')}
                                  </td>
                                </tr>
                              ))}
                            {financiamientos.filter(f => f.cliente_id === parseInt(pagoMultiple.cliente_id)).length === 0 && (
                              <tr>
                                <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                                  No hay financiamientos pendientes para este cliente
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* --- VISTA DE PAGOS A SUPLIDORES --- */}
                  {pagoMultiple.suplidor_id && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-red-600" />
                        Facturas de Compra Pendientes
                      </h3>
                      <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seleccionar</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Factura</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {facturasCompra
                              .filter(f => f.suplidor_id === parseInt(pagoMultiple.suplidor_id))
                              .map(factura => (
                                <tr
                                  key={factura.id}
                                  className={`hover:bg-gray-50 cursor-pointer ${
                                    pagoMultiple.facturas_suplidores_seleccionadas.includes(factura.id) ? 'bg-red-50' : ''
                                  }`}
                                  onClick={() => toggleFacturaSuplidorSeleccionada(factura.id)}
                                >
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={pagoMultiple.facturas_suplidores_seleccionadas.includes(factura.id)}
                                      onChange={() => toggleFacturaSuplidorSeleccionada(factura.id)}
                                      className="w-4 h-4 text-red-600 rounded"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{factura.numero_factura}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{factura.fecha}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{factura.fecha_vencimiento || '-'}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                    {formatCurrency(factura.total, factura.divisa || 'DOP')}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                                    {formatCurrency(factura.balance_pendiente, factura.divisa || 'DOP')}
                                  </td>
                                </tr>
                              ))}
                            {facturasCompra.filter(f => f.suplidor_id === parseInt(pagoMultiple.suplidor_id)).length === 0 && (
                              <tr>
                                <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                                  No hay facturas de compra pendientes para este suplidor
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Resumen del pago */}
              {(
                (pagoMultiple.tipo_operacion === 'cobro' && pagoMultiple.cliente_id && (pagoMultiple.facturas_seleccionadas.length > 0 || pagoMultiple.financiamientos_seleccionados.length > 0)) ||
                (pagoMultiple.tipo_operacion === 'pago' && pagoMultiple.suplidor_id && pagoMultiple.facturas_suplidores_seleccionadas.length > 0)
              ) && (
                <div className={`border rounded-lg p-4 mb-6 ${pagoMultiple.tipo_operacion === 'cobro' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                  <h3 className={`text-lg font-semibold mb-3 ${pagoMultiple.tipo_operacion === 'cobro' ? 'text-green-900' : 'text-orange-900'}`}>Resumen</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Monto {pagoMultiple.tipo_operacion === 'cobro' ? 'Ingreso' : 'a Pagar'}:</p>
                      <p className={`text-xl font-bold ${pagoMultiple.tipo_operacion === 'cobro' ? 'text-green-700' : 'text-orange-700'}`}>
                        {pagoMultiple.monto_disponible ? formatCurrency(parseFloat(pagoMultiple.monto_disponible), pagoMultiple.divisa) : formatCurrency(0, pagoMultiple.divisa)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Seleccionado:</p>
                      <p className="text-xl font-bold text-gray-800">
                        {formatCurrency(calcularTotalSeleccionado(), pagoMultiple.divisa)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Diferencia:</p>
                      <p className={`text-xl font-bold ${(parseFloat(pagoMultiple.monto_disponible) - calcularTotalSeleccionado()) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {formatCurrency((parseFloat(pagoMultiple.monto_disponible || 0) - calcularTotalSeleccionado()), pagoMultiple.divisa)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPagoMultipleModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2 text-white rounded-lg font-bold shadow-lg transform transition-transform hover:scale-105 ${
                    pagoMultiple.tipo_operacion === 'cobro'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {pagoMultiple.tipo_operacion === 'cobro' ? 'Procesar Cobro' : 'Procesar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Modal para nuevo movimiento */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{editando ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Movimiento *
                  </label>
                  <select
                    value={formData.tipo_movimiento}
                    onChange={(e) => setFormData({ ...formData, tipo_movimiento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Concepto *
                  </label>
                  <select
                    value={formData.concepto}
                    onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="pago_factura">Pago de Factura</option>
                    <option value="venta_contado">Venta de Contado</option>
                    <option value="deposito">Depósito</option>
                    <option value="retiro">Retiro</option>
                    <option value="gasto">Gasto</option>
                    <option value="caja_chica">Caja Chica</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moneda *
                  </label>
                  <select
                    value={formData.divisa}
                    onChange={(e) => setFormData({ ...formData, divisa: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="USD">🇺🇸 Dólares (USD)</option>
                    <option value="DOP">🇩🇴 Pesos (DOP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago *
                  </label>
                  <select
                    value={formData.metodo_pago}
                    onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referencia
                  </label>
                  <input
                    type="text"
                    value={formData.referencia}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ej: CHQ-12345"
                  />
                </div>

                {formData.concepto === 'pago_factura' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cliente (Opcional)
                      </label>
                      <select
                        value={formData.cliente_id}
                        onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Seleccionar cliente</option>
                        {clientes.map(cliente => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cuenta por Cobrar (Opcional)
                      </label>
                      <select
                        value={formData.cuenta_cobrar_id}
                        onChange={(e) => {
                          const cuentaId = e.target.value;
                          const cuenta = cuentasPorCobrar.find(c => c.id === parseInt(cuentaId));
                          setFormData({ 
                            ...formData, 
                            cuenta_cobrar_id: cuentaId,
                            cliente_id: cuenta?.cliente_id || formData.cliente_id,
                            monto: cuenta ? cuenta.monto_pendiente.toString() : formData.monto,
                            referencia: cuenta ? cuenta.referencia : formData.referencia,
                            divisa: cuenta?.divisa || formData.divisa
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Seleccionar cuenta (para sincronizar pagos)</option>
                        {cuentasPorCobrar.map(cuenta => (
                          <option key={cuenta.id} value={cuenta.id}>
                            {cuenta.referencia} - {cuenta.clientes?.nombre || 'Sin cliente'} - Pendiente: {formatCurrency(cuenta.monto_pendiente, cuenta.divisa || 'DOP')}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Si seleccionas una cuenta, el pago se aplicará automáticamente a la cuenta por cobrar
                      </p>
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows="3"
                    placeholder="Descripción del movimiento"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditando(null);
                    setFormData({
                      fecha: getFechaActual(),
                      tipo_movimiento: 'ingreso',
                      concepto: 'deposito',
                      monto: '',
                      metodo_pago: 'efectivo',
                      referencia: '',
                      descripcion: '',
                      cliente_id: '',
                      cuenta_cobrar_id: '',
                      divisa: 'DOP'
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {editando ? 'Actualizar Movimiento' : 'Guardar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}