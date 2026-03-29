import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getUserId } from '../lib/authUtils';
import { GitCompare, TrendingUp, TrendingDown, Calendar, User, Printer, CheckSquare, Building2 } from 'lucide-react';
import { formatCurrency, formatNumber } from '../lib/formatters';

export default function ComparacionPesadasFacturas({ user }) {
  const [loading, setLoading] = useState(true);
  const [productores, setProductores] = useState([]);
  const [productorSeleccionado, setProductorSeleccionado] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [comparacion, setComparacion] = useState(null);
  const [seleccionarTodos, setSeleccionarTodos] = useState(false);
  const [ordenamiento, setOrdenamiento] = useState('fecha-desc');
  const [mostrarSoloGanancias, setMostrarSoloGanancias] = useState(false);
  const [factorias, setFactorias] = useState([]);
  const [factoriaSeleccionada, setFactoriaSeleccionada] = useState('');

  // Helper for sorting
  const obtenerDatosOrdenados = () => {
    if (!comparacion) return { pesadas: [], facturas: [] };
    
    let pesadasAFiltrar = comparacion.pesadas || [];
    let facturasAFiltrar = comparacion.facturas || [];

    if (factoriaSeleccionada) {
      facturasAFiltrar = facturasAFiltrar.filter(f => f.nombre_factoria === factoriaSeleccionada);
      const numerosPesadaFactoria = new Set(facturasAFiltrar.map(f => f.numero_pesada).filter(Boolean));
      pesadasAFiltrar = pesadasAFiltrar.filter(p => numerosPesadaFactoria.has(p.numero_pesada));
    }

    const mapPesadas = new Map(pesadasAFiltrar.map(p => [p.numero_pesada, p]));
    const mapFacturas = new Map(facturasAFiltrar.map(f => [f.numero_pesada, f]));

    if (mostrarSoloGanancias) {
      const todosNumerosPesada = new Set([
        ...pesadasAFiltrar.map(p => p.numero_pesada).filter(Boolean),
        ...facturasAFiltrar.map(f => f.numero_pesada).filter(Boolean)
      ]);
      
      pesadasAFiltrar = [];
      facturasAFiltrar = [];

      todosNumerosPesada.forEach(num => {
        const p = mapPesadas.get(num);
        const f = mapFacturas.get(num);
        
        if (p && f) {
          const valorPesada = parseFloat(p.valor_total) || 0;
          const valorFactura = parseFloat(f.valor_pagar) || 0;
          const kilosPesada = parseFloat(p.kilos_neto) || 0;
          const kilosFactura = parseFloat(f.kilos_neto) || 0;
          
          if (kilosFactura > kilosPesada && valorFactura > valorPesada) {
            pesadasAFiltrar.push(p);
            facturasAFiltrar.push(f);
          }
        }
      });
    }

    const getDifKiloNeto = (item, type) => {
      const numPesada = item.numero_pesada;
      if (!numPesada) return 0;
      const pesada = type === 'pesada' ? item : mapPesadas.get(numPesada);
      const factura = type === 'factura' ? item : mapFacturas.get(numPesada);
      if (!pesada || !factura) return 0;
      return Math.abs((parseFloat(pesada.kilos_neto) || 0) - (parseFloat(factura.kilos_neto) || 0));
    };

    const getDifPorcentual = (item, type) => {
      const numPesada = item.numero_pesada;
      if (!numPesada) return 0;
      const pesada = type === 'pesada' ? item : mapPesadas.get(numPesada);
      const factura = type === 'factura' ? item : mapFacturas.get(numPesada);
      if (!pesada || !factura) return 0;
      const valP = parseFloat(pesada.kilos_neto) || 0;
      const valF = parseFloat(factura.kilos_neto) || 0;
      if (valF === 0) return valP > 0 ? 100 : 0;
      return Math.abs((valP - valF) / valF) * 100;
    };

    const sortFn = (type) => (a, b) => {
      switch (ordenamiento) {
        case 'fecha-desc':
          return new Date(b.fecha) - new Date(a.fecha);
        case 'fecha-asc':
          return new Date(a.fecha) - new Date(b.fecha);
        case 'pesada-asc':
          return String(a.numero_pesada || '').localeCompare(String(b.numero_pesada || ''), undefined, {numeric: true});
        case 'pesada-desc':
          return String(b.numero_pesada || '').localeCompare(String(a.numero_pesada || ''), undefined, {numeric: true});
        case 'factura-asc': {
          const idA = type === 'factura' ? a.id : (mapFacturas.get(a.numero_pesada)?.id || 0);
          const idB = type === 'factura' ? b.id : (mapFacturas.get(b.numero_pesada)?.id || 0);
          return idA - idB;
        }
        case 'factura-desc': {
          const idA = type === 'factura' ? a.id : (mapFacturas.get(a.numero_pesada)?.id || 0);
          const idB = type === 'factura' ? b.id : (mapFacturas.get(b.numero_pesada)?.id || 0);
          return idB - idA;
        }
        case 'dif-kilo-desc':
          return getDifKiloNeto(b, type) - getDifKiloNeto(a, type);
        case 'dif-porc-desc':
          return getDifPorcentual(b, type) - getDifPorcentual(a, type);
        default:
          return 0;
      }
    };

    return {
      pesadas: [...pesadasAFiltrar].sort(sortFn('pesada')),
      facturas: [...facturasAFiltrar].sort(sortFn('factura'))
    };
  };

  const { pesadas: pesadasOrdenadas, facturas: facturasOrdenadas } = obtenerDatosOrdenados();

  const totalesPesadasDisplay = pesadasOrdenadas.reduce((acc, p) => ({
    sacos: acc.sacos + (p.cantidad_sacos || 0),
    kilosNeto: acc.kilosNeto + (parseFloat(p.kilos_neto) || 0),
    fanegas: acc.fanegas + (parseFloat(p.fanegas) || 0),
    valorTotal: acc.valorTotal + (parseFloat(p.valor_total) || 0)
  }), { sacos: 0, kilosNeto: 0, fanegas: 0, valorTotal: 0 });

  const totalesFacturasDisplay = facturasOrdenadas.reduce((acc, f) => ({
    sacos: acc.sacos + (f.cantidad_sacos || 0),
    kilosNeto: acc.kilosNeto + (parseFloat(f.kilos_neto) || 0),
    fanegas: acc.fanegas + (parseFloat(f.fanegas) || 0),
    valorTotal: acc.valorTotal + (parseFloat(f.valor_pagar) || 0)
  }), { sacos: 0, kilosNeto: 0, fanegas: 0, valorTotal: 0 });

  const diferenciasDisplay = {
    sacos: totalesPesadasDisplay.sacos - totalesFacturasDisplay.sacos,
    kilosNeto: totalesPesadasDisplay.kilosNeto - totalesFacturasDisplay.kilosNeto,
    fanegas: totalesPesadasDisplay.fanegas - totalesFacturasDisplay.fanegas,
    valorTotal: totalesPesadasDisplay.valorTotal - totalesFacturasDisplay.valorTotal
  };

  useEffect(() => {
    cargarProductores();
    cargarFactorias();
  }, [user]);

  const cargarFactorias = async () => {
    try {
      const { data, error } = await supabase
        .from('facturas_factoria')
        .select('nombre_factoria')
        .not('nombre_factoria', 'is', null)
        .neq('nombre_factoria', '');
        
      if (!error && data) {
        const factoriasUnicas = [...new Set(data.map(f => f.nombre_factoria).filter(Boolean))].sort();
        setFactorias(factoriasUnicas);
      }
    } catch (e) {
      console.error('Error al cargar factorías:', e);
    }
  };

  const cargarProductores = async () => {
    try {
      setLoading(true);
      console.log('🔍 Iniciando carga de productores de pesadas...');
      
      // Cargar TODOS los productores de pesadas sin filtrar por user_id
      // Esto asegura que siempre se muestren los productores disponibles
      const { data: pesadas, error: errorPesadas } = await supabase
        .from('pesadas')
        .select('nombre_productor')
        .not('nombre_productor', 'is', null)
        .neq('nombre_productor', '');

      if (errorPesadas) {
        console.error('❌ Error al cargar pesadas:', errorPesadas);
        setProductores([]);
        setLoading(false);
        return;
      }

      console.log('✅ Pesadas cargadas:', pesadas?.length || 0);
      console.log('📋 Datos de pesadas:', pesadas);

      if (!pesadas || pesadas.length === 0) {
        console.warn('⚠️ No se encontraron pesadas en la base de datos');
        setProductores([]);
        setLoading(false);
        return;
      }

      // Extraer productores únicos de pesadas
      const productoresPesadas = (pesadas || [])
        .map(p => p.nombre_productor)
        .filter(p => p && p.trim() !== '' && p !== null && p !== undefined);
      
      console.log('📊 Productores extraídos (antes de eliminar duplicados):', productoresPesadas.length);
      
      // Eliminar duplicados y ordenar
      const productoresUnicos = [...new Set(productoresPesadas)].sort();
      console.log('✅ Productores únicos encontrados (solo de pesadas):', productoresUnicos);
      console.log('📊 Total de productores únicos:', productoresUnicos.length);
      
      if (productoresUnicos.length === 0) {
        console.warn('⚠️ No se encontraron productores válidos en las pesadas');
      }
      
      setProductores(productoresUnicos);
    } catch (error) {
      console.error('❌ Error al cargar productores:', error);
      setProductores([]);
    } finally {
      setLoading(false);
    }
  };

  const compararDatos = async () => {
    if (!seleccionarTodos && !productorSeleccionado) {
      alert('Selecciona un productor o marca "Seleccionar Todos"');
      return;
    }
    
    if (!fechaInicio || !fechaFin) {
      alert('Selecciona rango de fechas');
      return;
    }

    setLoading(true);
    try {
      if (!user || !user.id) {
        alert('Debes iniciar sesión');
        setLoading(false);
        return;
      }

      const userId = await getUserId(user);
      if (!userId) {
        alert('Error al obtener el ID de usuario. Por favor, verifica que estés autenticado correctamente.');
        setLoading(false);
        return;
      }

      console.log('🔍 Buscando datos para comparación:', {
        productor: seleccionarTodos ? 'TODOS' : productorSeleccionado,
        fechaInicio,
        fechaFin,
        userId: userId
      });

      // Cargar pesadas con filtros
      let queryPesadas = supabase
        .from('pesadas')
        .select('*')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin);
      
      if (!seleccionarTodos) {
        queryPesadas = queryPesadas.eq('nombre_productor', productorSeleccionado);
      }

      const { data: pesadas, error: errorPesadas } = await queryPesadas;

      if (errorPesadas) {
        console.error('❌ Error al cargar pesadas:', errorPesadas);
      }

      console.log('📊 Pesadas encontradas:', pesadas?.length || 0);

      // Cargar facturas con filtros
      let queryFacturas = supabase
        .from('facturas_factoria')
        .select('*')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin);
      
      if (!seleccionarTodos) {
        queryFacturas = queryFacturas.eq('cliente', productorSeleccionado);
      }

      const { data: facturas, error: errorFacturas } = await queryFacturas;

      if (errorFacturas) {
        console.error('❌ Error al cargar facturas:', errorFacturas);
      }

      console.log('📊 Facturas encontradas:', facturas?.length || 0);

      // Verificar si hay datos
      if ((!pesadas || pesadas.length === 0) && (!facturas || facturas.length === 0)) {
        const mensaje = seleccionarTodos 
          ? `No se encontraron registros en el período seleccionado.`
          : `No se encontraron registros para el productor "${productorSeleccionado}" en el período seleccionado.`;
        alert(mensaje);
        setComparacion(null);
        setLoading(false);
        return;
      }

      console.log('Generando comparación con los datos encontrados...');

      // Calcular totales
      const totalesPesadas = (pesadas || []).reduce((acc, p) => (
        {
          sacos: acc.sacos + p.cantidad_sacos,
          kilosNeto: acc.kilosNeto + parseFloat(p.kilos_neto),
          fanegas: acc.fanegas + parseFloat(p.fanegas),
          valorTotal: acc.valorTotal + parseFloat(p.valor_total)
        }
      ), { sacos: 0, kilosNeto: 0, fanegas: 0, valorTotal: 0 });

      const totalesFacturas = (facturas || []).reduce((acc, f) => (
        {
          sacos: acc.sacos + f.cantidad_sacos,
          kilosNeto: acc.kilosNeto + parseFloat(f.kilos_neto),
          fanegas: acc.fanegas + parseFloat(f.fanegas),
          valorTotal: acc.valorTotal + parseFloat(f.valor_pagar)
        }
      ), { sacos: 0, kilosNeto: 0, fanegas: 0, valorTotal: 0 });

      // Calcular diferencias
      const diferencias = {
        sacos: totalesPesadas.sacos - totalesFacturas.sacos,
        kilosNeto: totalesPesadas.kilosNeto - totalesFacturas.kilosNeto,
        fanegas: totalesPesadas.fanegas - totalesFacturas.fanegas,
        valorTotal: totalesPesadas.valorTotal - totalesFacturas.valorTotal
      };

      console.log('📊 Comparación completada:', {
        totalesPesadas,
        totalesFacturas,
        diferencias
      });

      const comparacionData = {
        pesadas: pesadas || [],
        facturas: facturas || [],
        totalesPesadas,
        totalesFacturas,
        diferencias
      };

      setComparacion(comparacionData);

      console.log('✅ Comparación guardada exitosamente');
      console.log('📋 Datos completos de la comparación:', comparacionData);
      console.log('📊 Resumen final:', {
        totalPesadas: comparacionData.pesadas.length,
        totalFacturas: comparacionData.facturas.length,
        diferenciaValor: comparacionData.diferencias.valorTotal,
        estado: comparacionData.diferencias.valorTotal > 0 ? 'PÉRDIDA' : comparacionData.diferencias.valorTotal < 0 ? 'GANANCIA' : 'SIN DIFERENCIA'
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Error al comparar datos');
    } finally {
      setLoading(false);
    }
  };

  const imprimirComparacion = () => {
    if (typeof window === 'undefined') {
      console.warn('Print is only supported in browser environment.');
      return;
    }

    if (!comparacion) return;
    
    const printWindow = window.open('', '_blank');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comparación Pesadas vs Facturas - AGROVERDE</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { margin: 0; color: #16a34a; }
          .header p { margin: 5px 0; color: #666; }
          .info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .info p { margin: 5px 0; }
          .resumen { background: linear-gradient(to right, #d1fae5, #dbeafe); padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .resumen h3 { margin-top: 0; }
          .resumen-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 15px; }
          .resumen-item { background: white; padding: 15px; border-radius: 8px; text-align: center; }
          .resumen-item .label { font-size: 12px; color: #666; margin-bottom: 5px; }
          .resumen-item .diferencia { font-size: 18px; font-weight: bold; }
          .resumen-item .detalles { font-size: 10px; color: #666; margin-top: 5px; }
          .analisis { padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .analisis.perdida { background: #fee2e2; }
          .analisis.ganancia { background: #d1fae5; }
          .analisis.neutro { background: #f3f4f6; }
          .analisis h3 { margin-top: 0; }
          .tablas { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .tabla-container { background: #f9fafb; padding: 15px; border-radius: 8px; }
          .tabla-container h4 { margin-top: 0; }
          table { width: 100%; border-collapse: collapse; background: white; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #16a34a; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
          .positivo { color: #16a34a; }
          .negativo { color: #dc2626; }
          @media print {
            body { padding: 10px; }
            .tablas { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AGROVERDE/AGVSRL</h1>
          <p>Comparación: Pesadas vs Facturas de Factoría</p>
          <p>Fecha de impresión: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        </div>
        
        <div class="info">
          <h3 style="margin-top: 0;">Información del Reporte</h3>
          <p><strong>Productor:</strong> ${seleccionarTodos ? 'TODOS' : productorSeleccionado}</p>
          <p><strong>Factoría:</strong> ${factoriaSeleccionada || 'Todas las Factorías'}</p>
          <p><strong>Período:</strong> ${new Date(fechaInicio).toLocaleDateString()} - ${new Date(fechaFin).toLocaleDateString()}</p>
          ${mostrarSoloGanancias ? '<p><strong>Filtro Activo:</strong> Solo registros con ganancia (+ Kilos y + Valor)</p>' : ''}
          <p><strong>Pesadas registradas:</strong> ${pesadasOrdenadas.length}</p>
          <p><strong>Facturas registradas:</strong> ${facturasOrdenadas.length}</p>
        </div>
        
        <div class="resumen">
          <h3>Resumen Comparativo</h3>
          <div class="resumen-grid">
            <div class="resumen-item">
              <div class="label">Diferencia en Sacos</div>
              <div class="diferencia ${diferenciasDisplay.sacos > 0 ? 'negativo' : diferenciasDisplay.sacos < 0 ? 'positivo' : ''}">
                ${diferenciasDisplay.sacos > 0 ? '-' : diferenciasDisplay.sacos < 0 ? '+' : ''}${Math.abs(diferenciasDisplay.sacos)}
              </div>
              <div class="detalles">
                Pesadas: ${totalesPesadasDisplay.sacos}<br>
                Facturas: ${totalesFacturasDisplay.sacos}
              </div>
            </div>
            
            <div class="resumen-item">
              <div class="label">Diferencia en Kilos</div>
              <div class="diferencia ${diferenciasDisplay.kilosNeto > 0 ? 'negativo' : diferenciasDisplay.kilosNeto < 0 ? 'positivo' : ''}">
                ${diferenciasDisplay.kilosNeto > 0 ? '-' : diferenciasDisplay.kilosNeto < 0 ? '+' : ''}${Math.abs(diferenciasDisplay.kilosNeto).toFixed(2)}
              </div>
              <div class="detalles">
                Pesadas: ${totalesPesadasDisplay.kilosNeto.toFixed(2)}<br>
                Facturas: ${totalesFacturasDisplay.kilosNeto.toFixed(2)}
              </div>
            </div>
            
            <div class="resumen-item">
              <div class="label">Diferencia en Fanegas</div>
              <div class="diferencia ${diferenciasDisplay.fanegas > 0 ? 'negativo' : diferenciasDisplay.fanegas < 0 ? 'positivo' : ''}">
                ${diferenciasDisplay.fanegas > 0 ? '-' : diferenciasDisplay.fanegas < 0 ? '+' : ''}${Math.abs(diferenciasDisplay.fanegas).toFixed(2)}
              </div>
              <div class="detalles">
                Pesadas: ${totalesPesadasDisplay.fanegas.toFixed(2)}<br>
                Facturas: ${totalesFacturasDisplay.fanegas.toFixed(2)}
              </div>
            </div>
            
            <div class="resumen-item">
              <div class="label">Diferencia en Valor</div>
              <div class="diferencia ${diferenciasDisplay.valorTotal > 0 ? 'negativo' : diferenciasDisplay.valorTotal < 0 ? 'positivo' : ''}">
                ${diferenciasDisplay.valorTotal > 0 ? '-' : diferenciasDisplay.valorTotal < 0 ? '+' : ''}${Math.abs(diferenciasDisplay.valorTotal).toFixed(2)}
              </div>
              <div class="detalles">
                Pesadas: ${totalesPesadasDisplay.valorTotal.toFixed(2)}<br>
                Facturas: ${totalesFacturasDisplay.valorTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        
        <div class="analisis ${diferenciasDisplay.valorTotal > 0 ? 'perdida' : diferenciasDisplay.valorTotal < 0 ? 'ganancia' : 'neutro'}">
          <h3>Análisis Financiero</h3>
          ${diferenciasDisplay.valorTotal > 0 ? `
            <p><strong style="color: #dc2626; font-size: 20px;">Pérdida: ${Math.abs(diferenciasDisplay.valorTotal).toFixed(2)}</strong></p>
            <p>La factoría está pagando menos de lo registrado en las pesadas. Revisa los datos para identificar discrepancias en kilos, humedad o precio por fanega.</p>
          ` : diferenciasDisplay.valorTotal < 0 ? `
            <p><strong style="color: #16a34a; font-size: 20px;">Ganancia: ${Math.abs(diferenciasDisplay.valorTotal).toFixed(2)}</strong></p>
            <p>La factoría está pagando más de lo registrado en las pesadas. Esto puede ser positivo, pero verifica que no haya errores en los registros.</p>
          ` : `
            <p><strong style="color: #666; font-size: 20px;">Sin diferencia</strong></p>
            <p>Los valores de pesadas y facturas coinciden perfectamente.</p>
          `}
        </div>
        
        <div class="tablas">
          <div class="tabla-container">
            <h4>Pesadas Registradas (${pesadasOrdenadas.length})</h4>
            <table>
              <thead>
                <tr>
                  <th>N° Pesada</th>
                  <th>Fecha</th>
                  <th>Productor</th>
                  <th>Sacos</th>
                  <th>Kg Neto</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                ${pesadasOrdenadas.map(p => `
                  <tr>
                    <td>${p.numero_pesada || '-'}</td>
                    <td>${new Date(p.fecha).toLocaleDateString()}</td>
                    <td>${p.nombre_productor}</td>
                    <td>${p.cantidad_sacos}</td>
                    <td>${parseFloat(p.kilos_neto).toFixed(2)}</td>
                    <td>${parseFloat(p.valor_total).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="tabla-container">
            <h4>Facturas de Factoría (${facturasOrdenadas.length})</h4>
            <table>
              <thead>
                <tr>
                  <th>N° Pesada</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Sacos</th>
                  <th>Kg Neto</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                ${facturasOrdenadas.map(f => `
                  <tr>
                    <td>${f.numero_pesada || '-'}</td>
                    <td>${new Date(f.fecha).toLocaleDateString()}</td>
                    <td>${f.cliente}</td>
                    <td>${f.cantidad_sacos}</td>
                    <td>${parseFloat(f.kilos_neto).toFixed(2)}</td>
                    <td>${parseFloat(f.valor_pagar).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="footer">
          <p>Sistema de Gestión AGROVERDE - Reporte generado automáticamente</p>
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

  const renderDiferencia = (valor, esValor = false) => {
    if (valor > 0) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <TrendingDown className="w-4 h-4" />
          <span className="font-semibold">-{esValor ? formatCurrency(Math.abs(valor)) : formatNumber(Math.abs(valor))}</span>
        </div>
      );
    } else if (valor < 0) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <TrendingUp className="w-4 h-4" />
          <span className="font-semibold">+{esValor ? formatCurrency(Math.abs(valor)) : formatNumber(Math.abs(valor))}</span>
        </div>
      );
    }
    return <span className="text-gray-600 font-semibold">Sin diferencia</span>;
  };



  if (loading && productores.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <GitCompare className="w-8 h-8 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800">Comparación Pesadas vs Facturas</h2>
            </div>
            {comparacion && (
              <button
                onClick={imprimirComparacion}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Imprimir
              </button>
            )}
          </div>

          {/* Filtros */}
          <div className="bg-blue-50 p-6 rounded-xl mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Selecciona Criterios</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={productorSeleccionado}
                  onChange={(e) => {
                    setProductorSeleccionado(e.target.value);
                    setSeleccionarTodos(false);
                  }}
                  disabled={seleccionarTodos || loading}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                >
                  <option value="">
                    {loading ? 'Cargando...' : productores.length === 0 ? 'No hay productores' : 'Selecciona productor'}
                  </option>
                  {productores.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={factoriaSeleccionada}
                  onChange={(e) => setFactoriaSeleccionada(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm bg-white"
                >
                  <option value="">Todas las Factorías</option>
                  {factorias.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <button
                onClick={() => {
                  setSeleccionarTodos(!seleccionarTodos);
                  if (!seleccionarTodos) {
                    setProductorSeleccionado('');
                  }
                }}
                className={`px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 font-semibold text-sm ${
                  seleccionarTodos
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                Todos
              </button>

              <button
                onClick={compararDatos}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50 font-semibold text-sm"
              >
                {loading ? 'Comparando...' : 'Comparar'}
              </button>
            </div>

            {/* Opciones Adicionales */}
            <div className="mt-4 pt-4 border-t border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-green-700 cursor-pointer bg-green-50 px-4 py-2 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                <input
                  type="checkbox"
                  checked={mostrarSoloGanancias}
                  onChange={(e) => setMostrarSoloGanancias(e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                Mostrar solo ganancias (+ Kilos y + Valor)
              </label>

              {comparacion && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Ordenar por:</span>
                  <select
                    value={ordenamiento}
                    onChange={(e) => setOrdenamiento(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                  >
                    <option value="fecha-desc">1) Fecha (Mayor a Menor)</option>
                    <option value="fecha-asc">2) Fecha (Menor a Mayor)</option>
                    <option value="pesada-asc">3) N° Pesada (Ascendente)</option>
                    <option value="pesada-desc">3) N° Pesada (Descendente)</option>
                    <option value="factura-asc">4) N° Factura (Ascendente)</option>
                    <option value="factura-desc">4) N° Factura (Descendente)</option>
                    <option value="dif-kilo-desc">5) Diferencia Kilo Neto (Mayor a Menor)</option>
                    <option value="dif-porc-desc">6) Diferencia Porcentual (Mayor a Menor)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Resultados */}
          {comparacion && (
            <div className="space-y-6">
              {/* Resumen Comparativo */}
              <div className="bg-gradient-to-r from-green-100 to-blue-100 p-6 rounded-xl">
                <h3 className="font-bold text-gray-800 mb-4 text-lg">Resumen Comparativo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Diferencia en Sacos</p>
                    {renderDiferencia(diferenciasDisplay.sacos)}
                    <div className="mt-2 text-xs text-gray-500">
                      <p>Pesadas: {formatNumber(totalesPesadasDisplay.sacos, 0)}</p>
                      <p>Facturas: {formatNumber(totalesFacturasDisplay.sacos, 0)}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Diferencia en Kilos</p>
                    {renderDiferencia(diferenciasDisplay.kilosNeto)}
                    <div className="mt-2 text-xs text-gray-500">
                      <p>Pesadas: {formatNumber(totalesPesadasDisplay.kilosNeto)}</p>
                      <p>Facturas: {formatNumber(totalesFacturasDisplay.kilosNeto)}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Diferencia en Fanegas</p>
                    {renderDiferencia(diferenciasDisplay.fanegas)}
                    <div className="mt-2 text-xs text-gray-500">
                      <p>Pesadas: {formatNumber(totalesPesadasDisplay.fanegas)}</p>
                      <p>Facturas: {formatNumber(totalesFacturasDisplay.fanegas)}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Diferencia en Valor</p>
                    {renderDiferencia(diferenciasDisplay.valorTotal, true)}
                    <div className="mt-2 text-xs text-gray-500">
                      <p>Pesadas: {formatCurrency(totalesPesadasDisplay.valorTotal)}</p>
                      <p>Facturas: {formatCurrency(totalesFacturasDisplay.valorTotal)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Análisis de Ganancias/Pérdidas */}
              <div className={`p-6 rounded-xl ${diferenciasDisplay.valorTotal >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <h3 className="font-bold text-gray-800 mb-4 text-lg">Análisis Financiero</h3>
                {diferenciasDisplay.valorTotal > 0 ? (
                  <div className="flex items-start gap-3">
                    <TrendingDown className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-red-600 text-xl mb-2">
                        Pérdida: {formatCurrency(Math.abs(diferenciasDisplay.valorTotal))}
                      </p>
                      <p className="text-gray-700">
                        La factoría está pagando menos de lo registrado en las pesadas. Revisa los datos para identificar discrepancias en kilos, humedad o precio por fanega.
                      </p>
                    </div>
                  </div>
                ) : diferenciasDisplay.valorTotal < 0 ? (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-green-600 text-xl mb-2">
                        Ganancia: {formatCurrency(Math.abs(diferenciasDisplay.valorTotal))}
                      </p>
                      <p className="text-gray-700">
                        La factoría está pagando más de lo registrado en las pesadas. Esto puede ser positivo, pero verifica que no haya errores en los registros.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-600 text-xl mb-2">Sin diferencia</p>
                      <p className="text-gray-700">
                        Los valores de pesadas y facturas coinciden perfectamente.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tablas lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pesadas */}
                <div className="bg-green-50 p-4 rounded-xl">
                  <h4 className="font-semibold text-gray-800 mb-4">Pesadas Registradas ({pesadasOrdenadas.length})</h4>
                  <div className="bg-white rounded-lg overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-green-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold">N° Pesada</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold">Fecha</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold">Productor</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold">Sacos</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold">Kg Neto</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {pesadasOrdenadas.map(p => (
                            <tr key={p.id}>
                              <td className="px-3 py-2 text-xs text-gray-600">{p.numero_pesada || '-'}</td>
                              <td className="px-3 py-2 text-xs">{new Date(p.fecha).toLocaleDateString()}</td>
                              <td className="px-3 py-2 text-xs">{p.nombre_productor}</td>
                              <td className="px-3 py-2 text-right text-xs">{p.cantidad_sacos}</td>
                              <td className="px-3 py-2 text-right text-xs">{formatNumber(parseFloat(p.kilos_neto))}</td>
                              <td className="px-3 py-2 text-right text-xs font-semibold text-green-600">
                                {formatCurrency(parseFloat(p.valor_total))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Facturas */}
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h4 className="font-semibold text-gray-800 mb-4">Facturas de Factoría ({comparacion.facturas.length})</h4>
                  <div className="bg-white rounded-lg overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-blue-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold">N° Pesada</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold">Fecha</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold">Cliente</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold">Sacos</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold">Kg Neto</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {facturasOrdenadas.map(f => (
                            <tr key={f.id}>
                              <td className="px-3 py-2 text-xs text-gray-600">{f.numero_pesada || '-'}</td>
                              <td className="px-3 py-2 text-xs">{new Date(f.fecha).toLocaleDateString()}</td>
                              <td className="px-3 py-2 text-xs">{f.cliente}</td>
                              <td className="px-3 py-2 text-right text-xs">{f.cantidad_sacos}</td>
                              <td className="px-3 py-2 text-right text-xs">{formatNumber(parseFloat(f.kilos_neto))}</td>
                              <td className="px-3 py-2 text-right text-xs font-semibold text-blue-600">
                                {formatCurrency(parseFloat(f.valor_pagar))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!comparacion && (
            <div className="text-center py-12">
              <GitCompare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Selecciona un productor y rango de fechas para comparar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
