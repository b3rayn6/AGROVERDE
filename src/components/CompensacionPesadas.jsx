import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Scale, FileText, CheckCircle, AlertCircle, X, ArrowRight, Check, Printer, List, Edit2, Save, Trash2 } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { formatearFechaLocal } from '../lib/dateUtils';
import { generarPDFCuentasPorCobrarCliente } from '../lib/pdfGeneratorCuentasCliente';
import { generarPDFCompensacionesCliente } from '../lib/pdfGeneratorCompensaciones';
import { generarPDFNotaCredito } from '../lib/pdfGeneratorNotaCredito';

export default function CompensacionPesadas() {
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([]);
  const [pesadas, setPesadas] = useState([]);
  const [compensaciones, setCompensaciones] = useState([]);
  const [notasCredito, setNotasCredito] = useState([]);
  const [clientesAgrupados, setClientesAgrupados] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [cuentasDelCliente, setCuentasDelCliente] = useState([]);
  const [pesadasDelCliente, setPesadasDelCliente] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cuentasSeleccionadas, setCuentasSeleccionadas] = useState([]);
  const [pesadasSeleccionadas, setPesadasSeleccionadas] = useState([]);
  const [notas, setNotas] = useState('');
  const [modoVista, setModoVista] = useState('cliente');
  const [busquedaCuenta, setBusquedaCuenta] = useState('');
  const [showDesgloseModal, setShowDesgloseModal] = useState(false);
  const [compensacionesDetalladas, setCompensacionesDetalladas] = useState([]);
  const [compensacionEditando, setCompensacionEditando] = useState(null);
  const [formEditarCompensacion, setFormEditarCompensacion] = useState({
    fecha: '',
    monto_compensado: '',
    notas: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const { data: cuentasData, error: cuentasError } = await supabase
        .from('cuentas_por_cobrar')
        .select('*')
        .neq('estado', 'Pagada')
        .neq('tipo', 'financiamiento_actualizado')
        .order('fecha_emision', { ascending: false });

      if (cuentasError) throw cuentasError;

      const { data: pesadasData, error: pesadasError } = await supabase
        .from('pesadas')
        .select('*')
        .gt('saldo_disponible', 0)
        .order('fecha', { ascending: false });

      if (pesadasError) throw pesadasError;

      const { data: compensacionesData, error: compensacionesError } = await supabase
        .from('compensaciones_cuentas')
        .select('*, cuentas_por_cobrar(referencia, cliente), pesadas(numero_pesada, nombre_productor)')
        .order('created_at', { ascending: false });

      if (compensacionesError) throw compensacionesError;

      const { data: notasData, error: notasError } = await supabase
        .from('notas_credito')
        .select('*')
        .eq('estado', 'activa')
        .order('created_at', { ascending: false });

      if (notasError) throw notasError;

      setCuentasPorCobrar(cuentasData || []);
      setPesadas(pesadasData || []);
      setCompensaciones(compensacionesData || []);
      setNotasCredito(notasData || []);

      const clientesMap = {};
      (cuentasData || []).forEach(cuenta => {
        const nombreCliente = cuenta.cliente || 'Sin nombre';
        if (!clientesMap[nombreCliente]) {
          clientesMap[nombreCliente] = {
            nombre: nombreCliente,
            totalCuentas: 0,
            montoPendiente: 0,
            cuentas: []
          };
        }
        clientesMap[nombreCliente].totalCuentas++;
        clientesMap[nombreCliente].montoPendiente += parseFloat(cuenta.monto_pendiente || 0);
        clientesMap[nombreCliente].cuentas.push(cuenta);
      });

      const clientesArray = Object.values(clientesMap).sort((a, b) => b.montoPendiente - a.montoPendiente);
      setClientesAgrupados(clientesArray);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar los datos de compensación');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setCuentasDelCliente(cliente.cuentas);
    setCuentasSeleccionadas([]);
    setPesadasSeleccionadas([]);
    
    const pesadasFiltradas = pesadas.filter(
      pesada => pesada.nombre_productor === cliente.nombre
    );
    setPesadasDelCliente(pesadasFiltradas);
  };

  const toggleCuentaSeleccionada = (cuenta) => {
    setCuentasSeleccionadas(prev => {
      const existe = prev.find(c => c.id === cuenta.id);
      if (existe) {
        return prev.filter(c => c.id !== cuenta.id);
      } else {
        return [...prev, cuenta];
      }
    });
  };

  const togglePesadaSeleccionada = (pesada) => {
    setPesadasSeleccionadas(prev => {
      const existe = prev.find(p => p.id === pesada.id);
      if (existe) {
        return prev.filter(p => p.id !== pesada.id);
      } else {
        return [...prev, pesada];
      }
    });
  };

  const abrirModalCompensacion = () => {
    if (cuentasSeleccionadas.length === 0) {
      alert('Debes seleccionar al menos una cuenta por cobrar');
      return;
    }
    
    if (modoVista === 'libre') {
      const clientesUnicos = [...new Set(cuentasSeleccionadas.map(c => c.cliente))];
      const pesadasFiltradas = pesadas.filter(
        pesada => clientesUnicos.includes(pesada.nombre_productor)
      );
      setPesadasDelCliente(pesadasFiltradas);
    }
    
    setPesadasSeleccionadas([]);
    setNotas('');
    setShowModal(true);
  };

  const obtenerCuentasFiltradas = () => {
    if (!busquedaCuenta) return cuentasPorCobrar;
    
    const termino = busquedaCuenta.toLowerCase();
    return cuentasPorCobrar.filter(cuenta =>
      cuenta.cliente?.toLowerCase().includes(termino) ||
      cuenta.referencia?.toLowerCase().includes(termino)
    );
  };

  const procesarCompensacion = async () => {
    if (cuentasSeleccionadas.length === 0 || pesadasSeleccionadas.length === 0) {
      alert('Debes seleccionar al menos una cuenta por cobrar y una pesada');
      return;
    }

    const totalCuentas = cuentasSeleccionadas.reduce((sum, c) => sum + parseFloat(c.monto_pendiente || 0), 0);
    const totalPesadas = pesadasSeleccionadas.reduce((sum, p) => sum + parseFloat(p.saldo_disponible || 0), 0);

    if (totalPesadas <= 0) {
      alert('Las pesadas seleccionadas no tienen saldo disponible');
      return;
    }

    const montoCompensado = Math.min(totalCuentas, totalPesadas);
    const saldoFavor = Math.max(0, totalPesadas - totalCuentas);

    try {
      let notaCreditoId = null;
      if (saldoFavor > 0) {
        const numeroNota = `NC-${Date.now()}`;
        const { data: notaData, error: notaError } = await supabase
          .from('notas_credito')
          .insert({
            numero_nota: numeroNota,
            fecha: new Date().toISOString().split('T')[0],
            cliente_nombre: clienteSeleccionado.nombre,
            monto: saldoFavor,
            origen: 'pesada',
            estado: 'activa',
            notas: `Saldo a favor generado al compensar ${pesadasSeleccionadas.length} pesada(s) con ${cuentasSeleccionadas.length} cuenta(s) por cobrar`
          })
          .select()
          .single();

        if (notaError) throw notaError;
        notaCreditoId = notaData.id;
      }

      let montoRestante = montoCompensado;
      
      for (const cuenta of cuentasSeleccionadas) {
        const montoCuenta = parseFloat(cuenta.monto_pendiente || 0);
        const montoParaEstaCuenta = Math.min(montoCuenta, montoRestante);
        
        if (montoParaEstaCuenta > 0) {
          const { error: compensacionError } = await supabase
            .from('compensaciones_cuentas')
            .insert({
              fecha: new Date().toISOString().split('T')[0],
              cuenta_cobrar_id: cuenta.id,
              pesada_id: pesadasSeleccionadas[0].id,
              monto_compensado: montoParaEstaCuenta,
              saldo_favor: cuenta.id === cuentasSeleccionadas[cuentasSeleccionadas.length - 1].id ? saldoFavor : 0,
              nota_credito_id: cuenta.id === cuentasSeleccionadas[cuentasSeleccionadas.length - 1].id ? notaCreditoId : null,
              notas: notas || `Compensación múltiple: ${cuentasSeleccionadas.length} cuenta(s) con ${pesadasSeleccionadas.length} pesada(s)`
            });

          if (compensacionError) throw compensacionError;

          const nuevoBalanceCuenta = montoCuenta - montoParaEstaCuenta;
          const nuevoEstado = nuevoBalanceCuenta === 0 ? 'Pagada' : 'Pendiente';

          const { error: cuentaError } = await supabase
            .from('cuentas_por_cobrar')
            .update({
              monto_pendiente: nuevoBalanceCuenta,
              estado: nuevoEstado
            })
            .eq('id', cuenta.id);

          if (cuentaError) throw cuentaError;

          montoRestante -= montoParaEstaCuenta;
        }
      }

      let montoDescuento = montoCompensado;
      
      for (const pesada of pesadasSeleccionadas) {
        const saldoPesada = parseFloat(pesada.saldo_disponible || 0);
        const montoParaEstaPesada = Math.min(saldoPesada, montoDescuento);
        
        if (montoParaEstaPesada > 0) {
          const nuevoSaldoPesada = saldoPesada - montoParaEstaPesada;
          const { error: pesadaError } = await supabase
            .from('pesadas')
            .update({
              saldo_disponible: nuevoSaldoPesada,
              usado_compensacion: true
            })
            .eq('id', pesada.id);

          if (pesadaError) throw pesadaError;

          montoDescuento -= montoParaEstaPesada;
        }
      }

      alert(
        saldoFavor > 0
          ? `✅ Compensación exitosa!\\n\\n💰 Monto compensado: ${formatCurrency(montoCompensado)}\\n📋 ${cuentasSeleccionadas.length} cuenta(s) procesada(s)\\n⚖️ ${pesadasSeleccionadas.length} pesada(s) utilizada(s)\\n📝 Nota de crédito generada: ${formatCurrency(saldoFavor)}`
          : `✅ Compensación exitosa!\\n\\n💰 Monto compensado: ${formatCurrency(montoCompensado)}\\n📋 ${cuentasSeleccionadas.length} cuenta(s) procesada(s)\\n⚖️ ${pesadasSeleccionadas.length} pesada(s) utilizada(s)`
      );

      setShowModal(false);
      setCuentasSeleccionadas([]);
      setPesadasSeleccionadas([]);
      cargarDatos();
    } catch (error) {
      console.error('Error al procesar compensación:', error);
      alert('Error al procesar la compensación');
    }
  };

  const calcularTotalCuentasSeleccionadas = () => {
    return cuentasSeleccionadas.reduce((sum, c) => sum + parseFloat(c.monto_pendiente || 0), 0);
  };

  const calcularTotalPesadasSeleccionadas = () => {
    return pesadasSeleccionadas.reduce((sum, p) => sum + parseFloat(p.saldo_disponible || 0), 0);
  };

  const calcularMontoCompensacion = () => {
    const totalCuentas = calcularTotalCuentasSeleccionadas();
    const totalPesadas = calcularTotalPesadasSeleccionadas();
    return Math.min(totalCuentas, totalPesadas);
  };

  const calcularSaldoFavor = () => {
    const totalCuentas = calcularTotalCuentasSeleccionadas();
    const totalPesadas = calcularTotalPesadasSeleccionadas();
    return Math.max(0, totalPesadas - totalCuentas);
  };

  const abrirDesgloseCompensaciones = async () => {
    try {
      setShowDesgloseModal(true);

      const { data: compensacionesConDetalles, error } = await supabase
        .from('compensaciones_cuentas')
        .select(`
          *,
          cuentas_por_cobrar(id, referencia, cliente, monto_total, monto_pendiente, estado),
          pesadas(id, numero_pesada, nombre_productor, fanegas, valor_total, saldo_disponible)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Compensaciones detalladas cargadas:', compensacionesConDetalles);
      setCompensacionesDetalladas(compensacionesConDetalles || []);
    } catch (error) {
      console.error('Error al cargar compensaciones detalladas:', error);
      alert('Error al cargar el desglose de compensaciones');
    }
  };

  const iniciarEdicionCompensacion = (compensacion) => {
    console.log('Iniciando edición de compensación:', compensacion);
    setCompensacionEditando(compensacion.id);
    setFormEditarCompensacion({
      fecha: compensacion.fecha,
      monto_compensado: compensacion.monto_compensado.toString(),
      notas: compensacion.notas || ''
    });
  };

  const cancelarEdicionCompensacion = () => {
    setCompensacionEditando(null);
    setFormEditarCompensacion({
      fecha: '',
      monto_compensado: '',
      notas: ''
    });
  };

  const guardarEdicionCompensacion = async (compensacionId) => {
    try {
      console.log('Guardando edición de compensación:', compensacionId, formEditarCompensacion);

      const montoNuevo = parseFloat(formEditarCompensacion.monto_compensado);

      if (isNaN(montoNuevo) || montoNuevo <= 0) {
        alert('El monto debe ser un número válido mayor a 0');
        return;
      }

      const { error: updateError } = await supabase
        .from('compensaciones_cuentas')
        .update({
          fecha: formEditarCompensacion.fecha,
          monto_compensado: montoNuevo,
          notas: formEditarCompensacion.notas
        })
        .eq('id', compensacionId);

      if (updateError) throw updateError;

      console.log('Compensación actualizada exitosamente');
      alert('✅ Compensación actualizada correctamente');

      cancelarEdicionCompensacion();
      await abrirDesgloseCompensaciones();
      await cargarDatos();
    } catch (error) {
      console.error('Error al actualizar compensación:', error);
      alert('Error al actualizar la compensación');
    }
  };

  const eliminarCompensacion = async (compensacion) => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar esta compensación?\\n\\n` +
      `Cuenta: ${compensacion.cuentas_por_cobrar?.referencia || 'N/A'}\\n` +
      `Pesada: ${compensacion.pesadas?.numero_pesada || 'N/A'}\\n` +
      `Monto: ${formatCurrency(compensacion.monto_compensado)}\\n\\n` +
      `Esta acción NO puede deshacerse.`
    );

    if (!confirmar) return;

    try {
      console.log('Eliminando compensación:', compensacion.id);

      const cuentaId = compensacion.cuenta_cobrar_id;
      const pesadaId = compensacion.pesada_id;
      const montoCompensado = parseFloat(compensacion.monto_compensado);

      const { data: cuentaActual, error: cuentaError } = await supabase
        .from('cuentas_por_cobrar')
        .select('monto_pendiente, monto_total')
        .eq('id', cuentaId)
        .single();

      if (cuentaError) throw cuentaError;

      const { data: pesadaActual, error: pesadaError } = await supabase
        .from('pesadas')
        .select('saldo_disponible')
        .eq('id', pesadaId)
        .single();

      if (pesadaError) throw pesadaError;

      const nuevoMontoPendiente = parseFloat(cuentaActual.monto_pendiente) + montoCompensado;
      const nuevoEstadoCuenta = nuevoMontoPendiente >= parseFloat(cuentaActual.monto_total) ? 'Pendiente' : cuentaActual.estado;

      const { error: updateCuentaError } = await supabase
        .from('cuentas_por_cobrar')
        .update({
          monto_pendiente: nuevoMontoPendiente,
          estado: nuevoEstadoCuenta
        })
        .eq('id', cuentaId);

      if (updateCuentaError) throw updateCuentaError;

      const nuevoSaldoPesada = parseFloat(pesadaActual.saldo_disponible) + montoCompensado;

      const { error: updatePesadaError } = await supabase
        .from('pesadas')
        .update({
          saldo_disponible: nuevoSaldoPesada
        })
        .eq('id', pesadaId);

      if (updatePesadaError) throw updatePesadaError;

      const { error: deleteError } = await supabase
        .from('compensaciones_cuentas')
        .delete()
        .eq('id', compensacion.id);

      if (deleteError) throw deleteError;

      console.log('Compensación eliminada y saldos revertidos correctamente');
      alert('✅ Compensación eliminada y saldos revertidos correctamente');

      await abrirDesgloseCompensaciones();
      await cargarDatos();
    } catch (error) {
      console.error('Error al eliminar compensación:', error);
      alert('Error al eliminar la compensación');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando datos de compensación...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Compensación con Pesadas</h1>
        <p className="text-sm text-gray-600">Saldar cuentas por cobrar usando el valor de las pesadas registradas</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-1">{clientesAgrupados.length}</div>
          <div className="text-blue-100 text-sm">Clientes con Cuentas</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Scale className="w-8 h-8 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-1">{pesadas.length}</div>
          <div className="text-green-100 text-sm">Pesadas Disponibles</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-1">{compensaciones.length}</div>
          <div className="text-blue-100 text-sm">Compensaciones</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-1">{notasCredito.length}</div>
          <div className="text-purple-100 text-sm">Notas de Crédito</div>
        </div>
      </div>

      {/* Botón Desglose de Compensaciones */}
      <div className="mb-6 flex justify-center">
        <button
          onClick={abrirDesgloseCompensaciones}
          className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <List className="w-5 h-5" />
          Desglose de Compensaciones
        </button>
      </div>

      {/* Selección de Cliente */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-blue-500" />
            {modoVista === 'cliente' ? 'Seleccionar Cliente' : 'Selección Libre de Cuentas'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setModoVista('cliente');
                setCuentasSeleccionadas([]);
                setPesadasSeleccionadas([]);
                setClienteSeleccionado(null);
                setBusquedaCuenta('');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                modoVista === 'cliente'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Por Cliente
            </button>
            <button
              onClick={() => {
                setModoVista('libre');
                setCuentasSeleccionadas([]);
                setPesadasSeleccionadas([]);
                setClienteSeleccionado(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                modoVista === 'libre'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Selección Libre
            </button>
          </div>
        </div>
        
        {modoVista === 'cliente' ? (
          clientesAgrupados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay clientes con cuentas por cobrar pendientes
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientesAgrupados.map((cliente, index) => (
                <button
                  key={index}
                  onClick={() => seleccionarCliente(cliente)}
                  className={`text-left border-2 rounded-xl p-5 transition-all ${
                    clienteSeleccionado?.nombre === cliente.nombre
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="font-bold text-lg text-gray-900">{cliente.nombre}</div>
                    {clienteSeleccionado?.nombre === cliente.nombre && (
                      <CheckCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Cuentas:</span>
                      <span className="font-semibold text-gray-900">{cliente.totalCuentas}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Pendiente:</span>
                      <span className="font-bold text-blue-600">{formatCurrency(cliente.montoPendiente)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : (
          <div>
            <div className="mb-4">
              <input
                type="text"
                value={busquedaCuenta}
                onChange={(e) => setBusquedaCuenta(e.target.value)}
                placeholder="Buscar por cliente o número de factura..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            {cuentasSeleccionadas.length > 0 && (
              <div className="mb-4 flex justify-between items-center bg-green-50 border border-green-300 rounded-lg p-4">
                <div>
                  <span className="font-semibold text-green-900">
                    {cuentasSeleccionadas.length} cuenta{cuentasSeleccionadas.length > 1 ? 's' : ''} seleccionada{cuentasSeleccionadas.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-sm text-green-700 ml-2">
                    ({formatCurrency(calcularTotalCuentasSeleccionadas())})
                  </span>
                </div>
                <button
                  onClick={abrirModalCompensacion}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Compensar Seleccionadas
                </button>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={cuentasSeleccionadas.length === obtenerCuentasFiltradas().length && obtenerCuentasFiltradas().length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCuentasSeleccionadas([...obtenerCuentasFiltradas()]);
                          } else {
                            setCuentasSeleccionadas([]);
                          }
                        }}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cliente</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Referencia</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Pendiente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {obtenerCuentasFiltradas().map((cuenta) => (
                    <tr 
                      key={cuenta.id} 
                      onClick={() => toggleCuentaSeleccionada(cuenta)}
                      className={`cursor-pointer transition-colors ${
                        cuentasSeleccionadas.find(c => c.id === cuenta.id)
                          ? 'bg-green-50 hover:bg-green-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={!!cuentasSeleccionadas.find(c => c.id === cuenta.id)}
                          onChange={() => toggleCuentaSeleccionada(cuenta)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{cuenta.cliente}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{cuenta.referencia}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatearFechaLocal(cuenta.fecha_emision)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(cuenta.monto_total)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-green-600">{formatCurrency(cuenta.monto_pendiente)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Cuentas del Cliente Seleccionado */}
      {clienteSeleccionado && modoVista === 'cliente' && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-500" />
              Cuentas por Cobrar de {clienteSeleccionado.nombre}
              {cuentasSeleccionadas.length > 0 && (
                <span className="text-sm font-normal text-blue-600">
                  ({cuentasSeleccionadas.length} seleccionada{cuentasSeleccionadas.length > 1 ? 's' : ''})
                </span>
              )}
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => generarPDFCuentasPorCobrarCliente(cuentasDelCliente, clienteSeleccionado.nombre)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                title="Imprimir Estado de Cuenta"
              >
                <Printer className="w-4 h-4" />
                PDF Cuentas
              </button>
              <button
                onClick={async () => {
                  const compensacionesCliente = compensaciones.filter(
                    comp => comp.cuentas_por_cobrar?.cliente === clienteSeleccionado.nombre
                  );
                  await generarPDFCompensacionesCliente(compensacionesCliente, clienteSeleccionado.nombre, supabase);
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                title="Imprimir Historial de Compensaciones"
              >
                <Printer className="w-4 h-4" />
                PDF Compensaciones
              </button>
              {cuentasSeleccionadas.length > 0 && (
                <button
                  onClick={abrirModalCompensacion}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Compensar Seleccionadas ({formatCurrency(calcularTotalCuentasSeleccionadas())})
                </button>
              )}
              <button
                onClick={() => {
                  setClienteSeleccionado(null);
                  setCuentasSeleccionadas([]);
                  setPesadasSeleccionadas([]);
                }}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Cambiar cliente
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={cuentasSeleccionadas.length === cuentasDelCliente.length && cuentasDelCliente.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCuentasSeleccionadas([...cuentasDelCliente]);
                        } else {
                          setCuentasSeleccionadas([]);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Referencia</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cuentasDelCliente.map((cuenta) => (
                  <tr 
                    key={cuenta.id} 
                    onClick={() => toggleCuentaSeleccionada(cuenta)}
                    className={`cursor-pointer transition-colors ${
                      cuentasSeleccionadas.find(c => c.id === cuenta.id)
                        ? 'bg-blue-50 hover:bg-blue-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={!!cuentasSeleccionadas.find(c => c.id === cuenta.id)}
                        onChange={() => toggleCuentaSeleccionada(cuenta)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{cuenta.referencia}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatearFechaLocal(cuenta.fecha_emision)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(cuenta.monto_total)}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">{formatCurrency(cuenta.monto_pendiente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pesadas del Cliente Seleccionado */}
      {clienteSeleccionado && modoVista === 'cliente' && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Scale className="w-6 h-6 text-green-500" />
            Pesadas de {clienteSeleccionado.nombre}
            {pesadasSeleccionadas.length > 0 && (
              <span className="text-sm font-normal text-green-600">
                ({pesadasSeleccionadas.length} seleccionada{pesadasSeleccionadas.length > 1 ? 's' : ''} - {formatCurrency(calcularTotalPesadasSeleccionadas())})
              </span>
            )}
          </h2>
          
          {pesadasDelCliente.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Este cliente no tiene pesadas con saldo disponible
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pesadasDelCliente.map((pesada) => {
                const isSelected = !!pesadasSeleccionadas.find(p => p.id === pesada.id);
                return (
                  <div
                    key={pesada.id}
                    onClick={() => togglePesadaSeleccionada(pesada)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-green-200 bg-green-50 hover:border-green-400 hover:shadow'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-gray-900">Pesada {pesada.numero_pesada || 'S/N'}</div>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-gray-700 mb-3">
                      <div>Fecha: {formatearFechaLocal(pesada.fecha)}</div>
                      <div>Fanegas: {parseFloat(pesada.fanegas || 0).toFixed(2)}</div>
                      <div>Valor Total: {formatCurrency(pesada.valor_total)}</div>
                      {pesada.avance_efectivo > 0 && (
                        <div className="text-orange-600 font-medium">
                          Avance Entregado: {formatCurrency(pesada.avance_efectivo)}
                        </div>
                      )}
                    </div>
                    <div className="pt-3 border-t border-green-300">
                      <div className="text-xs text-gray-600 mb-1">Saldo Disponible</div>
                      <div className="text-xl font-bold text-green-600">{formatCurrency(pesada.saldo_disponible)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Historial de Compensaciones */}
      {compensaciones.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-blue-500" />
            Historial de Compensaciones
          </h2>
          
          <div className="space-y-3">
            {compensaciones.map((comp) => (
              <div key={comp.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        Cuenta: {comp.cuentas_por_cobrar?.referencia}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        Pesada: {comp.pesadas?.numero_pesada || 'S/N'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {formatearFechaLocal(comp.fecha)} • {comp.cuentas_por_cobrar?.cliente}
                    </div>
                    {comp.notas && (
                      <div className="text-xs text-gray-500 italic mt-1">{comp.notas}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-600">
                      Compensado: {formatCurrency(comp.monto_compensado)}
                    </div>
                    {comp.saldo_favor > 0 && (
                      <div className="text-xs text-purple-600 font-medium">
                        Nota de crédito: {formatCurrency(comp.saldo_favor)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notas de Crédito Activas */}
      {notasCredito.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-500" />
            Notas de Crédito Activas
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notasCredito.map((nota) => (
              <div key={nota.id} className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-bold text-purple-900">{nota.numero_nota}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const cliente = { nombre: nota.cliente_nombre };
                        const notaFormateada = {
                          codigo: nota.numero_nota,
                          fecha_creacion: nota.fecha || nota.created_at,
                          saldo_disponible: nota.monto,
                          estado: nota.estado,
                          referencia_origen: nota.origen,
                          tipo: 'Compensación',
                          divisa: 'RD$',
                          notas: nota.notas
                        };
                        generarPDFNotaCredito(notaFormateada, cliente);
                      }}
                      className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      title="Imprimir Nota de Crédito"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                      {nota.estado}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-700 mb-1">{nota.cliente_nombre}</div>
                <div className="text-xs text-gray-600 mb-2">{formatearFechaLocal(nota.fecha)}</div>
                <div className="text-lg font-bold text-purple-600">{formatCurrency(nota.monto)}</div>
                {nota.notas && (
                  <div className="text-xs text-gray-600 italic mt-2 pt-2 border-t border-purple-200">
                    {nota.notas}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Desglose de Compensaciones */}
      {showDesgloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6 text-white sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <List className="w-7 h-7" />
                  Desglose de Compensaciones
                </h2>
                <button
                  onClick={() => {
                    setShowDesgloseModal(false);
                    cancelarEdicionCompensacion();
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-indigo-100 text-sm mt-2">
                Total de compensaciones registradas: {compensacionesDetalladas.length}
              </p>
            </div>

            <div className="p-6">
              {compensacionesDetalladas.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <List className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No hay compensaciones registradas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {compensacionesDetalladas.map((comp) => (
                    <div key={comp.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      {compensacionEditando === comp.id ? (
                        // Modo edición
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha
                              </label>
                              <input
                                type="date"
                                value={formEditarCompensacion.fecha}
                                onChange={(e) => setFormEditarCompensacion({
                                  ...formEditarCompensacion,
                                  fecha: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Monto Compensado
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={formEditarCompensacion.monto_compensado}
                                onChange={(e) => setFormEditarCompensacion({
                                  ...formEditarCompensacion,
                                  monto_compensado: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="0.00"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notas
                              </label>
                              <input
                                type="text"
                                value={formEditarCompensacion.notas}
                                onChange={(e) => setFormEditarCompensacion({
                                  ...formEditarCompensacion,
                                  notas: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Notas adicionales..."
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={cancelarEdicionCompensacion}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                            >
                              <X className="w-4 h-4" />
                              Cancelar
                            </button>
                            <button
                              onClick={() => guardarEdicionCompensacion(comp.id)}
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Save className="w-4 h-4" />
                              Guardar Cambios
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Modo visualización
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">Cuenta:</span>
                              <span className="text-blue-600 font-medium">
                                {comp.cuentas_por_cobrar?.referencia || 'N/A'}
                              </span>
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold text-gray-900">Pesada:</span>
                              <span className="text-green-600 font-medium">
                                {comp.pesadas?.numero_pesada || 'N/A'}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 flex-wrap text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <strong>Cliente:</strong> {comp.cuentas_por_cobrar?.cliente || 'N/A'}
                              </span>
                              <span className="flex items-center gap-1">
                                <strong>Productor:</strong> {comp.pesadas?.nombre_productor || 'N/A'}
                              </span>
                              <span className="flex items-center gap-1">
                                <strong>Fecha:</strong> {formatearFechaLocal(comp.fecha)}
                              </span>
                            </div>

                            {comp.notas && (
                              <div className="text-xs text-gray-500 italic bg-gray-50 px-3 py-2 rounded-lg">
                                <strong>Notas:</strong> {comp.notas}
                              </div>
                            )}

                            <div className="flex items-center gap-4 flex-wrap text-sm">
                              <span className="text-gray-600">
                                <strong>Monto Compensado:</strong> <span className="text-green-600 font-bold text-base">{formatCurrency(comp.monto_compensado)}</span>
                              </span>
                              {comp.saldo_favor > 0 && (
                                <span className="text-purple-600 font-medium">
                                  Nota de crédito: {formatCurrency(comp.saldo_favor)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => iniciarEdicionCompensacion(comp)}
                              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-1 text-sm"
                              title="Editar compensación"
                            >
                              <Edit2 className="w-4 h-4" />
                              Editar
                            </button>
                            <button
                              onClick={() => eliminarCompensacion(comp)}
                              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-1 text-sm"
                              title="Eliminar compensación"
                            >
                              <Trash2 className="w-4 h-4" />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compensación */}
      {showModal && cuentasSeleccionadas.length > 0 && (() => {
        const clientesUnicos = [...new Set(cuentasSeleccionadas.map(c => c.cliente))];
        const tituloCliente = clientesUnicos.length === 1 
          ? clientesUnicos[0]
          : `${clientesUnicos.length} Clientes`;
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    Compensar {cuentasSeleccionadas.length} Cuenta{cuentasSeleccionadas.length > 1 ? 's' : ''} de {tituloCliente}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Información de las Cuentas Seleccionadas */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-bold text-blue-900 mb-3">
                    Cuentas por Cobrar Seleccionadas ({cuentasSeleccionadas.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                    {cuentasSeleccionadas.map((cuenta) => (
                      <div key={cuenta.id} className="flex justify-between items-center bg-white p-2 rounded">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{cuenta.referencia}</span>
                          <span className="text-xs text-gray-600 ml-2">• {cuenta.cliente}</span>
                        </div>
                        <span className="text-sm font-bold text-blue-600">{formatCurrency(cuenta.monto_pendiente)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-blue-300 flex justify-between items-center">
                    <span className="font-bold text-blue-900">Total a compensar:</span>
                    <span className="text-2xl font-bold text-blue-600">{formatCurrency(calcularTotalCuentasSeleccionadas())}</span>
                  </div>
                </div>

                {/* Seleccionar Pesadas */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    Seleccionar Pesadas {clientesUnicos.length > 1 ? 'de los Clientes' : 'del Cliente'}
                    {pesadasSeleccionadas.length > 0 && (
                      <span className="text-sm font-normal text-green-600 ml-2">
                        ({pesadasSeleccionadas.length} seleccionada{pesadasSeleccionadas.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </h3>
                  {pesadasDelCliente.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      {clientesUnicos.length > 1 
                        ? 'Los clientes seleccionados no tienen pesadas con saldo disponible'
                        : 'Este cliente no tiene pesadas con saldo disponible'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                      {pesadasDelCliente.map((pesada) => {
                        const isSelected = !!pesadasSeleccionadas.find(p => p.id === pesada.id);
                        return (
                          <div
                            key={pesada.id}
                            onClick={() => togglePesadaSeleccionada(pesada)}
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-semibold text-gray-900">
                                  Pesada {pesada.numero_pesada || 'S/N'}
                                </div>
                                <div className="text-xs text-gray-700 font-medium">
                                  {pesada.nombre_productor}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {formatearFechaLocal(pesada.fecha)} • {parseFloat(pesada.fanegas || 0).toFixed(2)} fanegas
                                </div>
                                {pesada.avance_efectivo > 0 && (
                                  <div className="text-xs text-orange-600 font-medium mt-1">
                                    Avance: {formatCurrency(pesada.avance_efectivo)}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-600">Saldo Disponible</div>
                              <div className="text-lg font-bold text-green-600">
                                {formatCurrency(pesada.saldo_disponible)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Resumen de Compensación */}
                {pesadasSeleccionadas.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-3">Resumen de Compensación</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Total cuentas por cobrar:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(calcularTotalCuentasSeleccionadas())}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Total saldo pesadas:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(calcularTotalPesadasSeleccionadas())}</span>
                      </div>
                      <div className="border-t border-blue-300 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-green-700">Monto a compensar:</span>
                          <span className="font-bold text-green-600 text-lg">{formatCurrency(calcularMontoCompensacion())}</span>
                        </div>
                        {calcularSaldoFavor() > 0 && (
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm font-bold text-purple-700">Saldo a favor (Nota de crédito):</span>
                            <span className="font-bold text-purple-600 text-lg">{formatCurrency(calcularSaldoFavor())}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notas */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Notas adicionales sobre la compensación..."
                  />
                </div>

                {/* Advertencias */}
                {pesadasSeleccionadas.length > 0 && calcularSaldoFavor() > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-purple-800">
                      <strong>Nota de crédito:</strong> Como el total de las pesadas ({formatCurrency(calcularTotalPesadasSeleccionadas())}) 
                      es mayor que el total de las cuentas por cobrar ({formatCurrency(calcularTotalCuentasSeleccionadas())}), 
                      se generará una nota de crédito por {formatCurrency(calcularSaldoFavor())}.
                    </div>
                  </div>
                )}

                {/* Botones */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={procesarCompensacion}
                    disabled={pesadasSeleccionadas.length === 0}
                    className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors shadow-lg ${
                      pesadasSeleccionadas.length > 0
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Procesar Compensación Múltiple
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
