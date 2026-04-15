# 🤖 Chatbot de IA - AGROVERDE

## 🎉 ¡Nuevo! Asistente Inteligente Integrado

Tu sistema AGROVERDE ahora incluye un **chatbot de IA flotante** que puede responder cualquier pregunta sobre el sistema en tiempo real.

---

## 🚀 Inicio Rápido (3 pasos)

### 1️⃣ Obtén tu API Key GRATIS

Visita: **[https://console.groq.com/keys](https://console.groq.com/keys)**

- Regístrate con Google (30 segundos)
- Crea una API Key
- Copia la key (empieza con `gsk_...`)

### 2️⃣ Configura la API Key

Abre el archivo `.env` y agrega:

```env
VITE_GROQ_API_KEY=gsk_tu_api_key_aqui
```

### 3️⃣ Reinicia el servidor

```bash
# Detén el servidor (Ctrl+C)
# Inicia de nuevo
npm run dev
```

---

## ✨ Características

- 💬 **Chat en tiempo real** con IA avanzada
- 🎯 **Conocimiento completo** del sistema AGROVERDE
- ⚡ **Respuestas ultra rápidas** (más rápido que ChatGPT)
- 🎨 **Interfaz moderna** y fácil de usar
- 📱 **100% responsive** - funciona en móviles
- 🆓 **Completamente GRATIS** - 14,400 consultas/día

---

## 💡 Ejemplos de Uso

Pregúntale al chatbot:

```
"¿Cómo registro una nueva pesada?"
"Explícame el módulo de compensación"
"¿Qué es el cuadre de caja?"
"Ayúdame con las facturas de venta"
"¿Cómo funciona el inventario?"
```

---

## 🎯 Ubicación

El botón flotante aparece en la **esquina inferior derecha** de la pantalla cuando inicias sesión:

- 🟣 Botón morado/azul con efecto de pulso
- ✨ Icono de estrella (Sparkles)
- 🔴 Badge "AI" animado

---

## 🔧 Tecnología

- **API**: Groq (ultra rápida y gratuita)
- **Modelo**: Llama 3.3 70B (última generación)
- **Framework**: React + Vite
- **UI**: Lucide Icons + Tailwind CSS

---

## 📊 Límites Gratuitos

| Característica | Límite |
|----------------|--------|
| Solicitudes/día | 14,400 |
| Tokens/minuto | 30,000 |
| Costo | $0 (GRATIS) |
| Tarjeta requerida | ❌ No |

---

## 🛠️ Solución de Problemas

### ❌ Error 401: "Unauthorized"
**Solución**: Verifica que tu API key esté correctamente configurada en `.env`

### ❌ El chatbot no aparece
**Solución**: Asegúrate de haber iniciado sesión en el sistema

### ❌ Respuestas lentas
**Solución**: Groq es muy rápido, verifica tu conexión a internet

### ❌ Error 429: "Too Many Requests"
**Solución**: Has excedido el límite diario (14,400 solicitudes)

---

## 📚 Documentación Completa

Para más detalles, consulta: **[CONFIGURACION_IA.md](./CONFIGURACION_IA.md)**

---

## 🎨 Personalización

### Cambiar el modelo de IA

Edita `components/AIChatbot.jsx` línea 88:

```javascript
model: 'llama-3.3-70b-versatile', // Cambia aquí
```

**Opciones disponibles**:
- `llama-3.3-70b-versatile` - Mejor calidad (recomendado)
- `llama-3.1-8b-instant` - Más rápido
- `mixtral-8x7b-32768` - Contexto largo
- `gemma-7b-it` - Ligero

### Cambiar colores

Edita las clases de Tailwind en `components/AIChatbot.jsx`:

```javascript
// Busca: from-purple-600 to-blue-600
// Cambia a: from-green-600 to-emerald-600
```

---

## 🌟 Características Futuras

- [ ] Historial de conversaciones
- [ ] Exportar chat a PDF
- [ ] Comandos de voz
- [ ] Sugerencias automáticas
- [ ] Integración con módulos específicos

---

## 🤝 Soporte

¿Problemas? Abre un issue o contacta al equipo de desarrollo.

---

## 📄 Licencia

Este componente es parte del sistema AGROVERDE.

---

**¡Disfruta de tu nuevo asistente de IA! 🎉**
