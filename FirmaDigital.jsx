import React, { useRef, useState, useEffect } from 'react';
import { X, Trash2, Check } from 'lucide-react';

export default function FirmaDigital({ onGuardar, onCancelar, firmaInicial = null }) {
  const canvasRef = useRef(null);
  const [dibujando, setDibujando] = useState(false);
  const [hayFirma, setHayFirma] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Si hay firma inicial, cargarla
    if (firmaInicial) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHayFirma(true);
      };
      img.src = firmaInicial;
    }
  }, [firmaInicial]);

  const iniciarDibujo = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    setDibujando(true);
    setHayFirma(true);

    const x = e.clientX ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = e.clientY ? e.clientY - rect.top : e.touches[0].clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const dibujar = (e) => {
    if (!dibujando) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    const x = e.clientX ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = e.clientY ? e.clientY - rect.top : e.touches[0].clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const terminarDibujo = () => {
    setDibujando(false);
  };

  const limpiar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHayFirma(false);
  };

  const guardar = () => {
    if (!hayFirma) {
      alert('Por favor, firme antes de guardar');
      return;
    }

    const canvas = canvasRef.current;
    const firmaDataURL = canvas.toDataURL('image/png');
    onGuardar(firmaDataURL);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Firma Digital</h3>
          <button onClick={onCancelar} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Firme en el recuadro a continuación:</p>
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={600}
              height={300}
              className="w-full cursor-crosshair touch-none"
              onMouseDown={iniciarDibujo}
              onMouseMove={dibujar}
              onMouseUp={terminarDibujo}
              onMouseLeave={terminarDibujo}
              onTouchStart={iniciarDibujo}
              onTouchMove={dibujar}
              onTouchEnd={terminarDibujo}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={limpiar}
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center justify-center gap-2"
          >
            <Trash2 size={18} />
            Limpiar
          </button>
          <button
            onClick={guardar}
            disabled={!hayFirma}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <Check size={18} />
            Guardar Firma
          </button>
        </div>
      </div>
    </div>
  );
}
