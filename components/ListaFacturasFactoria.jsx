import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Plus, Edit2, Trash2, Search, Filter, Printer, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { formatCurrency, formatNumber } from '../lib/formatters';

export default function ListaFacturasFactoria({ user, onNuevaFactura, onEditarFactura }) {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFactoria, setFilterFactoria] = useState('');
  const [factorias, setFactorias] = useState([]);

  useEffect(() => {
    cargarFacturas();
  }, [user]);

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
    } finally {
      setLoading(false);
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

  const facturasFiltradas = facturas.filter(factura => {
    const matchSearch = factura.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       factura.nombre_factoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFactoria = filterFactoria === '' || factura.nombre_factoria === filterFactoria;
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
              <button
                onClick={imprimirFacturas}
                disabled={facturasFiltradas.length === 0}
                className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-5 h-5" />
                Imprimir
              </button>
              <button
                onClick={handleLimpiarDuplicados}
                disabled={loading}
                className="flex-1 md:flex-none px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Limpiar Duplicados
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

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por productor o factoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
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
          </div>

          {/* Totales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

          {/* Lista de Facturas */}
          {facturasFiltradas.length === 0 ? (
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
          )}
        </div>
      </div>
    </div>
  );
}
