import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Bot, Trash2, Copy, Check, Mic, MicOff, History, Plus, MessageSquare, X } from 'lucide-react';

export default function AsistenteIA({ user, onClose }) {
  // Estado para el historial de chats
  const [chatHistory, setChatHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error cargando historial:', error);
      return [];
    }
  });
  
  const [currentChatId, setCurrentChatId] = useState(() => {
    const saved = localStorage.getItem('ai_current_chat_id');
    return saved || Date.now().toString();
  });
  
  const [showHistory, setShowHistory] = useState(false);
  
  // Cargar mensajes guardados del localStorage
  const [messages, setMessages] = useState(() => {
    try {
      const savedMessages = localStorage.getItem(`ai_chat_${currentChatId}`);
      if (savedMessages) {
        return JSON.parse(savedMessages);
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    }
    // Mensaje inicial por defecto
    return [
      {
        role: 'assistant',
        content: `👋 ¡Hola ${user.nombre || user.username}!

Soy Agroverde AI, tu asistente inteligente del sistema AGROVERDE. Estoy aquí para ayudarte con cualquier consulta sobre el sistema.

💡 Puedo ayudarte con:

1. 📊 Consultar datos y estadísticas del sistema
2. 🔍 Explicar cómo usar cualquier módulo
3. 💼 Resolver dudas sobre procesos y funcionalidades
4. 📈 Proporcionar información sobre reportes y métricas
5. 🛠️ Guiarte paso a paso en cualquier tarea

¿En qué puedo ayudarte hoy?`
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll al final de los mensajes solo cuando hay nuevos mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Solo hacer scroll si hay mensajes nuevos (no cuando el usuario está escribiendo)
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]); // Solo cuando cambia la cantidad de mensajes

  // Focus en el input al cargar
  useEffect(() => {
    inputRef.current?.focus();
    
    // Inicializar reconocimiento de voz
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Mantener escuchando
      recognitionRef.current.interimResults = true; // Mostrar resultados mientras habla
      recognitionRef.current.lang = 'es-ES'; // Español
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onstart = () => {
        console.log('🎤 Reconocimiento de voz iniciado');
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Actualizar el input con el texto reconocido
        if (finalTranscript) {
          setInput(prev => prev + finalTranscript);
        } else if (interimTranscript) {
          // Mostrar texto temporal mientras habla
          setInput(prev => {
            const lastSpace = prev.lastIndexOf(' ');
            const base = lastSpace > 0 ? prev.substring(0, lastSpace + 1) : '';
            return base + interimTranscript;
          });
        }
      };

      recognitionRef.current.onend = () => {
        console.log('🎤 Reconocimiento de voz finalizado');
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('❌ Error de reconocimiento de voz:', event.error);
        setIsListening(false);
        
        // Mensajes de error específicos
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          alert('⚠️ Permiso denegado. Por favor, permite el acceso al micrófono en la configuración de tu navegador.');
        } else if (event.error === 'no-speech') {
          console.log('No se detectó voz, intenta de nuevo');
        } else if (event.error === 'network') {
          alert('❌ Error de red. Verifica tu conexión a internet.');
        }
      };
    } else {
      console.warn('⚠️ Reconocimiento de voz no soportado en este navegador');
    }

    return () => {
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Error al detener reconocimiento:', e);
        }
      }
    };
  }, []);

  // Guardar mensajes en localStorage cada vez que cambien
  useEffect(() => {
    try {
      localStorage.setItem(`ai_chat_${currentChatId}`, JSON.stringify(messages));
      localStorage.setItem('ai_current_chat_id', currentChatId);
      
      // Actualizar historial
      const chatTitle = messages.length > 1 
        ? messages[1].content.substring(0, 50) + '...'
        : 'Nuevo chat';
      
      setChatHistory(prev => {
        const existing = prev.find(c => c.id === currentChatId);
        if (existing) {
          return prev.map(c => 
            c.id === currentChatId 
              ? { ...c, title: chatTitle, lastMessage: new Date().toISOString(), messageCount: messages.length }
              : c
          );
        } else {
          const newHistory = [...prev, {
            id: currentChatId,
            title: chatTitle,
            created: new Date().toISOString(),
            lastMessage: new Date().toISOString(),
            messageCount: messages.length
          }];
          localStorage.setItem('ai_chat_history', JSON.stringify(newHistory));
          return newHistory;
        }
      });
    } catch (error) {
      console.error('Error guardando mensajes:', error);
    }
  }, [messages, currentChatId]);

  // Función para enviar mensaje a la API de Groq
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Agregar mensaje del usuario
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Detectar si el usuario está pidiendo datos específicos
      const needsData = userMessage.toLowerCase().includes('cuántos') || 
                       userMessage.toLowerCase().includes('cuantos') ||
                       userMessage.toLowerCase().includes('total') ||
                       userMessage.toLowerCase().includes('lista') ||
                       userMessage.toLowerCase().includes('mostrar') ||
                       userMessage.toLowerCase().includes('datos') ||
                       userMessage.toLowerCase().includes('información') ||
                       userMessage.toLowerCase().includes('estadísticas') ||
                       userMessage.toLowerCase().includes('métricas');

      let additionalContext = '';
      
      // Si necesita datos, intentar obtenerlos de Supabase
      if (needsData) {
        try {
          // Importar supabase dinámicamente
          const { supabase } = await import('../lib/supabase');
          
          // Obtener estadísticas básicas
          const [pesadasCount, facturasCount, clientesCount, suplidoresCount] = await Promise.all([
            supabase.from('pesadas').select('*', { count: 'exact', head: true }),
            supabase.from('facturas_factoria').select('*', { count: 'exact', head: true }),
            supabase.from('clientes').select('*', { count: 'exact', head: true }),
            supabase.from('suplidores').select('*', { count: 'exact', head: true })
          ]);

          additionalContext = `

DATOS ACTUALES DEL SISTEMA (en tiempo real):
- Total de pesadas registradas: ${pesadasCount.count || 0}
- Total de facturas de factoría: ${facturasCount.count || 0}
- Total de clientes: ${clientesCount.count || 0}
- Total de suplidores: ${suplidoresCount.count || 0}
- Usuario consultando: ${user.nombre || user.username}
- Fecha y hora actual: ${new Date().toLocaleString('es-DO')}

Usa estos datos reales para responder la pregunta del usuario.`;
        } catch (dbError) {
          console.error('Error obteniendo datos:', dbError);
          additionalContext = '\n\nNota: No pude acceder a los datos en tiempo real, pero puedo ayudarte con información general del sistema.';
        }
      }

      // Contexto del sistema AGROVERDE
      const systemContext = `Eres un asistente experto del sistema AGROVERDE, un sistema de gestión empresarial completo para una empresa agrícola.

IMPORTANTE: Responde SIEMPRE en texto plano, sin usar asteriscos, guiones bajos, ni ningún formato markdown. Usa solo texto normal.

DATOS Y MÉTRICAS DEL SISTEMA:
- Usuario actual: ${user.nombre || user.username}
- Rol: ${user.roles?.nombre || user.tipo}
- Empresa: AGROVERDE / AGVSRL
- Tipo de negocio: Gestión agrícola y comercial
- Base de datos: Supabase (PostgreSQL)
- Servidor: Sistema en la nube
- Módulos activos: 24 módulos principales

MÓDULOS DEL SISTEMA:
1. Pesadas: Registro y gestión de pesadas de productos agrícolas. Permite registrar peso, fecha, producto, cliente/suplidor.
2. Facturas Factoría: Gestión de facturas de producción. Control de facturas generadas en la factoría.
3. Comparación: Comparación entre pesadas y facturas para verificar concordancia de datos.
4. Compensación de Cuentas: Gestión de compensaciones financieras entre cuentas por cobrar y pagar.
5. Pagar con Pesadas: Sistema de pago mediante pesadas. Permite usar pesadas como forma de pago.
6. Registro de Flete: Control de transporte y logística. Gestión de fletes y transportistas.
7. Pago de Obreros: Gestión de nómina de trabajadores. Control de pagos a obreros y empleados.
8. Financiamientos: Control de préstamos y financiamientos. Gestión de créditos y deudas.
9. Inventario: Gestión de stock y productos. Control de entradas, salidas y existencias.
10. Facturas de Compra: Control de facturas de compras a suplidores.
11. Facturas de Venta: Control de facturas de ventas a clientes.
12. Suplidores: Gestión de proveedores. Base de datos de suplidores con contactos y términos.
13. Clientes: Gestión de clientes. Base de datos de clientes con historial de compras.
14. Ventas Diarias: Registro de ventas del día. Control diario de transacciones.
15. Cuentas por Cobrar: Control de cuentas pendientes de cobro a clientes.
16. Cuentas por Pagar: Control de cuentas pendientes de pago a suplidores.
17. Utilidad Neta: Análisis de rentabilidad. Cálculo de ganancias y pérdidas.
18. Libro Diario: Registro contable de todas las transacciones.
19. Cuadre de Caja: Control de efectivo. Cierre diario de caja.
20. Egresos/Gastos: Registro de gastos operativos y administrativos.
21. Activos Fijos: Gestión de activos de la empresa (maquinaria, vehículos, edificios).
22. Servidor: Administración técnica del servidor y configuraciones.
23. Base de Datos: Gestión de la base de datos, backups y mantenimiento.
24. Gestión de Usuarios: Control de accesos, permisos y roles de usuarios.

FUNCIONALIDADES PRINCIPALES:
- Sistema de permisos por rol (administrador, usuario, contador, etc.)
- Reportes y exportación de datos
- Búsqueda y filtros avanzados
- Historial de cambios y auditoría
- Interfaz responsive (funciona en móvil, tablet y desktop)
- Sincronización en tiempo real
- Backup automático de datos

MÉTRICAS Y DATOS IMPORTANTES:
- Todas las transacciones se registran con fecha, hora y usuario
- Los reportes se pueden exportar a PDF y Excel
- El sistema mantiene historial completo de cambios
- Las pesadas se registran en libras o kilogramos
- Las facturas incluyen impuestos (ITBIS) según configuración
- Los pagos pueden ser en efectivo, cheque, transferencia o pesadas
- El inventario se actualiza automáticamente con cada transacción

INSTRUCCIONES DE RESPUESTA:
- Responde en español claro y profesional
- USA emojis relevantes para hacer las respuestas más visuales y amigables
- Organiza la información con estructura clara usando saltos de línea
- NO uses asteriscos, guiones bajos, ni formato markdown
- Usa solo texto plano con puntos, comas y saltos de línea
- Para listas, usa números con emojis: 1. 📋 2. ✅ 3. 🔧
- Para secciones importantes, usa emojis de encabezado: 📊 DATOS, 💡 CONSEJO, ⚠️ IMPORTANTE
- Sé específico y da ejemplos prácticos
- Estructura tus respuestas así:

FORMATO DE RESPUESTA PROFESIONAL:
1. Saludo o confirmación breve con emoji
2. Respuesta directa a la pregunta
3. Detalles organizados con números o viñetas
4. Ejemplo práctico si aplica
5. Consejo adicional o siguiente paso

EJEMPLOS DE BUENA ESTRUCTURA:

Para preguntas de "cómo hacer":
✅ Entendido. Para [acción] en el sistema AGROVERDE:

1. 📋 Accede al módulo de [nombre]
2. 🔍 Busca la opción [opción]
3. ✏️ Completa los campos requeridos
4. 💾 Guarda los cambios

💡 Consejo: [tip útil]

Para preguntas de datos:
📊 DATOS ACTUALES DEL SISTEMA

Total de [item]: [número]
Total de [item]: [número]

📈 Análisis: [interpretación breve]

Para preguntas generales:
👋 [Saludo personalizado]

[Respuesta clara y directa]

[Detalles adicionales organizados]

💡 ¿Necesitas ayuda con algo más específico?

- Menciona siempre el módulo específico donde se hace cada acción
- Si te piden datos específicos, usa los datos reales proporcionados arriba
- Mantén un tono profesional pero cercano
- Usa emojis que refuercen el mensaje (no abuses de ellos)${additionalContext}`;


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
      
      // Mensaje de error amigable y profesional
      let errorMessage = '⚠️ LO SENTIMOS\n\nHubo un problema al conectar con el servicio de IA.\n\n';
      
      if (error.message.includes('401')) {
        errorMessage += '🔑 Error de autenticación: La API key no es válida.\n\n💡 Solución: Verifica la configuración de la API key de Groq.';
      } else if (error.message.includes('429')) {
        errorMessage += '⏱️ Límite de solicitudes excedido.\n\n💡 Solución: Por favor, espera unos momentos e intenta de nuevo.';
      } else {
        errorMessage += '🔧 Error técnico temporal.\n\n💡 Solución: Intenta de nuevo en unos momentos. Si el problema persiste, contacta al administrador del sistema.';
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

  const handleInputChange = (e) => {
    setInput(e.target.value);
    
    // Mostrar indicador de escritura
    setIsTyping(true);
    
    // Limpiar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Ocultar indicador después de 1 segundo sin escribir
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      alert('❌ Tu navegador no soporta reconocimiento de voz.\n\n✅ Navegadores compatibles:\n• Google Chrome\n• Microsoft Edge\n• Opera\n\n❌ No compatible:\n• Firefox\n• Safari (limitado)');
      return;
    }

    if (isListening) {
      // Detener reconocimiento
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        console.log('🛑 Deteniendo reconocimiento de voz');
      } catch (error) {
        console.error('Error al detener:', error);
        setIsListening(false);
      }
    } else {
      // Iniciar reconocimiento
      try {
        // Limpiar el input antes de empezar (opcional)
        // setInput('');
        
        recognitionRef.current.start();
        console.log('▶️ Iniciando reconocimiento de voz');
        setIsListening(true);
      } catch (error) {
        console.error('Error al iniciar:', error);
        
        if (error.message.includes('already started')) {
          // Si ya está iniciado, detenerlo primero
          recognitionRef.current.stop();
          setTimeout(() => {
            try {
              recognitionRef.current.start();
              setIsListening(true);
            } catch (e) {
              console.error('Error al reiniciar:', e);
              setIsListening(false);
            }
          }, 100);
        } else {
          alert('❌ Error al iniciar el micrófono.\n\nAsegúrate de:\n1. Permitir el acceso al micrófono\n2. Tener un micrófono conectado\n3. Usar Chrome o Edge');
          setIsListening(false);
        }
      }
    }
  };

  const clearChat = () => {
    const initialMessage = {
      role: 'assistant',
      content: `👋 ¡Hola ${user.nombre || user.username}!

Soy Agroverde AI, tu asistente inteligente del sistema AGROVERDE. Estoy aquí para ayudarte con cualquier consulta sobre el sistema.

💡 Puedo ayudarte con:

1. 📊 Consultar datos y estadísticas del sistema
2. 🔍 Explicar cómo usar cualquier módulo
3. 💼 Resolver dudas sobre procesos y funcionalidades
4. 📈 Proporcionar información sobre reportes y métricas
5. 🛠️ Guiarte paso a paso en cualquier tarea

¿En qué puedo ayudarte hoy?`
    };
    setMessages([initialMessage]);
    localStorage.setItem(`ai_chat_${currentChatId}`, JSON.stringify([initialMessage]));
  };

  const createNewChat = () => {
    const newChatId = Date.now().toString();
    setCurrentChatId(newChatId);
    const initialMessage = {
      role: 'assistant',
      content: `👋 ¡Hola ${user.nombre || user.username}!

Soy Agroverde AI, tu asistente inteligente del sistema AGROVERDE. Estoy aquí para ayudarte con cualquier consulta sobre el sistema.

💡 Puedo ayudarte con:

1. 📊 Consultar datos y estadísticas del sistema
2. 🔍 Explicar cómo usar cualquier módulo
3. 💼 Resolver dudas sobre procesos y funcionalidades
4. 📈 Proporcionar información sobre reportes y métricas
5. 🛠️ Guiarte paso a paso en cualquier tarea

¿En qué puedo ayudarte hoy?`
    };
    setMessages([initialMessage]);
    setShowHistory(false);
  };

  const loadChat = (chatId) => {
    try {
      const savedMessages = localStorage.getItem(`ai_chat_${chatId}`);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
        setCurrentChatId(chatId);
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Error cargando chat:', error);
    }
  };

  const deleteChat = (chatId) => {
    if (confirm('¿Estás seguro de eliminar este chat?')) {
      try {
        localStorage.removeItem(`ai_chat_${chatId}`);
        setChatHistory(prev => {
          const newHistory = prev.filter(c => c.id !== chatId);
          localStorage.setItem('ai_chat_history', JSON.stringify(newHistory));
          return newHistory;
        });
        
        if (chatId === currentChatId) {
          createNewChat();
        }
      } catch (error) {
        console.error('Error eliminando chat:', error);
      }
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 z-50">
      {/* Efecto de partículas de fondo */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Header mejorado */}
      <div className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 p-6 shadow-2xl border-b border-white/10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 rounded-2xl blur-md"></div>
              <div className="relative bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/20">
                <Bot className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3 drop-shadow-lg">
                Agroverde AI
                <Sparkles className="w-7 h-7 animate-pulse text-yellow-300" />
              </h1>
              <p className="text-purple-100 text-sm font-medium mt-1">Powered by Brayan • Model Elite 0.2</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="group flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:scale-105 hover:shadow-lg"
            >
              <History className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span className="text-sm font-semibold">Historial</span>
            </button>
            <button
              onClick={createNewChat}
              className="group flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:scale-105 hover:shadow-lg"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              <span className="text-sm font-semibold">Nuevo</span>
            </button>
            <button
              onClick={clearChat}
              className="group flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:scale-105 hover:shadow-lg"
            >
              <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span className="text-sm font-semibold">Limpiar</span>
            </button>
            <button
              onClick={() => onClose && onClose()}
              className="group flex items-center justify-center w-12 h-12 bg-red-500/20 hover:bg-red-500 text-white rounded-xl transition-all duration-300 backdrop-blur-sm border border-red-400/30 hover:border-red-400 hover:scale-110 hover:shadow-lg hover:shadow-red-500/50"
              title="Cerrar chat"
            >
              <span className="text-3xl font-bold leading-none group-hover:rotate-90 transition-transform duration-300">×</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mensajes mejorados */}
      <div className="relative flex-1 overflow-y-auto p-8 space-y-6" style={{ minHeight: 0 }}>
        {/* Panel de historial */}
        {showHistory && (
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-white/95 backdrop-blur-xl shadow-2xl border-r border-gray-200 z-10 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Historial de Chats
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {chatHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay chats guardados</p>
                </div>
              ) : (
                chatHistory.sort((a, b) => new Date(b.lastMessage) - new Date(a.lastMessage)).map(chat => (
                  <div
                    key={chat.id}
                    className={`group p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                      chat.id === currentChatId
                        ? 'bg-purple-50 border-purple-300 shadow-md'
                        : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0" onClick={() => loadChat(chat.id)}>
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {chat.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {chat.messageCount} mensajes • {new Date(chat.lastMessage).toLocaleDateString('es-DO')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 rounded transition-all"
                        title="Eliminar chat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        <div className="max-w-5xl mx-auto space-y-6">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-6 py-5 shadow-xl ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-purple-500/30'
                  : 'bg-white/95 backdrop-blur-sm text-gray-800 shadow-lg border border-gray-200/50'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                  <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2 rounded-lg">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Agroverde AI</span>
                </div>
              )}
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
              
              {message.role === 'assistant' && (
                <button
                  onClick={() => copyMessage(message.content)}
                  className="mt-4 flex items-center gap-2 text-xs text-gray-500 hover:text-purple-600 transition-colors font-semibold hover:scale-105 transform"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>✓ Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar respuesta</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-6 py-5 shadow-xl border border-gray-200/50">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500 rounded-full blur-md opacity-50 animate-pulse"></div>
                  <Bot className="relative w-6 h-6 text-purple-600 animate-bounce" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-gray-700 font-semibold">Agroverde AI está escribiendo</span>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input mejorado */}
      <div className="relative p-6 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-t border-white/10 shadow-2xl flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-stretch">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? "🎤 Escuchando... Habla ahora" : "💬 Escribe o habla tu pregunta..."}
                className={`w-full h-full px-4 py-3 pr-14 bg-white/95 backdrop-blur-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm resize-none shadow-xl placeholder-gray-400 font-medium transition-all duration-300 ${
                  isListening
                    ? 'border-red-500 ring-4 ring-red-300/50 bg-red-50/50'
                    : isTyping 
                    ? 'border-purple-500 ring-2 ring-purple-300/50' 
                    : 'border-purple-300/50 focus:border-purple-500'
                }`}
                disabled={isLoading}
                rows={2}
                style={{ minHeight: '60px', maxHeight: '100px' }}
              />
              {isTyping && input.trim() && !isListening && (
                <div className="absolute bottom-3 right-14 flex items-center gap-1 bg-purple-100 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              )}
              {/* Indicador de escucha activa */}
              {isListening && (
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-red-100 px-3 py-1.5 rounded-full animate-pulse">
                  <div className="flex gap-0.5">
                    <span className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '100ms' }}></span>
                    <span className="w-1 h-5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></span>
                    <span className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
                    <span className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></span>
                  </div>
                  <span className="text-xs font-bold text-red-600">Escuchando...</span>
                </div>
              )}
              {/* Botón de micrófono mejorado */}
              <button
                onClick={toggleVoiceRecognition}
                disabled={isLoading}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center ${
                  isListening 
                    ? 'bg-gradient-to-br from-red-500 to-red-600 text-white animate-pulse shadow-xl shadow-red-500/50 scale-110' 
                    : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 hover:scale-110 shadow-lg hover:shadow-xl'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isListening ? 'Detener grabación (clic para parar)' : 'Hablar con el micrófono'}
              >
                {isListening ? (
                  <div className="relative">
                    <MicOff className="w-5 h-5" />
                    <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
                  </div>
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className={`group relative bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-2xl hover:shadow-purple-500/50 disabled:shadow-none flex items-center justify-center ${isLoading ? 'animate-pulse' : ''}`}
              style={{ minHeight: '60px', minWidth: '80px' }}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-1">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-[10px] font-semibold">Enviando</span>
                </div>
              ) : (
                <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              )}
            </button>
          </div>
          <p className="text-xs text-purple-200 mt-3 text-center font-medium">
            💡 Escribe o usa el 🎤 micrófono para hacer preguntas sobre el sistema
          </p>
        </div>
      </div>
    </div>
  );
}
