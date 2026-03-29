import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/formatters';
import { Users, Plus, Edit2, Trash2, Search, DollarSign, FileText, FileDown, TrendingUp } from 'lucide-react';
import { generarPDFCliente } from '../lib/pdfGeneratorExtras';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [deudasClientes, setDeudasClientes] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    direccion: '',
    email: '',
    limite_credito: 0
  });
  const [fechaIntereses, setFechaIntereses] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre');
      
      if (error) throw error;
      setClientes(data || []);
      
      // Cargar deudas de facturas y financiamientos
      await cargarDeudasClientes(data || []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      alert('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const cargarDeudasClientes = async (clientesList) => {
    try {
      const deudas = {};
      
      // Para cada cliente, calcular deudas de facturas y financiamientos
      for (const cliente of clientesList) {
        // Calcular deuda de facturas a crédito
        const { data: facturas, error: errorFacturas } = await supabase
          .from('facturas_venta')
          .select('balance_pendiente')
          .eq('cliente_id', cliente.id)
          .gt('balance_pendiente', 0)
          .neq('estado', 'pagada');
        
        const deudaFacturas = facturas?.reduce((sum, f) => sum + (parseFloat(f.balance_pendiente) || 0), 0) || 0;
        
        // Calcular deuda de financiamientos
        const { data: financiamientos, error: errorFinanciamientos } = await supabase
          .from('financiamientos')
          .select('balance_pendiente')
          .eq('cliente_id', cliente.id)
          .gt('balance_pendiente', 0)
          .in('estado', ['Activo', 'Atrasado']);
        
        const deudaFinanciamientos = financiamientos?.reduce((sum, f) => sum + (parseFloat(f.balance_pendiente) || 0), 0) || 0;
        
        deudas[cliente.id] = {
          facturas: deudaFacturas,
          financiamientos: deudaFinanciamientos,
          total: deudaFacturas + deudaFinanciamientos
        };
      }
      
      setDeudasClientes(deudas);
    } catch (error) {
      console.error('Error al cargar deudas de clientes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCliente) {
        const { error } = await supabase
          .from('clientes')
          .update(formData)
          .eq('id', editingCliente.id);
        
        if (error) throw error;
        alert('Cliente actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([{ ...formData, balance_pendiente: 0 }]);
        
        if (error) throw error;
        alert('Cliente registrado exitosamente');
      }
      
      setShowModal(false);
      setEditingCliente(null);
      setFormData({
        nombre: '',
        cedula: '',
        telefono: '',
        direccion: '',
        email: '',
        limite_credito: 0
      });
      cargarClientes();
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      alert('Error al guardar cliente');
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      cedula: cliente.cedula || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      email: cliente.email || '',
      limite_credito: cliente.limite_credito || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este cliente?')) return;
    
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      alert('Cliente eliminado exitosamente');
      cargarClientes();
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      alert('Error al eliminar cliente. Puede tener facturas asociadas.');
    }
  };

  const calcularInteresesTodosClientes = async () => {
    if (!fechaIntereses) {
      alert('Por favor selecciona una fecha para calcular los intereses');
      return;
    }

    const fechaSeleccionada = new Date(fechaIntereses);
    const fechaFormateada = fechaSeleccionada.toLocaleDateString('es-DO');
    
    if (!confirm(`¿Deseas calcular los intereses diarios de todos los financiamientos activos?\n\nEsto actualizará las cuentas por cobrar con los intereses acumulados hasta el ${fechaFormateada}.`)) {
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

      const fechaCalculo = new Date(fechaIntereses);
      fechaCalculo.setHours(23, 59, 59, 999); // Fin del día seleccionado
      let cuentasGeneradas = 0;
      let interesesTotales = 0;

      // Calcular intereses para cada financiamiento
      for (const financiamiento of financiamientos) {
        const fechaPrestamo = new Date(financiamiento.fecha_prestamo);
        
        // Calcular días transcurridos desde el préstamo hasta la fecha seleccionada
        const diasTranscurridos = Math.floor((fechaCalculo - fechaPrestamo) / (1000 * 60 * 60 * 24));
        
        if (diasTranscurridos <= 0) continue;

        // Calcular interés diario
        const montoPrestado = parseFloat(financiamiento.monto_prestado) || 0;
        const tasaMensual = parseFloat(financiamiento.tasa_interes) || 0;
        const interesMensual = montoPrestado * (tasaMensual / 100);
        const interesDiario = interesMensual / 30;
        
        // Calcular interés acumulado hasta la fecha seleccionada
        const interesAcumuladoActual = interesDiario * diasTranscurridos;

        // Solo generar cuenta si hay interés acumulado
        if (interesAcumuladoActual > 0) {
          // Verificar si ya existe una cuenta actualizada para esta fecha
          const fechaReferencia = fechaIntereses;
          const { data: cuentaExistente } = await supabase
            .from('cuentas_por_cobrar')
            .select('id')
            .eq('referencia', `FIN-${financiamiento.id}-ACT-${fechaReferencia}`)
            .single();

          if (!cuentaExistente) {
            // Crear cuenta por cobrar actualizada solo con el interés adicional acumulado
            const { error: errorCuenta } = await supabase
              .from('cuentas_por_cobrar')
              .insert([{
                cliente_id: financiamiento.cliente_id,
                cliente: financiamiento.nombre_cliente,
                cedula: financiamiento.cedula_cliente || '',
                tipo: 'financiamiento_actualizado',
                referencia: `FIN-${financiamiento.id}-ACT-${fechaReferencia}`,
                fecha_emision: fechaReferencia,
                monto_total: interesAcumuladoActual,
                monto_pendiente: interesAcumuladoActual,
                estado: 'Pendiente',
                divisa: 'DOP',
                notas: `Interés diario: RD$ ${interesDiario.toFixed(2)}. Días transcurridos: ${diasTranscurridos} días. Interés acumulado desde fecha de préstamo hasta ${fechaFormateada}: RD$ ${interesAcumuladoActual.toFixed(2)}.`
              }]);

            if (!errorCuenta) {
              cuentasGeneradas++;
              interesesTotales += interesAcumuladoActual;
            }
          }
        }
      }

      // Recargar datos
      const { data: clientesActualizados } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre');
      
      if (clientesActualizados) {
        setClientes(clientesActualizados);
        await cargarDeudasClientes(clientesActualizados);
      }

      alert(`✅ Cálculo de intereses completado:\n\n- Financiamientos procesados: ${financiamientos.length}\n- Cuentas generadas: ${cuentasGeneradas}\n- Intereses totales calculados hasta ${fechaFormateada}: RD$ ${interesesTotales.toFixed(2)}`);
    } catch (error) {
      console.error('Error al calcular intereses:', error);
      alert('Error al calcular intereses: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cedula && c.cedula.includes(searchTerm))
  );

  const totalCredito = clientes.reduce((sum, c) => sum + (parseFloat(c.limite_credito) || 0), 0);
  const totalDeudaFacturas = clientes.reduce((sum, c) => {
    const deudas = deudasClientes[c.id] || { facturas: 0 };
    return sum + (deudas.facturas || 0);
  }, 0);
  const totalDeudaFinanciamientos = clientes.reduce((sum, c) => {
    const deudas = deudasClientes[c.id] || { financiamientos: 0 };
    return sum + (deudas.financiamientos || 0);
  }, 0);
  const totalPendiente = totalDeudaFacturas + totalDeudaFinanciamientos;
  const creditoDisponible = totalCredito - totalPendiente;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Cargando clientes...</div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Clientes</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex flex-col">
              <label className="text-xs sm:text-sm text-gray-600 mb-1">Fecha para calcular intereses</label>
              <input
                type="date"
                value={fechaIntereses}
                onChange={(e) => setFechaIntereses(e.target.value)}
                className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <button
              onClick={calcularInteresesTodosClientes}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm sm:text-base"
              disabled={loading}
            >
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              {loading ? 'Calculando...' : 'Calcular Intereses'}
            </button>
          </div>
          <button
            onClick={() => {
              setEditingCliente(null);
              setFormData({
                nombre: '',
                cedula: '',
                telefono: '',
                direccion: '',
                email: '',
                limite_credito: 0
              });
              setShowModal(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="text-xs sm:text-sm text-gray-600">Límite Total de Crédito</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600">{formatCurrency(totalCredito)}</div>
        </div>
        <div className="bg-orange-50 p-3 sm:p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            <span className="text-xs sm:text-sm text-gray-600">Deuda Facturas</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-orange-600">{formatCurrency(totalDeudaFacturas)}</div>
        </div>
        <div className="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            <span className="text-xs sm:text-sm text-gray-600">Deuda Financiamientos</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-600">{formatCurrency(totalDeudaFinanciamientos)}</div>
        </div>
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            <span className="text-xs sm:text-sm text-gray-600">Total Por Cobrar</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-red-600">{formatCurrency(totalPendiente)}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            <span className="text-xs sm:text-sm text-gray-600">Crédito Disponible</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(creditoDisponible)}</div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Buscar por nombre o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabla Desktop / Cards Mobile */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cédula</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Límite Crédito</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deuda Facturas</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deuda Financiamientos</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Deuda</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crédito Disponible</th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientesFiltrados.map((cliente) => {
                const limiteCredito = parseFloat(cliente.limite_credito) || 0;
                const deudas = deudasClientes[cliente.id] || { facturas: 0, financiamientos: 0, total: 0 };
                const deudaFacturas = deudas.facturas || 0;
                const deudaFinanciamientos = deudas.financiamientos || 0;
                const totalDeuda = deudas.total || 0;
                const creditoDisponible = limiteCredito - totalDeuda;
                
                return (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                      <div className="text-sm sm:text-base font-medium text-gray-900">{cliente.nombre}</div>
                      {cliente.email && <div className="text-xs sm:text-sm text-gray-500">{cliente.email}</div>}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {cliente.cedula || '-'}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {cliente.telefono || '-'}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-blue-600">
                      {formatCurrency(limiteCredito)}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-orange-600">
                      {formatCurrency(deudaFacturas)}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-purple-600">
                      {formatCurrency(deudaFinanciamientos)}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-bold text-red-600">
                      {formatCurrency(totalDeuda)}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-green-600">
                      {formatCurrency(creditoDisponible)}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => generarPDFCliente(cliente)}
                          className="text-green-600 hover:text-green-800"
                          title="Generar PDF"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(cliente)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cliente.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {clientesFiltrados.map((cliente) => {
            const limiteCredito = parseFloat(cliente.limite_credito) || 0;
            const deudas = deudasClientes[cliente.id] || { facturas: 0, financiamientos: 0, total: 0 };
            const deudaFacturas = deudas.facturas || 0;
            const deudaFinanciamientos = deudas.financiamientos || 0;
            const totalDeuda = deudas.total || 0;
            const creditoDisponible = limiteCredito - totalDeuda;
            
            return (
              <div key={cliente.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{cliente.nombre}</p>
                    {cliente.email && <p className="text-xs text-gray-500 mt-1">{cliente.email}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => generarPDFCliente(cliente)}
                      className="text-green-600 hover:text-green-800 p-1"
                      title="Generar PDF"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(cliente)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cliente.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Cédula</p>
                    <p className="font-medium text-gray-700">{cliente.cedula || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Teléfono</p>
                    <p className="font-medium text-gray-700">{cliente.telefono || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Límite Crédito</p>
                    <p className="font-medium text-blue-600">{formatCurrency(limiteCredito)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Deuda Facturas</p>
                    <p className="font-medium text-orange-600">{formatCurrency(deudaFacturas)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Deuda Financiamientos</p>
                    <p className="font-medium text-purple-600">{formatCurrency(deudaFinanciamientos)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Deuda</p>
                    <p className="font-bold text-red-600">{formatCurrency(totalDeuda)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Crédito Disponible</p>
                    <p className="font-bold text-green-600">{formatCurrency(creditoDisponible)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">
                {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Cédula
                    </label>
                    <input
                      type="text"
                      value={formData.cedula}
                      onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={formData.telefono}
                      onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Límite de Crédito
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.limite_credito}
                      onChange={(e) => setFormData({...formData, limite_credito: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <textarea
                      value={formData.direccion}
                      onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                      rows="2"
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 justify-end pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingCliente(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
                  >
                    {editingCliente ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}