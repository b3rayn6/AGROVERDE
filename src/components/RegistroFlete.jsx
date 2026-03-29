import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/authUtils';
import { Truck, Search, Edit2, Save, X, FileText, Filter, Scale, DollarSign, Users, Trash2, Plus } from 'lucide-react';
import { generarPDFFletes } from '../lib/pdfGenerator';
import { generarPDFChoferesAgrupados } from '../lib/pdfGeneratorExtras';
import GastosFleteModal from './GastosFleteModal';
import UnificarChoferesModal from './UnificarChoferesModal';
import ReporteGastosFlete from './ReporteGastosFlete';
import CruceFletesGastos from './CruceFletesGastos';

export default function RegistroFlete({ user }) {
  const [fletes, setFletes] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [choferFiltro, setChoferFiltro] = useState('');
  const [factoriaFiltro, setFactoriaFiltro] = useState('');
  const [choferResumenFiltro, setChoferResumenFiltro] = useState('');
  const [factoriaResumenFiltro, setFactoriaResumenFiltro] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [activeTab, setActiveTab] = useState('individual');
  const [editingId, setEditingId] = useState(null);
  const [gastoFlete, setGastoFlete] = useState(null);
  const [isUnificarModalOpen, setIsUnificarModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    productor: '',
    variedad: '',
    cantidad_sacos: '',
    lugar: '',
    pesador: '',
    numero_pesada: '',
    chofer: '',
    placa: '',
    finca: '',
    precio_flete: '',
    factoria: ''
  });

  useEffect(() => {
    if (user?.id) {
      cargarFletes();
      cargarChoferes();
    }
  }, [user]);

  // Check if user can edit fletes
  const puedeEditar = () => {
    if (user?.email === 'admin@admin.com') return true;
    if (user?.tipo === 'legacy') return true;
    if (user?.roles?.nombre?.toLowerCase() === 'administrador') return true;
    const permiso = user?.permisos?.find(p => p.modulos?.codigo === 'fletes' || p.modulos?.codigo === 'flete' || p.modulos?.codigo === 'fletes_obreros');
    return permiso?.puede_editar === true;
  };

  const puedeCrear = () => {
    if (user?.email === 'admin@admin.com') return true;
    if (user?.tipo === 'legacy') return true;
    if (user?.roles?.nombre?.toLowerCase() === 'administrador') return true;
    const permiso = user?.permisos?.find(p => p.modulos?.codigo === 'fletes' || p.modulos?.codigo === 'flete' || p.modulos?.codigo === 'fletes_obreros');
    return permiso?.puede_crear === true;
  };

  const puedeEliminar = () => {
    if (user?.email === 'admin@admin.com') return true;
    if (user?.tipo === 'legacy') return true;
    if (user?.roles?.nombre?.toLowerCase() === 'administrador') return true;
    const permiso = user?.permisos?.find(p => p.modulos?.codigo === 'fletes' || p.modulos?.codigo === 'flete' || p.modulos?.codigo === 'fletes_obreros');
    return permiso?.puede_eliminar === true;
  };

  const cargarFletes = async () => {
    if (!user?.id) {
      console.error('No hay usuario autenticado');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Load ALL fletes for all users
      const { data: fletesData, error: fletesError } = await supabase
        .from('fletes')
        .select('*')
        .order('fecha', { ascending: true });

      if (fletesError) throw fletesError;

      // Load all gastos
      const { data: gastosData, error: gastosError } = await supabase
        .from('gastos_flete')
        .select('flete_id, monto');

      if (gastosError) throw gastosError;

      // Calculate totals per flete
      const gastosPorFlete = {};
      (gastosData || []).forEach(g => {
        if (!gastosPorFlete[g.flete_id]) gastosPorFlete[g.flete_id] = 0;
        gastosPorFlete[g.flete_id] += Number(g.monto);
      });

      const fletesConGastos = (fletesData || []).map(f => ({
        ...f,
        total_gastos: gastosPorFlete[f.id] || 0
      }));

      setFletes(fletesConGastos);
    } catch (error) {
      console.error('Error al cargar fletes:', error);
      alert('Error al cargar los fletes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarChoferes = async () => {
    if (!user?.id) return;
    
    try {
      // Obtener choferes de la tabla choferes (all users)
      const { data: choferesTabla, error: errorChoferes } = await supabase
        .from('choferes')
        .select('nombre, placa');

      // Obtener choferes únicos de la tabla pesadas (all users)
      const { data: choferesPesadas, error: errorPesadas } = await supabase
        .from('pesadas')
        .select('chofer, placa')
        .not('chofer', 'eq', null);

      // Obtener choferes únicos de la tabla fletes (all users)
      const { data: choferesFletes, error: errorFletes } = await supabase
        .from('fletes')
        .select('chofer, placa')
        .not('chofer', 'eq', null);

      // Unificar todos los choferes y eliminar duplicados
      const choferesMap = new Map();

      // Agregar choferes de la tabla choferes
      (choferesTabla || []).forEach(c => {
        if (c.nombre && c.nombre.trim()) {
          choferesMap.set(c.nombre.trim().toUpperCase(), {
            nombre: c.nombre.trim(),
            placa: c.placa || ''
          });
        }
      });

      // Agregar choferes de pesadas (sin duplicar)
      (choferesPesadas || []).forEach(c => {
        if (c.chofer && c.chofer.trim()) {
          const key = c.chofer.trim().toUpperCase();
          if (!choferesMap.has(key)) {
            choferesMap.set(key, {
              nombre: c.chofer.trim(),
              placa: c.placa || ''
            });
          }
        }
      });

      // Agregar choferes de fletes (sin duplicar)
      (choferesFletes || []).forEach(c => {
        if (c.chofer && c.chofer.trim()) {
          const key = c.chofer.trim().toUpperCase();
          if (!choferesMap.has(key)) {
            choferesMap.set(key, {
              nombre: c.chofer.trim(),
              placa: c.placa || ''
            });
          }
        }
      });

      // Convertir el Map a array y ordenar alfabéticamente
      const choferesUnificados = Array.from(choferesMap.values())
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      setChoferes(choferesUnificados);
    } catch (error) {
      console.error('Error al cargar choferes:', error);
    }
  };

  const calcularValorTotal = () => {
    const sacos = parseFloat(formData.cantidad_sacos) || 0;
    const precio = parseFloat(formData.precio_flete) || 0;
    return sacos * precio;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.id) {
      alert('Error: No hay usuario autenticado');
      return;
    }
    
    setLoading(true);

    try {
      const userId = await getUserId(user);
      
      if (!userId) {
        alert('Error: No se pudo obtener el ID de usuario');
        setLoading(false);
        return;
      }

      const valor_total_flete = calcularValorTotal();
      const dataToSave = { 
        ...formData, 
        valor_total_flete,
        pesador: formData.pesador || user.nombre_completo || user.nombre
      };

      // Registrar o actualizar chofer
      if (formData.chofer) {
        const { data: choferExistente } = await supabase
          .from('choferes')
          .select('*')
          .eq('nombre', formData.chofer)
          .eq('user_id', userId)
          .single();

        if (!choferExistente) {
          await supabase
            .from('choferes')
            .insert([{ 
              nombre: formData.chofer, 
              placa: formData.placa,
              user_id: userId 
            }]);
        } else if (choferExistente.placa !== formData.placa) {
          await supabase
            .from('choferes')
            .update({ placa: formData.placa })
            .eq('id', choferExistente.id);
        }
      }

      if (editingId) {
        const { error } = await supabase
          .from('fletes')
          .update(dataToSave)
          .eq('id', editingId);

        if (error) throw error;
        alert('Flete actualizado exitosamente');
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from('fletes')
          .insert([{ ...dataToSave, user_id: userId }]);

        if (error) throw error;
        alert('Flete registrado exitosamente');
      }

      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        productor: '',
        variedad: '',
        cantidad_sacos: '',
        lugar: '',
        pesador: '',
        numero_pesada: '',
        chofer: '',
        placa: '',
        finca: '',
        precio_flete: '',
        factoria: ''
      });
      cargarFletes();
      cargarChoferes();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar el flete: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (flete) => {
    setFormData({
      fecha: flete.fecha,
      productor: flete.productor,
      variedad: flete.variedad,
      cantidad_sacos: flete.cantidad_sacos,
      lugar: flete.lugar,
      pesador: flete.pesador,
      numero_pesada: flete.numero_pesada,
      chofer: flete.chofer,
      placa: flete.placa,
      finca: flete.finca,
      precio_flete: flete.precio_flete,
      factoria: flete.factoria
    });
    setEditingId(flete.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      productor: '',
      variedad: '',
      cantidad_sacos: '',
      lugar: '',
      pesador: '',
      numero_pesada: '',
      chofer: '',
      placa: '',
      finca: '',
      precio_flete: '',
      factoria: ''
    });
  };

  const handleDelete = async (fleteId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este flete?')) return;
    
    try {
      const { error } = await supabase
        .from('fletes')
        .delete()
        .eq('id', fleteId);

      if (error) throw error;
      alert('Flete eliminado exitosamente');
      cargarFletes();
    } catch (error) {
      console.error('Error al eliminar flete:', error);
      alert('Error al eliminar el flete: ' + error.message);
    }
  };

  const handleNuevoFlete = () => {
    setEditingId(null);
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      productor: '',
      variedad: '',
      cantidad_sacos: '',
      lugar: '',
      pesador: '',
      numero_pesada: '',
      chofer: '',
      placa: '',
      finca: '',
      precio_flete: '',
      factoria: ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Obtener lista única de choferes de los fletes registrados
  const choferesFiltro = Array.from(new Set(fletes.map(f => f.chofer).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));

  // Obtener lista única de factorías de los fletes registrados
  const factoriasResumenFiltroList = Array.from(new Set(fletes.map(f => f.factoria).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));

  const fletesFiltrados = fletes.filter(flete => {
    const matchSearch = flete.productor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       flete.factoria?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchChofer = !choferFiltro || flete.chofer === choferFiltro;
    const matchFactoria = !factoriaFiltro || flete.factoria === factoriaFiltro;
    const matchFechaDesde = !fechaDesde || flete.fecha >= fechaDesde;
    const matchFechaHasta = !fechaHasta || flete.fecha <= fechaHasta;
    return matchSearch && matchChofer && matchFactoria && matchFechaDesde && matchFechaHasta;
  });

  const toTitleCase = (str) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };

  const choferesAgrupados = React.useMemo(() => {
    const map = new Map();
    fletes.forEach(f => {
      if (!f.chofer) return;
      if (factoriaResumenFiltro && f.factoria !== factoriaResumenFiltro) return;
      if (fechaDesde && f.fecha < fechaDesde) return;
      if (fechaHasta && f.fecha > fechaHasta) return;
      
      const cleanName = f.chofer.trim().replace(/\s+/g, ' ');
      const key = cleanName.toUpperCase();
      
      if (!map.has(key)) {
        map.set(key, {
          nombre: toTitleCase(cleanName),
          placa: f.placa || '-',
          cantidad: 0,
          total: 0,
          totalGastos: 0,
          fletes: [],
          fechas: []
        });
      }
      const data = map.get(key);
      // Update placa only if it's set
      if (f.placa && data.placa === '-') data.placa = f.placa;
      data.cantidad += 1;
      data.total += parseFloat(f.valor_total_flete || 0);
      data.totalGastos += parseFloat(f.total_gastos || 0);
      data.fletes.push(f);
      if (f.fecha) data.fechas.push(f.fecha);
    });

    return Array.from(map.values()).map(c => {
      c.fechas.sort();
      c.primerFlete = c.fechas[0] || '-';
      c.ultimoFlete = c.fechas[c.fechas.length - 1] || '-';
      c.fletes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      return c;
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [fletes, factoriaResumenFiltro, fechaDesde, fechaHasta]);

  const handleGenerarPDFConsolidado = () => {
    if (choferesAgrupados.length === 0) {
      alert('No hay fletes registrados para consolidar');
      return;
    }
    generarPDFChoferesAgrupados(choferesAgrupados, false);
  };

  const handleGenerarPDFIndividualAgrupado = (chofer) => {
    generarPDFChoferesAgrupados([chofer], true);
  };

  const handleGenerarPDF = () => {
    if (!choferFiltro) {
      alert('Por favor selecciona un chofer para generar el PDF');
      return;
    }
    
    // Obtener todos los fletes del chofer seleccionado (sin filtro de búsqueda)
    const fletesDelChofer = fletes.filter(flete => flete.chofer === choferFiltro);
    
    if (fletesDelChofer.length === 0) {
      alert('No hay fletes registrados para este chofer');
      return;
    }
    
    generarPDFFletes(fletesDelChofer, choferFiltro);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 p-3 rounded-lg">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Registro de Flete</h1>
                <p className="text-gray-600">Gestiona los fletes de transporte</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {puedeCrear() && (
                <button
                  onClick={handleNuevoFlete}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Nuevo Flete
                </button>
              )}
              {puedeEditar() && (
                <button
                  onClick={() => setIsUnificarModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  Unificar Choferes
                </button>
              )}
              <button
                onClick={handleGenerarPDF}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Generar PDF (Actual)
              </button>
            </div>
          </div>
        </div>

        {/* Formulario - Solo visible para usuarios con permisos de edición o creación */}
        {(puedeEditar() || puedeCrear()) && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingId ? 'Editar Flete' : 'Nuevo Flete'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Productor</label>
              <input
                type="text"
                value={formData.productor}
                onChange={(e) => setFormData({ ...formData, productor: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variedad</label>
              <input
                type="text"
                value={formData.variedad}
                onChange={(e) => setFormData({ ...formData, variedad: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Sacos</label>
              <input
                type="number"
                value={formData.cantidad_sacos}
                onChange={(e) => setFormData({ ...formData, cantidad_sacos: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
              <input
                type="text"
                value={formData.lugar}
                onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pesador</label>
              <input
                type="text"
                value={formData.pesador}
                onChange={(e) => setFormData({ ...formData, pesador: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Pesada</label>
              <input
                type="text"
                value={formData.numero_pesada}
                onChange={(e) => setFormData({ ...formData, numero_pesada: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chofer</label>
              <input
                type="text"
                list="choferes-list"
                value={formData.chofer}
                onChange={(e) => {
                  const choferSeleccionado = choferes.find(c => c.nombre === e.target.value);
                  setFormData({ 
                    ...formData, 
                    chofer: e.target.value,
                    placa: choferSeleccionado?.placa || formData.placa
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
              <datalist id="choferes-list">
                {choferes.map((chofer, index) => (
                  <option key={index} value={chofer.nombre} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
              <input
                type="text"
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Finca</label>
              <input
                type="text"
                value={formData.finca}
                onChange={(e) => setFormData({ ...formData, finca: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio del Flete</label>
              <input
                type="number"
                step="0.01"
                value={formData.precio_flete}
                onChange={(e) => setFormData({ ...formData, precio_flete: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Factoría</label>
              <input
                type="text"
                value={formData.factoria}
                onChange={(e) => setFormData({ ...formData, factoria: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 bg-green-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-700">Valor Total del Flete:</span>
                <span className="text-2xl font-bold text-green-600">
                  ${calcularValorTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Guardando...' : editingId ? 'Actualizar Flete' : 'Registrar Flete'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors font-semibold flex items-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Cancelar
                </button>
              )}
            </div>
          </form>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-4 px-4 text-center font-semibold transition-colors ${activeTab === 'individual' ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('individual')}
            >
              Fletes Individuales
            </button>
            <button
              className={`flex-1 py-4 px-4 text-center font-semibold transition-colors ${activeTab === 'agrupado' ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('agrupado')}
            >
              Resumen por Chofer (Agrupado)
            </button>
            <button
              className={`flex-1 py-4 px-4 text-center font-semibold transition-colors ${activeTab === 'gastos' ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('gastos')}
            >
              Reporte de Gastos
            </button>
            <button
              className={`flex-1 py-4 px-4 text-center font-semibold transition-colors ${activeTab === 'reconciliacion' ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('reconciliacion')}
            >
              Reconciliación y Cruce
            </button>
          </div>
        </div>

        {/* Contenido Principal */}
        {activeTab === 'reconciliacion' ? (
          <CruceFletesGastos user={user} />
        ) : activeTab === 'gastos' ? (
          <ReporteGastosFlete user={user} />
        ) : (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {activeTab === 'individual' ? 'Fletes Registrados' : 'Resumen Agrupado por Chofer'}
            </h2>
            {activeTab === 'individual' ? (
              <div className="flex flex-col md:flex-row flex-wrap gap-3 w-full">
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-500 font-medium">Desde:</span>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="border-none focus:ring-0 outline-none text-sm p-0 w-32 text-gray-700 bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-500 font-medium">Hasta:</span>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="border-none focus:ring-0 outline-none text-sm p-0 w-32 text-gray-700 bg-transparent"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={factoriaFiltro}
                    onChange={(e) => setFactoriaFiltro(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-full md:w-64"
                  >
                    <option value="">Todas las Factorías</option>
                    {factoriasResumenFiltroList.map(factoria => (
                      <option key={factoria} value={factoria}>{factoria}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={choferFiltro}
                    onChange={(e) => setChoferFiltro(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-full md:w-64"
                  >
                    <option value="">Todos los choferes</option>
                    {choferesFiltro.map(chofer => (
                      <option key={chofer} value={chofer}>{chofer}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar por productor o factoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-full md:w-80"
                  />
                </div>
                {(choferFiltro || factoriaFiltro || searchTerm || fechaDesde || fechaHasta) && (
                  <button
                    onClick={() => {
                      setChoferFiltro('');
                      setFactoriaFiltro('');
                      setSearchTerm('');
                      setFechaDesde('');
                      setFechaHasta('');
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold whitespace-nowrap"
                  >
                    Limpiar Filtro
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col md:flex-row flex-wrap gap-3 w-full items-center">
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-500 font-medium">Desde:</span>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="border-none focus:ring-0 outline-none text-sm p-0 w-32 text-gray-700 bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-500 font-medium">Hasta:</span>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="border-none focus:ring-0 outline-none text-sm p-0 w-32 text-gray-700 bg-transparent"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={factoriaResumenFiltro}
                    onChange={(e) => {
                      setFactoriaResumenFiltro(e.target.value);
                      setChoferResumenFiltro('');
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-full md:w-64"
                  >
                    <option value="">Todas las Factorías</option>
                    {factoriasResumenFiltroList.map(factoria => (
                      <option key={factoria} value={factoria}>{factoria}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={choferResumenFiltro}
                    onChange={(e) => setChoferResumenFiltro(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-full md:w-64"
                  >
                    <option value="">Todos los choferes</option>
                    {choferesAgrupados.map(chofer => (
                      <option key={chofer.nombre} value={chofer.nombre}>{chofer.nombre}</option>
                    ))}
                  </select>
                </div>
                {(choferResumenFiltro || factoriaResumenFiltro || fechaDesde || fechaHasta) && (
                  <button
                    onClick={() => {
                      setChoferResumenFiltro('');
                      setFactoriaResumenFiltro('');
                      setFechaDesde('');
                      setFechaHasta('');
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold whitespace-nowrap"
                  >
                    Limpiar Filtro
                  </button>
                )}
                <button
                  onClick={handleGenerarPDFConsolidado}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2 whitespace-nowrap"
                >
                  <FileText className="w-5 h-5" />
                  Descargar Consolidado PDF
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'individual' ? (
              <>
                <table className="w-full">
                  <thead className="bg-green-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Productor</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Variedad</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sacos</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lugar</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Pesador</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">N° Pesada</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Chofer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Placa</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Finca</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Precio Flete</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Factoría</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Valor Total</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Gastos</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fletesFiltrados.map((flete) => (
                      <tr key={flete.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">{flete.fecha}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            {flete.productor}
                            {flete.pesada_id && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium whitespace-nowrap" title="Viene de Pesada">
                                <Scale className="w-3 h-3" />
                                Pesada
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{flete.variedad}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{flete.cantidad_sacos}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{flete.lugar}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{flete.pesador}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{flete.numero_pesada}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{flete.chofer}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{flete.placa}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{flete.finca}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">${parseFloat(flete.precio_flete || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{flete.factoria}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">${parseFloat(flete.valor_total_flete || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-orange-600">${parseFloat(flete.total_gastos || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {puedeEditar() && (
                              <button
                                onClick={() => handleEdit(flete)}
                                className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                title={flete.pesada_id ? "Modificar" : "Editar"}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {puedeEliminar() && (
                              <button
                                onClick={() => handleDelete(flete.id)}
                                className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setGastoFlete(flete)}
                              className="text-orange-600 hover:text-orange-800 p-2 rounded-lg hover:bg-orange-50 transition-colors"
                              title="Gastos de Flete"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {fletesFiltrados.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay fletes registrados
                  </div>
                )}
              </>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-green-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Chofer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Placa</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Cant. Fletes</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Primer Flete</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Último Flete</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Monto Total</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Gastos</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Reporte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(choferResumenFiltro ? choferesAgrupados.filter(c => c.nombre === choferResumenFiltro) : choferesAgrupados).map((chofer) => (
                      <React.Fragment key={chofer.nombre}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{chofer.nombre}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{chofer.placa}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-700">
                            <span className="bg-green-100 text-green-800 py-1 px-3 rounded-full font-medium">
                              {chofer.cantidad}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-700">{chofer.primerFlete}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-700">{chofer.ultimoFlete}</td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                            ${chofer.total.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-orange-600">
                            ${chofer.totalGastos.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleGenerarPDFIndividualAgrupado(chofer)}
                              className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors inline-flex items-center gap-2 font-semibold"
                              title="Ver reporte del chofer"
                            >
                              <FileText className="w-4 h-4" />
                              <span className="text-sm">Descargar Reporte</span>
                            </button>
                          </td>
                        </tr>
                        {choferResumenFiltro && (
                          <tr>
                            <td colSpan="8" className="p-4 bg-green-50/50 border-t border-gray-200">
                              <div className="bg-white rounded-lg shadow border border-green-100 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                                  <h4 className="font-semibold text-gray-700">Detalle de fletes de {chofer.nombre}</h4>
                                </div>
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left font-medium text-gray-600">Fecha</th>
                                      <th className="px-4 py-2 text-left font-medium text-gray-600">Productor</th>
                                      <th className="px-4 py-2 text-left font-medium text-gray-600">Finca</th>
                                      <th className="px-4 py-2 text-left font-medium text-gray-600">Factoría</th>
                                      <th className="px-4 py-2 text-center font-medium text-gray-600">Sacos</th>
                                      <th className="px-4 py-2 text-right font-medium text-gray-600">Valor Flete</th>
                                      <th className="px-4 py-2 text-right font-medium text-gray-600">Total Gastos</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {chofer.fletes.map(f => (
                                      <tr key={f.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-gray-700">{f.fecha}</td>
                                        <td className="px-4 py-2 text-gray-700">{f.productor}</td>
                                        <td className="px-4 py-2 text-gray-700">{f.finca}</td>
                                        <td className="px-4 py-2 text-gray-700">{f.factoria}</td>
                                        <td className="px-4 py-2 text-center text-gray-700">{f.cantidad_sacos}</td>
                                        <td className="px-4 py-2 text-right font-medium text-green-600">${parseFloat(f.valor_total_flete || 0).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-right font-medium text-orange-600">${parseFloat(f.total_gastos || 0).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                {choferesAgrupados.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay choferes registrados
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        )}
      </div>

      {gastoFlete && (
        <GastosFleteModal
          flete={gastoFlete}
          onClose={() => {
            setGastoFlete(null);
            cargarFletes();
          }}
          user={user}
        />
      )}

      <UnificarChoferesModal
        isOpen={isUnificarModalOpen}
        onClose={() => setIsUnificarModalOpen(false)}
        onUnificados={cargarFletes}
      />
    </div>
  );
}
