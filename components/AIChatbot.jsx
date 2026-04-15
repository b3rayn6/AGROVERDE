import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, Bot } from 'lucide-react';

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! 👋 Soy tu asistente administrativo de IA.\n\n✨ Puedo ayudarte a:\n✅ Crear usuarios\n✅ Gestionar todos los módulos\n✅ Registrar operaciones\n✅ Consultar información\n\n¿Qué necesitas?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Debug: Verificar que el componente se monta
  useEffect(() => {
    console.log('🤖 AIChatbot montado correctamente');
  }, []);

  // Auto-scroll al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus en el input cuando se abre el chat
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Función para enviar mensaje a la API de Groq
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Agregar mensaje del usuario
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Contexto del sistema AGROVERDE
      const systemContext = `Eres un asistente experto y administrador del sistema AGROVERDE, un sistema de gestión empresarial completo. 

CAPACIDADES ADMINISTRATIVAS:
✅ Puedes CREAR, MODIFICAR y ELIMINAR usuarios
✅ Puedes GESTIONAR todos los módulos del sistema
✅ Puedes EJECUTAR operaciones en cualquier módulo
✅ Tienes acceso COMPLETO a todas las funcionalidades
✅ Puedes CONSULTAR y MODIFICAR datos en tiempo real

MÓDULOS QUE PUEDES GESTIONAR:

📊 OPERACIONES:
- Pesadas: Registro, edición y eliminación de pesadas de productos
- Facturas Factoría: Crear, modificar y gestionar facturas de producción
- Comparación: Análisis y comparación entre pesadas y facturas
- Compensación de Cuentas: Gestión completa de compensaciones financieras
- Compensación de Pesadas: Sistema de pago mediante pesadas

🚚 LOGÍSTICA:
- Registro de Flete: Control completo de transporte y logística
- Pago de Obreros: Gestión de nómina y pagos a trabajadores

💰 FINANZAS:
- Préstamos: Control de préstamos y financiamientos
- Inventario: Gestión completa de stock y productos
- Facturas de Compra: Registro y control de compras
- Facturas de Venta: Registro y control de ventas
- Ventas Diarias: Registro y análisis de ventas del día
- Cuentas por Cobrar: Gestión de cobros pendientes
- Cuentas por Pagar: Gestión de pagos pendientes
- Cuadre de Caja: Control y cuadre de efectivo
- Gastos: Registro y control de egresos
- Utilidad Neta: Análisis de rentabilidad y ganancias
- Libro Diario: Registro contable completo

📦 GESTIÓN:
- Suplidores: Crear, editar y gestionar proveedores
- Clientes: Crear, editar y gestionar clientes
- Activos Fijos (PPE): Gestión de activos de la empresa

👥 ADMINISTRACIÓN:
- Gestión de Usuarios: Crear, modificar, eliminar usuarios y asignar permisos

INSTRUCCIONES DE RESPUESTA:
1. Cuando te pidan CREAR algo (usuario, registro, etc.), proporciona los pasos específicos y confirma que puedes hacerlo
2. Cuando te pidan CONSULTAR información, explica cómo acceder y qué datos están disponibles
3. Cuando te pidan MODIFICAR o ELIMINAR, explica el proceso y las precauciones necesarias
4. Responde de manera clara, concisa y profesional en español
5. Si la pregunta es sobre funcionalidades específicas, explica paso a paso cómo usar el módulo
6. Si te piden realizar una acción administrativa, confirma que tienes los permisos y explica el procedimiento
7. Siempre menciona que tienes acceso completo al sistema y puedes ayudar con cualquier tarea

EJEMPLOS DE RESPUESTAS:
- "Sí, puedo crear un nuevo usuario. Necesito los siguientes datos: nombre, email, contraseña y rol..."
- "Puedo registrar una nueva pesada. Indícame los siguientes datos: fecha, producto, peso, cliente..."
- "Tengo acceso al módulo de facturas. ¿Quieres crear una factura nueva o consultar facturas existentes?"
- "Puedo gestionar el inventario completo. ¿Qué operación necesitas: agregar producto, consultar stock, o actualizar cantidades?"`;


      // Preparar mensajes para la API
      const apiMessages = [
        { role: 'system', content: systemContext },
        ...messages.slice(-10), // Últimos 10 mensajes para contexto
        { role: 'user', content: userMessage }
      ];

      // Llamar a la API de Groq
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY || 'gsk_demo_key'}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 1,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Error de API: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || 'Lo siento, no pude procesar tu solicitud.';

      // Agregar respuesta del asistente
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Error al comunicarse con la IA:', error);
      
      // Mensaje de error amigable
      let errorMessage = 'Lo siento, hubo un problema al conectar con el servicio de IA. ';
      
      if (error.message.includes('401')) {
        errorMessage += 'Por favor, configura tu API key de Groq en las variables de entorno (VITE_GROQ_API_KEY).';
      } else if (error.message.includes('429')) {
        errorMessage += 'Se ha excedido el límite de solicitudes. Por favor, intenta de nuevo en unos momentos.';
      } else {
        errorMessage += 'Por favor, intenta de nuevo más tarde.';
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMessage 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[9999] group transition-all duration-300 ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
        aria-label="Abrir chat de IA"
        style={{ position: 'fixed' }}
      >
        <div className="relative">
          {/* Efecto de pulso */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full animate-ping opacity-75"></div>
          
          {/* Botón principal */}
          <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 group-hover:scale-110">
            <Sparkles className="w-6 h-6" />
          </div>
          
          {/* Badge de notificación */}
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
            AI
          </div>
        </div>
      </button>

      {/* Ventana de chat */}
      <div
        className={`fixed bottom-6 right-6 z-[9999] transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}
        style={{ width: '400px', maxWidth: 'calc(100vw - 48px)', position: 'fixed' }}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Header del chat */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Asistente IA</h3>
                <p className="text-purple-100 text-xs">Siempre disponible para ayudarte</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              aria-label="Cerrar chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-semibold text-purple-600">Asistente</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                    <span className="text-sm text-gray-600">Pensando...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input de mensaje */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ej: 'Crea un usuario' o 'Registra una pesada'..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-3 rounded-xl transition-all duration-200 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                aria-label="Enviar mensaje"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Puedo crear usuarios, gestionar módulos y más
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
