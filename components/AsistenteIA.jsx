import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Bot, Trash2, Copy, Check } from 'lucide-react';

export default function AsistenteIA({ user }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! 👋 Soy tu asistente administrativo de IA para AGROVERDE.\n\n✨ Tengo acceso COMPLETO al sistema y puedo:\n\n✅ Crear, modificar y eliminar usuarios\n✅ Gestionar TODOS los módulos (Pesadas, Facturas, Inventario, etc.)\n✅ Registrar operaciones en cualquier módulo\n✅ Consultar y modificar datos en tiempo real\n✅ Ayudarte con cualquier tarea administrativa\n\n¿Qué necesitas que haga por ti hoy?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus en el input al cargar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
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
        errorMessage += 'Por favor, verifica que tu API key de Groq esté correctamente configurada.';
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

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: '¡Hola! 👋 Soy tu asistente administrativo de IA para AGROVERDE.\n\n✨ Tengo acceso COMPLETO al sistema y puedo:\n\n✅ Crear, modificar y eliminar usuarios\n✅ Gestionar TODOS los módulos (Pesadas, Facturas, Inventario, etc.)\n✅ Registrar operaciones en cualquier módulo\n✅ Consultar y modificar datos en tiempo real\n✅ Ayudarte con cualquier tarea administrativa\n\n¿Qué necesitas que haga por ti hoy?'
      }
    ]);
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                Asistente IA
                <Sparkles className="w-6 h-6 animate-pulse" />
              </h1>
              <p className="text-purple-100 text-sm">Powered by Groq • Llama 3.3 70B</p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">Limpiar Chat</span>
          </button>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-800 shadow-md border border-gray-200'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                  <Bot className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-600">Asistente IA</span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              
              {message.role === 'assistant' && (
                <button
                  onClick={() => copyMessage(message.content)}
                  className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-6 py-4 shadow-md border border-gray-200">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                <span className="text-sm text-gray-600">Pensando...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ej: 'Crea un usuario llamado Juan' o 'Registra una pesada de 500kg'..."
            className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-xl transition-all duration-200 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-lg"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          💡 Puedo crear usuarios, registrar operaciones, gestionar módulos y más
        </p>
      </div>
    </div>
  );
}
