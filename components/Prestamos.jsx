import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Plus, X, Download, Calendar, TrendingUp, AlertCircle, Edit } from 'lucide-react';
import { generatePrestamoPDF } from '../lib/pdfGenerator';

export default function Prestamos() {
  const [prestamos, setPrestamos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPagosModal, setShowPagosModal] = useState(false);
  const [showEditTasaModal, setShowEditTasaModal] = useState(false);
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState(null);
  const [pagosPrestamo, setPagosPrestamo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nuevaTasa, setNuevaTasa] = useState('');
  const [nuevaFechaPrestamo, setNuevaFechaPrestamo] = useState('');
  const [nuevaFechaVencimiento, setNuevaFechaVencimiento] = useState('');
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    nombre_cliente: '',
    cedula_cliente: '',
    monto_prestado: '',
    tasa_interes: '3.00',
    fecha_prestamo: new Date().toISOString().split('T')[0],
    plazo_meses: '',
    notas: ''
  });

  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesFiltrados, setClientesFiltrados] = useState([]);

  const [pagoData, setPagoData] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    monto_pagado: '',
    notas: ''
  });

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [facturasCredito, setFacturasCredito] = useState([]);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);

  useEffect(() => {
    cargarPrestamos();
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (!error && data) {
      setClientes(data);
    }
  };

  const cargarPrestamos = async () => {
    const { data, error } = await supabase
      .from('financiamientos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Actualizar estados automáticamente y calcular intereses diarios
      const prestamosActualizados = data.map(p => {
        const hoy = new Date();
        const vencimiento = new Date(p.fecha_vencimiento);
        const fechaPrestamo = new Date(p.fecha_prestamo);
        
        // Calcular días transcurridos desde el préstamo hasta hoy
        const diasTranscurridos = Math.floor((hoy - fechaPrestamo) / (1000 * 60 * 60 * 24));
        
        // Calcular interés diario
        const montoPrestado = parseFloat(p.monto_prestado) || 0;
        const tasaMensual = parseFloat(p.tasa_interes) || 0;
        const interesMensual = montoPrestado * (tasaMensual / 100);
        const interesDiario = interesMensual / 30;
        
        // Calcular interés acumulado al día de hoy
        const interesAcumuladoActual = interesDiario * diasTranscurridos;
        const totalActualizado = montoPrestado + interesAcumuladoActual;
        
        // Determinar estado
        let estado = p.estado;
        if (p.balance_pendiente <= 0) {
          estado = 'Pagado';
        } else if (vencimiento < hoy && p.balance_pendiente > 0) {
          estado = 'Atrasado';
        }
        
        return { 
          ...p, 
          estado,
          diasTranscurridos,
          interesDiario,
          interesAcumuladoActual,
          totalActualizado
        };
      });
      
      setPrestamos(prestamosActualizados);
    }
  };

  const cargarFacturasCredito = async (clienteId) => {
    const { data, error } = await supabase
      .from('facturas_venta')
      .select('*')
      .eq('cliente_id', clienteId)
      .gt('balance_pendiente', 0)
      .order('fecha', { ascending: false });
    
    if (!error && data) {
      setFacturasCredito(data);
    } else {
      setFacturasCredito([]);
    }
  };

  // Función para formatear números con puntos y comas
  const formatMoney = (value) => {
    const num = parseFloat(value) || 0;
    const formatted = num.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `RD$ ${formatted}`; // Moneda predeterminada: Pesos Dominicanos
  };

  const calculado = useMemo(() => {
    const monto = parseFloat(formData.monto_prestado) || 0;
    const tasa = parseFloat(formData.tasa_interes) || 0;
    const meses = parseInt(formData.plazo_meses) || 0;
    
    if (monto === 0 || tasa === 0 || meses === 0) {
      return {
        interes_generado: '0.00',
        total_pagar: '0.00',
        fecha_vencimiento: '',
        dias_totales: 0
      };
    }
    
    const fechaPrestamo = new Date(formData.fecha_prestamo);
    const fechaVencimiento = new Date(fechaPrestamo);
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + meses);
    
    // Calcular días REALES entre fecha de préstamo y fecha de vencimiento
    const diasReales = Math.floor((fechaVencimiento - fechaPrestamo) / (1000 * 60 * 60 * 24));
    
    // Calcular interés: tasa mensual convertida a diaria
    // Interés mensual = monto * (tasa / 100)
    // Interés diario = interés mensual / 30 (promedio de días por mes)
    // Interés total = interés diario * días reales
    const interesMensual = monto * (tasa / 100);
    const interesDiario = interesMensual / 30;
    const interes = interesDiario * diasReales;
    const total = monto + interes;
    
    return {
      interes_generado: interes.toFixed(2),
      total_pagar: total.toFixed(2),
      fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
      dias_totales: diasReales
    };
  }, [formData.monto_prestado, formData.tasa_interes, formData.plazo_meses, formData.fecha_prestamo]);

  const calcularPrestamo = () => calculado;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const calculado = calcularPrestamo();
      
      // Validar que el cliente esté seleccionado
      if (!formData.cliente_id) {
        alert('Por favor selecciona un cliente');
        setLoading(false);
        return;
      }
      
      // Insertar financiamiento
      const { data: prestamoData, error: errorPrestamo } = await supabase.from('financiamientos').insert([{
        cliente_id: parseInt(formData.cliente_id),
        nombre_cliente: formData.nombre_cliente,
        cedula_cliente: formData.cedula_cliente,
        monto_prestado: parseFloat(formData.monto_prestado),
        tasa_interes: parseFloat(formData.tasa_interes),
        fecha_prestamo: formData.fecha_prestamo,
        plazo_meses: parseInt(formData.plazo_meses),
        interes_generado: parseFloat(calculado.interes_generado),
        total_pagar: parseFloat(calculado.total_pagar),
        balance_pendiente: parseFloat(calculado.total_pagar),
        fecha_vencimiento: calculado.fecha_vencimiento,
        estado: 'Activo',
        notas: formData.notas
      }]).select();

      if (errorPrestamo) {
        console.error('Error al guardar financiamiento:', errorPrestamo);
        alert('Error al guardar el financiamiento: ' + errorPrestamo.message);
        setLoading(false);
        return;
      }

      // Actualizar balance_pendiente del cliente
      const { data: clienteActual } = await supabase
        .from('clientes')
        .select('balance_pendiente')
        .eq('id', parseInt(formData.cliente_id))
        .single();

      const nuevoBalance = (parseFloat(clienteActual?.balance_pendiente || 0)) + parseFloat(calculado.total_pagar);

      const { error: errorCliente } = await supabase
        .from('clientes')
        .update({ balance_pendiente: nuevoBalance })
        .eq('id', parseInt(formData.cliente_id));

      setLoading(false);

      if (errorCliente) {
        console.error('Error al actualizar cliente:', errorCliente);
        alert('Financiamiento guardado pero error al actualizar balance del cliente');
        return;
      }

      // Si hay una factura seleccionada, aplicar el pago automáticamente
      if (facturaSeleccionada) {
        const montoPago = Math.min(parseFloat(formData.monto_prestado), facturaSeleccionada.balance_pendiente);
        const nuevoBalanceFactura = facturaSeleccionada.balance_pendiente - montoPago;
        const nuevoEstadoFactura = nuevoBalanceFactura <= 0 ? 'pagada' : (nuevoBalanceFactura < facturaSeleccionada.total ? 'pendiente' : 'pendiente');

        // Actualizar factura
        const { error: errorFactura } = await supabase
          .from('facturas_venta')
          .update({
            balance_pendiente: nuevoBalanceFactura,
            monto_pagado: facturaSeleccionada.total - nuevoBalanceFactura,
            estado: nuevoEstadoFactura
          })
          .eq('id', facturaSeleccionada.id);

        if (errorFactura) {
          console.error('Error al actualizar factura:', errorFactura);
          alert('Financiamiento guardado pero error al aplicar pago a la factura');
          return;
        }

        // Registrar cobro en cobros_ventas
        const { error: errorCobro } = await supabase
          .from('cobros_ventas')
          .insert([{
            venta_id: facturaSeleccionada.id,
            fecha_cobro: formData.fecha_prestamo,
            monto: montoPago,
            metodo_pago: 'financiamiento',
            notas: `Pago mediante financiamiento. Referencia: FIN-${prestamoData[0].id}`
          }]);

        if (errorCobro) {
          console.error('Error al registrar cobro:', errorCobro);
        }

        // Actualizar cuentas por cobrar
        const { error: errorCxC } = await supabase
          .from('cuentas_por_cobrar')
          .update({
            monto_pendiente: nuevoBalanceFactura,
            estado: nuevoBalanceFactura <= 0 ? 'Pagada' : (nuevoBalanceFactura < facturaSeleccionada.total ? 'Parcial' : 'Pendiente')
          })
          .eq('referencia', facturaSeleccionada.numero_factura)
          .eq('tipo', 'factura_venta');

        if (errorCxC) {
          console.error('Error al actualizar cuentas por cobrar:', errorCxC);
        }

        alert(`✅ Financiamiento registrado exitosamente!\n- Agregado a Cuentas por Cobrar\n- Balance del cliente actualizado\n- Pago de ${formatMoney(montoPago)} aplicado a la factura ${facturaSeleccionada.numero_factura}`);
      } else {
        alert('✅ Financiamiento registrado exitosamente!\n- Agregado a Cuentas por Cobrar\n- Balance del cliente actualizado');
      }

      setShowModal(false);
      setBusquedaCliente('');
      setClientesFiltrados([]);
      setFacturasCredito([]);
      setFacturaSeleccionada(null);
      setFormData({
        cliente_id: '',
        nombre_cliente: '',
        cedula_cliente: '',
        monto_prestado: '',
        tasa_interes: '3.00',
        fecha_prestamo: new Date().toISOString().split('T')[0],
        plazo_meses: '',
        notas: ''
      });
      cargarPrestamos();
      cargarClientes();
    } catch (error) {
      console.error('Error general:', error);
      alert('Error al guardar el financiamiento: ' + error.message);
      setLoading(false);
    }
  };

  const abrirPagos = async (prestamo) => {
    setPrestamoSeleccionado(prestamo);
    
    const { data, error } = await supabase
      .from('pagos_financiamientos')
      .select('*')
      .eq('financiamiento_id', prestamo.id)
      .order('fecha_pago', { ascending: false });
    
    if (!error && data) {
      setPagosPrestamo(data);
    }
    
    setShowPagosModal(true);
  };

  const registrarPago = async (e) => {
    e.preventDefault();
    setLoading(true);

    const montoPagado = parseFloat(pagoData.monto_pagado) || 0;
    const nuevoBalance = prestamoSeleccionado.balance_pendiente - montoPagado;

    // Insertar pago
    const { error: errorPago } = await supabase.from('pagos_financiamientos').insert([{
      financiamiento_id: prestamoSeleccionado.id,
      fecha_pago: pagoData.fecha_pago,
      monto_pagado: montoPagado,
      balance_actualizado: nuevoBalance,
      notas: pagoData.notas
    }]);

    if (errorPago) {
      alert('Error al registrar el pago');
      setLoading(false);
      return;
    }

    // Actualizar balance del financiamiento
    const nuevoEstado = nuevoBalance <= 0 ? 'Pagado' : prestamoSeleccionado.estado;
    
    const { error: errorUpdate } = await supabase
      .from('financiamientos')
      .update({ 
        balance_pendiente: nuevoBalance,
        estado: nuevoEstado
      })
      .eq('id', prestamoSeleccionado.id);

    setLoading(false);

    if (errorUpdate) {
      alert('Error al actualizar el préstamo');
      return;
    }

    alert('Pago registrado exitosamente');
    setPagoData({
      fecha_pago: new Date().toISOString().split('T')[0],
      monto_pagado: '',
      notas: ''
    });
    
    // Recargar datos
    cargarPrestamos();
    abrirPagos({ ...prestamoSeleccionado, balance_pendiente: nuevoBalance });
  };

  const eliminarPrestamo = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este financiamiento? Se eliminarán también todos los pagos asociados.')) return;

    const { error } = await supabase.from('financiamientos').delete().eq('id', id);

    if (error) {
      alert('Error al eliminar el financiamiento');
      return;
    }

    alert('Financiamiento eliminado exitosamente');
    cargarPrestamos();
  };

  const abrirEditarTasa = (prestamo) => {
    setPrestamoSeleccionado(prestamo);
    setNuevaTasa(prestamo.tasa_interes);
    setNuevaFechaPrestamo(prestamo.fecha_prestamo);
    setNuevaFechaVencimiento(prestamo.fecha_vencimiento);
    setShowEditTasaModal(true);
  };

  const actualizarTasa = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Recalcular interés y total con las nuevas fechas
    const fechaPrestamo = new Date(nuevaFechaPrestamo);
    const fechaVencimiento = new Date(nuevaFechaVencimiento);
    const diasReales = Math.floor((fechaVencimiento - fechaPrestamo) / (1000 * 60 * 60 * 24));
    
    const monto = parseFloat(prestamoSeleccionado.monto_prestado);
    const tasa = parseFloat(nuevaTasa);
    const interesMensual = monto * (tasa / 100);
    const interesDiario = interesMensual / 30;
    const interesGenerado = interesDiario * diasReales;
    const totalPagar = monto + interesGenerado;

    const { error } = await supabase
      .from('financiamientos')
      .update({ 
        tasa_interes: nuevaTasa,
        fecha_prestamo: nuevaFechaPrestamo,
        fecha_vencimiento: nuevaFechaVencimiento,
        interes_generado: interesGenerado,
        total_pagar: totalPagar,
        balance_pendiente: totalPagar
      })
      .eq('id', prestamoSeleccionado.id);

    setLoading(false);

    if (error) {
      alert('Error al actualizar el financiamiento');
      return;
    }

    alert('Financiamiento actualizado exitosamente');
    setShowEditTasaModal(false);
    cargarPrestamos();
  };

  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'Activo': return 'bg-blue-100 text-blue-800';
      case 'Pagado': return 'bg-green-100 text-green-800';
      case 'Atrasado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calcularTotalesPorCliente = (clienteId) => {
    const prestamosCliente = prestamos.filter(p => p.cliente_id === clienteId);
    
    return {
      totalPrestado: prestamosCliente.reduce((sum, p) => sum + parseFloat(p.monto_prestado), 0),
      totalInteres: prestamosCliente.reduce((sum, p) => sum + parseFloat(p.interes_generado), 0),
      totalPagar: prestamosCliente.reduce((sum, p) => sum + parseFloat(p.total_pagar), 0),
      balancePendiente: prestamosCliente.reduce((sum, p) => sum + parseFloat(p.balance_pendiente), 0),
      cantidadPrestamos: prestamosCliente.length,
      prestamos: prestamosCliente
    };
  };

  const abrirDetallesCliente = (cliente) => {
    const totales = calcularTotalesPorCliente(cliente.id);
    setClienteSeleccionado({ ...cliente, ...totales });
    setShowClienteModal(true);
  };

  const generarCuentaPorCobrar = async (prestamo) => {
    if (!confirm(`¿Generar cuenta por cobrar actualizada al día de hoy?\n\nInterés Acumulado: ${formatMoney(prestamo.interesAcumuladoActual)}\nTotal Actualizado: ${formatMoney(prestamo.totalActualizado)}\nDías Transcurridos: ${prestamo.diasTranscurridos} días`)) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('cuentas_por_cobrar')
        .insert([{
          cliente_id: prestamo.cliente_id,
          cliente: prestamo.nombre_cliente,
          tipo: 'financiamiento_actualizado',
          referencia: `FIN-${prestamo.id}-ACT-${new Date().toISOString().split('T')[0]}`,
          fecha_emision: new Date().toISOString().split('T')[0],
          monto_total: prestamo.totalActualizado,
          monto_pendiente: prestamo.totalActualizado,
          estado: 'Pendiente',
          divisa: 'DOP',
          notas: `Cuenta por cobrar generada automáticamente del financiamiento FIN-${prestamo.id}. Interés diario: ${formatMoney(prestamo.interesDiario)}. Días transcurridos: ${prestamo.diasTranscurridos}. Interés acumulado: ${formatMoney(prestamo.interesAcumuladoActual)}.`
        }])
        .select();

      if (error) throw error;

      // Actualizar balance del cliente
      const { data: clienteActual } = await supabase
        .from('clientes')
        .select('balance_pendiente')
        .eq('id', prestamo.cliente_id)
        .single();

      const nuevoBalance = (parseFloat(clienteActual?.balance_pendiente || 0)) + prestamo.totalActualizado;

      await supabase
        .from('clientes')
        .update({ balance_pendiente: nuevoBalance })
        .eq('id', prestamo.cliente_id);

      setLoading(false);
      alert(`✅ Cuenta por cobrar generada exitosamente!\n\nReferencia: ${data[0].referencia}\nMonto Total: ${formatMoney(prestamo.totalActualizado)}\nInterés Acumulado: ${formatMoney(prestamo.interesAcumuladoActual)}\nDías: ${prestamo.diasTranscurridos}`);
      cargarPrestamos();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar la cuenta por cobrar: ' + error.message);
      setLoading(false);
    }
  };

  const generarPDFCliente = async (cliente) => {
    if (typeof window === 'undefined') return;
    
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');
    
    const doc = new jsPDF();
    const totales = calcularTotalesPorCliente(cliente.id);

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
    doc.text('REPORTE DE FINANCIAMIENTOS POR CLIENTE', 105, 45, { align: 'center' });

    // Información del Cliente
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Cliente:', 14, 60);
    doc.setFont(undefined, 'normal');
    doc.text(cliente.nombre, 35, 60);
    
    doc.setFont(undefined, 'bold');
    doc.text('Cédula:', 14, 67);
    doc.setFont(undefined, 'normal');
    doc.text(cliente.cedula, 35, 67);

    // Resumen de totales
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(34, 197, 94);
    doc.rect(14, 75, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('RESUMEN', 105, 80, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Prestado: ${formatMoney(totales.totalPrestado)}`, 20, 90);
    doc.text(`Total Interés: ${formatMoney(totales.totalInteres)}`, 20, 97);
    doc.text(`Total a Pagar: ${formatMoney(totales.totalPagar)}`, 20, 104);
    doc.setFont(undefined, 'bold');
    doc.text(`Balance Pendiente: ${formatMoney(totales.balancePendiente)}`, 20, 111);

    // Tabla de préstamos
    const tableData = totales.prestamos.map(p => [
      new Date(p.fecha_prestamo).toLocaleDateString(),
      `${formatMoney(p.monto_prestado)}`,
      `${p.tasa_interes}%`,
      `${formatMoney(p.interes_generado)}`,
      `${formatMoney(p.total_pagar)}`,
      `${formatMoney(p.balance_pendiente)}`
    ]);

    doc.autoTable({
      startY: 120,
      head: [['Fecha', 'Monto', 'Tasa', 'Interés', 'Total', 'Balance']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
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

    doc.save(`financiamientos_${cliente.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Financiamientos</h1>
                <p className="text-gray-600">Gestión de financiamientos y pagos</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClienteModal(true)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <TrendingUp className="w-5 h-5" />
                Seleccionar Clientes
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuevo Financiamiento
              </button>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm">Total Prestado</p>
            <p className="text-2xl font-bold text-gray-800">
              {formatMoney(prestamos.reduce((sum, p) => sum + parseFloat(p.monto_prestado), 0))}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm">Total a Cobrar</p>
            <p className="text-2xl font-bold text-green-600">
              {formatMoney(prestamos.reduce((sum, p) => sum + parseFloat(p.total_pagar), 0))}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm">Balance Pendiente</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatMoney(prestamos.reduce((sum, p) => sum + parseFloat(p.balance_pendiente), 0))}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm">Financiamientos Activos</p>
            <p className="text-2xl font-bold text-orange-600">
              {prestamos.filter(p => p.estado === 'Activo').length}
            </p>
          </div>
        </div>

        {/* Tabla de Financiamientos */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cédula</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interés/Día</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interés Acum.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Actual</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {prestamos.map((prestamo) => (
                  <tr key={prestamo.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{prestamo.nombre_cliente}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{prestamo.cedula_cliente}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatMoney(prestamo.monto_prestado)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{prestamo.tasa_interes}%</td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{formatMoney(prestamo.interesDiario)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-purple-600">{prestamo.diasTranscurridos} días</td>
                    <td className="px-4 py-3 text-sm font-medium text-orange-600">{formatMoney(prestamo.interesAcumuladoActual)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600">{formatMoney(prestamo.totalActualizado)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{formatMoney(prestamo.balance_pendiente)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(prestamo.fecha_vencimiento).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(prestamo.estado)}`}>
                        {prestamo.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => generarCuentaPorCobrar(prestamo)}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs font-medium flex items-center gap-1 whitespace-nowrap"
                          title="Generar Cuenta por Cobrar Actualizada"
                        >
                          <Plus className="w-3 h-3" />
                          CxC
                        </button>
                        <button
                          onClick={() => abrirEditarTasa(prestamo)}
                          className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 text-xs font-medium flex items-center gap-1"
                          title="Editar Tasa"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => abrirPagos(prestamo)}
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-xs font-medium flex items-center gap-1"
                        >
                          <DollarSign className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => generatePrestamoPDF(prestamo, pagosPrestamo)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => eliminarPrestamo(prestamo.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Nuevo Financiamiento */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Nuevo Financiamiento</h2>
                  <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Cliente *</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Escribe el nombre del cliente..."
                          value={busquedaCliente}
                          onChange={(e) => {
                            const valor = e.target.value;
                            setBusquedaCliente(valor);
                            
                            if (valor.length > 0) {
                              const filtrados = clientes.filter(c => 
                                c.nombre.toLowerCase().includes(valor.toLowerCase()) ||
                                c.cedula.includes(valor)
                              );
                              setClientesFiltrados(filtrados);
                            } else {
                              setClientesFiltrados([]);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                        
                        {clientesFiltrados.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {clientesFiltrados.map(cliente => (
                              <button
                                key={cliente.id}
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    cliente_id: cliente.id.toString(),
                                    nombre_cliente: cliente.nombre,
                                    cedula_cliente: cliente.cedula
                                  });
                                  setBusquedaCliente(cliente.nombre);
                                  setClientesFiltrados([]);
                                  cargarFacturasCredito(cliente.id);
                                  setFacturaSeleccionada(null);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-green-50 flex justify-between items-center"
                              >
                                <span className="font-medium text-gray-800">{cliente.nombre}</span>
                                <span className="text-sm text-gray-500">{cliente.cedula}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Cliente</label>
                      <input
                        type="text"
                        disabled
                        value={formData.nombre_cliente}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cédula del Cliente</label>
                      <input
                        type="text"
                        disabled
                        value={formData.cedula_cliente}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>

                    {/* Selector de Factura a Crédito */}
                    {facturasCredito.length > 0 && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ¿Deseas saldar una factura a crédito con este financiamiento? (Opcional)
                        </label>
                        <select
                          value={facturaSeleccionada ? facturaSeleccionada.id : ''}
                          onChange={(e) => {
                            const facturaId = parseInt(e.target.value);
                            const factura = facturasCredito.find(f => f.id === facturaId);
                            setFacturaSeleccionada(factura || null);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">No saldar ninguna factura (solo financiamiento)</option>
                          {facturasCredito.map(factura => (
                            <option key={factura.id} value={factura.id}>
                              {factura.numero_factura} - Fecha: {new Date(factura.fecha).toLocaleDateString()} - Balance: {formatMoney(factura.balance_pendiente)}
                            </option>
                          ))}
                        </select>
                        {facturaSeleccionada && (
                          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              <strong>⚠️ Nota:</strong> El monto del financiamiento se aplicará automáticamente como pago a la factura {facturaSeleccionada.numero_factura}. 
                              Si el monto excede el balance de la factura, el excedente quedará como crédito disponible para el cliente.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monto Prestado ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.monto_prestado}
                        onChange={(e) => setFormData({...formData, monto_prestado: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de Interés (%) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.tasa_interes}
                        onChange={(e) => setFormData({...formData, tasa_interes: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del Préstamo *</label>
                      <input
                        type="date"
                        required
                        value={formData.fecha_prestamo}
                        onChange={(e) => setFormData({...formData, fecha_prestamo: e.target.value})}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plazo (Meses) *</label>
                      <input
                        type="number"
                        required
                        value={formData.plazo_meses}
                        onChange={(e) => setFormData({...formData, plazo_meses: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  {/* Cálculos Automáticos */}
                  {formData.monto_prestado && formData.tasa_interes && formData.plazo_meses && (
                    <div className="bg-green-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Días Totales:</span>
                        <span className="font-bold text-gray-800">{calculado.dias_totales} días</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Interés Generado:</span>
                        <span className="font-bold text-green-600">{formatMoney(calculado.interes_generado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Total a Pagar:</span>
                        <span className="font-bold text-green-600">{formatMoney(calculado.total_pagar)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Fecha de Vencimiento:</span>
                        <span className="font-bold text-gray-800">{new Date(calculado.fecha_vencimiento).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                    <textarea
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                    >
                      {loading ? 'Guardando...' : 'Guardar Financiamiento'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal Editar Tasa */}
        {showEditTasaModal && prestamoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Editar Financiamiento</h2>
                  <button onClick={() => setShowEditTasaModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={actualizarTasa} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                    <input
                      type="text"
                      value={prestamoSeleccionado.nombre_cliente}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monto Prestado</label>
                      <input
                        type="text"
                        value={formatMoney(prestamoSeleccionado.monto_prestado)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tasa Actual</label>
                      <input
                        type="text"
                        value={`${prestamoSeleccionado.tasa_interes}%`}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Tasa de Interés (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={nuevaTasa}
                      onChange={(e) => setNuevaTasa(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Fecha Préstamo *
                      </label>
                      <input
                        type="date"
                        required
                        value={nuevaFechaPrestamo}
                        onChange={(e) => setNuevaFechaPrestamo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Fecha Vencimiento *
                      </label>
                      <input
                        type="date"
                        required
                        value={nuevaFechaVencimiento}
                        onChange={(e) => setNuevaFechaVencimiento(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Vista previa de cálculos */}
                  {nuevaTasa && nuevaFechaPrestamo && nuevaFechaVencimiento && (() => {
                    const fechaPrestamo = new Date(nuevaFechaPrestamo);
                    const fechaVencimiento = new Date(nuevaFechaVencimiento);
                    const diasReales = Math.floor((fechaVencimiento - fechaPrestamo) / (1000 * 60 * 60 * 24));
                    const monto = parseFloat(prestamoSeleccionado.monto_prestado);
                    const tasa = parseFloat(nuevaTasa);
                    const interesMensual = monto * (tasa / 100);
                    const interesDiario = interesMensual / 30;
                    const interesGenerado = interesDiario * diasReales;
                    const totalPagar = monto + interesGenerado;

                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                        <p className="text-sm font-semibold text-blue-800 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Vista Previa de Cálculos
                        </p>
                        <div className="text-xs text-blue-700 space-y-1">
                          <p>Días del préstamo: <span className="font-semibold">{diasReales} días</span></p>
                          <p>Interés diario: <span className="font-semibold">{formatMoney(interesDiario)}</span></p>
                          <p>Interés generado: <span className="font-semibold">{formatMoney(interesGenerado)}</span></p>
                          <p className="text-sm font-bold text-blue-900 pt-1 border-t border-blue-300">
                            Total a pagar: {formatMoney(totalPagar)}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50"
                    >
                      {loading ? 'Guardando...' : 'Actualizar Financiamiento'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditTasaModal(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal Seleccionar Clientes */}
        {showClienteModal && !clienteSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Seleccionar Cliente</h2>
                  <button onClick={() => setShowClienteModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientes.map((cliente) => {
                    const totales = calcularTotalesPorCliente(cliente.id);
                    if (totales.cantidadPrestamos === 0) return null;
                    
                    return (
                      <button
                        key={cliente.id}
                        onClick={() => abrirDetallesCliente(cliente)}
                        className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-purple-500 hover:shadow-lg transition-all text-left"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-purple-100 p-2 rounded-full">
                            <DollarSign className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800">{cliente.nombre}</h3>
                            <p className="text-xs text-gray-500">{cliente.cedula}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Préstamos:</span>
                            <span className="font-bold text-gray-800">{totales.cantidadPrestamos}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Prestado:</span>
                            <span className="font-bold text-blue-600">{formatMoney(totales.totalPrestado)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Interés:</span>
                            <span className="font-bold text-orange-600">{formatMoney(totales.totalInteres)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Balance:</span>
                            <span className="font-bold text-green-600">{formatMoney(totales.balancePendiente)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Detalles Cliente */}
        {showClienteModal && clienteSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{clienteSeleccionado.nombre}</h2>
                    <p className="text-gray-600">Cédula: {clienteSeleccionado.cedula}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setClienteSeleccionado(null);
                      setShowClienteModal(false);
                    }} 
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Resumen del Cliente */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Prestado</p>
                    <p className="text-2xl font-bold text-blue-600">{formatMoney(clienteSeleccionado.totalPrestado)}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Interés</p>
                    <p className="text-2xl font-bold text-orange-600">{formatMoney(clienteSeleccionado.totalInteres)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total a Pagar</p>
                    <p className="text-2xl font-bold text-green-600">{formatMoney(clienteSeleccionado.totalPagar)}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Balance Pendiente</p>
                    <p className="text-2xl font-bold text-purple-600">{formatMoney(clienteSeleccionado.balancePendiente)}</p>
                  </div>
                </div>

                {/* Lista de Préstamos del Cliente */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-4">Préstamos del Cliente ({clienteSeleccionado.cantidadPrestamos})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasa</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interés</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {clienteSeleccionado.prestamos.map((prestamo) => (
                          <tr key={prestamo.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700">{new Date(prestamo.fecha_prestamo).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm font-medium text-blue-600">{formatMoney(prestamo.monto_prestado)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{prestamo.tasa_interes}%</td>
                            <td className="px-4 py-3 text-sm font-medium text-orange-600">{formatMoney(prestamo.interes_generado)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-green-600">{formatMoney(prestamo.total_pagar)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-purple-600">{formatMoney(prestamo.balance_pendiente)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(prestamo.estado)}`}>
                                {prestamo.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => generarPDFCliente(clienteSeleccionado)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Generar PDF
                  </button>
                  <button
                    onClick={() => {
                      setClienteSeleccionado(null);
                      setShowClienteModal(false);
                      setPagoData({
                        fecha_pago: new Date().toISOString().split('T')[0],
                        monto_pagado: '',
                        notas: ''
                      });
                      if (clienteSeleccionado.prestamos.length > 0) {
                        abrirPagos(clienteSeleccionado.prestamos[0]);
                      }
                    }}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    Registrar Pago
                  </button>
                  <button
                    onClick={() => setClienteSeleccionado(null)}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                  >
                    Volver a Lista
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Pagos */}
        {showPagosModal && prestamoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Pagos del Financiamiento</h2>
                    <p className="text-gray-600">{prestamoSeleccionado.nombre_cliente}</p>
                  </div>
                  <button onClick={() => setShowPagosModal(false)} className="text-gray-500 hover:text-gray-700">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Resumen del Financiamiento */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Total a Pagar</p>
                    <p className="text-lg font-bold text-gray-800">{formatMoney(prestamoSeleccionado.total_pagar)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Balance Pendiente</p>
                    <p className="text-lg font-bold text-blue-600">{formatMoney(prestamoSeleccionado.balance_pendiente)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Pagado</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatMoney(parseFloat(prestamoSeleccionado.total_pagar) - parseFloat(prestamoSeleccionado.balance_pendiente))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Estado</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(prestamoSeleccionado.estado)}`}>
                      {prestamoSeleccionado.estado}
                    </span>
                  </div>
                </div>

                {/* Formulario de Nuevo Pago */}
                {prestamoSeleccionado.balance_pendiente > 0 && (
                  <form onSubmit={registrarPago} className="bg-blue-50 p-4 rounded-lg mb-6">
                    <h3 className="font-bold text-gray-800 mb-4">Registrar Nuevo Pago</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del Pago *</label>
                        <input
                          type="date"
                          required
                          value={pagoData.fecha_pago}
                          onChange={(e) => setPagoData({...pagoData, fecha_pago: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monto Pagado ($) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          max={prestamoSeleccionado.balance_pendiente}
                          value={pagoData.monto_pagado}
                          onChange={(e) => setPagoData({...pagoData, monto_pagado: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                        <input
                          type="text"
                          value={pagoData.notas}
                          onChange={(e) => setPagoData({...pagoData, notas: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                    >
                      {loading ? 'Guardando...' : 'Registrar Pago'}
                    </button>
                  </form>
                )}

                {/* Historial de Pagos */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-4">Historial de Pagos</h3>
                  {pagosPrestamo.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No hay pagos registrados</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto Pagado</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance Actualizado</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {pagosPrestamo.map((pago) => (
                            <tr key={pago.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-700">{new Date(pago.fecha_pago).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-sm font-medium text-green-600">{formatMoney(pago.monto_pagado)}</td>
                              <td className="px-4 py-3 text-sm font-medium text-blue-600">{formatMoney(pago.balance_actualizado)}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{pago.notas || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
