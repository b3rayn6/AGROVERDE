export const generarPDFFletes = (fletes, choferSeleccionado = null) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const titulo = choferSeleccionado 
    ? `Fletes - Chofer: ${choferSeleccionado}` 
    : 'Todos los Fletes';
  
  const fletesAImprimir = choferSeleccionado
    ? fletes.filter(f => f.chofer === choferSeleccionado)
    : fletes;

  const totalGeneral = fletesAImprimir.reduce((sum, f) => sum + parseFloat(f.valor_total_flete || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${titulo}</title>
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
          border-bottom: 3px solid #16a34a;
          padding-bottom: 15px;
        }
        .logo {
          flex-shrink: 0;
        }
        .logo img {
          height: 120px;
          width: auto;
          object-fit: contain;
        }
        .header-content {
          flex: 1;
          text-align: center;
        }
        .header h1 {
          color: #16a34a;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 11px;
        }
        th {
          background-color: #16a34a;
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
          background-color: #dcfce7;
          font-weight: bold;
          font-size: 13px;
        }
        .total-row td {
          padding: 12px 8px;
          border-top: 2px solid #16a34a;
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
          <h1>📦 ${titulo}</h1>
          <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
          <p>Total de registros: ${fletesAImprimir.length}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Productor</th>
            <th>Variedad</th>
            <th>Sacos</th>
            <th>Chofer</th>
            <th>Placa</th>
            <th>Finca</th>
            <th>Factoría</th>
            <th>Precio</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${fletesAImprimir.map(flete => `
            <tr>
              <td>${flete.fecha}</td>
              <td>${flete.productor}</td>
              <td>${flete.variedad}</td>
              <td>${flete.cantidad_sacos}</td>
              <td>${flete.chofer}</td>
              <td>${flete.placa}</td>
              <td>${flete.finca}</td>
              <td>${flete.factoria}</td>
              <td>$${parseFloat(flete.precio_flete || 0).toFixed(2)}</td>
              <td>$${parseFloat(flete.valor_total_flete || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="9" style="text-align: right;">TOTAL GENERAL:</td>
            <td>$${totalGeneral.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

export const generarPDFPagosObreros = (pagos) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const totalGeneral = pagos.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
  const totalSacos = pagos.reduce((sum, p) => sum + parseFloat(p.cantidad_sacos || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Pagos de Obreros</title>
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
          border-bottom: 3px solid #16a34a;
          padding-bottom: 15px;
        }
        .logo {
          flex-shrink: 0;
        }
        .logo img {
          height: 120px;
          width: auto;
          object-fit: contain;
        }
        .header-content {
          flex: 1;
          text-align: center;
        }
        .header h1 {
          color: #16a34a;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 12px;
        }
        th {
          background-color: #16a34a;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #ddd;
        }
        tr:hover {
          background-color: #f9fafb;
        }
        .total-row {
          background-color: #dcfce7;
          font-weight: bold;
          font-size: 14px;
        }
        .total-row td {
          padding: 15px 12px;
          border-top: 2px solid #16a34a;
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
          <h1>👷 Pagos de Obreros</h1>
          <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p>Total de registros: ${pagos.length}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Nombre del Obrero</th>
            <th>Cantidad de Sacos</th>
            <th>Precio por Saco</th>
            <th>Total a Pagar</th>
          </tr>
        </thead>
        <tbody>
          ${pagos.map(pago => `
            <tr>
              <td>${pago.fecha}</td>
              <td>${pago.nombre_obrero}</td>
              <td>${pago.cantidad_sacos}</td>
              <td>${parseFloat(pago.precio_saco || 0).toFixed(2)}</td>
              <td>${parseFloat(pago.total || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="2" style="text-align: right;">TOTALES:</td>
            <td>${totalSacos.toFixed(2)} sacos</td>
            <td></td>
            <td>${totalGeneral.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

export const generatePrestamoPDF = (prestamo, pagos = []) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const totalPagado = parseFloat(prestamo.total_pagar) - parseFloat(prestamo.balance_pendiente);
  const porcentajePagado = ((totalPagado / parseFloat(prestamo.total_pagar)) * 100).toFixed(2);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Préstamo - ${prestamo.nombre_cliente}</title>
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
          border-bottom: 3px solid #16a34a;
          padding-bottom: 15px;
        }
        .logo {
          flex-shrink: 0;
        }
        .logo img {
          height: 120px;
          width: auto;
          object-fit: contain;
        }
        .header-content {
          flex: 1;
          text-align: center;
        }
        .header h1 {
          color: #16a34a;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .info-section {
          background-color: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-label {
          font-weight: bold;
          color: #666;
        }
        .info-value {
          color: #333;
        }
        .resumen {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        .resumen-card {
          background-color: #dcfce7;
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
          color: #16a34a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 12px;
        }
        th {
          background-color: #16a34a;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 10px 12px;
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
          <h1>💰 Detalle de Préstamo</h1>
          <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Cliente:</span>
          <span class="info-value">${prestamo.nombre_cliente}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Cédula:</span>
          <span class="info-value">${prestamo.cedula_cliente}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Monto Total a Pagar:</span>
          <span class="info-value">$${parseFloat(prestamo.total_pagar).toFixed(2)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Estado:</span>
          <span class="info-value">${prestamo.estado}</span>
        </div>
      </div>

      <div class="resumen">
        <div class="resumen-card">
          <h3>Monto Prestado</h3>
          <p>$${parseFloat(prestamo.monto_prestado).toFixed(2)}</p>
        </div>
        <div class="resumen-card">
          <h3>Total Pagado</h3>
          <p>$${totalPagado.toFixed(2)}</p>
        </div>
        <div class="resumen-card">
          <h3>Balance Pendiente</h3>
          <p>$${parseFloat(prestamo.balance_pendiente).toFixed(2)}</p>
        </div>
      </div>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

export const generateVentaPDF = (venta, items = []) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(value);
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Venta ${venta.numero_venta}</title>
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
          border-bottom: 3px solid #16a34a;
          padding-bottom: 15px;
        }
        .logo {
          flex-shrink: 0;
        }
        .logo img {
          height: 120px;
          width: auto;
          object-fit: contain;
        }
        .header-content {
          flex: 1;
          text-align: center;
        }
        .header h1 {
          color: #16a34a;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .info-section {
          background-color: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 12px;
        }
        th {
          background-color: #16a34a;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #ddd;
        }
        tr:hover {
          background-color: #f9fafb;
        }
        .totales {
          margin-top: 20px;
          background-color: #dcfce7;
          padding: 20px;
          border-radius: 8px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        .total-final {
          font-size: 18px;
          font-weight: bold;
          border-top: 2px solid #16a34a;
          padding-top: 10px;
          margin-top: 10px;
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
          <h1>🛒 Factura de Venta</h1>
          <p>Número: ${venta.numero_venta}</p>
          <p>Fecha: ${new Date(venta.fecha).toLocaleDateString()}</p>
        </div>
      </div>

      <div class="info-section">
        <div class="info-row">
          <span><strong>Cliente:</strong></span>
          <span>${venta.cliente_nombre}</span>
        </div>
        <div class="info-row">
          <span><strong>Tipo de Venta:</strong></span>
          <span>${venta.tipo_venta === 'contado' ? 'Contado' : 'Crédito'}</span>
        </div>
      </div>

      <h2 style="margin-top: 30px; color: #16a34a;">Productos</h2>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th style="text-align: center;">Cantidad</th>
            <th style="text-align: right;">Precio Unitario</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.producto_nombre}</td>
              <td style="text-align: center;">${item.cantidad}</td>
              <td style="text-align: right;">${formatCurrency(item.precio_unitario)}</td>
              <td style="text-align: right;">${formatCurrency(item.subtotal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totales">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(venta.subtotal)}</span>
        </div>
        <div class="total-row">
          <span>ITBIS (18%):</span>
          <span>${formatCurrency(venta.itbis)}</span>
        </div>
        <div class="total-row total-final">
          <span>TOTAL:</span>
          <span>${formatCurrency(venta.total)}</span>
        </div>
      </div>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Factura generada automáticamente</p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

export const generarPDFFacturasCompra = (facturas) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(value);
  };

  const totalGeneral = facturas.reduce((sum, f) => sum + parseFloat(f.total || 0), 0);
  const totalPendiente = facturas.reduce((sum, f) => sum + parseFloat(f.balance_pendiente || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Facturas de Compra</title>
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
          border-bottom: 3px solid #16a34a;
          padding-bottom: 15px;
        }
        .logo {
          flex-shrink: 0;
        }
        .logo img {
          height: 120px;
          width: auto;
          object-fit: contain;
        }
        .header-content {
          flex: 1;
          text-align: center;
        }
        .header h1 {
          color: #16a34a;
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
          background-color: #dcfce7;
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
          color: #16a34a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 11px;
        }
        th {
          background-color: #16a34a;
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
          <h1>📋 Facturas de Compra</h1>
          <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
          <p>Total: ${facturas.length} facturas</p>
        </div>
      </div>

      <div class="resumen">
        <div class="resumen-card">
          <h3>Total Comprado</h3>
          <p>${formatCurrency(totalGeneral)}</p>
        </div>
        <div class="resumen-card">
          <h3>Total Pendiente</h3>
          <p>${formatCurrency(totalPendiente)}</p>
        </div>
        <div class="resumen-card">
          <h3>Total Pagado</h3>
          <p>${formatCurrency(totalGeneral - totalPendiente)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Número</th>
            <th>Suplidor</th>
            <th>Total</th>
            <th>Pagado</th>
            <th>Pendiente</th>
          </tr>
        </thead>
        <tbody>
          ${facturas.map(factura => `
            <tr>
              <td>${new Date(factura.fecha).toLocaleDateString()}</td>
              <td>${factura.numero_factura}</td>
              <td>${factura.suplidor_nombre || 'N/A'}</td>
              <td>${formatCurrency(factura.total)}</td>
              <td>${formatCurrency(factura.monto_pagado || 0)}</td>
              <td>${formatCurrency(factura.balance_pendiente)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

export const generarPDFCuentasPorPagar = (facturas) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const formatCurrency = (value, currency = 'DOP') => {
    // Normalizar currency a mayúsculas
    const normalizedCurrency = (currency || 'DOP').toUpperCase();
    
    if (value === null || value === undefined || isNaN(value)) {
      return normalizedCurrency === 'USD' ? '$ 0.00' : 'RD$ 0.00';
    }
    
    const number = parseFloat(value);
    
    // Formatear el número con comas y decimales
    const formatted = number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Retornar con el prefijo de moneda correcto
    return normalizedCurrency === 'USD' ? `$ ${formatted}` : `RD$ ${formatted}`;
  };

  // Calcular totales por divisa (normalizar divisa a mayúsculas)
  const totalPorPagarDOP = facturas
    .filter(f => {
      const divisa = (f.divisa || 'DOP').toUpperCase();
      return divisa === 'DOP';
    })
    .reduce((sum, f) => sum + parseFloat(f.balance_pendiente || 0), 0);
  
  const totalPorPagarUSD = facturas
    .filter(f => {
      const divisa = (f.divisa || 'DOP').toUpperCase();
      return divisa === 'USD';
    })
    .reduce((sum, f) => sum + parseFloat(f.balance_pendiente || 0), 0);
  
  // Debug: verificar divisas
  console.log('=== DEBUG PDF CUENTAS POR PAGAR ===');
  console.log('Total facturas:', facturas.length);
  facturas.forEach((f, index) => {
    console.log(`Factura ${index + 1}:`, {
      numero: f.numero_factura,
      divisa: f.divisa,
      divisaTipo: typeof f.divisa,
      divisaUpperCase: f.divisa ? f.divisa.toUpperCase() : 'NO DEFINIDA',
      total: f.total,
      pendiente: f.balance_pendiente,
      todasLasPropiedades: Object.keys(f)
    });
  });
  console.log('Total DOP:', totalPorPagarDOP);
  console.log('Total USD:', totalPorPagarUSD);
  console.log('===================================');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cuentas por Pagar</title>
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
          border-bottom: 3px solid #dc2626;
          padding-bottom: 15px;
        }
        .logo {
          flex-shrink: 0;
        }
        .logo img {
          height: 120px;
          width: auto;
          object-fit: contain;
        }
        .header-content {
          flex: 1;
          text-align: center;
        }
        .header h1 {
          color: #dc2626;
          margin: 0 0 10px 0;
          font-size: 28px;
        }
        .resumen-general {
          background-color: #fee2e2;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          text-align: center;
        }
        .resumen-general h2 {
          margin: 0 0 10px 0;
          color: #991b1b;
        }
        .resumen-general p {
          margin: 0;
          font-size: 32px;
          font-weight: bold;
          color: #dc2626;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 11px;
        }
        th {
          background-color: #dc2626;
          color: white;
          padding: 10px 8px;
          font-weight: bold;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #ddd;
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
          <h1>💳 Cuentas por Pagar</h1>
          <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
        </div>
      </div>

      <div class="resumen-general">
        <h2>TOTAL POR PAGAR</h2>
        ${totalPorPagarDOP > 0 ? `<p style="margin-bottom: 10px;">${formatCurrency(totalPorPagarDOP, 'DOP')}</p>` : ''}
        ${totalPorPagarUSD > 0 ? `<p>${formatCurrency(totalPorPagarUSD, 'USD')}</p>` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Suplidor</th>
            <th>Referencia</th>
            <th>Divisa</th>
            <th>Monto</th>
            <th>Pagado</th>
            <th>Pendiente</th>
          </tr>
        </thead>
        <tbody>
          ${facturas.map(f => {
            // Normalizar divisa a mayúsculas para asegurar consistencia
            const divisaOriginal = f.divisa;
            const divisa = (f.divisa || 'DOP').toUpperCase();
            const suplidorNombre = f.suplidor_nombre || f.suplidores?.nombre || 'N/A';
            
            // Debug individual por factura
            console.log(`Factura ${f.numero_factura}: divisaOriginal="${divisaOriginal}", divisaNormalizada="${divisa}", total=${f.total}, pendiente=${f.balance_pendiente}`);
            
            return `
            <tr>
              <td>${new Date(f.fecha).toLocaleDateString()}</td>
              <td>${suplidorNombre}</td>
              <td>${f.numero_factura}</td>
              <td>${divisa}</td>
              <td>${formatCurrency(f.total, divisa)}</td>
              <td>${formatCurrency(f.monto_pagado || 0, divisa)}</td>
              <td style="color: #dc2626; font-weight: bold;">${formatCurrency(f.balance_pendiente, divisa)}</td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

export const generarPDFCuentasPorCobrar = (ventas) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(value);
  };

  const totalPorCobrar = ventas.reduce((sum, v) => sum + parseFloat(v.balance_pendiente || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cuentas por Cobrar</title>
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
          height: 120px;
          width: auto;
          object-fit: contain;
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
        .resumen-general {
          background-color: #dbeafe;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          text-align: center;
        }
        .resumen-general h2 {
          margin: 0 0 10px 0;
          color: #1e40af;
        }
        .resumen-general p {
          margin: 0;
          font-size: 32px;
          font-weight: bold;
          color: #2563eb;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 11px;
        }
        th {
          background-color: #2563eb;
          color: white;
          padding: 10px 8px;
          font-weight: bold;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #ddd;
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
          <h1>💰 Cuentas por Cobrar</h1>
          <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
        </div>
      </div>

      <div class="resumen-general">
        <h2>TOTAL POR COBRAR</h2>
        <p>${formatCurrency(totalPorCobrar)}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Referencia</th>
            <th>Monto</th>
            <th>Pagado</th>
            <th>Pendiente</th>
          </tr>
        </thead>
        <tbody>
          ${ventas.map(v => `
            <tr>
              <td>${new Date(v.fecha).toLocaleDateString()}</td>
              <td>${v.cliente_nombre || 'N/A'}</td>
              <td>${v.numero_venta}</td>
              <td>${formatCurrency(v.total)}</td>
              <td>${formatCurrency(v.monto_pagado || 0)}</td>
              <td style="color: #2563eb; font-weight: bold;">${formatCurrency(v.balance_pendiente)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

export const generarPDFInventario = (productos) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(value);
  };

  const valorTotal = productos.reduce((sum, p) => sum + (parseFloat(p.cantidad || 0) * parseFloat(p.precio_venta || 0)), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Inventario</title>
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
          height: 120px;
          width: auto;
          object-fit: contain;
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
        .resumen {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        .resumen-card {
          background-color: #ede9fe;
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
          color: #7c3aed;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 11px;
        }
        th {
          background-color: #7c3aed;
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
          <h1>📦 Inventario</h1>
          <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
        </div>
      </div>

      <div class="resumen">
        <div class="resumen-card">
          <h3>Total Productos</h3>
          <p>${productos.length}</p>
        </div>
        <div class="resumen-card">
          <h3>Total Unidades</h3>
          <p>${productos.reduce((sum, p) => sum + parseFloat(p.cantidad || 0), 0).toFixed(0)}</p>
        </div>
        <div class="resumen-card">
          <h3>Valor Total</h3>
          <p>${formatCurrency(valorTotal)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Cantidad</th>
            <th>Precio Venta</th>
            <th>Valor Stock</th>
          </tr>
        </thead>
        <tbody>
          ${productos.map(p => `
            <tr>
              <td>${p.codigo}</td>
              <td>${p.nombre}</td>
              <td>${p.cantidad}</td>
              <td>${formatCurrency(p.precio_venta)}</td>
              <td>${formatCurrency(parseFloat(p.cantidad) * parseFloat(p.precio_venta))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};
