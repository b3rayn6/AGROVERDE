import { useState } from 'react';
import { Sparkles, X, Send, Bot } from 'lucide-react';

export default function AIChatbotTest() {
  const [isOpen, setIsOpen] = useState(false);

  console.log('🤖 AIChatbot Test renderizado - isOpen:', isOpen);

  return (
    <>
      {/* Botón flotante - SIEMPRE VISIBLE PARA DEBUG */}
      <button
        onClick={() => {
          console.log('🖱️ Click en botón, isOpen era:', isOpen);
          setIsOpen(!isOpen);
        }}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110"
        style={{ 
          position: 'fixed',
          zIndex: 99999,
          width: '64px',
          height: '64px'
        }}
        aria-label="Abrir chat de IA"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Ventana de chat */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
          style={{ 
            position: 'fixed',
            zIndex: 99999,
            width: '400px',
            maxWidth: 'calc(100vw - 48px)'
          }}
        >
          {/* Header del chat */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-white" />
              <div>
                <h3 className="text-white font-bold text-lg">Asistente IA</h3>
                <p className="text-purple-100 text-xs">Test Mode</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-4">
            <p className="text-gray-700">
              ✅ El chatbot está funcionando correctamente!
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Si ves esto, el componente se está renderizando bien.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
