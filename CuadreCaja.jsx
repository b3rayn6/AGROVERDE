import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Download, Calendar, DollarSign, TrendingUp, TrendingDown, Filter, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { getFechaActual } from '../lib/dateUtils';

export default function CuadreCaja() {
  const [movimientos, setMovimientos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [fechaInicio, setFechaInicio] = useState(getFechaActual());
  const [fechaFin, setFechaFin] = useState(getFechaActual());
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroConcepto, setFiltroConcepto] = useState('todos');

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
  }, [fechaInicio, fechaFin, filtroTipo, filtroConcepto]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar movimientos con filtros
      let query = supabase
        .from('cuadre_caja')
        .select('*')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
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

      // Cargar cuentas por cobrar pendientes
      const { data: cuentasData, error: cuentasError } = await supabase
        .from('cuentas_por_cobrar')
        .select('*, clientes(nombre)')
        .gt('monto_pendiente', 0)
        .order('fecha_emision', { ascending: false });

      if (cuentasError) throw cuentasError;

      // Asegurar que todos los movimientos tengan divisa (si es null, usar DOP)
      const movimientosConDivisa = (movimientosData || []).map(m => {
        // Si no hay divisa o es null/undefined, usar DOP
        const divisaFinal = (m.divisa && m.divisa !== null && m.divisa !== undefined) ? m.divisa : 'DOP';
        
        // Log para depuración
        if (!m.divisa || m.divisa === null || m.divisa === undefined) {
          console.log('Movimiento sin divisa encontrado:', m.referencia, 'Asignando DOP');
        }
        
        return {
          ...m,
          divisa: divisaFinal
        };
      });
      
      console.log('Movimientos cargados con divisas:', movimientosConDivisa.map(m => ({ referencia: m.referencia, concepto: m.concepto, divisa: m.divisa })));
      setMovimientos(movimientosConDivisa);
      setClientes(clientesData || []);
      setCuentasPorCobrar(cuentasData || []);
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

    doc.save(`cuadre_caja_${fechaInicio}_${fechaFin}.pdf`);
  };

  const totales = calcularTotales();

  const conceptoLabels = {
    pago_factura: 'Pago de Factura',
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              {movimientos.map((movimiento) => (
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