import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/authUtils';
import { X, GitCompare, Download, Search } from 'lucide-react';
import { formatNumber } from '../lib/formatters';

export default function ModalComparacionDirecta({ isOpen, onClose, user }) {
  const [pesadas, setPesadas] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [pesadaId, setPesadaId] = useState('');
  const [facturaId, setFacturaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [pesadaSearch, setPesadaSearch] = useState('');
  const [facturaSearch, setFacturaSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen, user]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const userId = await getUserId(user);
      
      // Cargar últimas 200 pesadas
      const { data: pData, error: pError } = await supabase
        .from('pesadas')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(200);
        
      if (!pError && pData) setPesadas(pData);
      
      // Cargar últimas 200 facturas
      const { data: fData, error: fError } = await supabase
        .from('facturas_factoria')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(200);
        
      if (!fError && fData) setFacturas(fData);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const pesadaSeleccionada = pesadas.find(p => p.id.toString() === pesadaId);
  const facturaSeleccionada = facturas.find(f => f.id.toString() === facturaId);

  let diferenciaKilos = 0;
  let diferenciaPorcentaje = 0;

  if (pesadaSeleccionada && facturaSeleccionada) {
    const kPesada = parseFloat(pesadaSeleccionada.kilos_neto || 0);
    const kFactura = parseFloat(facturaSeleccionada.kilos_neto || 0);
    diferenciaKilos = kPesada - kFactura;
    diferenciaPorcentaje = kPesada > 0 ? (diferenciaKilos / kPesada) * 100 : 0;
  }

  const exportarResultado = () => {
    if (!pesadaSeleccionada || !facturaSeleccionada) return;

    if (typeof window === 'undefined') return;

    const printWindow = window.open('', '_blank');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comparación Pesada vs Factura</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f3f4f6; }
          .diferencia { font-weight: bold; }
          .positivo { color: #16a34a; }
          .negativo { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Comparación Directa: Pesada vs Factura</h1>
          <p>Fecha de reporte: ${new Date().toLocaleString()}</p>
        </div>
        
        <h3>Datos de la Pesada Seleccionada</h3>
        <table>
          <tr><th>N° Pesada</th><td>${pesadaSeleccionada.numero_pesada || '-'}</td></tr>
          <tr><th>Fecha</th><td>${new Date(pesadaSeleccionada.fecha).toLocaleDateString()}</td></tr>
          <tr><th>Productor</th><td>${pesadaSeleccionada.nombre_productor}</td></tr>
        </table>
        
        <h3>Datos de la Factura Seleccionada</h3>
        <table>
          <tr><th>Factoría</th><td>${facturaSeleccionada.nombre_factoria}</td></tr>
          <tr><th>Fecha</th><td>${new Date(facturaSeleccionada.fecha).toLocaleDateString()}</td></tr>
          <tr><th>Cliente</th><td>${facturaSeleccionada.cliente}</td></tr>
        </table>

        <h3>Análisis de Kilos Netos</h3>
        <table>
          <tr>
            <th>Kilo Neto Pesada</th>
            <th>Kilo Neto Factura</th>
            <th>Diferencia (Kilos)</th>
            <th>Diferencia (%)</th>
          </tr>
          <tr>
            <td>${formatNumber(parseFloat(pesadaSeleccionada.kilos_neto))}</td>
            <td>${formatNumber(parseFloat(facturaSeleccionada.kilos_neto))}</td>
            <td class="diferencia ${diferenciaKilos < 0 ? 'positivo' : diferenciaKilos > 0 ? 'negativo' : ''}">
              ${diferenciaKilos > 0 ? '+' : ''}${formatNumber(diferenciaKilos)} kg
            </td>
            <td class="diferencia ${diferenciaPorcentaje < 0 ? 'positivo' : diferenciaPorcentaje > 0 ? 'negativo' : ''}">
              ${diferenciaPorcentaje > 0 ? '+' : ''}${formatNumber(diferenciaPorcentaje, 2)}%
            </td>
          </tr>
        </table>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Filtrado simple
  const pesadasFiltradas = pesadas.filter(p => 
    (p.nombre_productor || '').toLowerCase().includes(pesadaSearch.toLowerCase()) ||
    (p.numero_pesada || '').toString().includes(pesadaSearch)
  );

  const facturasFiltradas = facturas.filter(f => 
    (f.cliente || '').toLowerCase().includes(facturaSearch.toLowerCase()) ||
    (f.nombre_factoria || '').toLowerCase().includes(facturaSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <GitCompare className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-bold text-gray-800">Comparación Directa: Pesada vs Factura</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
             <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Seleccion de pesada */}
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <h3 className="font-semibold text-gray-800 mb-3">1. Seleccionar Pesada</h3>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar productor o N°..."
                    value={pesadaSearch}
                    onChange={(e) => setPesadaSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="bg-white rounded-lg border border-gray-200 h-48 overflow-y-auto">
                  {pesadasFiltradas.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 text-center">No hay resultados</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {pesadasFiltradas.map(p => (
                        <li 
                          key={p.id}
                          onClick={() => setPesadaId(p.id.toString())}
                          className={`p-3 cursor-pointer hover:bg-green-50 transition-colors ${pesadaId === p.id.toString() ? 'bg-green-100 border-l-4 border-green-500' : ''}`}
                        >
                          <div className="font-semibold text-sm text-gray-800">{p.nombre_productor}</div>
                          <div className="text-xs text-gray-500 flex justify-between mt-1">
                            <span>Fecha: {new Date(p.fecha).toLocaleDateString()}</span>
                            <span>Kg Neto: {formatNumber(parseFloat(p.kilos_neto))}</span>
                          </div>
                          {p.numero_pesada && <div className="text-xs text-gray-400">N° {p.numero_pesada}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Seleccion de factura */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-gray-800 mb-3">2. Seleccionar Factura Factoría</h3>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar cliente o factoría..."
                    value={facturaSearch}
                    onChange={(e) => setFacturaSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="bg-white rounded-lg border border-gray-200 h-48 overflow-y-auto">
                  {facturasFiltradas.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 text-center">No hay resultados</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {facturasFiltradas.map(f => (
                        <li 
                          key={f.id}
                          onClick={() => setFacturaId(f.id.toString())}
                          className={`p-3 cursor-pointer hover:bg-blue-50 transition-colors ${facturaId === f.id.toString() ? 'bg-blue-100 border-l-4 border-blue-500' : ''}`}
                        >
                          <div className="font-semibold text-sm text-gray-800">{f.cliente}</div>
                          <div className="text-xs text-gray-500 flex justify-between mt-1">
                            <span>Fact: {f.nombre_factoria}</span>
                            <span>Kg Neto: {formatNumber(parseFloat(f.kilos_neto))}</span>
                          </div>
                          <div className="text-xs text-gray-400">{new Date(f.fecha).toLocaleDateString()}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {pesadaSeleccionada && facturaSeleccionada && (
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm animate-fadeIn">
              <h3 className="font-bold text-gray-800 mb-4 text-center">Resultados de Comparación</h3>
              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-lg overflow-hidden border border-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600 border-b">Kilo Neto Pesada</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600 border-b">Kilo Neto Factura</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600 border-b">Diferencia (Kilos)</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600 border-b">Diferencia (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-4 text-center text-lg font-medium text-gray-800 border-r">
                        {formatNumber(parseFloat(pesadaSeleccionada.kilos_neto))} kg
                      </td>
                      <td className="px-4 py-4 text-center text-lg font-medium text-gray-800 border-r">
                        {formatNumber(parseFloat(facturaSeleccionada.kilos_neto))} kg
                      </td>
                      <td className="px-4 py-4 text-center text-lg font-bold border-r">
                        <span className={diferenciaKilos < 0 ? 'text-green-600' : diferenciaKilos > 0 ? 'text-red-600' : 'text-gray-600'}>
                          {diferenciaKilos > 0 ? '+' : ''}{formatNumber(diferenciaKilos)} kg
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-lg font-bold">
                        <span className={diferenciaPorcentaje < 0 ? 'text-green-600' : diferenciaPorcentaje > 0 ? 'text-red-600' : 'text-gray-600'}>
                           {diferenciaPorcentaje > 0 ? '+' : ''}{formatNumber(diferenciaPorcentaje, 2)}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-center text-sm text-gray-600">
                <p>
                  <span className="font-semibold">Interpretación:</span>{' '}
                  {diferenciaKilos > 0 
                    ? 'La pesada tiene más kilos que la factura (pérdida de kilos).' 
                    : diferenciaKilos < 0 
                      ? 'La factura tiene más kilos que la pesada (ganancia de kilos).' 
                      : 'Ambos registros tienen exactamente la misma cantidad de kilos.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={exportarResultado}
            disabled={!pesadaSeleccionada || !facturaSeleccionada}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Exportar Resultado
          </button>
        </div>
      </div>
    </div>
  );
}
