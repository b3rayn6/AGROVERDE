import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency } from './formatters';
import { formatearFechaLocal } from './dateUtils';

export const generarPDFReconciliacion = (datos, filtros) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  
  // Título
  doc.setFontSize(18);
  doc.text('Análisis y Reconciliación de Fletes vs Gastos', 14, 22);
  
  // Filtros
  doc.setFontSize(10);
  let filtrosText = [];
  if (filtros.fechaDesde) filtrosText.push(`Desde: ${formatearFechaLocal(filtros.fechaDesde)}`);
  if (filtros.fechaHasta) filtrosText.push(`Hasta: ${formatearFechaLocal(filtros.fechaHasta)}`);
  if (filtros.choferFiltro) filtrosText.push(`Chofer: ${filtros.choferFiltro}`);
  
  if (filtrosText.length > 0) {
    doc.text(`Filtros: ${filtrosText.join(' | ')}`, 14, 30);
  } else {
    doc.text('Filtros: Todos los registros', 14, 30);
  }

  let yPos = 40;

  // 1. Resumen por Chofer
  doc.setFontSize(14);
  doc.text('Resumen por Chofer', 14, yPos);
  yPos += 8;

  const resumenBody = datos.resumenChofer.map(r => [
    r.chofer,
    r.totalFletes.toString(),
    formatCurrency(r.tarifaTotal),
    formatCurrency(r.gastosTotales),
    formatCurrency(r.gananciaNeta),
    `${r.margen.toFixed(1)}%`
  ]);

  doc.autoTable({
    startY: yPos,
    head: [['Chofer', 'Cant. Fletes', 'Tarifa Total', 'Gastos Totales', 'Ganancia Neta', 'Margen']],
    body: resumenBody,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 9 }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // 2. Gastos sin flete asignado (si los hay)
  if (datos.gastosHuerfanos && datos.gastosHuerfanos.length > 0) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(230, 81, 0); // Naranja oscuro
    doc.text(`Gastos sin Flete Asignado (${datos.gastosHuerfanos.length})`, 14, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 8;

    const huerfanosBody = datos.gastosHuerfanos.map(g => [
      formatearFechaLocal(g.fecha),
      g.chofer || 'N/A',
      g.tipo,
      g.descripcion || '',
      formatCurrency(g.monto)
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Fecha', 'Chofer', 'Tipo', 'Descripción', 'Monto']],
      body: huerfanosBody,
      theme: 'grid',
      headStyles: { fillColor: [230, 81, 0], textColor: 255 },
      styles: { fontSize: 9 }
    });

    yPos = doc.lastAutoTable.finalY + 15;
  }

  // 3. Detalle de Fletes
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.text(`Detalle de Fletes (${datos.fletes.length} registros)`, 14, yPos);
  yPos += 8;

  const fletesBody = datos.fletes.map(f => [
    formatearFechaLocal(f.fecha),
    f.lugar,
    f.chofer,
    formatCurrency(f.tarifa),
    formatCurrency(f.totalGastos),
    formatCurrency(f.gananciaNeta),
    `${f.margen.toFixed(1)}%`,
    f.reconciliado ? 'Sí' : 'No'
  ]);

  doc.autoTable({
    startY: yPos,
    head: [['Fecha', 'Destino', 'Chofer', 'Tarifa', 'Gastos', 'Ganancia', 'Margen', 'Reconciliado']],
    body: fletesBody,
    theme: 'grid',
    headStyles: { fillColor: [46, 204, 113], textColor: 255 },
    styles: { fontSize: 8 }
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // 4. Totales Consolidados
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setTextColor(39, 174, 96);
  doc.text('Totales Consolidados', 14, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  // Resumen principal
  doc.autoTable({
    startY: yPos,
    head: [['Total Fletes', 'Total Gastos', 'Ganancia Neta Total', 'Margen Promedio']],
    body: [[
      formatCurrency(datos.totalesGlobales.tarifaTotal),
      formatCurrency(datos.totalesGlobales.totalGastosAmount),
      formatCurrency(datos.totalesGlobales.gananciaNetaTotal),
      `${datos.totalesGlobales.margenPromedio.toFixed(1)}%`
    ]],
    theme: 'grid',
    headStyles: { fillColor: [52, 73, 94], textColor: 255, halign: 'center' },
    bodyStyles: { fontStyle: 'bold', halign: 'center', fontSize: 11 },
    margin: { bottom: 10 }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }

  // Dividimos en dos tablas para el desglose y estadísticas
  const desgloseGastosBody = [
    ['Combustible', formatCurrency(datos.totalesGlobales.gastosPorTipo.Combustible)],
    ['Peaje', formatCurrency(datos.totalesGlobales.gastosPorTipo.Peaje)],
    ['Avance de efectivo', formatCurrency(datos.totalesGlobales.gastosPorTipo['Avance de efectivo'])],
    ['Otros', formatCurrency(datos.totalesGlobales.gastosPorTipo.Otros)]
  ];

  doc.autoTable({
    startY: yPos,
    head: [['Desglose de Gastos', 'Monto']],
    body: desgloseGastosBody,
    theme: 'grid',
    headStyles: { fillColor: [149, 165, 166], textColor: 255 },
    margin: { right: doc.internal.pageSize.width / 2 + 5 }
  });

  const finalYDesglose = doc.lastAutoTable.finalY;

  const statsBody = [
    ['Fletes procesados', datos.totalesGlobales.totalFletes.toString()],
    ['Fletes sin gastos asignados', datos.totalesGlobales.fletesSinGastos.toString()],
    ['Gastos sin flete asignado', datos.totalesGlobales.gastosSinFlete.toString()]
  ];

  doc.autoTable({
    startY: yPos,
    head: [['Estadísticas Adicionales', 'Valor']],
    body: statsBody,
    theme: 'grid',
    headStyles: { fillColor: [149, 165, 166], textColor: 255 },
    margin: { left: doc.internal.pageSize.width / 2 + 5 }
  });

  // Pie de página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, pageHeight - 10);
  }

  doc.save(`Reconciliacion_Fletes_Gastos_${new Date().toISOString().split('T')[0]}.pdf`);
};
