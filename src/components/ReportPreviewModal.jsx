import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ReportPreviewModal({ isOpen, onClose, title, htmlContent }) {
  const iframeRef = useRef(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!iframeRef.current || !iframeRef.current.contentDocument) return;

    setIsGeneratingPdf(true);
    try {
      const doc = iframeRef.current.contentDocument;
      const element = doc.body; // Or a specific container in your HTML

      // Create a canvas from the HTML content
      const canvas = await html2canvas(element, {
        scale: 2, // Improve quality
        useCORS: true, // Handle images from other domains if CORS headers are set
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${title || 'reporte'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Intente usar la opción de Imprimir.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            {title || 'Vista Previa del Reporte'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 bg-gray-100 p-4 overflow-hidden relative">
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title="Report Preview"
            className="w-full h-full bg-white shadow-lg border-0"
            style={{ display: 'block' }}
          />
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-gray-50 flex justify-between sm:justify-between items-center">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="default" 
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isGeneratingPdf ? 'Generando...' : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </>
              )}
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir / Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
