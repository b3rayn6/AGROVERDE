// Función para generar PDF de Facturas de Venta
export const generarPDFFacturasVenta = (facturas) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

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

  const totalGeneral = facturas.reduce((sum, f) => sum + parseFloat(f.total || 0), 0);
  const totalCobrado = facturas.reduce((sum, f) => sum + parseFloat(f.monto_pagado || 0), 0);
  const totalPendiente = facturas.reduce((sum, f) => sum + parseFloat(f.balance_pendiente || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Facturas de Venta</title>
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
        .estado {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }
        .estado-pendiente {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .estado-pagada {
          background-color: #dcfce7;
          color: #166534;
        }
        .estado-parcial {
          background-color: #fef3c7;
          color: #92400e;
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
          <h1>📋 Facturas de Venta</h1>
          <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}</strong></p>
          <p>Total de facturas: ${facturas.length}</p>
        </div>
      </div>

      <div class="resumen">
        <div class="resumen-card">
          <h3>Total Facturado</h3>
          <p>${formatCurrency(totalGeneral)}</p>
        </div>
        <div class="resumen-card">
          <h3>Total Cobrado</h3>
          <p>${formatCurrency(totalCobrado)}</p>
        </div>
        <div class="resumen-card">
          <h3>Por Cobrar</h3>
          <p>${formatCurrency(totalPendiente)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Número</th>
            <th>Cliente</th>
            <th>Subtotal</th>
            <th>ITBIS</th>
            <th>Total</th>
            <th>Pagado</th>
            <th>Pendiente</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${facturas.map(factura => {
            const currency = factura.divisa || 'DOP';
            return `
            <tr>
              <td>${new Date(factura.fecha).toLocaleDateString()}</td>
              <td>${factura.numero_factura}</td>
              <td>${factura.clientes?.nombre || factura.cliente_nombre || 'N/A'}</td>
              <td>${formatCurrency(factura.subtotal, currency)}</td>
              <td>${formatCurrency(factura.itbis, currency)}</td>
              <td>${formatCurrency(factura.total, currency)}</td>
              <td>${formatCurrency(factura.monto_pagado || 0, currency)}</td>
              <td>${formatCurrency(factura.balance_pendiente, currency)}</td>
              <td><span class="estado estado-${factura.estado}">${factura.estado}</span></td>
            </tr>
          `}).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

// Función para generar PDF de Ventas Diarias
export const generarPDFVentasDiarias = (ventas) => {
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

  const totalVentas = ventas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
  const totalCobrado = ventas.reduce((sum, v) => sum + parseFloat(v.monto_pagado || 0), 0);
  const porCobrar = ventas.reduce((sum, v) => sum + parseFloat(v.balance_pendiente || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ventas Diarias</title>
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
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #16a34a;
          padding-bottom: 15px;
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
        .tipo {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }
        .tipo-contado {
          background-color: #dcfce7;
          color: #166534;
        }
        .tipo-credito {
          background-color: #dbeafe;
          color: #1e40af;
        }
        .estado {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }
        .estado-pendiente {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .estado-pagada {
          background-color: #dcfce7;
          color: #166534;
        }
        .estado-parcial {
          background-color: #fef3c7;
          color: #92400e;
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
        <h1>🛒 Ventas Diarias</h1>
        <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
        <p>Total de ventas: ${ventas.length}</p>
      </div>

      <div class="resumen">
        <div class="resumen-card">
          <h3>Total Ventas</h3>
          <p>${formatCurrency(totalVentas)}</p>
        </div>
        <div class="resumen-card">
          <h3>Total Cobrado</h3>
          <p>${formatCurrency(totalCobrado)}</p>
        </div>
        <div class="resumen-card">
          <h3>Por Cobrar</h3>
          <p>${formatCurrency(porCobrar)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Número</th>
            <th>Cliente</th>
            <th>Tipo</th>
            <th>Total</th>
            <th>Balance</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${ventas.map(venta => `
            <tr>
              <td>${new Date(venta.fecha).toLocaleDateString()}</td>
              <td>${venta.numero_venta}</td>
              <td>${venta.cliente_nombre}</td>
              <td><span class="tipo tipo-${venta.tipo_venta}">${venta.tipo_venta === 'contado' ? 'Contado' : 'Crédito'}</span></td>
              <td>${formatCurrency(venta.total)}</td>
              <td>${formatCurrency(venta.balance_pendiente)}</td>
              <td><span class="estado estado-${venta.estado}">${venta.estado === 'pagada' ? 'Pagada' : venta.estado === 'parcial' ? 'Parcial' : 'Pendiente'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

// Función para generar PDF de Cuentas por Cobrar - ACTUALIZADA CON MONTO E INTERÉS
export const generarPDFCuentasPorCobrar = (cuentas, totales) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

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
          border-bottom: 3px solid #ea580c;
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
          color: #ea580c;
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
          background-color: #ffedd5;
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
          color: #ea580c;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 9px;
        }
        th {
          background-color: #ea580c;
          color: white;
          padding: 10px 5px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 8px 5px;
          border-bottom: 1px solid #ddd;
        }
        tr:hover {
          background-color: #f9fafb;
        }
        .tipo {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 8px;
          font-weight: bold;
        }
        .tipo-financiamiento {
          background-color: #dcfce7;
          color: #166534;
        }
        .tipo-factura {
          background-color: #dbeafe;
          color: #1e40af;
        }
        .estado {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 8px;
          font-weight: bold;
        }
        .estado-pendiente {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .estado-pagado {
          background-color: #dcfce7;
          color: #166534;
        }
        .estado-parcial {
          background-color: #fef3c7;
          color: #92400e;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          color: #666;
          font-size: 12px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        .text-right {
          text-align: right;
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
          <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}</strong></p>
          <p>Total de cuentas: ${cuentas.length}</p>
        </div>
      </div>

      <div class="resumen">
        <div class="resumen-card">
          <h3>Total por Cobrar</h3>
          <p>${formatCurrency(totales.total)}</p>
        </div>
        <div class="resumen-card">
          <h3>Total Cobrado</h3>
          <p>${formatCurrency(totales.cobrado)}</p>
        </div>
        <div class="resumen-card">
          <h3>Pendiente</h3>
          <p>${formatCurrency(totales.pendiente)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Referencia</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th class="text-right">Monto</th>
            <th class="text-right">Interés</th>
            <th class="text-right">Total</th>
            <th>Vencimiento</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${cuentas.map(cuenta => {
            const currency = cuenta.divisa || 'DOP';
            return `
            <tr>
              <td><span class="tipo tipo-${cuenta.tipo.toLowerCase()}">${cuenta.tipo}</span></td>
              <td>${cuenta.referencia || '-'}</td>
              <td>${new Date(cuenta.fecha_emision).toLocaleDateString()}</td>
              <td>${cuenta.clientes?.nombre || '-'}</td>
              <td class="text-right">${formatCurrency(cuenta.monto_principal || 0, currency)}</td>
              <td class="text-right">${formatCurrency(cuenta.monto_interes || 0, currency)}</td>
              <td class="text-right">${formatCurrency(cuenta.monto_total, currency)}</td>
              <td>${cuenta.fecha_vencimiento ? new Date(cuenta.fecha_vencimiento).toLocaleDateString() : '-'}</td>
              <td><span class="estado estado-${cuenta.estado.toLowerCase()}">${cuenta.estado}</span></td>
            </tr>
          `}).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

// Función para generar HTML de Detalle de Cliente (Facturas y Financiamientos)
export const generarHTMLDetalleCliente = (cliente, facturas, financiamientos) => {
  const formatCurrency = (value, currency = 'DOP') => {
    if (value === null || value === undefined || isNaN(value)) {
      return currency === 'USD' ? '$ 0.00' : 'RD$ 0.00';
    }
    
    const number = parseFloat(value);
    
    // Formatear el número con comas y decimales
    const formatted = number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Retornar con el prefijo de moneda correcto
    return currency === 'USD' ? `$ ${formatted}` : `RD$ ${formatted}`;
  };

  const totalFacturas = facturas.reduce((sum, f) => sum + parseFloat(f.total || 0), 0);
  const totalFacturasPendiente = facturas.reduce((sum, f) => sum + parseFloat(f.balance_pendiente || 0), 0);
  
  const totalFinanciamientos = financiamientos.reduce((sum, f) => sum + parseFloat(f.monto_total || 0), 0);
  const totalFinanciamientosPendiente = financiamientos.reduce((sum, f) => sum + parseFloat(f.balance_pendiente || 0), 0);

  const totalGeneralDeuda = totalFacturasPendiente + totalFinanciamientosPendiente;
  
  const limiteCredito = parseFloat(cliente.limite_credito) || 0;
  const creditoDisponible = limiteCredito - totalGeneralDeuda;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reporte Detallado - ${cliente.nombre}</title>
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
          font-size: 24px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .cliente-info {
          background-color: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #2563eb;
        }
        .cliente-info h2 {
          margin: 0 0 10px 0;
          color: #1e40af;
          font-size: 18px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          font-size: 14px;
        }
        .section-title {
          background-color: #e0f2fe;
          color: #0369a1;
          padding: 10px;
          margin-top: 20px;
          margin-bottom: 10px;
          font-weight: bold;
          border-radius: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 11px;
        }
        th {
          background-color: #f1f5f9;
          color: #475569;
          padding: 8px;
          text-align: left;
          font-weight: bold;
          border-bottom: 2px solid #cbd5e1;
        }
        td {
          padding: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        tr:hover {
          background-color: #f8fafc;
        }
        .text-right {
          text-align: right;
        }
        .total-row {
          background-color: #f1f5f9;
          font-weight: bold;
        }
        .resumen-financiero {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }
        .resumen-card {
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .resumen-card.azul { background-color: #dbeafe; }
        .resumen-card.rojo { background-color: #fee2e2; }
        .resumen-card.verde { background-color: #dcfce7; }
        
        .resumen-card h3 {
          margin: 0 0 5px 0;
          font-size: 12px;
          color: #666;
        }
        .resumen-card p {
          margin: 0;
          font-size: 18px;
          font-weight: bold;
        }
        .resumen-card.azul p { color: #1e40af; }
        .resumen-card.rojo p { color: #991b1b; }
        .resumen-card.verde p { color: #166534; }
        
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
          <h1>📑 Estado de Cuenta Detallado</h1>
          <p>Fecha: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div class="cliente-info">
        <h2>${cliente.nombre}</h2>
        <div class="info-grid">
          <div><strong>Cédula:</strong> ${cliente.cedula || 'N/A'}</div>
          <div><strong>Teléfono:</strong> ${cliente.telefono || 'N/A'}</div>
          <div><strong>Email:</strong> ${cliente.email || 'N/A'}</div>
          <div><strong>Dirección:</strong> ${cliente.direccion || 'N/A'}</div>
        </div>
      </div>
      
      <div class="resumen-financiero">
        <div class="resumen-card azul">
          <h3>Límite de Crédito</h3>
          <p>${formatCurrency(limiteCredito)}</p>
        </div>
        <div class="resumen-card rojo">
          <h3>Total Deuda Pendiente</h3>
          <p>${formatCurrency(totalGeneralDeuda)}</p>
        </div>
        <div class="resumen-card verde">
          <h3>Crédito Disponible</h3>
          <p>${formatCurrency(creditoDisponible)}</p>
        </div>
      </div>

      ${facturas.length > 0 ? `
        <div class="section-title">Facturas de Venta</div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Número</th>
              <th>Estado</th>
              <th class="text-right">Total</th>
              <th class="text-right">Pagado</th>
              <th class="text-right">Pendiente</th>
            </tr>
          </thead>
          <tbody>
            ${facturas.map(f => `
              <tr>
                <td>${new Date(f.fecha).toLocaleDateString()}</td>
                <td>${f.numero_factura}</td>
                <td>${f.estado}</td>
                <td class="text-right">${formatCurrency(f.total, f.divisa)}</td>
                <td class="text-right">${formatCurrency(f.monto_pagado || 0, f.divisa)}</td>
                <td class="text-right"><strong>${formatCurrency(f.balance_pendiente, f.divisa)}</strong></td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3" class="text-right">Subtotal Facturas:</td>
              <td class="text-right">${formatCurrency(totalFacturas)}</td>
              <td class="text-right">${formatCurrency(totalFacturas - totalFacturasPendiente)}</td>
              <td class="text-right">${formatCurrency(totalFacturasPendiente)}</td>
            </tr>
          </tbody>
        </table>
      ` : '<div class="section-title">No hay facturas registradas</div>'}

      ${financiamientos.length > 0 ? `
        <div class="section-title">Financiamientos</div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Referencia</th>
              <th>Estado</th>
              <th class="text-right">Monto Total</th>
              <th class="text-right">Pagado</th>
              <th class="text-right">Pendiente</th>
            </tr>
          </thead>
          <tbody>
            ${financiamientos.map(f => {
              const pagado = (parseFloat(f.monto_total) || 0) - (parseFloat(f.balance_pendiente) || 0);
              return `
              <tr>
                <td>${new Date(f.fecha_prestamo).toLocaleDateString()}</td>
                <td>${f.referencia || '-'}</td>
                <td>${f.estado}</td>
                <td class="text-right">${formatCurrency(f.monto_total, f.divisa)}</td>
                <td class="text-right">${formatCurrency(pagado, f.divisa)}</td>
                <td class="text-right"><strong>${formatCurrency(f.balance_pendiente, f.divisa)}</strong></td>
              </tr>
            `}).join('')}
            <tr class="total-row">
              <td colspan="3" class="text-right">Subtotal Financiamientos:</td>
              <td class="text-right">${formatCurrency(totalFinanciamientos)}</td>
              <td class="text-right">${formatCurrency(totalFinanciamientos - totalFinanciamientosPendiente)}</td>
              <td class="text-right">${formatCurrency(totalFinanciamientosPendiente)}</td>
            </tr>
          </tbody>
        </table>
      ` : '<div class="section-title">No hay financiamientos registrados</div>'}

      <div class="summary-card">
        <h3>TOTAL DEUDA PENDIENTE</h3>
        <p>${formatCurrency(totalGeneralDeuda)}</p>
      </div>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Documento generado el ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
};

// Función para generar PDF Detallado de Cliente (Facturas y Financiamientos)
export const generarPDFDetalleCliente = (cliente, facturas, financiamientos, targetWindow = null) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const html = generarHTMLDetalleCliente(cliente, facturas, financiamientos);

  let ventana = targetWindow;
  
  if (!ventana) {
    try {
      ventana = window.open('', '_blank');
    } catch (e) {
      console.error('Error opening window:', e);
    }
  }
  
  if (!ventana || ventana.closed) {
    alert('No se pudo abrir o se cerró la ventana del reporte. Por favor intente nuevamente.');
    return;
  }

  try {
    // Limpiar el contenido previo (importante si reusamos la ventana o si escribimos "Cargando..." antes)
    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();
    
    // Usar setTimeout para asegurar que el contenido se cargue antes de imprimir
    setTimeout(() => {
      try {
        ventana.print();
      } catch (e) {
        console.error('Error printing:', e);
      }
    }, 500);
  } catch (e) {
    console.error('Error writing to window:', e);
    alert('Error al generar el contenido del reporte: ' + e.message);
  }
};

// Función para generar HTML de Cliente Individual
export const generarHTMLCliente = (cliente) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(value);
  };

  const limiteCredito = parseFloat(cliente.limite_credito) || 0;
  const balancePendiente = parseFloat(cliente.balance_pendiente) || 0;
  const creditoDisponible = limiteCredito - balancePendiente;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Información del Cliente - ${cliente.nombre}</title>
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
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 15px;
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
        .info-section {
          background-color: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .info-section h2 {
          color: #2563eb;
          margin: 0 0 15px 0;
          font-size: 18px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 8px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .info-item label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
          font-weight: bold;
        }
        .info-item value {
          font-size: 14px;
          color: #333;
        }
        .resumen {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        .resumen-card {
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .resumen-card.azul {
          background-color: #dbeafe;
        }
        .resumen-card.rojo {
          background-color: #fee2e2;
        }
        .resumen-card.verde {
          background-color: #dcfce7;
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
        }
        .resumen-card.azul p {
          color: #1e40af;
        }
        .resumen-card.rojo p {
          color: #991b1b;
        }
        .resumen-card.verde p {
          color: #166534;
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
        <h1>👤 Información del Cliente</h1>
        <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
      </div>

      <div class="info-section">
        <h2>Datos Personales</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>Nombre Completo:</label>
            <value>${cliente.nombre}</value>
          </div>
          <div class="info-item">
            <label>Cédula:</label>
            <value>${cliente.cedula || 'No registrada'}</value>
          </div>
          <div class="info-item">
            <label>Teléfono:</label>
            <value>${cliente.telefono || 'No registrado'}</value>
          </div>
          <div class="info-item">
            <label>Email:</label>
            <value>${cliente.email || 'No registrado'}</value>
          </div>
          <div class="info-item" style="grid-column: span 2;">
            <label>Dirección:</label>
            <value>${cliente.direccion || 'No registrada'}</value>
          </div>
        </div>
      </div>

      <div class="info-section">
        <h2>Información Financiera</h2>
        <div class="resumen">
          <div class="resumen-card azul">
            <h3>Límite de Crédito</h3>
            <p>${formatCurrency(limiteCredito)}</p>
          </div>
          <div class="resumen-card rojo">
            <h3>Balance Pendiente</h3>
            <p>${formatCurrency(balancePendiente)}</p>
          </div>
          <div class="resumen-card verde">
            <h3>Crédito Disponible</h3>
            <p>${formatCurrency(creditoDisponible)}</p>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
        <p>Este documento es confidencial y solo debe ser usado para fines internos</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
      </div>
    </body>
    </html>
  `;
};

// Función para generar PDF de Cliente Individual
export const generarPDFCliente = async (cliente) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const html = generarHTMLCliente(cliente);

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

// Función para generar HTML de Todos los Clientes
export const generarHTMLTodosClientes = (clientes, deudasClientes, filtroDeuda) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Calcular totales según filtros
  let totalLimiteCredito = 0;
  let totalDeudaFacturas = 0;
  let totalDeudaFinanciamientos = 0;
  let totalDeuda = 0;
  let totalCreditoDisponible = 0;

  clientes.forEach(cliente => {
    const limiteCredito = parseFloat(cliente.limite_credito) || 0;
    const deudas = deudasClientes[cliente.id] || { facturas: 0, financiamientos: 0, total: 0 };

    let deudaCliente = 0;
    if (filtroDeuda.facturas) {
      deudaCliente += deudas.facturas || 0;
      totalDeudaFacturas += deudas.facturas || 0;
    }
    if (filtroDeuda.financiamientos) {
      deudaCliente += deudas.financiamientos || 0;
      totalDeudaFinanciamientos += deudas.financiamientos || 0;
    }

    totalLimiteCredito += limiteCredito;
    totalDeuda += deudaCliente;
    totalCreditoDisponible += (limiteCredito - deudaCliente);
  });

  // Determinar título según filtros
  let tituloFiltro = '';
  if (filtroDeuda.facturas && filtroDeuda.financiamientos) {
    tituloFiltro = 'Deuda Total (Facturas + Financiamientos)';
  } else if (filtroDeuda.facturas) {
    tituloFiltro = 'Deuda de Facturas';
  } else if (filtroDeuda.financiamientos) {
    tituloFiltro = 'Deuda de Financiamientos';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reporte General de Clientes - ${tituloFiltro}</title>
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
        .header p {
          margin: 5px 0;
          color: #666;
          font-size: 14px;
        }
        .filtro-badge {
          display: inline-block;
          background-color: #dbeafe;
          color: #1e40af;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: bold;
          margin-top: 8px;
        }
        .resumen {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .resumen-card {
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .resumen-card.azul {
          background-color: #dbeafe;
        }
        .resumen-card.naranja {
          background-color: #ffedd5;
        }
        .resumen-card.morado {
          background-color: #f3e8ff;
        }
        .resumen-card.rojo {
          background-color: #fee2e2;
        }
        .resumen-card.verde {
          background-color: #dcfce7;
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
        }
        .resumen-card.azul p { color: #1e40af; }
        .resumen-card.naranja p { color: #ea580c; }
        .resumen-card.morado p { color: #7c3aed; }
        .resumen-card.rojo p { color: #991b1b; }
        .resumen-card.verde p { color: #166534; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 10px;
        }
        th {
          background-color: #2563eb;
          color: white;
          padding: 10px 6px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 8px 6px;
          border-bottom: 1px solid #ddd;
        }
        tr:hover {
          background-color: #f9fafb;
        }
        .text-right {
          text-align: right;
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
          <h1>👥 Reporte General de Clientes</h1>
          <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}</strong></p>
          <p>Total de clientes: ${clientes.length}</p>
          <div class="filtro-badge">${tituloFiltro}</div>
        </div>
      </div>

      <div class="resumen">
        <div class="resumen-card azul">
          <h3>Límite Total de Crédito</h3>
          <p>${formatCurrency(totalLimiteCredito)}</p>
        </div>
        ${filtroDeuda.facturas ? `
        <div class="resumen-card naranja">
          <h3>Deuda Facturas</h3>
          <p>${formatCurrency(totalDeudaFacturas)}</p>
        </div>
        ` : ''}
        ${filtroDeuda.financiamientos ? `
        <div class="resumen-card morado">
          <h3>Deuda Financiamientos</h3>
          <p>${formatCurrency(totalDeudaFinanciamientos)}</p>
        </div>
        ` : ''}
        <div class="resumen-card rojo">
          <h3>Total Deuda</h3>
          <p>${formatCurrency(totalDeuda)}</p>
        </div>
        <div class="resumen-card verde">
          <h3>Crédito Disponible</h3>
          <p>${formatCurrency(totalCreditoDisponible)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Cédula</th>
            <th>Teléfono</th>
            <th class="text-right">Límite Crédito</th>
            ${filtroDeuda.facturas ? '<th class="text-right">Deuda Facturas</th>' : ''}
            ${filtroDeuda.financiamientos ? '<th class="text-right">Deuda Financiamientos</th>' : ''}
            <th class="text-right">Total Deuda</th>
            <th class="text-right">Crédito Disponible</th>
          </tr>
        </thead>
        <tbody>
          ${clientes.map(cliente => {
            const limiteCredito = parseFloat(cliente.limite_credito) || 0;
            const deudas = deudasClientes[cliente.id] || { facturas: 0, financiamientos: 0, total: 0 };

            let deudaCliente = 0;
            if (filtroDeuda.facturas) deudaCliente += deudas.facturas || 0;
            if (filtroDeuda.financiamientos) deudaCliente += deudas.financiamientos || 0;

            const creditoDisponible = limiteCredito - deudaCliente;

            return `
            <tr>
              <td>${cliente.nombre}</td>
              <td>${cliente.cedula || '-'}</td>
              <td>${cliente.telefono || '-'}</td>
              <td class="text-right">${formatCurrency(limiteCredito)}</td>
              ${filtroDeuda.facturas ? `<td class="text-right">${formatCurrency(deudas.facturas || 0)}</td>` : ''}
              ${filtroDeuda.financiamientos ? `<td class="text-right">${formatCurrency(deudas.financiamientos || 0)}</td>` : ''}
              <td class="text-right"><strong>${formatCurrency(deudaCliente)}</strong></td>
              <td class="text-right"><strong>${formatCurrency(creditoDisponible)}</strong></td>
            </tr>
          `}).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
      </div>
    </body>
    </html>
  `;
};

// Función para generar PDF de Todos los Clientes con Filtros de Deuda
export const generarPDFTodosClientes = (clientes, deudasClientes, filtroDeuda) => {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const html = generarHTMLTodosClientes(clientes, deudasClientes, filtroDeuda);

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

export const generarPDFChequesFactoria = (cheques) => {
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

  const totalMonto = cheques.reduce((sum, c) => sum + parseFloat(c.monto || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reporte de Cheques de Factoría</title>
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
          border-bottom: 3px solid #4f46e5; /* indigo-600 */
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
          color: #4f46e5;
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
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        .resumen-card {
          background-color: #e0e7ff; /* indigo-100 */
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
          color: #4f46e5;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 11px;
        }
        th {
          background-color: #4f46e5;
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
          <h1>💵 Reporte de Cheques de Factoría</h1>
          <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>
      </div>

      <div class="resumen">
        <div class="resumen-card">
          <h3>Total de Cheques</h3>
          <p>${cheques.length}</p>
        </div>
        <div class="resumen-card">
          <h3>Monto Total</h3>
          <p>${formatCurrency(totalMonto)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>N° Cheque</th>
            <th>Monto</th>
            <th>Fecha</th>
            <th>Factoría</th>
            <th>Banco</th>
            <th>Estado</th>
            <th>Notas</th>
          </tr>
        </thead>
        <tbody>
          ${cheques.map(c => `
            <tr>
              <td>${c.numero_cheque}</td>
              <td>${formatCurrency(parseFloat(c.monto || 0))}</td>
              <td>${new Date(c.fecha).toLocaleDateString('es-DO')}</td>
              <td>${c.factoria || '-'}</td>
              <td>${c.banco || 'N/A'}</td>
              <td>${c.estado || 'Procesado'}</td>
              <td>${c.notas || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>Sistema de Gestión de Arroz - Reporte generado automáticamente</p>
        <p><strong>Fecha de impresión: ${new Date().toLocaleString('es-ES', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}</strong></p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  ventana.document.write(html);
  ventana.document.close();
  ventana.print();
};

export const generarPDFChoferesAgrupados = (choferesAgrupados, esIndividual = false) => {
  if (typeof window === 'undefined') return;

  const titulo = esIndividual 
    ? `Reporte de Fletes - ${choferesAgrupados[0].nombre}`
    : 'Consolidación de Fletes por Chofer';

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${titulo}</title>
      <style>
        @media print {
          @page { margin: 1.5cm; }
          body { margin: 0; }
          .page-break { page-break-before: always; }
          .no-break { page-break-inside: avoid; }
        }
        body {
          font-family: Arial, sans-serif;
          color: #333;
          font-size: 12px;
          line-height: 1.4;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
          border-bottom: 3px solid #16a34a;
          padding-bottom: 15px;
        }
        .logo img {
          height: 100px;
          width: auto;
          object-fit: contain;
        }
        .header-content {
          flex: 1;
        }
        .header h1 {
          margin: 0 0 5px 0;
          color: #16a34a;
          font-size: 24px;
        }
        .header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 11px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f3f4f6;
          color: #374151;
          font-weight: bold;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .total-row {
          background-color: #e5e7eb;
          font-weight: bold;
        }
        .driver-section {
          margin-bottom: 30px;
        }
        .driver-header {
          background-color: #16a34a;
          color: white;
          padding: 10px;
          margin-bottom: 10px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .driver-header h3 {
          margin: 0;
          font-size: 16px;
        }
        .driver-stats {
          display: flex;
          gap: 20px;
          font-size: 14px;
        }
        .summary-table {
          margin-bottom: 40px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          <img src="https://sensible-spoonbill-485.convex.cloud/api/storage/f2c37282-23ea-45e1-8f03-4f60c1d96017" alt="Agroverde">
        </div>
        <div class="header-content">
          <h1>AGROVERDE</h1>
          <p>${titulo}</p>
          <p>Fecha de emisión: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
  `;

  if (!esIndividual) {
    // Add summary table for all drivers
    const totalGlobal = choferesAgrupados.reduce((sum, c) => sum + c.total, 0);
    const totalFletes = choferesAgrupados.reduce((sum, c) => sum + c.cantidad, 0);
    
    html += `
      <div class="summary-table">
        <h2 style="color: #16a34a; margin-bottom: 10px; font-size: 18px;">Resumen Consolidado</h2>
        <table>
          <thead>
            <tr>
              <th>Chofer</th>
              <th>Placa</th>
              <th class="text-center">Cant. Fletes</th>
              <th class="text-center">Primer Flete</th>
              <th class="text-center">Último Flete</th>
              <th class="text-right">Monto Total</th>
            </tr>
          </thead>
          <tbody>
            ${choferesAgrupados.map(c => `
              <tr>
                <td>${c.nombre}</td>
                <td>${c.placa || '-'}</td>
                <td class="text-center">${c.cantidad}</td>
                <td class="text-center">${c.primerFlete}</td>
                <td class="text-center">${c.ultimoFlete}</td>
                <td class="text-right">$${c.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2" class="text-right">TOTAL GENERAL:</td>
              <td class="text-center">${totalFletes}</td>
              <td colspan="2"></td>
              <td class="text-right">$${totalGlobal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  // Detailed section per driver
  html += `<div>`;
  
  choferesAgrupados.forEach((chofer, index) => {
    // Add page break if it's not individual and not the first driver
    const pageBreakClass = !esIndividual && index > 0 ? 'page-break' : '';
    
    html += `
      <div class="driver-section ${pageBreakClass} no-break">
        <div class="driver-header">
          <h3>${chofer.nombre} ${chofer.placa ? `(${chofer.placa})` : ''}</h3>
          <div class="driver-stats">
            <span><strong>Fletes:</strong> ${chofer.cantidad}</span>
            <span><strong>Total:</strong> $${chofer.total.toFixed(2)}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Productor</th>
              <th>Destino (Lugar / Factoría)</th>
              <th class="text-center">N° Pesada</th>
              <th class="text-center">Sacos</th>
              <th class="text-right">Precio/Flete</th>
              <th class="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${chofer.fletes.map(f => `
              <tr>
                <td>${f.fecha}</td>
                <td>${f.productor || '-'}</td>
                <td>${f.lugar || '-'} ${f.factoria ? ` / ${f.factoria}` : ''}</td>
                <td class="text-center">${f.numero_pesada || '-'}</td>
                <td class="text-center">${f.cantidad_sacos || '-'}</td>
                <td class="text-right">$${parseFloat(f.precio_flete || 0).toFixed(2)}</td>
                <td class="text-right font-semibold text-green-600">$${parseFloat(f.valor_total_flete || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="6" class="text-right">TOTAL ${chofer.nombre}:</td>
              <td class="text-right font-bold text-green-700">$${chofer.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  });

  html += `
      </div>
      <div class="text-center" style="margin-top: 40px; color: #666; font-size: 10px;">
        <p>Documento generado el ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank');
  if (ventana) {
    ventana.document.write(html);
    ventana.document.close();
    
    setTimeout(() => {
      ventana.print();
    }, 500);
  } else {
    alert('Por favor, permita las ventanas emergentes (pop-ups) para ver el reporte.');
  }
};
