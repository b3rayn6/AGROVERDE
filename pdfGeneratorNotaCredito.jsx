export function generarPDFNotaCredito(notaCredito, cliente) {
  if (typeof window === 'undefined') {
    console.warn('PDF generation is only supported in browser environment.');
    return;
  }

  const ventana = window.open('', '_blank');
  
  if (!ventana) {
    alert('Por favor, habilita las ventanas emergentes para generar el PDF');
    return;
  }

  const estado = notaCredito.estado || 'Activa';
  const colorEstado = estado === 'Activa' ? '#10b981' : '#6b7280';
  
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nota de Crédito - ${notaCredito.codigo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 40px;
          background: #f9fafb;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #10b981;
        }
        .logo-section {
          flex: 1;
        }
        .logo {
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
        }
        .logo-text {
          color: white;
          font-size: 28px;
          font-weight: bold;
          text-align: center;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 5px;
        }
        .company-info {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.6;
        }
        .doc-section {
          text-align: right;
        }
        .doc-title {
          font-size: 32px;
          font-weight: bold;
          color: #10b981;
          margin-bottom: 10px;
        }
        .doc-code {
          font-size: 18px;
          color: #1f2937;
          font-weight: 600;
          margin-bottom: 5px;
        }
        .doc-date {
          font-size: 14px;
          color: #6b7280;
        }
        .estado-badge {
          display: inline-block;
          padding: 6px 16px;
          background: ${colorEstado};
          color: white;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          margin-top: 10px;
        }
        .cliente-section {
          background: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }
        .cliente-nombre {
          font-size: 20px;
          font-weight: bold;
          color: #1f2937;
        }
        .detalle-section {
          margin-bottom: 30px;
        }
        .detalle-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .detalle-item {
          background: #f9fafb;
          padding: 15px;
          border-radius: 6px;
          border-left: 4px solid #10b981;
        }
        .detalle-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }
        .detalle-valor {
          font-size: 16px;
          color: #1f2937;
          font-weight: 600;
        }
        .monto-section {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 30px;
        }
        .monto-label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .monto-valor {
          font-size: 48px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .monto-texto {
          font-size: 14px;
          opacity: 0.9;
          font-style: italic;
        }
        .notas-section {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 30px;
        }
        .notas-titulo {
          font-size: 14px;
          font-weight: 600;
          color: #92400e;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .notas-texto {
          font-size: 14px;
          color: #78350f;
          line-height: 1.6;
        }
        .origen-section {
          background: #eff6ff;
          border-left: 4px solid #3b82f6;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 30px;
        }
        .origen-titulo {
          font-size: 14px;
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .origen-detalle {
          font-size: 14px;
          color: #1e3a8a;
          line-height: 1.8;
        }
        .origen-item {
          margin-bottom: 5px;
        }
        .origen-label {
          font-weight: 600;
          display: inline-block;
          min-width: 150px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
        }
        .footer-text {
          font-size: 12px;
          color: #6b7280;
          line-height: 1.6;
        }
        .firma-section {
          margin-top: 60px;
          display: flex;
          justify-content: space-around;
        }
        .firma-box {
          text-align: center;
          flex: 1;
        }
        .firma-linea {
          width: 200px;
          border-top: 2px solid #1f2937;
          margin: 0 auto 10px;
        }
        .firma-label {
          font-size: 13px;
          color: #6b7280;
          font-weight: 600;
        }
        @media print {
          body { padding: 0; background: white; }
          .container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="logo-section">
            <div class="logo">
              <div class="logo-text">AV</div>
            </div>
            <div class="company-name">Agroverde</div>
            <div class="company-info">
              Sistema de Gestión Agrícola<br>
              RNC: 000-0000000-0<br>
              Tel: (809) 000-0000
            </div>
          </div>
          <div class="doc-section">
            <div class="doc-title">NOTA DE CRÉDITO</div>
            <div class="doc-code">${notaCredito.codigo || 'N/A'}</div>
            <div class="doc-date">Fecha: ${new Date(notaCredito.fecha_creacion).toLocaleDateString('es-DO', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
            <div class="estado-badge">${estado.toUpperCase()}</div>
          </div>
        </div>

        <!-- Cliente -->
        <div class="cliente-section">
          <div class="section-title">Cliente</div>
          <div class="cliente-nombre">${cliente?.nombre || 'N/A'}</div>
        </div>

        <!-- Detalle -->
        <div class="detalle-section">
          <div class="section-title">Detalles de la Nota de Crédito</div>
          <div class="detalle-grid">
            <div class="detalle-item">
              <div class="detalle-label">Referencia Origen</div>
              <div class="detalle-valor">${notaCredito.referencia_origen || 'N/A'}</div>
            </div>
            <div class="detalle-item">
              <div class="detalle-label">Tipo</div>
              <div class="detalle-valor">${notaCredito.tipo || 'Compensación'}</div>
            </div>
            <div class="detalle-item">
              <div class="detalle-label">Divisa</div>
              <div class="detalle-valor">${notaCredito.divisa || 'RD$'}</div>
            </div>
            <div class="detalle-item">
              <div class="detalle-label">Estado</div>
              <div class="detalle-valor">${estado}</div>
            </div>
          </div>
        </div>

        <!-- Origen de la Nota -->
        ${notaCredito.compensacion_id || notaCredito.pesada_numero ? `
        <div class="origen-section">
          <div class="origen-titulo">📋 Origen de la Nota de Crédito</div>
          <div class="origen-detalle">
            ${notaCredito.compensacion_id ? `
              <div class="origen-item">
                <span class="origen-label">Compensación ID:</span> 
                <span>${notaCredito.compensacion_id}</span>
              </div>
            ` : ''}
            ${notaCredito.pesada_numero ? `
              <div class="origen-item">
                <span class="origen-label">Pesada:</span> 
                <span>#${notaCredito.pesada_numero}</span>
              </div>
            ` : ''}
            ${notaCredito.cuenta_referencia ? `
              <div class="origen-item">
                <span class="origen-label">Cuenta Compensada:</span> 
                <span>${notaCredito.cuenta_referencia}</span>
              </div>
            ` : ''}
            <div class="origen-item">
              <span class="origen-label">Motivo:</span> 
              <span>Saldo a favor por compensación con pesada</span>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Monto -->
        <div class="monto-section">
          <div class="monto-label">Saldo Disponible</div>
          <div class="monto-valor">${notaCredito.divisa || 'RD$'} ${parseFloat(notaCredito.saldo_disponible || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="monto-texto">${numeroALetras(notaCredito.saldo_disponible || 0)}</div>
        </div>

        <!-- Notas -->
        ${notaCredito.notas ? `
        <div class="notas-section">
          <div class="notas-titulo">📝 Notas Adicionales</div>
          <div class="notas-texto">${notaCredito.notas}</div>
        </div>
        ` : ''}

        <!-- Firmas -->
        <div class="firma-section">
          <div class="firma-box">
            <div class="firma-linea"></div>
            <div class="firma-label">Emitido por</div>
          </div>
          <div class="firma-box">
            <div class="firma-linea"></div>
            <div class="firma-label">Recibido por</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-text">
            <strong>Este documento es un comprobante oficial de Nota de Crédito</strong><br>
            Válido para aplicar a futuras transacciones según términos y condiciones<br>
            Generado: ${new Date().toLocaleDateString('es-DO')} a las ${new Date().toLocaleTimeString('es-DO')}<br>
            <br>
            <em>Agroverde - Sistema de Gestión Agrícola</em>
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  ventana.document.write(html);
  ventana.document.close();
}

function numeroALetras(numero) {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (numero === 0) return 'CERO PESOS';

  const partes = numero.toFixed(2).split('.');
  const entero = parseInt(partes[0]);
  const decimales = parseInt(partes[1]);

  let texto = '';

  if (entero >= 1000000) {
    const millones = Math.floor(entero / 1000000);
    texto += (millones === 1 ? 'UN MILLÓN ' : convertirCentenas(millones) + ' MILLONES ');
    const resto = entero % 1000000;
    if (resto > 0) texto += convertirMiles(resto) + ' ';
  } else {
    texto += convertirMiles(entero) + ' ';
  }

  texto += 'PESOS';
  if (decimales > 0) {
    texto += ' CON ' + decimales.toString().padStart(2, '0') + '/100';
  }

  return texto.trim();
}

function convertirMiles(numero) {
  if (numero === 0) return '';
  if (numero < 1000) return convertirCentenas(numero);
  
  const miles = Math.floor(numero / 1000);
  const resto = numero % 1000;
  
  let texto = '';
  if (miles === 1) {
    texto = 'MIL';
  } else {
    texto = convertirCentenas(miles) + ' MIL';
  }
  
  if (resto > 0) {
    texto += ' ' + convertirCentenas(resto);
  }
  
  return texto;
}

function convertirCentenas(numero) {
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];

  if (numero === 0) return '';
  if (numero === 100) return 'CIEN';

  let texto = '';
  const c = Math.floor(numero / 100);
  const d = Math.floor((numero % 100) / 10);
  const u = numero % 10;

  if (c > 0) texto += centenas[c];
  
  if (d === 1) {
    if (texto) texto += ' ';
    texto += especiales[u];
  } else {
    if (d > 0) {
      if (texto) texto += ' ';
      texto += decenas[d];
      if (u > 0) texto += ' Y ' + unidades[u];
    } else if (u > 0) {
      if (texto) texto += ' ';
      texto += unidades[u];
    }
  }

  return texto;
}
