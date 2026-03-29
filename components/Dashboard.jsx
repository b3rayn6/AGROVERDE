import { formatCurrency, formatNumber } from '../lib/formatters';
import { useState, useEffect } from 'react';
import { LogOut, Plus, Search, Edit2, Trash2, FileText, Filter, Download, Calendar, User, Wifi, WifiOff, RefreshCw, Menu, X, Scale, FileSpreadsheet, Truck, Users, Package, ShoppingCart, DollarSign, TrendingUp, CreditCard, UserCog, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getPesadasLocal,
  syncToSupabase,
  syncFromSupabase,
  checkConnection,
  getLastSync
} from '../lib/localStorage';
import NuevaPesada from './NuevaPesada';
import EditarPesada from './EditarPesada';
import ListaFacturasFactoria from './ListaFacturasFactoria';
import ComparacionPesadasFacturas from './ComparacionPesadasFacturas';
import RegistroFlete from './RegistroFlete';
import PagoObreros from './PagoObreros';
import Prestamos from './Prestamos';
import Inventario from './Inventario';
import FacturasCompra from './FacturasCompra';
import Suplidores from './Suplidores';
import FacturasVenta from './FacturasVenta';
import Clientes from './Clientes';
import VentasDiarias from './VentasDiarias';
import CuentasPorPagar from './CuentasPorPagar';
import CuentasPorCobrar from './CuentasPorCobrar';
import UtilidadNeta from './UtilidadNeta';
import GestionUsuarios from './GestionUsuarios';
import CuadreCaja from './CuadreCaja';
import ActivosFijos from './ActivosFijos';

export default function Dashboard({ user, onLogout }) {
  const [activeModule, setActiveModule] = useState('pesadas');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pesadas, setPesadas] = useState([]);
  const [filteredPesadas, setFilteredPesadas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNuevaPesada, setShowNuevaPesada] = useState(false);
  const [editingPesada, setEditingPesada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    fechaDesde: '',
    fechaHasta: '',
    mes: '',
    anio: ''
  });
  const [productores, setProductores] = useState([]);
  const [isOnline, setIsOnline] = useState(checkConnection());
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [selectedPesadas, setSelectedPesadas] = useState([]);
  const [showUnificarModal, setShowUnificarModal] = useState(false);
  const [nuevoNombreUnificado, setNuevoNombreUnificado] = useState('');

  const modules = [
    { id: 'pesadas', name: 'Pesadas', icon: Scale },
    { id: 'facturas-factoria', name: 'Facturas Factoría', icon: FileSpreadsheet },
    { id: 'comparacion', name: 'Comparación', icon: FileText },
    { id: 'flete', name: 'Registro de Flete', icon: Truck },
    { id: 'obreros', name: 'Pago de Obreros', icon: Users },
    { id: 'prestamos', name: 'Préstamos', icon: CreditCard },
    { id: 'inventario', name: 'Inventario', icon: Package },
    { id: 'facturas-compra', name: 'Facturas Compra', icon: ShoppingCart },
    { id: 'suplidores', name: 'Suplidores', icon: Truck },
    { id: 'facturas-venta', name: 'Facturas Venta', icon: FileText },
    { id: 'clientes', name: 'Clientes', icon: Users },
    { id: 'ventas-diarias', name: 'Ventas Diarias', icon: TrendingUp },
    { id: 'cuentas-pagar', name: 'Cuentas por Pagar', icon: DollarSign },
    { id: 'cuentas-cobrar', name: 'Cuentas por Cobrar', icon: DollarSign },
    { id: 'cuadre-caja', name: 'Cuadre de Caja', icon: Wallet },
    { id: 'activos-fijos', name: 'Activos Fijos / PPE', icon: Package },
    { id: 'utilidad-neta', name: 'Utilidad Neta', icon: TrendingUp },
    { id: 'usuarios', name: 'Gestión Usuarios', icon: UserCog }
  ];

  useEffect(() => {
    loadPesadas();
    updateLastSync();

    // Detectar cambios de conexión
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auto-sincronizar cada 5 minutos
    const syncInterval = setInterval(() => {
      if (isOnline) handleSync();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, []);

  useEffect(() => {
    const uniqueProductores = [...new Set(pesadas.map(p => p.nombre_productor))];
    setProductores(uniqueProductores);
  }, [pesadas]);

  useEffect(() => {
    let filtered = [...pesadas];

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.nombre_productor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.variedad.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por rango de fechas
    if (filters.fechaDesde) {
      filtered = filtered.filter(p => new Date(p.fecha) >= new Date(filters.fechaDesde));
    }
    if (filters.fechaHasta) {
      filtered = filtered.filter(p => new Date(p.fecha) <= new Date(filters.fechaHasta));
    }
    
    // Filtro por fecha exacta
    if (filters.fechaExacta) {
      filtered = filtered.filter(p => p.fecha === filters.fechaExacta);
    }

    // Filtro por mes y año
    if (filters.mes && filters.anio) {
      filtered = filtered.filter(p => {
        const fecha = new Date(p.fecha);
        return fecha.getMonth() + 1 === parseInt(filters.mes) &&
          fecha.getFullYear() === parseInt(filters.anio);
      });
    }

    setFilteredPesadas(filtered);
  }, [searchTerm, pesadas, filters]);

  const loadPesadas = async () => {
    setLoading(true);

    if (isOnline) {
      // Si hay conexión, cargar desde Supabase
      const { data, error } = await supabase
        .from('pesadas')
        .select('*')
        .order('fecha', { ascending: true });

      if (!error && data) {
        // Verificar y limpiar duplicados antes de establecer las pesadas
        const pesadasSinDuplicados = eliminarDuplicados(data || []);
        
        // Si se encontraron duplicados, eliminarlos de la base de datos
        if (pesadasSinDuplicados.length !== (data || []).length) {
          console.warn(`Se encontraron ${(data || []).length - pesadasSinDuplicados.length} pesadas duplicadas`);
          await limpiarDuplicadosEnBD(data || []);
          // Recargar después de limpiar
          const { data: dataActualizada } = await supabase
            .from('pesadas')
            .select('*')
            .order('fecha', { ascending: true });
          if (dataActualizada) {
            setPesadas(dataActualizada);
            setFilteredPesadas(dataActualizada);
          }
        } else {
          setPesadas(data);
          setFilteredPesadas(data);
        }
      }
    } else {
      // Si no hay conexión, cargar desde localStorage
      const localPesadas = getPesadasLocal();
      setPesadas(localPesadas);
      setFilteredPesadas(localPesadas);
    }

    setLoading(false);
  };

  // Función para crear clave única de una pesada
  const crearClavePesada = (pesada) => {
    // Si tiene numero_pesada, usarlo como clave principal
    if (pesada.numero_pesada) {
      return `numero-${pesada.numero_pesada}`;
    }
    // Si no, usar combinación de campos únicos
    return `${pesada.fecha}-${pesada.nombre_productor}-${pesada.variedad}-${pesada.cantidad_sacos}-${pesada.kilos_neto}`;
  };

  // Función para eliminar duplicados en memoria
  const eliminarDuplicados = (pesadas) => {
    const vistas = new Map();
    const pesadasUnicas = [];

    for (const pesada of pesadas) {
      const clave = crearClavePesada(pesada);
      
      if (!vistas.has(clave)) {
        vistas.set(clave, true);
        pesadasUnicas.push(pesada);
      } else {
        // Si es duplicado, mantener el más reciente (mayor ID o fecha más reciente)
        const existente = pesadasUnicas.find(p => crearClavePesada(p) === clave);
        
        if (existente) {
          const fechaExistente = new Date(existente.fecha);
          const fechaNueva = new Date(pesada.fecha);
          
          // Si la nueva pesada es más reciente o tiene mayor ID, reemplazar
          if (fechaNueva > fechaExistente || pesada.id > existente.id) {
            const indice = pesadasUnicas.indexOf(existente);
            pesadasUnicas[indice] = pesada;
          }
        }
      }
    }

    return pesadasUnicas;
  };

  // Función para limpiar duplicados en la base de datos
  const limpiarDuplicadosEnBD = async (pesadas) => {
    const grupos = new Map();
    
    // Agrupar por clave única
    for (const pesada of pesadas) {
      const clave = crearClavePesada(pesada);
      
      if (!grupos.has(clave)) {
        grupos.set(clave, []);
      }
      grupos.get(clave).push(pesada);
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
          // Eliminar flete relacionado
          await supabase
            .from('fletes')
            .delete()
            .eq('pesada_id', duplicado.id);
          
          // Eliminar pago de obreros relacionado
          await supabase
            .from('pagos_obreros')
            .delete()
            .eq('pesada_id', duplicado.id);
          
          // Eliminar la pesada duplicada
          await supabase
            .from('pesadas')
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
    if (!confirm('¿Estás seguro de limpiar los duplicados? Esta acción eliminará las pesadas duplicadas manteniendo solo la más reciente de cada grupo.')) {
      return;
    }

    setLoading(true);
    try {
      // Cargar todas las pesadas
      const { data, error } = await supabase
        .from('pesadas')
        .select('*')
        .order('fecha', { ascending: true });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        alert('No hay pesadas para limpiar');
        setLoading(false);
        return;
      }

      // Limpiar duplicados
      const totalEliminados = await limpiarDuplicadosEnBD(data);

      if (totalEliminados > 0) {
        alert(`Se eliminaron ${totalEliminados} pesadas duplicadas`);
        // Recargar las pesadas
        await loadPesadas();
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

  const handleSync = async () => {
    if (!isOnline) return;

    setSyncing(true);
    await syncToSupabase();
    await syncFromSupabase();
    await loadPesadas();
    updateLastSync();
    setSyncing(false);
  };

  const updateLastSync = () => {
    const sync = getLastSync();
    if (sync) {
      const date = new Date(sync);
      setLastSync(date.toLocaleString('es-DO'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta pesada? También se eliminarán el flete y pago de obreros relacionados.')) return;

    try {
      // Eliminar flete relacionado
      const { error: fleteError } = await supabase
        .from('fletes')
        .delete()
        .eq('pesada_id', id);

      if (fleteError) {
        console.error('Error eliminando flete:', fleteError);
      }

      // Eliminar pago de obreros relacionado
      const { error: obrerosError } = await supabase
        .from('pagos_obreros')
        .delete()
        .eq('pesada_id', id);

      if (obrerosError) {
        console.error('Error eliminando pago obreros:', obrerosError);
      }

      // Eliminar la pesada
      const { error: pesadaError } = await supabase
        .from('pesadas')
        .delete()
        .eq('id', id);

      if (pesadaError) {
        alert('Error al eliminar la pesada: ' + pesadaError.message);
        return;
      }

      alert('Pesada, flete y pago de obreros eliminados correctamente');
      loadPesadas();
    } catch (error) {
      console.error('Error en handleDelete:', error);
      alert('Error al eliminar: ' + error.message);
    }
  };

  const totalValor = filteredPesadas.reduce((sum, p) => sum + parseFloat(p.valor_total || 0), 0);
  const totalFanegas = filteredPesadas.reduce((sum, p) => sum + parseFloat(p.fanegas || 0), 0);
  const totalSacos = filteredPesadas.reduce((sum, p) => sum + parseInt(p.cantidad_sacos || 0), 0);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPesadas(filteredPesadas.map(p => p.id));
    } else {
      setSelectedPesadas([]);
    }
  };

  const handleSelectPesada = (id) => {
    if (selectedPesadas.includes(id)) {
      setSelectedPesadas(selectedPesadas.filter(p => p !== id));
    } else {
      setSelectedPesadas([...selectedPesadas, id]);
    }
  };

  const handleUnificarNombres = async () => {
    if (!nuevoNombreUnificado.trim()) return;
    
    if (!confirm(`¿Estás seguro de cambiar el nombre a "${nuevoNombreUnificado}" en ${selectedPesadas.length} pesadas seleccionadas?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('pesadas')
        .update({ nombre_productor: nuevoNombreUnificado.trim() })
        .in('id', selectedPesadas);

      if (error) throw error;

      alert('Nombres actualizados correctamente');
      setShowUnificarModal(false);
      setNuevoNombreUnificado('');
      setSelectedPesadas([]);
      loadPesadas();
    } catch (error) {
      console.error('Error updating names:', error);
      alert('Error al actualizar nombres: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generarPDFProductor = async (nombreProductor) => {
    const pesadasProductor = filteredPesadas.filter(p => p.nombre_productor === nombreProductor);
    if (pesadasProductor.length === 0) {
      alert('No hay pesadas para este productor');
      return;
    }

    if (typeof window === 'undefined') {
      console.warn('PDF generation is only supported in browser environment.');
      return;
    }

    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    const totalFanegasProductor = pesadasProductor.reduce((sum, p) => sum + parseFloat(p.fanegas || 0), 0);
    const totalValorProductor = pesadasProductor.reduce((sum, p) => sum + parseFloat(p.valor_total || 0), 0);

    doc.setFontSize(18);
    doc.text('AGROVERDE/AGVSRL', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Reporte de Pesadas', 105, 28, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Productor: ${nombreProductor}`, 20, 40);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-DO')}`, 20, 46);

    const tableData = pesadasProductor.map(p => [
      new Date(p.fecha).toLocaleDateString('es-DO'),
      p.variedad,
      formatNumber(p.cantidad_sacos, 0),
      formatNumber(p.kilos_neto),
      formatNumber(p.fanegas),
      formatCurrency(p.valor_total)
    ]);

    doc.autoTable({
      startY: 55,
      head: [['Fecha', 'Variedad', 'Sacos', 'Kg Neto', 'Fanegas', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`Total Fanegas: ${formatNumber(totalFanegasProductor)}`, 20, finalY);
    doc.text(`Valor Total: ${formatCurrency(totalValorProductor)}`, 20, finalY + 7);

    // Fecha de impresión
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const fechaImpresion = new Date().toLocaleString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Fecha de impresión: ${fechaImpresion}`, 105, pageHeight - 15, { align: 'center' });

    doc.save(`Reporte_${nombreProductor.replace(/\s/g, '_')}_${new Date().toLocaleDateString('es-DO').replace(/\//g, '-')}.pdf`);
  };

  const generarPDFGeneral = async () => {
    if (filteredPesadas.length === 0) {
      alert('No hay pesadas para generar reporte');
      return;
    }

    if (typeof window === 'undefined') {
      console.warn('PDF generation is only supported in browser environment.');
      return;
    }

    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('AGROVERDE/AGVSRL', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Reporte General de Pesadas', 105, 28, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-DO')}`, 20, 40);
    doc.text(`Total Pesadas: ${filteredPesadas.length}`, 20, 46);

    const tableData = filteredPesadas.map(p => [
      new Date(p.fecha).toLocaleDateString('es-DO'),
      p.nombre_productor,
      p.variedad,
      formatNumber(p.cantidad_sacos, 0),
      formatNumber(p.kilos_neto),
      formatNumber(p.fanegas),
      formatCurrency(p.valor_total)
    ]);

    doc.autoTable({
      startY: 55,
      head: [['Fecha', 'Productor', 'Variedad', 'Sacos', 'Kg Neto', 'Fanegas', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 8 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`Total Fanegas: ${formatNumber(totalFanegas)}`, 20, finalY);
    doc.text(`Valor Total: ${formatCurrency(totalValor)}`, 20, finalY + 7);

    // Fecha de impresión
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const fechaImpresion = new Date().toLocaleString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Fecha de impresión: ${fechaImpresion}`, 105, pageHeight - 15, { align: 'center' });

    doc.save(`Reporte_General_${new Date().toLocaleDateString('es-DO').replace(/\//g, '-')}.pdf`);
  };

  const limpiarFiltros = () => {
    setFilters({
      fechaDesde: '',
      fechaHasta: '',
      mes: '',
      anio: ''
    });
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'pesadas':
        return renderPesadasModule();
      case 'facturas-factoria':
        return <ListaFacturasFactoria user={user} />;
      case 'comparacion':
        return <ComparacionPesadasFacturas user={user} />;
      case 'flete':
        return <RegistroFlete user={user} />;
      case 'obreros':
        return <PagoObreros user={user} />;
      case 'prestamos':
        return <Prestamos user={user} />;
      case 'inventario':
        return <Inventario user={user} />;
      case 'facturas-compra':
        return <FacturasCompra user={user} />;
      case 'suplidores':
        return <Suplidores user={user} />;
      case 'facturas-venta':
        return <FacturasVenta user={user} />;
      case 'clientes':
        return <Clientes user={user} />;
      case 'ventas-diarias':
        return <VentasDiarias user={user} />;
      case 'cuentas-pagar':
        return <CuentasPorPagar user={user} />;
      case 'cuentas-cobrar':
        return <CuentasPorCobrar user={user} />;
      case 'cuadre-caja':
        return <CuadreCaja user={user} />;
      case 'activos-fijos':
        return <ActivosFijos user={user} />;
      case 'utilidad-neta':
        return <UtilidadNeta user={user} />;
      case 'usuarios':
        return <GestionUsuarios user={user} />;
      default:
        return renderPesadasModule();
    }
  };

  const renderPesadasModule = () => (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 max-w-full">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Pesadas</p>
              <p className="text-2xl font-bold text-gray-800">{filteredPesadas.length}</p>
            </div>
            <FileText className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Sacos</p>
              <p className="text-2xl font-bold text-gray-800">{totalSacos}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Fanegas</p>
              <p className="text-2xl font-bold text-gray-800">{formatNumber(totalFanegas)}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚖️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Valor Total</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalValor)}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de Filtros y Reportes PDF */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Filter className="w-5 h-5 text-green-600" />
            Filtros y Reportes
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLimpiarDuplicados}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Limpiar Duplicados
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 pb-4 border-b border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha Exacta
              </label>
              <input
                type="date"
                value={filters.fechaExacta || ''}
                onChange={(e) => setFilters({ ...filters, fechaExacta: e.target.value, fechaDesde: '', fechaHasta: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha Desde
              </label>
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value, fechaExacta: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha Hasta
              </label>
              <input
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
              <select
                value={filters.mes}
                onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos</option>
                <option value="1">Enero</option>
                <option value="2">Febrero</option>
                <option value="3">Marzo</option>
                <option value="4">Abril</option>
                <option value="5">Mayo</option>
                <option value="6">Junio</option>
                <option value="7">Julio</option>
                <option value="8">Agosto</option>
                <option value="9">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
              <select
                value={filters.anio}
                onChange={(e) => setFilters({ ...filters, anio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos</option>
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 max-w-full">
          <button
            onClick={generarPDFGeneral}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            Reporte General PDF
          </button>

          {productores.length > 0 && (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <User className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap flex-shrink-0">PDF por Productor:</span>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide min-w-0 flex-1">
                {productores.map(productor => (
                  <button
                    key={productor}
                    onClick={() => generarPDFProductor(productor)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    {productor}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(filters.fechaDesde || filters.fechaHasta || filters.mes || filters.anio || filters.fechaExacta) && (
            <button
              onClick={limpiarFiltros}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm transition-colors flex-shrink-0"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 max-w-full">
        <div className="flex-1 relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por productor o variedad..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        
        {selectedPesadas.length > 0 && (
          <button
            onClick={() => setShowUnificarModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Users className="w-5 h-5" />
            Unificar Nombres ({selectedPesadas.length})
          </button>
        )}

        <button
          onClick={() => setShowNuevaPesada(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Pesada
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-full">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedPesadas.length === filteredPesadas.length && filteredPesadas.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Productor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variedad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sacos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kg Neto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fanegas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : filteredPesadas.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                    No hay pesadas registradas
                  </td>
                </tr>
              ) : (
                filteredPesadas.map((pesada) => (
                  <tr key={pesada.id} className={`hover:bg-gray-50 transition-colors ${selectedPesadas.includes(pesada.id) ? 'bg-green-50' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedPesadas.includes(pesada.id)}
                        onChange={() => handleSelectPesada(pesada.id)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {new Date(pesada.fecha).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">{pesada.nombre_productor}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{pesada.variedad}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{pesada.cantidad_sacos}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{parseFloat(pesada.kilos_neto).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{parseFloat(pesada.fanegas).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      RD${parseFloat(pesada.valor_total).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingPesada(pesada)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pesada.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUnificarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Unificar Nombres</h3>
            <p className="text-gray-600 mb-4">
              Ingresa el nombre que quieres asignar a las {selectedPesadas.length} pesadas seleccionadas.
            </p>
            <input
              type="text"
              value={nuevoNombreUnificado}
              onChange={(e) => setNuevoNombreUnificado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 mb-6"
              placeholder="Nuevo nombre del productor"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnificarModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnificarNombres}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {showNuevaPesada && (
        <NuevaPesada
          user={user}
          onClose={() => setShowNuevaPesada(false)}
          onSuccess={() => {
            setShowNuevaPesada(false);
            loadPesadas();
          }}
        />
      )}

      {editingPesada && (
        <EditarPesada
          pesada={editingPesada}
          onClose={() => setEditingPesada(null)}
          onSuccess={() => {
            setEditingPesada(null);
            loadPesadas();
          }}
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden max-w-full">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col flex-shrink-0`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <img
                  src="https://sensible-spoonbill-485.convex.cloud/api/storage/12b5938f-3d8e-4f35-b6be-06dc9d878d6d"
                  alt="Logo"
                  className="h-10 w-auto"
                />
                <div>
                  <h2 className="text-sm font-bold text-gray-800">AGROVERDE</h2>
                  <p className="text-xs text-gray-500">Sistema ERP</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.id}
                  onClick={() => setActiveModule(module.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeModule === module.id
                    ? 'bg-green-50 text-green-600'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">{module.name}</span>}
                </button>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  {modules.find(m => m.id === activeModule)?.name || 'Dashboard'}
                </h1>
                <p className="text-xs text-gray-500">AGROVERDE/AGVSRL</p>
              </div>

              <div className="flex items-center gap-4">
                {/* Indicador de conexión */}
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Wifi className="w-5 h-5" />
                      <span className="text-sm hidden sm:inline">En línea</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-orange-600">
                      <WifiOff className="w-5 h-5" />
                      <span className="text-sm hidden sm:inline">Sin conexión</span>
                    </div>
                  )}

                  {/* Botón de sincronización */}
                  {isOnline && (
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Sincronizar datos"
                    >
                      <RefreshCw className={`w-5 h-5 text-gray-600 ${syncing ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Última sincronización */}
                {lastSync && (
                  <div className="hidden md:block text-xs text-gray-500">
                    Última sync: {lastSync}
                  </div>
                )}

                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 max-w-full">
          <div className="max-w-full">
            {renderModule()}
          </div>
        </main>
      </div>
    </div>
  );
}