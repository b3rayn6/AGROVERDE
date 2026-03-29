import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Scale, DollarSign, CheckCircle, AlertCircle, TrendingUp, FileText } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';

export default function CompensacionCuentas() {
  const [clientes, setClientes] = useState([]);
  const [pesadas, setPesadas] = useState([]);
  const [compensaciones, setCompensaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: '',
    pesada_id: '',
    notas: ''
  });
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [pesadaSeleccionada, setPesadaSeleccionada] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar clientes con deuda pendiente
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('*')
        .gt('balance_pendiente', 0)
        .order('nombre');

      // Cargar compensaciones
      const { data: compensacionesData } = await supabase
        .from('compensaciones')
        .select(`
          *,
          clientes(nombre),
          pesadas(numero_pesada, productor, total_pagar)
        `)
        .order('fecha', { ascending: false });

      setClientes(clientesData || []);
      setCompensaciones(compensacionesData || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar datos');
    }
    setLoading(false);
  };

  const handleClienteChange = async (clienteId) => {
    setFormData({ ...formData, cliente_id: clienteId, pesada_id: '' });
    setPesadaSeleccionada(null);

    if (!clienteId) {
      setClienteSeleccionado(null);
      setPesadas([]);
      return;
    }

    // Buscar cliente seleccionado
    const cliente = clientes.find(c => c.id === parseInt(clienteId));
    setClienteSeleccionado(cliente);

    // Cargar pesadas del cliente
    const { data: pesadasData } = await supabase
      .from('pesadas')
      .select('*')
      .eq('productor', cliente.nombre)
      .order('fecha', { ascending: false });

    setPesadas(pesadasData || []);
  };

  const handlePesadaChange = (pesadaId) => {
    setFormData({ ...formData, pesada_id: pesadaId });

    if (!pesadaId) {
      setPesadaSeleccionada(null);
      return;
    }

    const pesada = pesadas.find(p => p.id === parseInt(pesadaId));
    setPesadaSeleccionada(pesada);
  };

  const calcularCompensacion = () => {
    if (!clienteSeleccionado || !pesadaSeleccionada) {
      return { montoCompensar: 0, saldoFavor: 0, deudaNueva: 0 };
    }

    const deudaActual = parseFloat(clienteSeleccionado.balance_pendiente);
    const valorPesada = parseFloat(pesadaSeleccionada.total_pagar);

    const montoCompensar = Math.min(deudaActual, valorPesada);
    const saldoFavor = Math.max(0, valorPesada - deudaActual);
    const deudaNueva = Math.max(0, deudaActual - valorPesada);

    return { montoCompensar, saldoFavor, deudaNueva };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.cliente_id || !formData.pesada_id) {
      alert('Seleccione cliente y pesada');
      return;
    }

    setLoading(true);
    try {
      const { montoCompensar, saldoFavor, deudaNueva } = calcularCompensacion();
      const deudaAnterior = parseFloat(clienteSeleccionado.balance_pendiente);

      // Registrar compensación
      const { error: errorCompensacion } = await supabase
        .from('compensaciones')
        .insert({
          cliente_id: parseInt(formData.cliente_id),
          pesada_id: parseInt(formData.pesada_id),
          fecha: new Date().toISOString().split('T')[0],
          monto_compensado: montoCompensar,
          deuda_anterior: deudaAnterior,
          deuda_nueva: deudaNueva,
          saldo_favor: saldoFavor,
          notas: formData.notas
        });

      if (errorCompensacion) throw errorCompensacion;

      // Actualizar balance del cliente
      const { error: errorCliente } = await supabase
        .from('clientes')
        .update({ balance_pendiente: deudaNueva })
        .eq('id', formData.cliente_id);

      if (errorCliente) throw errorCliente;

      // Si hay saldo a favor, actualizar o crear registro
      if (saldoFavor > 0) {
        const { data: saldoExistente } = await supabase
          .from('saldo_clientes')
          .select('*')
          .eq('cliente_id', formData.cliente_id)
          .single();

        if (saldoExistente) {
          await supabase
            .from('saldo_clientes')
            .update({
              saldo_favor: saldoExistente.saldo_favor + saldoFavor,
              updated_at: new Date().toISOString()
            })
            .eq('cliente_id', formData.cliente_id);
        } else {
          await supabase
            .from('saldo_clientes')
            .insert({
              cliente_id: parseInt(formData.cliente_id),
              saldo_favor: saldoFavor
            });
        }
      }

      alert(`Compensación registrada exitosamente!\n\nMonto compensado: RD$ ${montoCompensar.toFixed(2)}\nDeuda nueva: RD$ ${deudaNueva.toFixed(2)}${saldoFavor > 0 ? `\nSaldo a favor: RD$ ${saldoFavor.toFixed(2)}` : ''}`);

      // Reset form
      setFormData({ cliente_id: '', pesada_id: '', notas: '' });
      setClienteSeleccionado(null);
      setPesadaSeleccionada(null);
      setPesadas([]);
      cargarDatos();
    } catch (error) {
      console.error('Error al registrar compensación:', error);
      alert('Error al registrar compensación: ' + error.message);
    }
    setLoading(false);
  };

  const { montoCompensar, saldoFavor, deudaNueva } = calcularCompensacion();

  const totales = compensaciones.reduce((acc, comp) => ({
    totalCompensado: acc.totalCompensado + parseFloat(comp.monto_compensado),
    totalSaldoFavor: acc.totalSaldoFavor + parseFloat(comp.saldo_favor)
  }), { totalCompensado: 0, totalSaldoFavor: 0 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl shadow-lg">
                <Scale className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  Compensación de Cuentas
                </h1>
                <p className="text-sm text-gray-500 mt-1">Saldar cuentas por pagar con pesadas de clientes</p>
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-90">Total Compensado</p>
                <CheckCircle className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-3xl font-bold">{formatCurrency(totales.totalCompensado)}</p>
              <p className="text-xs opacity-75 mt-1">{compensaciones.length} compensaciones</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-90">Saldo a Favor</p>
                <TrendingUp className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-3xl font-bold">{formatCurrency(totales.totalSaldoFavor)}</p>
              <p className="text-xs opacity-75 mt-1">Generado en compensaciones</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-90">Clientes con Deuda</p>
                <AlertCircle className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-3xl font-bold">{clientes.length}</p>
              <p className="text-xs opacity-75 mt-1">Pendientes de compensar</p>
            </div>
          </div>
        </div>

        {/* Formulario de Compensación */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Nueva Compensación
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Selección de Cliente */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Cliente con Deuda *</label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => handleClienteChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                  required
                >
                  <option value="">Seleccione un cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} - Debe: {formatCurrency(c.balance_pendiente)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selección de Pesada */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Pesada del Cliente *</label>
                <select
                  value={formData.pesada_id}
                  onChange={(e) => handlePesadaChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                  required
                  disabled={!formData.cliente_id}
                >
                  <option value="">Seleccione una pesada...</option>
                  {pesadas.map(p => (
                    <option key={p.id} value={p.id}>
                      #{p.numero_pesada} - {p.fecha} - Valor: {formatCurrency(p.total_pagar)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cálculo de Compensación */}
            {clienteSeleccionado && pesadaSeleccionada && (
              <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl border-2 border-green-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Resumen de Compensación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Deuda Actual</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(clienteSeleccionado.balance_pendiente)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Valor de Pesada</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(pesadaSeleccionada.total_pagar)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-green-300">
                    <p className="text-sm text-gray-600 mb-1">Monto a Compensar</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(montoCompensar)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Deuda Nueva</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(deudaNueva)}</p>
                  </div>
                  {saldoFavor > 0 && (
                    <div className="md:col-span-2 bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg">
                      <p className="text-sm text-white opacity-90 mb-1">💰 Saldo a Favor del Cliente</p>
                      <p className="text-3xl font-bold text-white">{formatCurrency(saldoFavor)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Notas (Opcional)</label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                rows="3"
                placeholder="Observaciones adicionales..."
              />
            </div>

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={loading || !formData.cliente_id || !formData.pesada_id}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-6 h-6" />
              {loading ? 'Procesando...' : 'Registrar Compensación'}
            </button>
          </form>
        </div>

        {/* Historial de Compensaciones */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Historial de Compensaciones
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Fecha</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Pesada</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Deuda Anterior</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Compensado</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Deuda Nueva</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Saldo a Favor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {compensaciones.map((comp) => (
                  <tr key={comp.id} className="hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 transition-all duration-200">
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(comp.fecha).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{comp.clientes?.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">#{comp.pesadas?.numero_pesada}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-red-600">{formatCurrency(comp.deuda_anterior)}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-green-600">{formatCurrency(comp.monto_compensado)}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-orange-600">{formatCurrency(comp.deuda_nueva)}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">
                      {comp.saldo_favor > 0 ? formatCurrency(comp.saldo_favor) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {compensaciones.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay compensaciones registradas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}