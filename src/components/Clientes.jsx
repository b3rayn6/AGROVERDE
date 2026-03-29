import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/formatters';
import { Users, Plus, Edit2, Trash2, Search, DollarSign, FileText, FileDown, TrendingUp, Filter, Check, GitMerge } from 'lucide-react';
import { generarPDFCliente, generarPDFTodosClientes, generarHTMLDetalleCliente, generarHTMLCliente, generarHTMLTodosClientes } from '../lib/pdfGeneratorExtras';
import ReportPreviewModal from './ReportPreviewModal';
import UnificarClientesModal from './UnificarClientesModal';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [deudasClientes, setDeudasClientes] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showUnificarModal, setShowUnificarModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroDeuda, setFiltroDeuda] = useState({
    facturas: true,
    financiamientos: true
  });
  const [clientesSeleccionados, setClientesSeleccionados] = useState([]);
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    direccion: '',
    email: '',
    limite_credito: 0
  });

  // State for currency conversion
  const [convertirMoneda, setConvertirMoneda] = useState(false);
  const [tasaCambio, setTasaCambio] = useState(60.00);

  // State for PDF Preview
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');

  useEffect(() => {
    const init = async () => {
      let tasa = 60.00;
      try {
        const { data } = await supabase
          .from('configuracion_divisa')
          .select('tasa_dolar')
          .single();
        if (data) {
          setTasaCambio(data.tasa_dolar);
          tasa = data.tasa_dolar;
        }
      } catch (error) {
        console.error('Error fetching tasa:', error);
      }
      cargarClientes(tasa);
    };
    init();
  }, []);

  const cargarClientes = async (tasaRef = null) => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre');
      
      if (error) throw error;
      setClientes(data || []);
      
      // Cargar deudas de facturas y financiamientos
      await cargarDeudasClientes(data || [], tasaRef);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      alert('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const cargarDeudasClientes = async (clientesList, tasaRef = null) => {
    try {
      const deudas = {};
      const tasaCalculo = tasaRef || tasaCambio;
      
      // Para cada cliente, calcular deudas de facturas y financiamientos
      for (const cliente of clientesList) {
        // Calcular deuda de facturas a crédito
        const { data: facturas, error: errorFacturas } = await supabase
          .from('facturas_venta')
          .select('balance_pendiente, divisa')
          .eq('cliente_id', cliente.id)
          .gt('balance_pendiente', 0)
          .neq('estado', 'pagada');
        
        const deudaFacturas = facturas?.reduce((sum, f) => {
          const monto = parseFloat(f.balance_pendiente) || 0;
          if (f.divisa === 'USD') {
            return sum + (monto * tasaCalculo);
          }
          return sum + monto;
        }, 0) || 0;
        
        // Calcular deuda de financiamientos
        const { data: financiamientos, error: errorFinanciamientos } = await supabase
          .from('financiamientos')
          .select('balance_pendiente, divisa')
          .eq('cliente_id', cliente.id)
          .gt('balance_pendiente', 0)
          .in('estado', ['Activo', 'Atrasado']);
        
        const deudaFinanciamientos = financiamientos?.reduce((sum, f) => {
          const monto = parseFloat(f.balance_pendiente) || 0;
          if (f.divisa === 'USD') {
            return sum + (monto * tasaCalculo);
          }
          return sum + monto;
        }, 0) || 0;
        
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

  const handleVerDetalleCliente = (cliente) => {
    setSelectedClientId(cliente.id);
    setShowReportModal(true);
  };

  const handleGenerarReporteDetallado = async () => {
    console.log('Iniciando generación de reporte detallado...');
    
    // Check for sandbox environment
    const isE2bSandbox = window.location.hostname.includes('e2b.app') || 
                         window.location.hostname.includes('e2b.dev') ||
                         window.self !== window.top;
                         
    if (isE2bSandbox) {
      console.log('Detectado entorno sandbox/iframe. Usando modal interno.');
    }

    if (!selectedClientId) {
      console.warn('No hay cliente seleccionado');
      return;
    }
    
    // Buscar cliente seleccionado - Usar comparación flexible para manejar string/number
    const cliente = clientes.find(c => c.id == selectedClientId);
    if (!cliente) {
      console.error('Cliente no encontrado en la lista');
      return;
    }
    
    console.log('Cliente seleccionado:', cliente.nombre);

    setGeneratingReport(true);
    try {
      console.log('Consultando facturas...');
      // Fetch invoices
      const { data: facturas, error: errorFacturas } = await supabase
        .from('facturas_venta')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('fecha', { ascending: false });
        
      if (errorFacturas) {
        console.error('Error fetching facturas:', errorFacturas);
        throw errorFacturas;
      }
      console.log('Facturas encontradas:', facturas?.length || 0);

      console.log('Consultando financiamientos...');
      // Fetch financings
      const { data: financiamientos, error: errorFinanciamientos } = await supabase
        .from('financiamientos')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('fecha_prestamo', { ascending: false });

      if (errorFinanciamientos) {
        console.error('Error fetching financiamientos:', errorFinanciamientos);
        throw errorFinanciamientos;
      }
      console.log('Financiamientos encontrados:', financiamientos?.length || 0);

      // Procesar conversión de moneda si es necesario
      let facturasProcesadas = facturas || [];
      let financiamientosProcesados = financiamientos || [];

      if (convertirMoneda) {
        console.log(`Aplicando conversión USD -> DOP con tasa: ${tasaCambio}`);
        
        facturasProcesadas = facturasProcesadas.map(f => {
          // Si la factura está en USD, convertir valores
          if (f.divisa === 'USD') {
            return {
              ...f,
              total: (parseFloat(f.total) || 0) * tasaCambio,
              monto_pagado: (parseFloat(f.monto_pagado) || 0) * tasaCambio,
              balance_pendiente: (parseFloat(f.balance_pendiente) || 0) * tasaCambio,
              divisa: 'DOP' // Cambiar divisa para que se muestre como RD$
            };
          }
          return f;
        });

        financiamientosProcesados = financiamientosProcesados.map(f => {
          if (f.divisa === 'USD') {
            return {
              ...f,
              monto_total: (parseFloat(f.monto_total) || 0) * tasaCambio,
              balance_pendiente: (parseFloat(f.balance_pendiente) || 0) * tasaCambio,
              divisa: 'DOP'
            };
          }
          return f;
        });
      }

      // Generar HTML del reporte
      console.log('Generando HTML del reporte...');
      const htmlContent = generarHTMLDetalleCliente(cliente, facturasProcesadas, financiamientosProcesados);
      
      // Mostrar en modal
      setPreviewHtml(htmlContent);
      setPreviewTitle(`Reporte Detallado - ${cliente.nombre}`);
      setShowPreview(true);
      
      // Cerrar modal de selección
      setShowReportModal(false);
      setSelectedClientId('');
    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('Error al generar el reporte: ' + error.message);
    } finally {
      setGeneratingReport(false);
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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-wrap justify-end">
          <button
            onClick={() => setShowUnificarModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm sm:text-base"
          >
            <GitMerge className="w-4 h-4 sm:w-5 sm:h-5" />
            Unificar
          </button>
          <button
            onClick={() => setShowFilterModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm sm:text-base"
          >
            <FileDown className="w-4 h-4 sm:w-5 sm:h-5" />
            Generar PDF General
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm sm:text-base"
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            Reporte Detallado
          </button>
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
                          onClick={() => handleVerDetalleCliente(cliente)}
                          className="text-purple-600 hover:text-purple-800"
                          title="Ver Reporte Detallado"
                          disabled={generatingReport}
                        >
                          <FileText className="w-4 h-4" />
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
                      onClick={() => handleVerDetalleCliente(cliente)}
                      className="text-purple-600 hover:text-purple-800 p-1"
                      title="Ver Reporte Detallado"
                      disabled={generatingReport}
                    >
                      <FileText className="w-4 h-4" />
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

      {/* Modal Reporte Detallado */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Reporte Detallado de Cliente
            </h2>
            
            <p className="text-sm text-gray-600 mb-4">
              Seleccione un cliente para generar un reporte detallado que incluya todas sus facturas y financiamientos.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Seleccionar un cliente...</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="convertirMoneda"
                  checked={convertirMoneda}
                  onChange={(e) => setConvertirMoneda(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="convertirMoneda" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Convertir facturas USD a DOP
                </label>
              </div>
              
              {convertirMoneda && (
                <div className="ml-6 mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Tasa del día (USD {`->`} DOP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">RD$</span>
                    <input
                      type="number"
                      value={tasaCambio}
                      onChange={(e) => setTasaCambio(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="1"
                      className="w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Se convertirán los montos de facturas en USD a Pesos usando esta tasa.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setSelectedClientId('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerarReporteDetallado}
                disabled={!selectedClientId || generatingReport}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {generatingReport ? (
                  <>Generando...</>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    Generar Reporte
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={previewTitle}
        htmlContent={previewHtml}
      />

      {/* Modal Filtros PDF */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800">Filtrar Datos para PDF</h2>
              </div>

              <div className="space-y-6">
                {/* Sección de Tipos de Deuda */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3">Tipos de Deuda</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Seleccione qué tipo de deuda desea incluir en el reporte PDF:
                  </p>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filtroDeuda.facturas}
                        onChange={(e) => setFiltroDeuda({...filtroDeuda, facturas: e.target.checked})}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-orange-600" />
                          <span className="font-medium text-gray-900">Deuda de Facturas</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Incluir cuentas por cobrar de facturas de venta</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filtroDeuda.financiamientos}
                        onChange={(e) => setFiltroDeuda({...filtroDeuda, financiamientos: e.target.checked})}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-gray-900">Deuda de Financiamientos</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Incluir préstamos y financiamientos activos</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Sección de Selección de Clientes */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3">Clientes</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Seleccione clientes específicos (opcional). Si no selecciona ninguno, se incluirán todos los clientes:
                  </p>

                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setClientesSeleccionados(clientes.map(c => c.id))}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Seleccionar Todos
                    </button>
                    <button
                      onClick={() => setClientesSeleccionados([])}
                      className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Deseleccionar Todos
                    </button>
                  </div>

                  <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                    {clientes.map(cliente => (
                      <label
                        key={cliente.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={clientesSeleccionados.includes(cliente.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setClientesSeleccionados([...clientesSeleccionados, cliente.id]);
                              } else {
                                setClientesSeleccionados(clientesSeleccionados.filter(id => id !== cliente.id));
                              }
                            }}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-gray-900 text-sm">{cliente.nombre}</span>
                              {cliente.cedula && (
                                <span className="text-xs text-gray-500 ml-2">({cliente.cedula})</span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Deuda Total</div>
                              <div className="text-sm font-medium text-red-600">
                                {formatCurrency((deudasClientes[cliente.id]?.total || 0))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {clientesSeleccionados.length > 0 && (
                    <p className="text-sm text-blue-600 mt-2">
                      {clientesSeleccionados.length} cliente{clientesSeleccionados.length !== 1 ? 's' : ''} seleccionado{clientesSeleccionados.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFilterModal(false);
                      setClientesSeleccionados([]);
                    }}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (!filtroDeuda.facturas && !filtroDeuda.financiamientos) {
                        alert('Debe seleccionar al menos un tipo de deuda');
                        return;
                      }

                      // Filtrar clientes si hay selección específica
                      const clientesFiltrados = clientesSeleccionados.length > 0
                        ? clientes.filter(c => clientesSeleccionados.includes(c.id))
                        : clientes;

                      const html = generarHTMLTodosClientes(clientesFiltrados, deudasClientes, filtroDeuda);
                      setPreviewHtml(html);
                      setPreviewTitle('Reporte General de Clientes');
                      setShowPreview(true);
                      
                      setShowFilterModal(false);
                      setClientesSeleccionados([]);
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base flex items-center justify-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Generar PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Clientes */}
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
      <UnificarClientesModal
        isOpen={showUnificarModal}
        onClose={() => setShowUnificarModal(false)}
        clientes={clientes}
        onMergeComplete={() => {
          setShowUnificarModal(false);
          cargarClientes();
        }}
      />

    </div>
  );
}