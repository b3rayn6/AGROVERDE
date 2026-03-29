const formatCurrency = (value, currency = 'DOP') => {
  if (value === null || value === undefined || isNaN(value)) {
    return currency === 'USD' ? 'USD 0.00' : 'RD$ 0.00';
  }
  
  const number = parseFloat(value);
  
  // Formatear el número con comas y decimales
  const formatted = number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  // Retornar con el prefijo de moneda correcto
  return currency === 'USD' ? `USD ${formatted}` : `RD$ ${formatted}`;
};

export const generarPDFFacturaVenta = async (factura, items) => {
  // Verificar que estamos en el navegador
  if (typeof window === 'undefined') {
    console.warn('generarPDFFacturaVenta solo funciona en el navegador');
    return;
  }

  // Importación dinámica de jsPDF
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Logo de Agroverde - Más grande
  const logoUrl = 'https://sensible-spoonbill-485.convex.cloud/api/storage/f2c37282-23ea-45e1-8f03-4f60c1d96017';
  doc.addImage(logoUrl, 'PNG', 14, 8, 70, 35);
  
  // Información de la empresa (derecha)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('AGROVERDE/AGV.SRL', pageWidth - 14, 12, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('RNC: 133-07456-7', pageWidth - 14, 18, { align: 'right' });
  doc.text('C/ DUARTE NO 7 VILLA RIVA RD', pageWidth - 14, 23, { align: 'right' });
  doc.text('Tel: 809-489-9215', pageWidth - 14, 28, { align: 'right' });
  
  // Encabezado
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA DE VENTA', pageWidth / 2, 40, { align: 'center' });
  
  // Información de la factura
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Número: ${factura.numero_factura}`, 14, 50);
  doc.text(`Fecha: ${new Date(factura.fecha).toLocaleDateString()}`, 14, 57);
  doc.text(`Cliente: ${factura.clientes?.nombre || 'N/A'}`, 14, 64);
  doc.text(`Estado: ${factura.estado === 'pagada' ? 'Pagada' : factura.estado === 'parcial' ? 'Parcial' : 'Pendiente'}`, 14, 71);
  
  // Información de divisa
  const currency = factura.divisa || 'DOP';
  doc.text(`Moneda: ${currency === 'USD' ? 'USD (Dólares Estadounidenses)' : 'RD$ (Pesos Dominicanos)'}`, 14, 78);
  if (currency === 'USD' && factura.tasa_cambio) {
    doc.text(`Tasa de Cambio: ${parseFloat(factura.tasa_cambio).toFixed(4)} RD$/USD`, 14, 85);
  }
  
  // Tabla de items
  const startYItems = currency === 'USD' && factura.tasa_cambio ? 92 : 85;
  const tableData = items.map(item => [
    item.mercancias?.nombre || 'N/A',
    item.cantidad.toFixed(2),
    formatCurrency(item.precio_unitario, currency),
    formatCurrency(item.subtotal, currency)
  ]);
  
  doc.autoTable({
    startY: startYItems,
    head: [['Producto', 'Cantidad', 'Precio Unit.', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [34, 197, 94],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    }
  });
  
  // Totales
  let finalY = doc.lastAutoTable.finalY + 10;
  const rightX = pageWidth - 14;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', rightX - 60, finalY);
  doc.text(formatCurrency(factura.subtotal, currency), rightX, finalY, { align: 'right' });
  
  // Mostrar equivalente en la otra moneda si es necesario
  if (currency === 'USD' && factura.tasa_cambio) {
    const subtotalPesos = factura.subtotal * parseFloat(factura.tasa_cambio);
    finalY += 5;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`(RD$ ${subtotalPesos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, rightX, finalY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    finalY += 2;
  }
  
  if (factura.descuento_monto && factura.descuento_monto > 0) {
    finalY += 7;
    doc.setTextColor(34, 197, 94);
    doc.text(`Descuento (${factura.descuento_porcentaje}%):`, rightX - 60, finalY);
    doc.text(`-${formatCurrency(factura.descuento_monto, currency)}`, rightX, finalY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    
    // Mostrar equivalente en la otra moneda si es necesario
    if (currency === 'USD' && factura.tasa_cambio) {
      const descuentoPesos = factura.descuento_monto * parseFloat(factura.tasa_cambio);
      finalY += 5;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`(RD$ ${descuentoPesos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, rightX, finalY, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      finalY += 2;
    }
  }
  
  finalY += 7;
  doc.text('ITBIS (18%):', rightX - 60, finalY);
  doc.text(formatCurrency(factura.itbis, currency), rightX, finalY, { align: 'right' });
  
  // Mostrar equivalente en la otra moneda si es necesario
  if (currency === 'USD' && factura.tasa_cambio) {
    const itbisPesos = factura.itbis * parseFloat(factura.tasa_cambio);
    finalY += 5;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`(RD$ ${itbisPesos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, rightX, finalY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    finalY += 2;
  }
  
  finalY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', rightX - 60, finalY);
  doc.text(formatCurrency(factura.total, currency), rightX, finalY, { align: 'right' });
  
  // Mostrar equivalente en la otra moneda si es necesario
  if (currency === 'USD' && factura.tasa_cambio) {
    const totalPesos = factura.total * parseFloat(factura.tasa_cambio);
    finalY += 5;
    doc.setFontSize(9);
    doc.setTextColor(64, 64, 64);
    doc.setFont('helvetica', 'bold');
    doc.text(`(RD$ ${totalPesos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, rightX, finalY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    finalY += 2;
  }
  
  // Información de pagos
  if (factura.monto_pagado > 0) {
    finalY += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Monto Pagado:', rightX - 60, finalY);
    doc.setTextColor(34, 197, 94);
    doc.text(formatCurrency(factura.monto_pagado, currency), rightX, finalY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    
    // Mostrar equivalente en la otra moneda si es necesario
    if (currency === 'USD' && factura.tasa_cambio) {
      const pagadoPesos = factura.monto_pagado * parseFloat(factura.tasa_cambio);
      finalY += 5;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`(RD$ ${pagadoPesos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, rightX, finalY, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      finalY += 2;
    }
    
    finalY += 7;
    doc.text('Balance Pendiente:', rightX - 60, finalY);
    doc.setTextColor(249, 115, 22);
    doc.text(formatCurrency(factura.balance_pendiente, currency), rightX, finalY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    
    // Mostrar equivalente en la otra moneda si es necesario
    if (currency === 'USD' && factura.tasa_cambio) {
      const pendientePesos = factura.balance_pendiente * parseFloat(factura.tasa_cambio);
      finalY += 5;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`(RD$ ${pendientePesos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, rightX, finalY, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      finalY += 2;
    }
  }
  
  // Notas
  if (factura.notas) {
    finalY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Notas:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(factura.notas, 14, finalY + 7, { maxWidth: pageWidth - 28 });
    finalY += 15;
  } else {
    finalY += 15;
  }
  
  // Sección de firmas
  finalY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  
  // ENTREGADO POR
  doc.text('ENTREGADO POR:', 14, finalY);
  doc.line(14, finalY + 15, 70, finalY + 15);
  
  // DESPACHADO POR
  doc.text('DESPACHADO POR:', 80, finalY);
  doc.line(80, finalY + 15, 136, finalY + 15);
  
  // RECIBIDO POR (con firma si existe)
  doc.text('RECIBIDO POR:', 146, finalY);
  doc.line(146, finalY + 15, pageWidth - 14, finalY + 15);
  
  // Si hay firma digital, agregarla debajo de RECIBIDO POR
  if (factura.firma_cliente) {
    try {
      doc.addImage(factura.firma_cliente, 'PNG', 146, finalY + 2, 50, 12);
    } catch (error) {
      console.error('Error al agregar firma al PDF:', error);
    }
  }
  
  // Pie de página - Fecha de impresión
  const footerY = doc.internal.pageSize.height - 20;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  const fechaImpresion = new Date().toLocaleString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Fecha de impresión: ${fechaImpresion}`, pageWidth / 2, footerY, { align: 'center' });
  
  // Guardar PDF
  doc.save(`Factura_${factura.numero_factura}.pdf`);
};
