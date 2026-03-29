import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, Filter, Download, Calendar, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/formatters';

export default function LibroDiario() {
  const [asientos, setAsientos] = useState([]);
  const [filteredAsientos, setFilteredAsientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [moduloFiltro, setModuloFiltro] = useState('');
  const [cuentaFiltro, setCuentaFiltro] = useState('');
  const [vistaActual, setVistaActual] = useState('diario'); // 'diario' o 'mayor'
  const [cuentas, setCuentas] = useState([]);

  useEffect(() => {
    cargarAsientos();
    cargarCuentas();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [asientos, fechaInicio, fechaFin, moduloFiltro, cuentaFiltro]);

  async function cargarAsientos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('libro_diario')
        .select('*')
        .order('fecha', { ascending: false })
        .order('numero_asiento', { ascending: false })
        .order('id', { ascending: false });

      if (error) throw error;
      setAsientos(data || []);
    } catch (error) {
      console.error('Error al cargar asientos:', error);
      alert('Error al cargar el libro diario');
    } finally {
      setLoading(false);
    }
  }

  async function cargarCuentas() {
    try {
      const { data, error } = await supabase
        .from('catalogo_cuentas')
        .select('*')
        .order('codigo', { ascending: true });

      if (error) throw error;
      setCuentas(data || []);
    } catch (error) {
      console.error('Error al cargar cuentas:', error);
    }
  }

  function aplicarFiltros() {
    let filtered = [...asientos];

    if (fechaInicio) {
      filtered = filtered.filter(a => a.fecha >= fechaInicio);
    }

    if (fechaFin) {
      filtered = filtered.filter(a => a.fecha <= fechaFin);
    }

    if (moduloFiltro) {
      filtered = filtered.filter(a => a.modulo_origen === moduloFiltro);
    }

    if (cuentaFiltro) {
      filtered = filtered.filter(a => 
        a.cuenta_codigo.toLowerCase().includes(cuentaFiltro.toLowerCase()) ||
        a.cuenta_nombre.toLowerCase().includes(cuentaFiltro.toLowerCase())
      );
    }

    setFilteredAsientos(filtered);
  }

  function limpiarFiltros() {
    setFechaInicio('');
    setFechaFin('');
    setModuloFiltro('');
    setCuentaFiltro('');
  }

  function calcularTotales() {
    const totalDebe = filteredAsientos.reduce((sum, a) => sum + parseFloat(a.debe || 0), 0);
    const totalHaber = filteredAsientos.reduce((sum, a) => sum + parseFloat(a.haber || 0), 0);
    const diferencia = totalDebe - totalHaber;
    
    return { totalDebe, totalHaber, diferencia };
  }

  function agruparPorAsiento() {
    const grupos = {};
    filteredAsientos.forEach(asiento => {
      if (!grupos[asiento.numero_asiento]) {
        grupos[asiento.numero_asiento] = [];
      }
      grupos[asiento.numero_asiento].push(asiento);
    });
    return Object.values(grupos);
  }

  function generarLibroMayor() {
    const mayor = {};
    
    // Inicializar con todas las cuentas del catálogo
    cuentas.forEach(cuenta => {
      mayor[cuenta.codigo] = {
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        saldo_inicial: parseFloat(cuenta.saldo_inicial || 0),
        movimientos: [],
        total_debe: 0,
        total_haber: 0,
        saldo_final: parseFloat(cuenta.saldo_inicial || 0)
      };
    });

    // Agregar movimientos filtrados
    filteredAsientos.forEach(asiento => {
      const codigo = asiento.cuenta_codigo;
      if (mayor[codigo]) {
        mayor[codigo].movimientos.push(asiento);
        mayor[codigo].total_debe += parseFloat(asiento.debe || 0);
        mayor[codigo].total_haber += parseFloat(asiento.haber || 0);
      }
    });

    // Calcular saldos finales según el tipo de cuenta
    Object.keys(mayor).forEach(codigo => {
      const cuenta = mayor[codigo];
      const tipo = cuenta.tipo;
      
      if (tipo === 'Activo' || tipo === 'Gasto') {
        // Para activos y gastos: saldo aumenta con débitos, disminuye con créditos
        cuenta.saldo_final = cuenta.saldo_inicial + cuenta.total_debe - cuenta.total_haber;
      } else if (tipo === 'Pasivo' || tipo === 'Capital' || tipo === 'Ingreso') {
        // Para pasivos, capital e ingresos: saldo aumenta con créditos, disminuye con débitos
        cuenta.saldo_final = cuenta.saldo_inicial + cuenta.total_haber - cuenta.total_debe;
      }
    });

    // Filtrar solo cuentas con movimientos o saldo
    return Object.values(mayor).filter(c => 
      c.movimientos.length > 0 || c.saldo_inicial !== 0 || c.saldo_final !== 0
    );
  }

  function exportarExcel() {
    if (typeof window === 'undefined') {
      console.warn('Excel export is only supported in browser environment.');
      return;
    }

    if (vistaActual === 'diario') {
      exportarDiarioExcel();
    } else {
      exportarMayorExcel();
    }
  }

  function exportarDiarioExcel() {
    const totales = calcularTotales();
    let csv = 'Fecha,Número de Asiento,Cuenta,Código,Descripción,Debe,Haber,Referencia,Módulo\n';
    
    filteredAsientos.forEach(asiento => {
      csv += `${formatDate(asiento.fecha)},${asiento.numero_asiento},"${asiento.cuenta_nombre}",${asiento.cuenta_codigo},"${asiento.descripcion}",${asiento.debe},${asiento.haber},"${asiento.referencia || ''}",${asiento.modulo_origen}\n`;
    });

    csv += `\n,,,TOTALES,Total Debe:,${totales.totalDebe},Total Haber:,${totales.totalHaber}\n`;
    csv += `,,,DIFERENCIA,,${Math.abs(totales.diferencia)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `libro_diario_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  function exportarMayorExcel() {
    const mayor = generarLibroMayor();
    let csv = 'Código,Cuenta,Tipo,Saldo Inicial,Total Débitos,Total Créditos,Saldo Final\n';
    
    mayor.forEach(cuenta => {
      csv += `${cuenta.codigo},"${cuenta.nombre}",${cuenta.tipo},${cuenta.saldo_inicial},${cuenta.total_debe},${cuenta.total_haber},${cuenta.saldo_final}\n`;
    });

    csv += '\n\nDETALLE DE MOVIMIENTOS POR CUENTA\n\n';
    
    mayor.forEach(cuenta => {
      if (cuenta.movimientos.length > 0) {
        csv += `\nCuenta: ${cuenta.codigo} - ${cuenta.nombre}\n`;
        csv += 'Fecha,Asiento,Descripción,Módulo,Debe,Haber\n';
        cuenta.movimientos.forEach(mov => {
          csv += `${formatDate(mov.fecha)},${mov.numero_asiento},"${mov.descripcion}",${mov.modulo_origen},${mov.debe},${mov.haber}\n`;
        });
        csv += `Totales:,,,${cuenta.total_debe},${cuenta.total_haber}\n`;
        csv += `Saldo Final:,,,,${cuenta.saldo_final}\n\n`;
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `libro_mayor_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  function generarPDFDiario() {
    if (typeof window === 'undefined') {
      console.warn('PDF generation is only supported in browser environment.');
      return;
    }

    const totales = calcularTotales();
    const grupos = agruparPorAsiento();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Libro Diario</title>
        <style>
          @media print {
            @page { margin: 1cm; }
            body { margin: 0; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 30px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 15px;
          }
          .logo {
            flex-shrink: 0;
          }
          .logo img {
            height: 80px;
            width: auto;
          }
          .header-content {
            flex: 1;
            text-align: center;
          }
          .header h1 {
            color: #2563eb;
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
          }
          .resumen {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 20px 0;
          }
          .resumen-card {
            background-color: #dbeafe;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
          }
          .resumen-card h3 {
            margin: 0 0 5px 0;
            font-size: 12px;
            color: #666;
          }
          .resumen-card p {
            margin: 0;
            font-size: 20px;
            font-weight: bold;
            color: #2563eb;
          }
          .asiento {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .asiento-header {
            background-color: #f3f4f6;
            padding: 10px 15px;
            border-left: 4px solid #2563eb;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .asiento-header .info {
            display: flex;
            gap: 20px;
          }
          .asiento-header .badge {
            background-color: #2563eb;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
          }
          table {
            width: 100%:
            border-collapse: collapse;
            font-size: 11px;
          }
          th {
            background-color: #2563eb;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
          }
          tr:hover {
            background-color: #f9fafb;
          }
          .total-row {
            background-color: #dbeafe;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <img src="https://sensible-spoonbill-485.convex.cloud/api/storage/f2c37282-23ea-45e1-8f03-4f60c1d96017" alt="Agroverde">
          </div>
          <div class="header-content">
            <h1>📚 Libro Diario</h1>
            <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p>Período: ${fechaInicio || 'Desde el inicio'} - ${fechaFin || 'Hasta la fecha'}</p>
            <p>Total de asientos: ${grupos.length}</p>
          </div>
        </div>

        <div class="resumen">
          <div class="resumen-card">
            <h3>Total Debe</h3>
            <p>${formatCurrency(totales.totalDebe)}</p>
          </div>
          <div class="resumen-card">
            <h3>Total Haber</h3>
            <p>${formatCurrency(totales.totalHaber)}</p>
          </div>
          <div class="resumen-card">
            <h3>Diferencia</h3>
            <p>${formatCurrency(Math.abs(totales.diferencia))}</p>
          </div>
        </div>

        ${grupos.map(grupo => {
          const primera = grupo[0];
          const totalDebe = grupo.reduce((sum, a) => sum + parseFloat(a.debe || 0), 0);
          const totalHaber = grupo.reduce((sum, a) => sum + parseFloat(a.haber || 0), 0);
          const balanceado = Math.abs(totalDebe - totalHaber) < 0.01;

          return `
            <div class="asiento">
              <div class="asiento-header">
                <div class="info">
                  <strong>Asiento: ${primera.numero_asiento}</strong>
                  <span>Fecha: ${formatDate(primera.fecha)}</span>
                  <span class="badge">${primera.modulo_origen}</span>
                </div>
                <span style="color: ${balanceado ? '#16a34a' : '#dc2626'};">
                  ${balanceado ? '✓ Balanceado' : '⚠ Desbalanceado'}
                </span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cuenta</th>
                    <th>Descripción</th>
                    <th style="text-align: right;">Debe</th>
                    <th style="text-align: right;">Haber</th>
                  </tr>
                </thead>
                <tbody>
                  ${grupo.map(asiento => `
                    <tr>
                      <td>${asiento.cuenta_codigo}</td>
                      <td>${asiento.cuenta_nombre}</td>
                      <td>${asiento.descripcion}</td>
                      <td style="text-align: right; color: #2563eb; font-weight: bold;">
                        ${asiento.debe > 0 ? formatCurrency(asiento.debe) : '-'}
                      </td>
                      <td style="text-align: right; color: #16a34a; font-weight: bold;">
                        ${asiento.haber > 0 ? formatCurrency(asiento.haber) : '-'}
                      </td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td colspan="3"><strong>TOTALES</strong></td>
                    <td style="text-align: right;"><strong>${formatCurrency(totalDebe)}</strong></td>
                    <td style="text-align: right;"><strong>${formatCurrency(totalHaber)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;
        }).join('')}

        <div class="footer">
          <p>Sistema de Gestión de Arroz - Reporte Contable generado automáticamente</p>
          <p>Agroverde - RNC: 132041329 - Tel: (809) 803-7200 - La Vega, República Dominicana</p>
        </div>
      </body>
      </html>
    `;

    const ventana = window.open('', '_blank');
    ventana.document.write(html);
    ventana.document.close();
    ventana.print();
  }

  function generarPDFMayor() {
    if (typeof window === 'undefined') {
      console.warn('PDF generation is only supported in browser environment.');
      return;
    }

    const mayor = generarLibroMayor();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Libro Mayor</title>
        <style>
          @media print {
            @page { margin: 1cm; }
            body { margin: 0; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 30px;
            border-bottom: 3px solid #7c3aed;
            padding-bottom: 15px;
          }
          .logo {
            flex-shrink: 0;
          }
          .logo img {
            height: 80px;
            width: auto;
          }
          .header-content {
            flex: 1;
            text-align: center;
          }
          .header h1 {
            color: #7c3aed;
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
          }
          .cuenta {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          .cuenta-header {
            background: linear-gradient(to right, #ede9fe, #ddd6fe);
            padding: 15px;
            border-left: 4px solid #7c3aed;
            margin-bottom: 10px;
          }
          .cuenta-header h2 {
            margin: 0 0 5px 0;
            color: #111827;
            font-size: 16px;
          }
          .cuenta-header .tipo {
            background-color: #7c3aed;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            display: inline-block;
          }
          .resumen-cuenta {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin: 10px 0;
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
          }
          .resumen-item {
            text-align: center;
          }
          .resumen-item h4 {
            margin: 0 0 5px 0;
            font-size: 11px;
            color: #666;
          }
          .resumen-item p {
            margin: 0;
            font-size: 16px;
            font-weight: bold;
            color: #7c3aed;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 10px;
          }
          th {
            background-color: #7c3aed;
            color: white;
            padding: 8px 6px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 6px;
            border-bottom: 1px solid #ddd;
          }
          tr:hover {
            background-color: #f9fafb;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <img src="https://sensible-spoonbill-485.convex.cloud/api/storage/f2c37282-23ea-45e1-8f03-4f60c1d96017" alt="Agroverde">
          </div>
          <div class="header-content">
            <h1>📊 Libro Mayor</h1>
            <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p>Período: ${fechaInicio || 'Desde el inicio'} - ${fechaFin || 'Hasta la fecha'}</p>
            <p>Total de cuentas con movimientos: ${mayor.length}</p>
          </div>
        </div>

        ${mayor.map(cuenta => `
          <div class="cuenta">
            <div class="cuenta-header">
              <h2>${cuenta.codigo} - ${cuenta.nombre}</h2>
              <span class="tipo">${cuenta.tipo}</span>
            </div>

            <div class="resumen-cuenta">
              <div class="resumen-item">
                <h4>Saldo Inicial</h4>
                <p>${formatCurrency(cuenta.saldo_inicial)}</p>
              </div>
              <div class="resumen-item">
                <h4>Total Débitos</h4>
                <p style="color: #2563eb;">${formatCurrency(cuenta.total_debe)}</p>
              </div>
              <div class="resumen-item">
                <h4>Total Créditos</h4>
                <p style="color: #16a34a;">${formatCurrency(cuenta.total_haber)}</p>
              </div>
              <div class="resumen-item">
                <h4>Saldo Final</h4>
                <p style="color: ${cuenta.saldo_final >= 0 ? '#111827' : '#dc2626'};">
                  ${formatCurrency(Math.abs(cuenta.saldo_final))}
                </p>
              </div>
            </div>

            ${cuenta.movimientos.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Asiento</th>
                    <th>Descripción</th>
                    <th>Módulo</th>
                    <th style="text-align: right;">Debe</th>
                    <th style="text-align: right;">Haber</th>
                  </tr>
                </thead>
                <tbody>
                  ${cuenta.movimientos.map(mov => `
                    <tr>
                      <td>${formatDate(mov.fecha)}</td>
                      <td>${mov.numero_asiento}</td>
                      <td>${mov.descripcion}</td>
                      <td><span style="background-color: #dbeafe; padding: 2px 8px; border-radius: 8px; font-size: 9px;">${mov.modulo_origen}</span></td>
                      <td style="text-align: right; color: #2563eb;">${mov.debe > 0 ? formatCurrency(mov.debe) : '-'}</td>
                      <td style="text-align: right; color: #16a34a;">${mov.haber > 0 ? formatCurrency(mov.haber) : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>
        `).join('')}

        <div class="footer">
          <p>Sistema de Gestión de Arroz - Reporte Contable generado automáticamente</p>
          <p>Agroverde - RNC: 132041329 - Tel: (809) 803-7200 - La Vega, República Dominicana</p>
        </div>
      </body>
      </html>
    `;

    const ventana = window.open('', '_blank');
    ventana.document.write(html);
    ventana.document.close();
    ventana.print();
  }

  const totales = calcularTotales();
  const gruposAsientos = agruparPorAsiento();
  const libroMayor = generarLibroMayor();
  const modulos = [...new Set(asientos.map(a => a.modulo_origen))].filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando libro diario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {vistaActual === 'diario' ? 'Libro Diario' : 'Libro Mayor'}
                </h1>
                <p className="text-sm text-gray-500">
                  {vistaActual === 'diario' 
                    ? 'Registro contable automático de todas las transacciones' 
                    : 'Resumen por cuenta contable para cierre mensual'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={vistaActual === 'diario' ? generarPDFDiario : generarPDFMayor}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Download className="w-5 h-5" />
                Exportar PDF
              </button>
              <button
                onClick={exportarExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-5 h-5" />
                Exportar Excel
              </button>
            </div>
          </div>

          {/* Pestañas */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setVistaActual('diario')}
              className={`px-4 py-2 font-medium transition-colors ${
                vistaActual === 'diario'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Libro Diario
            </button>
            <button
              onClick={() => setVistaActual('mayor')}
              className={`px-4 py-2 font-medium transition-colors ${
                vistaActual === 'mayor'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Libro Mayor
            </button>
          </div>
        </div>

        {/* Resumen de Totales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Debe</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totales.totalDebe)}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Haber</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totales.totalHaber)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingDown className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Diferencia</p>
                <p className={`text-2xl font-bold ${totales.diferencia === 0 ? 'text-gray-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(totales.diferencia))}
                </p>
                {totales.diferencia === 0 && (
                  <p className="text-xs text-green-600 mt-1">✓ Balance correcto</p>
                )}
              </div>
              <div className={`${totales.diferencia === 0 ? 'bg-gray-100' : 'bg-red-100'} p-3 rounded-lg`}>
                <DollarSign className={`w-8 h-8 ${totales.diferencia === 0 ? 'text-gray-600' : 'text-red-600'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Módulo</label>
              <select
                value={moduloFiltro}
                onChange={(e) => setModuloFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {modulos.map(modulo => (
                  <option key={modulo} value={modulo}>{modulo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta</label>
              <input
                type="text"
                value={cuentaFiltro}
                onChange={(e) => setCuentaFiltro(e.target.value)}
                placeholder="Buscar cuenta..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={limpiarFiltros}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Limpiar Filtros
          </button>
        </div>

        {/* Tabla de Asientos Agrupados o Libro Mayor */}
        {vistaActual === 'diario' ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              {gruposAsientos.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay asientos contables registrados</p>
                </div>
              ) : (
                <div className="space-y-6 p-6">
                  {gruposAsientos.map((grupo, index) => {
                    const primeraEntrada = grupo[0];
                    const totalDebeGrupo = grupo.reduce((sum, a) => sum + parseFloat(a.debe || 0), 0);
                    const totalHaberGrupo = grupo.reduce((sum, a) => sum + parseFloat(a.haber || 0), 0);
                    const balanceado = Math.abs(totalDebeGrupo - totalHaberGrupo) < 0.01;

                    return (
                      <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Header del Asiento */}
                        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-semibold text-gray-700">
                                Asiento: {primeraEntrada.numero_asiento}
                              </span>
                              <span className="text-sm text-gray-600">
                                Fecha: {formatDate(primeraEntrada.fecha)}
                              </span>
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                {primeraEntrada.modulo_origen}
                              </span>
                            </div>
                            {balanceado ? (
                              <span className="text-xs text-green-600 font-medium">✓ Balanceado</span>
                            ) : (
                              <span className="text-xs text-red-600 font-medium">⚠ Desbalanceado</span>
                            )}
                          </div>
                        </div>

                        {/* Detalles del Asiento */}
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuenta</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debe</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Haber</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {grupo.map((asiento) => (
                                <tr key={asiento.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{asiento.cuenta_codigo}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{asiento.cuenta_nombre}</td>
                                  <td className="px-4 py-3 text-sm text-gray-600">{asiento.descripcion}</td>
                                  <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">
                                    {asiento.debe > 0 ? formatCurrency(asiento.debe) : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                                    {asiento.haber > 0 ? formatCurrency(asiento.haber) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                              <tr>
                                <td colSpan="3" className="px-4 py-3 text-sm font-bold text-gray-700">TOTALES</td>
                                <td className="px-4 py-3 text-sm text-right font-bold text-blue-700">
                                  {formatCurrency(totalDebeGrupo)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-bold text-green-700">
                                  {formatCurrency(totalHaberGrupo)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              {libroMayor.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay cuentas con movimientos</p>
                </div>
              ) : (
                <div className="space-y-6 p-6">
                  {libroMayor.map((cuenta) => (
                    <div key={cuenta.codigo} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Header de la Cuenta */}
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-gray-800">
                              {cuenta.codigo} - {cuenta.nombre}
                            </span>
                            <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded">
                              {cuenta.tipo}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-600">Saldo Inicial</p>
                            <p className="text-sm font-bold text-gray-800">{formatCurrency(cuenta.saldo_inicial)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Resumen de Movimientos */}
                      <div className="bg-gray-50 px-4 py-3 grid grid-cols-3 gap-4 border-b border-gray-200">
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Total Débitos</p>
                          <p className="text-lg font-bold text-blue-600">{formatCurrency(cuenta.total_debe)}</p>
                          <p className="text-xs text-gray-500">{cuenta.movimientos.filter(m => m.debe > 0).length} movimientos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Total Créditos</p>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(cuenta.total_haber)}</p>
                          <p className="text-xs text-gray-500">{cuenta.movimientos.filter(m => m.haber > 0).length} movimientos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Saldo Final</p>
                          <p className={`text-lg font-bold ${cuenta.saldo_final >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(cuenta.saldo_final))}
                          </p>
                          <p className="text-xs text-gray-500">
                            {cuenta.saldo_final >= 0 ? 'Normal' : 'Deudor'}
                          </p>
                        </div>
                      </div>

                      {/* Tabla de Movimientos */}
                      {cuenta.movimientos.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Asiento</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Módulo</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Debe</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Haber</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {cuenta.movimientos.map((mov, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-xs text-gray-700">{formatDate(mov.fecha)}</td>
                                  <td className="px-4 py-2 text-xs text-gray-700">{mov.numero_asiento}</td>
                                  <td className="px-4 py-2 text-xs text-gray-600">{mov.descripcion}</td>
                                  <td className="px-4 py-2">
                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                      {mov.modulo_origen}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-xs text-right text-blue-600">
                                    {mov.debe > 0 ? formatCurrency(mov.debe) : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-xs text-right text-green-600">
                                    {mov.haber > 0 ? formatCurrency(mov.haber) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}