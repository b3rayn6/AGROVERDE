import { formatCurrency, formatNumber } from '../lib/formatters';
import { useState, useEffect } from 'react';
import { LogOut, Plus, Search, Edit2, Trash2, FileText, Filter, Download, Calendar, User, Wifi, WifiOff, RefreshCw, Menu, X, Scale, FileSpreadsheet, Truck, Users, Package, ShoppingCart, DollarSign, TrendingUp, CreditCard, UserCog, Wallet, CheckCircle, XCircle } from 'lucide-react';
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
import NuevaFacturaFactoria from './NuevaFacturaFactoria';

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
    fechaExacta: '',
    mes: '',
    anio: '',
    cantidadSacosMin: '',
    cantidadSacosMax: '',
    fanegasMin: '',
    fanegasMax: '',
    productor: '',
    variedad: '',
    numeroPesada: ''
  });
  const [productores, setProductores] = useState([]);
  const [isOnline, setIsOnline] = useState(checkConnection());
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [selectedPesadas, setSelectedPesadas] = useState([]);
  const [showNuevaFactura, setShowNuevaFactura] = useState(false);
  const [editingFactura, setEditingFactura] = useState(null);
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

    // Filtro por búsqueda rápida
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.nombre_productor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.variedad.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtros avanzados
    if (filters.productor) {
      filtered = filtered.filter(p => 
        p.nombre_productor.toLowerCase().includes(filters.productor.toLowerCase())
      );
    }

    if (filters.variedad) {
      filtered = filtered.filter(p => 
        p.variedad.toLowerCase().includes(filters.variedad.toLowerCase())
      );
    }

    if (filters.numeroPesada) {
      filtered = filtered.filter(p => 
        p.numero_pesada && p.numero_pesada.toString().includes(filters.numeroPesada)
      );
    }

    if (filters.cantidadSacosMin) {
      filtered = filtered.filter(p => parseInt(p.cantidad_sacos || 0) >= parseInt(filters.cantidadSacosMin));
    }

    if (filters.cantidadSacosMax) {
      filtered = filtered.filter(p => parseInt(p.cantidad_sacos || 0) <= parseInt(filters.cantidadSacosMax));
    }

    if (filters.fanegasMin) {
      filtered = filtered.filter(p => parseFloat(p.fanegas || 0) >= parseFloat(filters.fanegasMin));
    }

    if (filters.fanegasMax) {
      filtered = filtered.filter(p => parseFloat(p.fanegas || 0) <= parseFloat(filters.fanegasMax));
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

  // Estado de pago guardado en localStorage mientras no existan las columnas en BD
  const getEstadosPago = () => {
    try {
      return JSON.parse(localStorage.getItem('pesadas_estados_pago') || '{}');
    } catch { return {}; }
  };

  const saveEstadoPago = (id, estado) => {
    const estados = getEstadosPago();
    estados[id] = { estado, fecha: estado === 'pagado' ? new Date().toISOString() : null };
    localStorage.setItem('pesadas_estados_pago', JSON.stringify(estados));
  };

  const getEstadoPesada = (pesada) => {
    if (pesada.estado_pago) return pesada.estado_pago;
    const estados = getEstadosPago();
    return estados[pesada.id]?.estado || 'pendiente';
  };

  const loadPesadas = async () => {
    setLoading(true);

    // Función para aplicar estados de pago desde localStorage
    const aplicarEstadosPago = (listaPesadas) => {
      const estados = getEstadosPago();
      return listaPesadas.map(p => ({
        ...p,
        estado_pago: p.estado_pago || estados[p.id]?.estado || 'pendiente',
        fecha_pago: p.fecha_pago || estados[p.id]?.fecha || null
      }));
    };

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
            const conEstados = aplicarEstadosPago(dataActualizada);
            setPesadas(conEstados);
            setFilteredPesadas(conEstados);
          }
        } else {
          const conEstados = aplicarEstadosPago(data);
          setPesadas(conEstados);
          setFilteredPesadas(conEstados);
        }
      }
    } else {
      // Si no hay conexión, cargar desde localStorage
      const localPesadas = aplicarEstadosPago(getPesadasLocal());
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

  const marcarComoPagado = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'pagado' ? 'pendiente' : 'pagado';
    const mensaje = nuevoEstado === 'pagado' 
      ? '¿Marcar esta pesada como PAGADA?' 
      : '¿Marcar esta pesada como PENDIENTE?';
    
    if (!confirm(mensaje)) return;

    // Siempre guardar en localStorage para persistencia
    saveEstadoPago(id, nuevoEstado);

    try {
      const { error } = await supabase
        .from('pesadas')
        .update({ 
          estado_pago: nuevoEstado,
          fecha_pago: nuevoEstado === 'pagado' ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) {
        console.warn('Columna estado_pago no existe en BD, usando localStorage:', error.message);
      }
    } catch (error) {
      console.error('Error:', error);
    }

    // Actualizar estado local inmediatamente
    setPesadas(prev => prev.map(p => 
      p.id === id ? { ...p, estado_pago: nuevoEstado, fecha_pago: nuevoEstado === 'pagado' ? new Date().toISOString() : null } : p
    ));
    setFilteredPesadas(prev => prev.map(p => 
      p.id === id ? { ...p, estado_pago: nuevoEstado, fecha_pago: nuevoEstado === 'pagado' ? new Date().toISOString() : null } : p
    ));
  };

  const totalValor = filteredPesadas.reduce((sum, p) => sum + parseFloat(p.valor_total || 0), 0);
  const totalFanegas = filteredPesadas.reduce((sum, p) => sum + parseFloat(p.fanegas || 0), 0);
  const totalSacos = filteredPesadas.reduce((sum, p) => sum + parseInt(p.cantidad_sacos || 0), 0);
  const totalKilosBruto = filteredPesadas.reduce((sum, p) => sum + parseFloat(p.kilos_bruto || 0), 0);
  const totalKilosNeto = filteredPesadas.reduce((sum, p) => sum + parseFloat(p.kilos_neto || 0), 0);

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
    const totalSacosProductor = pesadasProductor.reduce((sum, p) => sum + parseInt(p.cantidad_sacos || 0), 0);
    const totalKilosBrutoProductor = pesadasProductor.reduce((sum, p) => sum + parseFloat(p.kilos_bruto || 0), 0);
    const totalKilosNetoProductor = pesadasProductor.reduce((sum, p) => sum + parseFloat(p.kilos_neto || 0), 0);
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
      formatNumber(p.kilos_bruto),
      formatNumber(p.kilos_neto),
      formatNumber(p.fanegas),
      formatCurrency(p.valor_total)
    ]);

    doc.autoTable({
      startY: 55,
      head: [['Fecha', 'Variedad', 'Sacos', 'Kg Bruto', 'Kg Neto', 'Fanegas', 'Valor']],
      body: tableData,
      foot: [['', 'TOTALES:', formatNumber(totalSacosProductor, 0), formatNumber(totalKilosBrutoProductor), formatNumber(totalKilosNetoProductor), formatNumber(totalFanegasProductor), formatCurrency(totalValorProductor)]],
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
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
      formatNumber(p.kilos_bruto),
      formatNumber(p.kilos_neto),
      formatNumber(p.fanegas),
      formatCurrency(p.valor_total)
    ]);

    doc.autoTable({
      startY: 55,
      head: [['Fecha', 'Productor', 'Variedad', 'Sacos', 'Kg Bruto', 'Kg Neto', 'Fanegas', 'Valor']],
      body: tableData,
      foot: [['', '', 'TOTALES:', formatNumber(totalSacos, 0), formatNumber(totalKilosBruto), formatNumber(totalKilosNeto), formatNumber(totalFanegas), formatCurrency(totalValor)]],
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
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
      fechaExacta: '',
      mes: '',
      anio: '',
      cantidadSacosMin: '',
      cantidadSacosMax: '',
      fanegasMin: '',
      fanegasMax: '',
      productor: '',
      variedad: '',
      numeroPesada: ''
    });
    setSearchTerm('');
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'pesadas':
        return renderPesadasModule();
      case 'facturas-factoria':
        if (showNuevaFactura || editingFactura) {
          return <NuevaFacturaFactoria 
            user={user} 
            facturaToEdit={editingFactura} 
            onBack={() => {
              setShowNuevaFactura(false);
              setEditingFactura(null);
            }} 
          />;
        }
        return <ListaFacturasFactoria 
          user={user} 
          onNuevaFactura={() => setShowNuevaFactura(true)}
          onEditarFactura={(factura) => setEditingFactura(factura)}
        />;
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
      {/* Stats - Tarjetas Mejoradas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 max-w-full">
        {/* Total Pesadas */}
        <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 rounded-2xl p-6 shadow-lg border-2 border-green-200 hover-lift transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-200 rounded-full -mr-12 -mt-12 opacity-20 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="flex items-start justify-between relative z-10 gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                Total Pesadas
              </p>
              <p className="text-2xl font-bold text-green-900 group-hover:scale-105 transition-transform duration-300 break-words leading-tight">{filteredPesadas.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg group-hover:rotate-6 transition-transform duration-300 flex-shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Total Sacos */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 rounded-2xl p-6 shadow-lg border-2 border-blue-200 hover-lift transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200 rounded-full -mr-12 -mt-12 opacity-20 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="flex items-start justify-between relative z-10 gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                </svg>
                Total Sacos
              </p>
              <p className="text-2xl font-bold text-blue-900 group-hover:scale-105 transition-transform duration-300 break-words leading-tight">{totalSacos}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg group-hover:rotate-6 transition-transform duration-300 flex-shrink-0">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Total Fanegas */}
        <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 rounded-2xl p-6 shadow-lg border-2 border-purple-200 hover-lift transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-200 rounded-full -mr-12 -mt-12 opacity-20 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="flex items-start justify-between relative z-10 gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L5 10.274zm10 0l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L15 10.274z" clipRule="evenodd" />
                </svg>
                Total Fanegas
              </p>
              <p className="text-2xl font-bold text-purple-900 group-hover:scale-105 transition-transform duration-300 break-words leading-tight">{formatNumber(totalFanegas)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl shadow-lg group-hover:rotate-6 transition-transform duration-300 flex-shrink-0">
              <Scale className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Valor Total */}
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 rounded-2xl p-6 shadow-lg border-2 border-amber-200 hover-lift transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200 rounded-full -mr-12 -mt-12 opacity-20 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="flex items-start justify-between relative z-10 gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                Valor Total
              </p>
              <p className="text-2xl font-bold text-amber-900 group-hover:scale-105 transition-transform duration-300 break-words leading-tight">{formatCurrency(totalValor)}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-xl shadow-lg group-hover:rotate-6 transition-transform duration-300 flex-shrink-0">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Panel de Filtros y Reportes PDF */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Filter className="w-5 h-5 text-green-600" />
            Búsqueda Avanzada y Reportes
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
              className="text-sm text-green-700 hover:bg-green-100 font-medium bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 flex items-center gap-1"
            >
              <Search className="w-4 h-4 inline" />
              {showFilters ? 'Ocultar Búsqueda' : 'Buscar / Filtros'}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200">
            {/* Productor y Variedad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Productor
              </label>
              <input
                type="text"
                placeholder="Nombre del productor"
                value={filters.productor}
                onChange={(e) => setFilters({ ...filters, productor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variedad de Arroz
              </label>
              <input
                type="text"
                placeholder="Ej. Juma 67"
                value={filters.variedad}
                onChange={(e) => setFilters({ ...filters, variedad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>

            {/* Cantidad de Sacos */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad de Sacos
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Mínimo"
                  value={filters.cantidadSacosMin}
                  onChange={(e) => setFilters({ ...filters, cantidadSacosMin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
                <span className="flex items-center text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Máximo"
                  value={filters.cantidadSacosMax}
                  onChange={(e) => setFilters({ ...filters, cantidadSacosMax: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
            </div>

            {/* Fanegas */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fanegas
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Mínimo"
                  value={filters.fanegasMin}
                  onChange={(e) => setFilters({ ...filters, fanegasMin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
                <span className="flex items-center text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Máximo"
                  value={filters.fanegasMax}
                  onChange={(e) => setFilters({ ...filters, fanegasMax: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
            </div>

            {/* Fechas */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Rango de Fechas
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.fechaDesde}
                  onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value, fechaExacta: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
                <span className="flex items-center text-gray-500">-</span>
                <input
                  type="date"
                  value={filters.fechaHasta}
                  onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha Exacta
              </label>
              <input
                type="date"
                value={filters.fechaExacta || ''}
                onChange={(e) => setFilters({ ...filters, fechaExacta: e.target.value, fechaDesde: '', fechaHasta: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
              />
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

          {(searchTerm || filters.numeroPesada || filters.fechaDesde || filters.fechaHasta || filters.mes || filters.anio || filters.fechaExacta || filters.cantidadSacosMin || filters.cantidadSacosMax || filters.fanegasMin || filters.fanegasMax || filters.productor || filters.variedad) && (
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
        <div className="flex-1 relative min-w-0 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-green-600 transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por productor o variedad..."
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300 hover:shadow-md"
          />
        </div>
        <div className="flex-1 relative min-w-0 group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm group-focus-within:text-green-600 transition-colors">N°</div>
          <input
            type="text"
            value={filters.numeroPesada}
            onChange={(e) => setFilters({ ...filters, numeroPesada: e.target.value })}
            placeholder="N. de Pesada..."
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-300 hover:shadow-md"
          />
        </div>
        
        {selectedPesadas.length > 0 && (
          <button
            onClick={() => setShowUnificarModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-semibold group"
          >
            <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Unificar Nombres ({selectedPesadas.length})
          </button>
        )}

        <button
          onClick={() => setShowNuevaPesada(true)}
          className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-bold group relative overflow-hidden animate-gradient bg-[length:200%_100%]"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300 relative z-10" />
          <span className="relative z-10">Nueva Pesada</span>
        </button>
      </div>

      {/* Table - Tabla Mejorada */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden max-w-full hover-lift transition-all duration-300">
        <div className="overflow-x-auto max-w-full scrollbar-custom">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedPesadas.length === filteredPesadas.length && filteredPesadas.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 hover:scale-110 transition-transform cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    Fecha
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Productor
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Variedad</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Sacos</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Kg Bruto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Kg Neto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fanegas</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                      <p className="text-gray-500 font-medium">Cargando pesadas...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPesadas.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-gray-100 p-4 rounded-full">
                        <FileText className="w-12 h-12 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No hay pesadas registradas</p>
                      <button
                        onClick={() => setShowNuevaPesada(true)}
                        className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Crear primera pesada
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPesadas.map((pesada) => (
                  <tr key={pesada.id} className={`hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 ${selectedPesadas.includes(pesada.id) ? 'bg-green-50 border-l-4 border-green-500' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedPesadas.includes(pesada.id)}
                        onChange={() => handleSelectPesada(pesada.id)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 hover:scale-110 transition-transform cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {new Date(pesada.fecha).toLocaleDateString('es-DO')}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{pesada.nombre_productor}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-xs font-medium">
                        {pesada.variedad}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{pesada.cantidad_sacos}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{parseFloat(pesada.kilos_bruto || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{parseFloat(pesada.kilos_neto || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-purple-700 font-bold">{parseFloat(pesada.fanegas).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-800">
                      RD${parseFloat(pesada.valor_total).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {getEstadoPesada(pesada) === 'pagado' ? (
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => marcarComoPagado(pesada.id, getEstadoPesada(pesada))}
                          className={`p-2 rounded-xl transition-all duration-200 hover:scale-110 ${
                            getEstadoPesada(pesada) === 'pagado' 
                              ? 'text-yellow-600 hover:bg-yellow-100 hover:shadow-md' 
                              : 'text-green-600 hover:bg-green-100 hover:shadow-md'
                          }`}
                          title={getEstadoPesada(pesada) === 'pagado' ? 'Marcar como pendiente' : 'Marcar como pagado'}
                        >
                          {getEstadoPesada(pesada) === 'pagado' ? (
                            <XCircle className="w-5 h-5" />
                          ) : (
                            <CheckCircle className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingPesada(pesada)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md group"
                          title="Editar pesada"
                        >
                          <Edit2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        </button>
                        <button
                          onClick={() => handleDelete(pesada.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md group"
                          title="Eliminar pesada"
                        >
                          <Trash2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredPesadas.length > 0 && (
              <tfoot className="bg-gradient-to-r from-gray-100 to-gray-200 border-t-2 border-gray-300">
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-sm font-bold text-gray-800 text-right uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                      Totales:
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-blue-700">{formatNumber(totalSacos, 0)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">{formatNumber(totalKilosBruto)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-800">{formatNumber(totalKilosNeto)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-purple-700">{formatNumber(totalFanegas)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-green-700">{formatCurrency(totalValor)}</td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            )}
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