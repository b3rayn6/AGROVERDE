import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Plus, Edit2, Trash2, Search, Filter, Printer, CheckCircle, XCircle, RefreshCw, Banknote, Download, GitCompare } from 'lucide-react';
import { formatCurrency, formatNumber } from '../lib/formatters';
import ModalChequeFactoria from './ModalChequeFactoria';
import ModalComparacionDirecta from './ModalComparacionDirecta';
import { generarPDFChequesFactoria } from '../lib/pdfGeneratorExtras';

export default function ListaFacturasFactoria({ user, onNuevaFactura, onEditarFactura = () => {} }) {
  const [facturas, setFacturas] = useState([]);
  const [cheques, setCheques] = useState([]);
  const [activeTab, setActiveTab] = useState('facturas'); // 'facturas' | 'cheques'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFactoria, setFilterFactoria] = useState('');
  const [factorias, setFactorias] = useState([]);
  const [showModalCheque, setShowModalCheque] = useState(false);
  const [showModalComparacion, setShowModalComparacion] = useState(false);
  const [chequeAEditar, setChequeAEditar] = useState(null);
  
  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterNumero, setFilterNumero] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [filterProductor, setFilterProductor] = useState('');
  const [filterMontoMin, setFilterMontoMin] = useState('');
  const [filterMontoMax, setFilterMontoMax] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterSacosMin, setFilterSacosMin] = useState('');
  const [filterSacosMax, setFilterSacosMax] = useState('');
  const [agruparPor, setAgruparPor] = useState('none');
  
  const clearFilters = () => {
    setSearchTerm('');
    setFilterFactoria('');
    setFilterNumero('');
    setFilterFechaDesde('');
    setFilterFechaHasta('');
    setFilterProductor('');
    setFilterMontoMin('');
    setFilterMontoMax('');
    setFilterSacosMin('');
    setFilterSacosMax('');
    setFilterEstado('');
  };

  useEffect(() => {
    cargarDatos();
  }, [user]);

  const cargarDatos = async () => {
    setLoading(true);
    await Promise.all([cargarFacturas(), cargarCheques()]);
    setLoading(false);
  };

  const cargarCheques = async () => {
    try {
      const { data, error } = await supabase
        .from('cheques_factoria')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;
      setCheques(data || []);
    } catch (error) {
      console.error('Error al cargar cheques:', error);
    }
  };

  // Función para crear clave única de una factura
  const crearClaveFactura = (factura) => {
    // Si tiene numero_pesada, usarlo como clave principal
    if (factura.numero_pesada) {
      return `numero-${factura.numero_pesada}`;
    }
    // Si no, usar combinación de campos únicos
    return `${factura.fecha}-${factura.nombre_factoria}-${factura.cliente}-${factura.cantidad_sacos}-${factura.kilos_neto}`;
  };

  // Función para eliminar duplicados en memoria
  const eliminarDuplicados = (facturas) => {
    const vistas = new Map();
    const facturasUnicas = [];

    for (const factura of facturas) {
      const clave = crearClaveFactura(factura);
      
      if (!vistas.has(clave)) {
        vistas.set(clave, true);
        facturasUnicas.push(factura);
      } else {
        // Si es duplicado, mantener el más reciente (mayor ID o fecha más reciente)
        const existente = facturasUnicas.find(f => crearClaveFactura(f) === clave);
        
        if (existente) {
          const fechaExistente = new Date(existente.fecha);
          const fechaNueva = new Date(factura.fecha);
          
          // Si la nueva factura es más reciente o tiene mayor ID, reemplazar
          if (fechaNueva > fechaExistente || factura.id > existente.id) {
            const indice = facturasUnicas.indexOf(existente);
            facturasUnicas[indice] = factura;
          }
        }
      }
    }

    return facturasUnicas;
  };

  // Función para limpiar duplicados en la base de datos
  const limpiarDuplicadosEnBD = async (facturas) => {
    const grupos = new Map();
    
    // Agrupar por clave única
    for (const factura of facturas) {
      const clave = crearClaveFactura(factura);
      
      if (!grupos.has(clave)) {
        grupos.set(clave, []);
      }
      grupos.get(clave).push(factura);
    }

    let totalEliminados = 0;

    // Para cada grupo con duplicados, mantener solo el más reciente
    for (const [clave, grupo] of grupos) {
      if (grupo.length > 1) {
        // Ordenar por fecha descendente y luego por ID descendente
        grupo.sort((a, b) => {
          const fechaA = new Date(a.fecha);
          const fechaB = new Date(b.fecha);
          if (fechaB.getTime() !== fechaA.getTime()) {
            return fechaB - fechaA;
          }
          return b.id - a.id;
        });

        // Mantener el primero (más reciente)
        const mantener = grupo[0];
        const eliminar = grupo.slice(1);

        for (const duplicado of eliminar) {
          await supabase
            .from('facturas_factoria')
            .delete()
            .eq('id', duplicado.id);
          
          totalEliminados++;
        }

        console.log(`Eliminados ${eliminar.length} duplicados de ${clave}, mantenido ID: ${mantener.id}`);
      }
    }

    return totalEliminados;
  };

  // Función para limpiar duplicados manualmente
  const handleLimpiarDuplicados = async () => {
    if (!confirm('¿Estás seguro de limpiar los duplicados? Esta acción eliminará las facturas duplicadas manteniendo solo la más reciente de cada grupo.')) {
      return;
    }

    setLoading(true);
    try {
      // Cargar todas las facturas
      const { data, error } = await supabase
        .from('facturas_factoria')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('No hay facturas para limpiar');
        setLoading(false);
        return;
      }

      // Limpiar duplicados
      const totalEliminados = await limpiarDuplicadosEnBD(data);

      if (totalEliminados > 0) {
        alert(`Se eliminaron ${totalEliminados} facturas duplicadas`);
        // Recargar las facturas
        await cargarFacturas();
      } else {
        alert('No se encontraron duplicados');
      }
    } catch (error) {
      console.error('Error al limpiar duplicados:', error);
      alert(`Error al limpiar duplicados: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const cargarFacturas = async () => {
    try {
      // No filtrar por user_id - mostrar todas las facturas
      // Si en el futuro quieres filtrar por usuario, puedes hacerlo aquí
      const { data, error } = await supabase
        .from('facturas_factoria')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;

      // Verificar y limpiar duplicados antes de establecer las facturas
      const facturasSinDuplicados = eliminarDuplicados(data || []);
      
      // Si se encontraron duplicados, eliminarlos de la base de datos
      if (facturasSinDuplicados.length !== (data || []).length) {
        console.warn(`Se encontraron ${(data || []).length - facturasSinDuplicados.length} facturas duplicadas`);
        await limpiarDuplicadosEnBD(data || []);
        // Recargar después de limpiar
        const { data: dataActualizada } = await supabase
          .from('facturas_factoria')
          .select('*')
          .order('fecha', { ascending: false });
        if (dataActualizada) {
          setFacturas(dataActualizada);
          // Extraer factorías únicas
          const factoriasUnicas = [...new Set((dataActualizada || []).map(f => f.nombre_factoria))];
          setFactorias(factoriasUnicas);
        }
      } else {
        setFacturas(data || []);
        // Extraer factorías únicas
        const factoriasUnicas = [...new Set((data || []).map(f => f.nombre_factoria))];
        setFactorias(factoriasUnicas);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar las facturas: ' + error.message);
    }
  };

  const eliminarFactura = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta factura?')) return;

    try {
      const { error } = await supabase
        .from('facturas_factoria')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Factura eliminada correctamente');
      cargarFacturas();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar la factura');
    }
  };

  const eliminarCheque = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este cheque?')) return;

    try {
      const { error } = await supabase
        .from('cheques_factoria')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Cheque eliminado correctamente');
      cargarCheques();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el cheque');
    }
  };

  const editarCheque = (cheque) => {
    setChequeAEditar(cheque);
    setShowModalCheque(true);
  };

  const marcarComoPagado = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'pagado' ? 'pendiente' : 'pagado';
    const mensaje = nuevoEstado === 'pagado' 
      ? '¿Marcar esta factura como PAGADA?' 
      : '¿Marcar esta factura como PENDIENTE?';
    
    if (!confirm(mensaje)) return;

    try {
      const { error } = await supabase
        .from('facturas_factoria')
        .update({ 
          estado_pago: nuevoEstado,
          fecha_pago: nuevoEstado === 'pagado' ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;

      alert(`Factura marcada como ${nuevoEstado.toUpperCase()}`);
      cargarFacturas();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar el estado de pago');
    }
  };

  const imprimirFacturas = () => {
    const printWindow = window.open('', '_blank');
    const totales = calcularTotales();
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facturas de Factoría - AGROVERDE</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { margin: 0; color: #16a34a; }
          .header p { margin: 5px 0; color: #666; }
          .filters { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .filters p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #16a34a; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .totales { background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; }
          .totales h3 { margin-top: 0; color: #92400e; }
          .totales-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
          .total-item { text-align: center; }
          .total-item .label { font-size: 12px; color: #666; }
          .total-item .value { font-size: 20px; font-weight: bold; color: #16a34a; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AGROVERDE/AGVSRL</h1>
          <p>Reporte de Facturas de Factoría</p>
          <p>Fecha de impresión: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        </div>
        
        ${searchTerm || filterFactoria ? `
        <div class="filters">
          <h3 style="margin-top: 0;">Filtros Aplicados:</h3>
          ${searchTerm ? `<p><strong>Búsqueda:</strong> ${searchTerm}</p>` : ''}
          ${filterFactoria ? `<p><strong>Factoría:</strong> ${filterFactoria}</p>` : ''}
        </div>
        ` : ''}
        
        <table>
          <thead>
            <tr>
              <th>N° Pesada</th>
              <th>Fecha</th>
              <th>Factoría</th>
              <th>Productor</th>
              <th>Sacos</th>
              <th>Kg Neto</th>
              <th>Humedad</th>
              <th>Fanegas</th>
              <th>Precio/Fanega</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            ${facturasFiltradas.map(f => `
              <tr>
                <td>${f.numero_pesada || '-'}</td>
                <td>${new Date(f.fecha).toLocaleDateString()}</td>
                <td>${f.nombre_factoria}</td>
                <td>${f.cliente}</td>
                <td>${f.cantidad_sacos}</td>
                <td>${parseFloat(f.kilos_neto).toFixed(2)}</td>
                <td>${parseFloat(f.humedad).toFixed(2)}%</td>
                <td>${parseFloat(f.fanegas).toFixed(2)}</td>
                <td>${parseFloat(f.precio_fanega).toFixed(2)}</td>
                <td><strong>${parseFloat(f.valor_pagar).toFixed(2)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totales">
          <h3>Totales Generales</h3>
          <div class="totales-grid">
            <div class="total-item">
              <div class="label">Total Sacos</div>
              <div class="value">${totales.sacos}</div>
            </div>
            <div class="total-item">
              <div class="label">Total Kilos Neto</div>
              <div class="value">${totales.kilosNeto.toFixed(2)}</div>
            </div>
            <div class="total-item">
              <div class="label">Total Fanegas</div>
              <div class="value">${totales.fanegas.toFixed(2)}</div>
            </div>
            <div class="total-item">
              <div class="label">Valor Total</div>
              <div class="value">${totales.valorTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Total de facturas: ${facturasFiltradas.length}</p>
          <p>Sistema de Gestión AGROVERDE - Generado automáticamente</p>
          <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-DO', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}</strong></p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const generarReporteCheques = async () => {
    if (chequesFiltrados.length === 0) {
      alert('No hay cheques para generar reporte');
      return;
    }

    if (typeof window === 'undefined') {
      console.warn('PDF generation is only supported in browser environment.');
      return;
    }

    try {
      generarPDFChequesFactoria(chequesFiltrados);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Hubo un error al generar el reporte PDF');
    }
  };

  const facturasFiltradas = facturas.filter(factura => {
    // Basic filters
    const matchSearch = searchTerm === '' || 
      factura.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.nombre_factoria.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchFactoria = filterFactoria === '' || factura.nombre_factoria === filterFactoria;
    
    // Advanced filters
    const matchNumero = filterNumero === '' || 
      (factura.numero_pesada && factura.numero_pesada.toString().includes(filterNumero));
    
    const matchFechaDesde = filterFechaDesde === '' || new Date(factura.fecha) >= new Date(filterFechaDesde);
    const matchFechaHasta = filterFechaHasta === '' || new Date(factura.fecha) <= new Date(filterFechaHasta);
    
    const matchProductor = filterProductor === '' || 
      factura.cliente.toLowerCase().includes(filterProductor.toLowerCase());
    
    const monto = parseFloat(factura.valor_pagar || 0);
    const matchMontoMin = filterMontoMin === '' || monto >= parseFloat(filterMontoMin);
    const matchMontoMax = filterMontoMax === '' || monto <= parseFloat(filterMontoMax);
    
    const sacos = parseFloat(factura.cantidad_sacos || 0);
    const matchSacosMin = filterSacosMin === '' || sacos >= parseFloat(filterSacosMin);
    const matchSacosMax = filterSacosMax === '' || sacos <= parseFloat(filterSacosMax);
    
    const matchEstado = filterEstado === '' || 
      (filterEstado === 'pagado' && factura.estado_pago === 'pagado') || 
      (filterEstado === 'pendiente' && factura.estado_pago !== 'pagado');
      
    return matchSearch && matchFactoria && matchNumero && matchFechaDesde && 
           matchFechaHasta && matchProductor && matchMontoMin && matchMontoMax && 
           matchSacosMin && matchSacosMax && matchEstado;
  });
  
  // Agrupar por fecha
  const facturasPorFecha = facturasFiltradas.reduce((acc, factura) => {
    const fecha = new Date(factura.fecha).toLocaleDateString();
    if (!acc[fecha]) acc[fecha] = { total: 0, cantidad: 0, facturas: [] };
    acc[fecha].total += parseFloat(factura.valor_pagar || 0);
    acc[fecha].cantidad += 1;
    acc[fecha].facturas.push(factura);
    return acc;
  }, {});

  const chequesFiltrados = cheques.filter(cheque => {
    const matchSearch = cheque.numero_cheque.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       cheque.factoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFactoria = filterFactoria === '' || cheque.factoria === filterFactoria;
    return matchSearch && matchFactoria;
  });

  const calcularTotales = () => {
    return facturasFiltradas.reduce((acc, f) => ({
      sacos: acc.sacos + f.cantidad_sacos,
      kilosNeto: acc.kilosNeto + parseFloat(f.kilos_neto),
      fanegas: acc.fanegas + parseFloat(f.fanegas),
      valorTotal: acc.valorTotal + parseFloat(f.valor_pagar)
    }), { sacos: 0, kilosNeto: 0, fanegas: 0, valorTotal: 0 });
  };

  const totales = calcularTotales();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando facturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800">Facturas de Factoría</h2>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              {activeTab === 'facturas' ? (
                <button
                  onClick={imprimirFacturas}
                  disabled={facturasFiltradas.length === 0}
                  className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-5 h-5" />
                  Imprimir
                </button>
              ) : (
                <button
                  onClick={generarReporteCheques}
                  disabled={chequesFiltrados.length === 0}
                  className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-5 h-5" />
                  Descargar / Imprimir Reporte
                </button>
              )}
              <button
                onClick={handleLimpiarDuplicados}
                disabled={loading}
                className="flex-1 md:flex-none px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Limpiar Duplicados
              </button>
              <button
                onClick={() => setShowModalComparacion(true)}
                className="flex-1 md:flex-none px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
              >
                <GitCompare className="w-5 h-5" />
                Comparar Pesadas
              </button>
              <button
                onClick={() => {
                  setChequeAEditar(null);
                  setShowModalCheque(true);
                }}
                className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                <Banknote className="w-5 h-5" />
                Registrar Cheque
              </button>
              <button
                onClick={onNuevaFactura}
                className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nueva Factura
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('facturas')}
              className={`py-3 px-6 font-semibold text-sm transition-colors border-b-2 ${
                activeTab === 'facturas' 
                  ? 'border-green-600 text-green-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Lista de Facturas
            </button>
            <button
              onClick={() => setActiveTab('cheques')}
              className={`py-3 px-6 font-semibold text-sm transition-colors border-b-2 ${
                activeTab === 'cheques' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Registro de Cheques
            </button>
          </div>

          
          {/* Controles de Filtros */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Búsqueda rápida..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">N°</span>
                </div>
                <input
                  type="text"
                  placeholder="N. de Pesada..."
                  value={filterNumero}
                  onChange={(e) => setFilterNumero(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={filterFactoria}
                  onChange={(e) => setFilterFactoria(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="">Todas las factorías</option>
                  {factorias.map(factoria => (
                    <option key={factoria} value={factoria}>{factoria}</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <select
                  value={agruparPor}
                  onChange={(e) => setAgruparPor(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="none">Sin agrupar</option>
                  <option value="fecha">Agrupar por Fecha</option>
                  <option value="factoria">Agrupar por Factoría</option>
                  <option value="productor">Agrupar por Productor</option>
                </select>
              </div>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Filter className="w-5 h-5" />
                Búsqueda Avanzada
              </button>
              {(searchTerm || filterFactoria || filterNumero || filterFechaDesde || filterFechaHasta || filterProductor || filterMontoMin || filterMontoMax || filterEstado || filterSacosMin || filterSacosMax) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Limpiar Filtros
                </button>
              )}
            </div>

            {/* Panel de Búsqueda Avanzada */}
            {showAdvancedFilters && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente / Productor</label>
                  <input
                    type="text"
                    value={filterProductor}
                    onChange={(e) => setFilterProductor(e.target.value)}
                    placeholder="Nombre del productor..."
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                  <input
                    type="date"
                    value={filterFechaDesde}
                    onChange={(e) => setFilterFechaDesde(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                  <input
                    type="date"
                    value={filterFechaHasta}
                    onChange={(e) => setFilterFechaHasta(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Mínimo</label>
                  <input
                    type="number"
                    value={filterMontoMin}
                    onChange={(e) => setFilterMontoMin(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Máximo</label>
                  <input
                    type="number"
                    value={filterMontoMax}
                    onChange={(e) => setFilterMontoMax(e.target.value)}
                    placeholder="10000.00"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sacos Mínimos</label>
                  <input
                    type="number"
                    value={filterSacosMin}
                    onChange={(e) => setFilterSacosMin(e.target.value)}
                    placeholder="0"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sacos Máximos</label>
                  <input
                    type="number"
                    value={filterSacosMax}
                    onChange={(e) => setFilterSacosMax(e.target.value)}
                    placeholder="1000"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado de Pago</label>
                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 appearance-none"
                  >
                    <option value="">Todos los estados</option>
                    <option value="pagado">Pagados</option>
                    <option value="pendiente">Pendientes</option>
                  </select>
                </div>
              </div>
            )}
          </div>


          
          {/* Totales y Reportes (Facturas) */}
          {activeTab === 'facturas' && (
            <div className="space-y-6 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Total Sacos</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(totales.sacos, 0)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Total Kilos Neto</p>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(totales.kilosNeto)}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Total Fanegas</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatNumber(totales.fanegas)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(totales.valorTotal)}</p>
                </div>
              </div>

              {/* Sección de Reportes por Fecha */}
              {Object.keys(facturasPorFecha).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Resumen por Fecha (Reporte)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cant. Facturas</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(facturasPorFecha).sort((a,b) => new Date(b[0]) - new Date(a[0])).map(([fecha, data]) => (
                          <tr key={fecha}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{fecha}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-center text-gray-500">{data.cantidad}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-semibold text-green-600">{formatCurrency(data.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* Lista de Facturas o Cheques */}
          {activeTab === 'facturas' ? (
            facturasFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No hay facturas registradas</p>
                <button
                  onClick={onNuevaFactura}
                  className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Crear primera factura
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">N° Pesada</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Factoría</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Productor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Sacos</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Kilos Neto</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Fanegas</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Valor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {facturasFiltradas.map(factura => (
                    <tr key={factura.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {factura.numero_pesada || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {new Date(factura.fecha).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{factura.nombre_factoria}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{factura.cliente}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{factura.cantidad_sacos}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatNumber(parseFloat(factura.kilos_neto))}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatNumber(parseFloat(factura.fanegas))}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        {formatCurrency(parseFloat(factura.valor_pagar))}
                      </td>
                      <td className="px-4 py-3">
                        {factura.estado_pago === 'pagado' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            Pagado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                            <XCircle className="w-3 h-3" />
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => marcarComoPagado(factura.id, factura.estado_pago)}
                            className={`p-2 rounded-lg transition-colors ${
                              factura.estado_pago === 'pagado' 
                                ? 'text-yellow-600 hover:bg-yellow-50' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={factura.estado_pago === 'pagado' ? 'Marcar como pendiente' : 'Marcar como pagado'}
                          >
                            {factura.estado_pago === 'pagado' ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => onEditarFactura(factura)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => eliminarFactura(factura.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )
          ) : (
            chequesFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Banknote className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No hay cheques registrados</p>
                <button
                  onClick={() => {
                    setChequeAEditar(null);
                    setShowModalCheque(true);
                  }}
                  className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Registrar primer cheque
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">N° Cheque</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Fecha</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Factoría</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Monto</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Notas</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {chequesFiltrados.map(cheque => (
                      <tr key={cheque.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{cheque.numero_cheque}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(cheque.fecha).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{cheque.factoria}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">{formatCurrency(parseFloat(cheque.monto))}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{cheque.notas || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => editarCheque(cheque)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => eliminarCheque(cheque.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      <ModalChequeFactoria 
        isOpen={showModalCheque}
        onClose={() => {
          setShowModalCheque(false);
          setChequeAEditar(null);
        }}
        factorias={factorias}
        chequeAEditar={chequeAEditar}
        onChequeRegistrado={() => {
          cargarCheques();
          setShowModalCheque(false);
          setChequeAEditar(null);
        }}
        user={user}
      />
      <ModalComparacionDirecta 
        isOpen={showModalComparacion}
        onClose={() => setShowModalComparacion(false)}
        user={user}
      />
    </div>
  );
}