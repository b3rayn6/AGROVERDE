import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Search, Filter, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ReporteGastosFlete({ user }) {
  const [gastosBrutos, setGastosBrutos] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [choferFiltro, setChoferFiltro] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // 1. Obtener los gastos con la información del flete
      const { data: gastosData, error: gastosError } = await supabase
        .from('gastos_flete')
        .select(`
          monto,
          tipo,
          flete_id,
          fletes (
            chofer,
            fecha
          )
        `);

      if (gastosError) throw gastosError;

      // 2. Extraer los choferes para el filtro
      const choferesUnicos = new Set();
      const gastosMapeados = [];

      (gastosData || []).forEach(gasto => {
        if (gasto.fletes && gasto.fletes.chofer) {
          choferesUnicos.add(gasto.fletes.chofer);
          gastosMapeados.push({
            monto: Number(gasto.monto || 0),
            tipo: gasto.tipo || 'Otros',
            chofer: gasto.fletes.chofer,
            fecha: gasto.fletes.fecha
          });
        }
      });

      setChoferes(Array.from(choferesUnicos).sort());
      setGastosBrutos(gastosMapeados);
    } catch (error) {
      console.error('Error al cargar reporte de gastos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar y agrupar datos
  const { datosTabla, datosGrafico, totalesGenerales } = useMemo(() => {
    // 1. Aplicar filtros
    let filtrados = gastosBrutos;

    if (fechaDesde) {
      filtrados = filtrados.filter(g => g.fecha >= fechaDesde);
    }
    if (fechaHasta) {
      filtrados = filtrados.filter(g => g.fecha <= fechaHasta);
    }
    if (choferFiltro) {
      filtrados = filtrados.filter(g => g.chofer === choferFiltro);
    }

    // 2. Agrupar por chofer
    const agrupado = {};
    
    filtrados.forEach(gasto => {
      if (!agrupado[gasto.chofer]) {
        agrupado[gasto.chofer] = {
          chofer: gasto.chofer,
          combustible: 0,
          peaje: 0,
          avanceEfectivo: 0,
          otros: 0,
          total: 0
        };
      }
      
      const monto = gasto.monto;
      const tipoLower = gasto.tipo.toLowerCase();
      
      if (tipoLower.includes('combustible')) {
        agrupado[gasto.chofer].combustible += monto;
      } else if (tipoLower.includes('peaje')) {
        agrupado[gasto.chofer].peaje += monto;
      } else if (tipoLower.includes('avance')) {
        agrupado[gasto.chofer].avanceEfectivo += monto;
      } else {
        agrupado[gasto.chofer].otros += monto;
      }
      
      agrupado[gasto.chofer].total += monto;
    });

    const datosTabla = Object.values(agrupado).sort((a, b) => b.total - a.total);

    // 3. Preparar datos para gráfico
    const datosGrafico = datosTabla.map(d => ({
      name: d.chofer,
      Combustible: d.combustible,
      Peajes: d.peaje,
      'Avances Efectivo': d.avanceEfectivo,
      Otros: d.otros
    }));

    // 4. Calcular totales generales
    const totalesGenerales = datosTabla.reduce((acc, curr) => ({
      combustible: acc.combustible + curr.combustible,
      peaje: acc.peaje + curr.peaje,
      avanceEfectivo: acc.avanceEfectivo + curr.avanceEfectivo,
      otros: acc.otros + curr.otros,
      total: acc.total + curr.total
    }), { combustible: 0, peaje: 0, avanceEfectivo: 0, otros: 0, total: 0 });

    return { datosTabla, datosGrafico, totalesGenerales };
  }, [gastosBrutos, fechaDesde, fechaHasta, choferFiltro]);

  const exportarPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text('Reporte de Gastos por Chofer', 14, 20);
      
      doc.setFontSize(10);
      let yInfo = 28;
      if (fechaDesde || fechaHasta) {
        doc.text(`Período: ${fechaDesde || 'Inicio'} al ${fechaHasta || 'Fin'}`, 14, yInfo);
        yInfo += 6;
      }
      if (choferFiltro) {
        doc.text(`Chofer: ${choferFiltro}`, 14, yInfo);
        yInfo += 6;
      }

      const tableData = datosTabla.map(d => [
        d.chofer,
        `$${d.combustible.toFixed(2)}`,
        `$${d.peaje.toFixed(2)}`,
        `$${d.avanceEfectivo.toFixed(2)}`,
        `$${d.otros.toFixed(2)}`,
        `$${d.total.toFixed(2)}`
      ]);

      // Add totals row
      tableData.push([
        'TOTAL GENERAL',
        `$${totalesGenerales.combustible.toFixed(2)}`,
        `$${totalesGenerales.peaje.toFixed(2)}`,
        `$${totalesGenerales.avanceEfectivo.toFixed(2)}`,
        `$${totalesGenerales.otros.toFixed(2)}`,
        `$${totalesGenerales.total.toFixed(2)}`
      ]);

      doc.autoTable({
        startY: yInfo + 4,
        head: [['Chofer', 'Combustible', 'Peajes', 'Avances', 'Otros', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94] },
        footStyles: { fillColor: [240, 240, 240] },
        willDrawCell: function(data) {
          // Bold totals row
          if (data.row.index === tableData.length - 1) {
            doc.setFont('helvetica', 'bold');
          }
        }
      });

      doc.save(`Reporte_Gastos_Choferes_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Hubo un error al generar el PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-lg">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Chofer</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={choferFiltro}
                onChange={(e) => setChoferFiltro(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Todos los choferes</option>
                {choferes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFechaDesde('');
                setFechaHasta('');
                setChoferFiltro('');
              }}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="Limpiar filtros"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={cargarDatos}
              className="px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              title="Recargar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={exportarPDF}
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              title="Descargar PDF"
            >
              <FileText className="w-5 h-5" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 bg-white rounded-xl shadow-lg">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-green-600 mb-4" />
          <p className="text-gray-500">Cargando reporte de gastos...</p>
        </div>
      ) : (
        <>
          {/* Gráfico */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Comparativa de Gastos por Chofer</h3>
            {datosGrafico.length > 0 ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="Combustible" stackId="a" fill="#10B981" />
                    <Bar dataKey="Peajes" stackId="a" fill="#F59E0B" />
                    <Bar dataKey="Avances Efectivo" stackId="a" fill="#EF4444" />
                    <Bar dataKey="Otros" stackId="a" fill="#6B7280" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                No hay datos para mostrar en este período
              </div>
            )}
          </div>

          {/* Tabla de Datos */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Chofer</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Combustible</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Peajes</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Avances de Efectivo</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Otros</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-800">Total General</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {datosTabla.length > 0 ? (
                    datosTabla.map((fila, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">{fila.chofer}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">${fila.combustible.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">${fila.peaje.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">${fila.avanceEfectivo.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">${fila.otros.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-orange-600 font-bold text-right">${fila.total.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        No se encontraron gastos para los filtros seleccionados
                      </td>
                    </tr>
                  )}
                </tbody>
                {datosTabla.length > 0 && (
                  <tfoot className="bg-green-100">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold text-gray-800">TOTAL GENERAL</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-800 text-right">${totalesGenerales.combustible.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-800 text-right">${totalesGenerales.peaje.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-800 text-right">${totalesGenerales.avanceEfectivo.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-800 text-right">${totalesGenerales.otros.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-orange-700 text-right">${totalesGenerales.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
