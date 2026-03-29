import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Search, Filter, AlertCircle, CheckCircle, RefreshCw, Plus, Save, DollarSign, X } from 'lucide-react';
import { formatCurrency } from '../lib/formatters';
import { formatearFechaLocal } from '../lib/dateUtils';
import { generarPDFReconciliacion } from '../lib/pdfGeneratorReconciliacion';

export default function CruceFletesGastos({ user }) {
  const [fletes, setFletes] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [choferFiltro, setChoferFiltro] = useState('');
  const [estadoReconciliacion, setEstadoReconciliacion] = useState('todos'); // 'todos', 'reconciliados', 'pendientes'
  
  // Modal para gasto sin flete
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [formGasto, setFormGasto] = useState({
    chofer: '',
    tipo: 'Avance de efectivo',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const puedeEditar = () => {
    if (user?.email === 'admin@admin.com') return true;
    const permiso = user?.permisos?.find(p => p.modulos?.codigo === 'fletes' || p.modulos?.codigo === 'flete');
    return permiso?.puede_editar === true;
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Obtener fletes
      const { data: fletesData, error: fletesError } = await supabase
        .from('fletes')
        .select('*')
        .order('fecha', { ascending: false });

      if (fletesError) throw fletesError;

      // Obtener gastos (con o sin flete)
      const { data: gastosData, error: gastosError } = await supabase
        .from('gastos_flete')
        .select('*');

      if (gastosError) throw gastosError;

      // Extraer choferes únicos
      const choferesUnicos = new Set();
      fletesData?.forEach(f => {
        if (f.chofer) choferesUnicos.add(f.chofer);
      });
      gastosData?.forEach(g => {
        if (g.chofer) choferesUnicos.add(g.chofer);
      });

      setChoferes(Array.from(choferesUnicos).sort());
      setFletes(fletesData || []);
      setGastos(gastosData || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const procesarDatos = () => {
    let fletesFiltrados = fletes;
    let gastosFiltrados = gastos;

    if (fechaDesde) {
      fletesFiltrados = fletesFiltrados.filter(f => f.fecha >= fechaDesde);
      gastosFiltrados = gastosFiltrados.filter(g => g.fecha >= fechaDesde);
    }
    if (fechaHasta) {
      fletesFiltrados = fletesFiltrados.filter(f => f.fecha <= fechaHasta);
      gastosFiltrados = gastosFiltrados.filter(g => g.fecha <= fechaHasta);
    }
    if (choferFiltro) {
      fletesFiltrados = fletesFiltrados.filter(f => f.chofer === choferFiltro);
      gastosFiltrados = gastosFiltrados.filter(g => g.chofer === choferFiltro || (!g.chofer && g.flete_id && fletes.find(fx => fx.id === g.flete_id)?.chofer === choferFiltro));
    }
    if (estadoReconciliacion === 'reconciliados') {
      fletesFiltrados = fletesFiltrados.filter(f => f.reconciliado);
    } else if (estadoReconciliacion === 'pendientes') {
      fletesFiltrados = fletesFiltrados.filter(f => !f.reconciliado);
    }

    // Calcular datos por flete
    const fletesProcesados = fletesFiltrados.map(flete => {
      const gastosDelFlete = gastos.filter(g => g.flete_id === flete.id);
      
      const desgloseGastos = {
        Combustible: 0,
        Peaje: 0,
        'Avance de efectivo': 0,
        Otros: 0
      };

      let totalGastos = 0;
      gastosDelFlete.forEach(g => {
        const monto = Number(g.monto || 0);
        totalGastos += monto;
        if (g.tipo === 'Combustible') desgloseGastos.Combustible += monto;
        else if (g.tipo === 'Peaje') desgloseGastos.Peaje += monto;
        else if (g.tipo === 'Avance de efectivo') desgloseGastos['Avance de efectivo'] += monto;
        else desgloseGastos.Otros += monto;
      });

      const tarifa = Number(flete.valor_total_flete || 0);
      const gananciaNeta = tarifa - totalGastos;
      const margen = tarifa > 0 ? (gananciaNeta / tarifa) * 100 : 0;

      return {
        ...flete,
        gastos: gastosDelFlete,
        totalGastos,
        desgloseGastos,
        tarifa,
        gananciaNeta,
        margen
      };
    });

    // Gastos sin flete asignado (huérfanos)
    const gastosHuerfanos = gastosFiltrados.filter(g => !g.flete_id);

    // Resumen por chofer
    const resumenChofer = {};
    choferes.forEach(c => {
      if (choferFiltro && c !== choferFiltro) return;
      resumenChofer[c] = {
        chofer: c,
        totalFletes: 0,
        tarifaTotal: 0,
        gastosTotales: 0,
        gananciaNeta: 0,
        fletesReconciliados: 0,
        fletesPendientes: 0
      };
    });

    fletesProcesados.forEach(f => {
      if (resumenChofer[f.chofer]) {
        resumenChofer[f.chofer].totalFletes++;
        resumenChofer[f.chofer].tarifaTotal += f.tarifa;
        resumenChofer[f.chofer].gastosTotales += f.totalGastos;
        resumenChofer[f.chofer].gananciaNeta += f.gananciaNeta;
        if (f.reconciliado) resumenChofer[f.chofer].fletesReconciliados++;
        else resumenChofer[f.chofer].fletesPendientes++;
      }
    });

    // Agregar gastos huérfanos a los gastos totales del chofer
    gastosHuerfanos.forEach(g => {
      if (g.chofer && resumenChofer[g.chofer]) {
        resumenChofer[g.chofer].gastosTotales += Number(g.monto || 0);
        resumenChofer[g.chofer].gananciaNeta -= Number(g.monto || 0);
      }
    });

    Object.values(resumenChofer).forEach(r => {
      r.margen = r.tarifaTotal > 0 ? (r.gananciaNeta / r.tarifaTotal) * 100 : 0;
    });

    let totalesGlobales = {
      totalFletes: fletesProcesados.length,
      tarifaTotal: 0,
      totalGastosAmount: 0,
      gananciaNetaTotal: 0,
      fletesSinGastos: 0,
      gastosSinFlete: gastosHuerfanos.length,
      gastosPorTipo: {
        Combustible: 0,
        Peaje: 0,
        'Avance de efectivo': 0,
        Otros: 0
      }
    };

    fletesProcesados.forEach(f => {
      totalesGlobales.tarifaTotal += f.tarifa;
      totalesGlobales.totalGastosAmount += f.totalGastos;
      totalesGlobales.gananciaNetaTotal += f.gananciaNeta;
      
      if (f.totalGastos === 0) totalesGlobales.fletesSinGastos++;
      
      totalesGlobales.gastosPorTipo.Combustible += f.desgloseGastos.Combustible;
      totalesGlobales.gastosPorTipo.Peaje += f.desgloseGastos.Peaje;
      totalesGlobales.gastosPorTipo['Avance de efectivo'] += f.desgloseGastos['Avance de efectivo'];
      totalesGlobales.gastosPorTipo.Otros += f.desgloseGastos.Otros;
    });

    gastosHuerfanos.forEach(g => {
      const monto = Number(g.monto || 0);
      totalesGlobales.totalGastosAmount += monto;
      totalesGlobales.gananciaNetaTotal -= monto;
      
      if (g.tipo === 'Combustible') totalesGlobales.gastosPorTipo.Combustible += monto;
      else if (g.tipo === 'Peaje') totalesGlobales.gastosPorTipo.Peaje += monto;
      else if (g.tipo === 'Avance de efectivo') totalesGlobales.gastosPorTipo['Avance de efectivo'] += monto;
      else totalesGlobales.gastosPorTipo.Otros += monto;
    });

    totalesGlobales.margenPromedio = totalesGlobales.tarifaTotal > 0 
      ? (totalesGlobales.gananciaNetaTotal / totalesGlobales.tarifaTotal) * 100 
      : 0;

    return {
      fletes: fletesProcesados,
      gastosHuerfanos,
      resumenChofer: Object.values(resumenChofer).filter(r => r.totalFletes > 0 || r.gastosTotales > 0),
      totalesGlobales
    };
  };

  const datos = useMemo(procesarDatos, [fletes, gastos, fechaDesde, fechaHasta, choferFiltro, estadoReconciliacion]);

  const handleReconciliarToggle = async (flete) => {
    if (!puedeEditar()) return;
    try {
      const nuevoEstado = !flete.reconciliado;
      const { error } = await supabase
        .from('fletes')
        .update({ reconciliado: nuevoEstado })
        .eq('id', flete.id);
      
      if (error) throw error;
      
      setFletes(prev => prev.map(f => f.id === flete.id ? { ...f, reconciliado: nuevoEstado } : f));
    } catch (error) {
      console.error('Error al actualizar reconciliación:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleAsignarGasto = async (gastoId, fleteId) => {
    if (!fleteId) return;
    try {
      const { error } = await supabase
        .from('gastos_flete')
        .update({ flete_id: fleteId })
        .eq('id', gastoId);
      
      if (error) throw error;
      cargarDatos();
      alert('Gasto asignado exitosamente al flete.');
    } catch (error) {
      console.error('Error al asignar gasto:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleGuardarGastoHuerfano = async (e) => {
    e.preventDefault();
    if (!puedeEditar()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('gastos_flete')
        .insert([{
          chofer: formGasto.chofer,
          tipo: formGasto.tipo,
          monto: parseFloat(formGasto.monto),
          fecha: formGasto.fecha,
          descripcion: formGasto.descripcion,
          flete_id: null
        }]);

      if (error) throw error;
      
      alert('Gasto registrado exitosamente (Sin flete asignado)');
      setShowGastoModal(false);
      setFormGasto({
        chofer: '',
        tipo: 'Avance de efectivo',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: ''
      });
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const descargarPDF = () => {
    generarPDFReconciliacion(datos, { fechaDesde, fechaHasta, choferFiltro });
  };

  if (loading && fletes.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Chofer</label>
            <select
              value={choferFiltro}
              onChange={(e) => setChoferFiltro(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Todos los choferes</option>
              {choferes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado Reconciliación</label>
            <select
              value={estadoReconciliacion}
              onChange={(e) => setEstadoReconciliacion(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            >
              <option value="todos">Todos</option>
              <option value="reconciliados">Reconciliados ✅</option>
              <option value="pendientes">Pendientes ❌</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFechaDesde('');
                setFechaHasta('');
                setChoferFiltro('');
                setEstadoReconciliacion('todos');
              }}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Limpiar
            </button>
            <button
              onClick={descargarPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              <span>Exportar PDF</span>
            </button>
            <button
              onClick={() => setShowGastoModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Gasto/Avance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Resumen por Chofer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {datos.resumenChofer.map(res => (
          <div key={res.chofer} className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
            <h3 className="font-bold text-lg text-gray-800 mb-2">{res.chofer}</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tarifas ({res.totalFletes} fletes):</span>
                <span className="font-semibold">{formatCurrency(res.tarifaTotal)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Gastos Totales:</span>
                <span>-{formatCurrency(res.gastosTotales)}</span>
              </div>
              <div className="flex justify-between text-green-600 font-bold border-t pt-1 mt-1">
                <span>Ganancia Neta:</span>
                <span>{formatCurrency(res.gananciaNeta)}</span>
              </div>
              <div className="flex justify-between text-blue-600 font-medium">
                <span>Margen:</span>
                <span>{res.margen.toFixed(1)}%</span>
              </div>
              <div className="pt-2 mt-2 border-t text-xs text-gray-500 flex justify-between">
                <span>Reconciliados: {res.fletesReconciliados}</span>
                <span>Pendientes: {res.fletesPendientes}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gastos Huerfanos (Sin Flete) */}
      {datos.gastosHuerfanos.length > 0 && (
        <div className="bg-orange-50 rounded-xl shadow-lg p-6 border border-orange-200">
          <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Gastos sin flete asignado ({datos.gastosHuerfanos.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-orange-100 text-orange-800 text-sm">
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Chofer</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Descripción</th>
                  <th className="px-4 py-2 text-right">Monto</th>
                  <th className="px-4 py-2 text-center">Asignar a Flete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-200">
                {datos.gastosHuerfanos.map(g => (
                  <tr key={g.id} className="text-sm">
                    <td className="px-4 py-2">{formatearFechaLocal(g.fecha)}</td>
                    <td className="px-4 py-2 font-medium">{g.chofer || 'N/A'}</td>
                    <td className="px-4 py-2">{g.tipo}</td>
                    <td className="px-4 py-2 text-gray-600">{g.descripcion}</td>
                    <td className="px-4 py-2 text-right font-bold text-red-600">{formatCurrency(g.monto)}</td>
                    <td className="px-4 py-2">
                      <select 
                        className="w-full text-xs p-1 border rounded"
                        onChange={(e) => handleAsignarGasto(g.id, e.target.value)}
                        defaultValue=""
                      >
                        <option value="" disabled>Seleccionar Flete...</option>
                        {fletes.filter(f => f.chofer === g.chofer).map(f => (
                          <option key={f.id} value={f.id}>
                            {formatearFechaLocal(f.fecha)} - {f.lugar} ({formatCurrency(f.valor_total_flete)})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla Principal de Fletes */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-500" />
            Cruce de Fletes vs Gastos ({datos.fletes.length} registros)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Flete / Destino</th>
                <th className="px-4 py-3 text-left">Chofer</th>
                <th className="px-4 py-3 text-right">Tarifa ($)</th>
                <th className="px-4 py-3 text-right">Gastos ($)</th>
                <th className="px-4 py-3 text-right">Ganancia ($)</th>
                <th className="px-4 py-3 text-center">Margen</th>
                <th className="px-4 py-3 text-center">Desglose Gastos</th>
                <th className="px-4 py-3 text-center">Reconciliado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {datos.fletes.map(flete => (
                <tr key={flete.id} className={`hover:bg-gray-50 ${flete.totalGastos === 0 ? 'bg-yellow-50/50' : ''}`}>
                  <td className="px-4 py-3 whitespace-nowrap">{formatearFechaLocal(flete.fecha)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{flete.lugar}</div>
                    <div className="text-xs text-gray-500">Origen: {flete.finca}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-blue-700">{flete.chofer}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(flete.tarifa)}</td>
                  <td className="px-4 py-3 text-right text-red-600">
                    {formatCurrency(flete.totalGastos)}
                    {flete.totalGastos === 0 && (
                      <span className="block text-[10px] text-orange-500 font-medium">¡Sin Gastos!</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(flete.gananciaNeta)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${flete.margen > 30 ? 'bg-green-100 text-green-800' : flete.margen > 10 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                      {flete.margen.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="grid grid-cols-2 gap-x-2 text-gray-500">
                      <span>Comb: {formatCurrency(flete.desgloseGastos.Combustible)}</span>
                      <span>Peaje: {formatCurrency(flete.desgloseGastos.Peaje)}</span>
                      <span>Avance: {formatCurrency(flete.desgloseGastos['Avance de efectivo'])}</span>
                      <span>Otros: {formatCurrency(flete.desgloseGastos.Otros)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleReconciliarToggle(flete)}
                      className={`p-1.5 rounded-full transition-colors ${flete.reconciliado ? 'text-green-600 bg-green-100 hover:bg-green-200' : 'text-gray-400 bg-gray-100 hover:bg-gray-200'}`}
                      title={flete.reconciliado ? 'Marcar como pendiente' : 'Marcar como reconciliado'}
                    >
                      <CheckCircle className="w-6 h-6" />
                    </button>
                  </td>
                </tr>
              ))}
              {datos.fletes.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                    No se encontraron registros para los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totales Consolidados */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Totales Consolidados
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="text-sm text-blue-600 font-medium mb-1">Total de Fletes (Tarifa)</div>
              <div className="text-2xl font-bold text-blue-800">{formatCurrency(datos.totalesGlobales.tarifaTotal)}</div>
              <div className="text-xs text-blue-600 mt-1">{datos.totalesGlobales.totalFletes} fletes procesados</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
              <div className="text-sm text-red-600 font-medium mb-1">Total de Gastos</div>
              <div className="text-2xl font-bold text-red-800">{formatCurrency(datos.totalesGlobales.totalGastosAmount)}</div>
              <div className="text-xs text-red-600 mt-1">Incluye gastos sin flete</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="text-sm text-green-600 font-medium mb-1">Ganancia Neta Total</div>
              <div className="text-2xl font-bold text-green-800">{formatCurrency(datos.totalesGlobales.gananciaNetaTotal)}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <div className="text-sm text-purple-600 font-medium mb-1">Margen Promedio</div>
              <div className="text-2xl font-bold text-purple-800">{datos.totalesGlobales.margenPromedio.toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1">
              <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Desglose de Gastos</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Combustible</span>
                  <span className="font-medium">{formatCurrency(datos.totalesGlobales.gastosPorTipo.Combustible)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Peaje</span>
                  <span className="font-medium">{formatCurrency(datos.totalesGlobales.gastosPorTipo.Peaje)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avance de efectivo</span>
                  <span className="font-medium">{formatCurrency(datos.totalesGlobales.gastosPorTipo['Avance de efectivo'])}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Otros</span>
                  <span className="font-medium">{formatCurrency(datos.totalesGlobales.gastosPorTipo.Otros)}</span>
                </div>
              </div>
            </div>
            <div className="col-span-1">
              <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Estadísticas Adicionales</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Fletes sin gastos asignados</span>
                  <span className="font-medium bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-sm">{datos.totalesGlobales.fletesSinGastos}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Gastos sin flete asignado</span>
                  <span className="font-medium bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-sm">{datos.totalesGlobales.gastosSinFlete}</span>
                </div>
              </div>
            </div>
            <div className="col-span-1">
              <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Totales por Chofer</h4>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {datos.resumenChofer.map(res => (
                  <div key={res.chofer} className="flex flex-col mb-2 pb-2 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">{res.chofer}</span>
                      <span className="font-bold text-green-600">{formatCurrency(res.gananciaNeta)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{res.totalFletes} fletes | {res.margen.toFixed(1)}%</span>
                      <span>Gastos: {formatCurrency(res.gastosTotales)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Gasto sin Flete */}
      {showGastoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Registrar Gasto a Chofer</h2>
              <button onClick={() => setShowGastoModal(false)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Registra un avance o gasto que aún no está asignado a un viaje/flete específico. Podrás asignarlo más adelante.
            </p>

            <form onSubmit={handleGuardarGastoHuerfano} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chofer *</label>
                <select
                  required
                  value={formGasto.chofer}
                  onChange={(e) => setFormGasto({...formGasto, chofer: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Seleccionar Chofer</option>
                  {choferes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Gasto</label>
                <select
                  value={formGasto.tipo}
                  onChange={(e) => setFormGasto({...formGasto, tipo: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                >
                  <option value="Combustible">Combustible</option>
                  <option value="Peaje">Peaje</option>
                  <option value="Avance de efectivo">Avance de efectivo</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formGasto.monto}
                    onChange={(e) => setFormGasto({...formGasto, monto: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={formGasto.fecha}
                    onChange={(e) => setFormGasto({...formGasto, fecha: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (Opcional)</label>
                <textarea
                  rows="2"
                  value={formGasto.descripcion}
                  onChange={(e) => setFormGasto({...formGasto, descripcion: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGastoModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
