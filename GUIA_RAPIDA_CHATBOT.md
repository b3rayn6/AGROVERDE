# 🚀 Guía Rápida - Chatbot de IA en 3 Minutos

## ⚡ Setup Ultra Rápido

### 🎯 Objetivo
Tener el chatbot funcionando en menos de 3 minutos.

---

## 📝 Paso 1: Obtener API Key (90 segundos)

### 1.1 Abrir Groq Console
```
🌐 Visita: https://console.groq.com/keys
```

### 1.2 Registrarse
- Clic en "Sign Up"
- Usar cuenta de Google (más rápido)
- O usar email + contraseña

### 1.3 Crear API Key
- Clic en "Create API Key"
- Darle un nombre: "AGROVERDE Chatbot"
- Clic en "Submit"

### 1.4 Copiar la Key
```
✅ Copiar la key completa (empieza con gsk_...)
📋 Ejemplo: gsk_abc123xyz789...
```

---

## 🔧 Paso 2: Configurar (60 segundos)

### 2.1 Abrir archivo .env
```bash
# En la raíz del proyecto
# Buscar el archivo: .env
```

### 2.2 Buscar esta línea
```env
VITE_GROQ_API_KEY=tu_api_key_aqui
```

### 2.3 Reemplazar con tu key
```env
VITE_GROQ_API_KEY=gsk_abc123xyz789...
```

### 2.4 Guardar archivo
```
💾 Ctrl+S (Windows/Linux)
💾 Cmd+S (Mac)
```

---

## 🔄 Paso 3: Reiniciar Servidor (30 segundos)

### 3.1 Detener servidor actual
```bash
# En la terminal donde corre el servidor
Ctrl+C
```

### 3.2 Iniciar de nuevo
```bash
npm run dev
```

### 3.3 Esperar mensaje
```
✅ Local: http://localhost:5173/
```

---

## 🎉 Paso 4: ¡Usar! (Inmediato)

### 4.1 Abrir navegador
```
🌐 http://localhost:5173/
```

### 4.2 Iniciar sesión
```
👤 Usuario: tu_usuario
🔒 Contraseña: tu_contraseña
```

### 4.3 Buscar el botón
```
📍 Esquina inferior derecha
🟣 Botón morado/azul con estrella
🔴 Badge "AI" animado
```

### 4.4 Hacer clic y preguntar
```
💬 "¿Cómo registro una nueva pesada?"
💬 "Explícame el módulo de inventario"
💬 "¿Qué es el cuadre de caja?"
```

---

## ✅ Checklist de Verificación

Marca cada paso completado:

- [ ] ✅ Obtuve mi API key de Groq
- [ ] ✅ Copié la key completa
- [ ] ✅ Abrí el archivo .env
- [ ] ✅ Pegué mi API key
- [ ] ✅ Guardé el archivo
- [ ] ✅ Reinicié el servidor
- [ ] ✅ Inicié sesión en AGROVERDE
- [ ] ✅ Veo el botón flotante
- [ ] ✅ El chatbot responde mis preguntas

---

## 🆘 Solución Rápida de Problemas

### ❌ No veo el botón flotante
```
1. ¿Iniciaste sesión? → Inicia sesión
2. ¿Reiniciaste el servidor? → Reinicia (Ctrl+C, npm run dev)
3. ¿Hay errores en consola? → Abre F12 y revisa
```

### ❌ Error 401: Unauthorized
```
1. ¿Copiaste la key completa? → Verifica en .env
2. ¿Empieza con gsk_? → Debe empezar con gsk_
3. ¿Guardaste el archivo? → Guarda y reinicia servidor
```

### ❌ El chatbot no responde
```
1. ¿Tienes internet? → Verifica conexión
2. ¿La key es válida? → Prueba crear una nueva en Groq
3. ¿Hay errores en consola? → Abre F12 y revisa
```

### ❌ Respuestas en inglés
```
1. Haz preguntas en español claro
2. El modelo se adaptará automáticamente
```

---

## 💡 Primeras Preguntas Sugeridas

Prueba estas preguntas para empezar:

### Básicas
```
"¿Qué módulos tiene el sistema?"
"¿Cómo funciona el sistema AGROVERDE?"
"¿Qué puedo hacer en el dashboard?"
```

### Específicas
```
"¿Cómo registro una nueva pesada?"
"Explícame el módulo de compensación de cuentas"
"¿Cómo creo una factura de venta?"
```

### Avanzadas
```
"¿Cuál es la diferencia entre facturas de compra y venta?"
"¿Cómo funciona el cuadre de caja?"
"Explícame el proceso de pago de obreros"
```

---

## 🎯 Tips para Mejores Respuestas

### ✅ Hacer
- Sé específico: "¿Cómo registro una pesada?"
- Da contexto: "En el módulo de inventario..."
- Pregunta paso a paso para tareas complejas

### ❌ Evitar
- Preguntas muy generales: "¿Cómo funciona todo?"
- Múltiples preguntas en una: "¿Cómo hago X, Y y Z?"
- Preguntas sin contexto: "¿Qué hago ahora?"

---

## 📊 Límites del Plan Gratuito

```
✅ 14,400 solicitudes por día
✅ Sin tarjeta de crédito
✅ Respuestas ultra rápidas
✅ Acceso a Llama 3.3 70B
```

### ¿Es suficiente?
```
14,400 solicitudes/día = 600/hora = 10/minuto

Para una empresa típica: MÁS QUE SUFICIENTE ✅
```

---

## 🎨 Personalización Rápida (Opcional)

### Cambiar a colores verdes (tema AGROVERDE)

**Archivo**: `components/AIChatbot.jsx`

**Buscar**: `from-purple-600 to-blue-600`
**Reemplazar por**: `from-green-600 to-emerald-600`

**Buscar**: `text-purple-600`
**Reemplazar por**: `text-green-600`

**Guardar y listo!** 🎉

---

## 📚 Documentación Completa

Si necesitas más información:

| Documento | Contenido |
|-----------|-----------|
| `README_CHATBOT_IA.md` | Inicio rápido y características |
| `CONFIGURACION_IA.md` | Configuración detallada |
| `FAQ_CHATBOT_IA.md` | Preguntas frecuentes |
| `DEMO_VISUAL_CHATBOT.md` | Demostración visual |
| `RESUMEN_CHATBOT_IA.md` | Resumen ejecutivo |

---

## 🏁 ¡Listo!

Si completaste todos los pasos, tu chatbot está funcionando.

### Próximos pasos:
1. ✅ Experimenta con diferentes preguntas
2. ✅ Comparte con tu equipo
3. ✅ Reporta cualquier problema
4. ✅ Disfruta de tu asistente de IA

---

## 🎉 Resumen Visual

```
┌─────────────────────────────────────────┐
│  1. Obtener API Key (90s)               │
│     → https://console.groq.com/keys     │
│     → Copiar key (gsk_...)              │
├─────────────────────────────────────────┤
│  2. Configurar .env (60s)               │
│     → Abrir .env                        │
│     → Pegar API key                     │
│     → Guardar                           │
├─────────────────────────────────────────┤
│  3. Reiniciar Servidor (30s)            │
│     → Ctrl+C                            │
│     → npm run dev                       │
├─────────────────────────────────────────┤
│  4. ¡Usar! (Inmediato)                  │
│     → Iniciar sesión                    │
│     → Buscar botón flotante             │
│     → Hacer preguntas                   │
└─────────────────────────────────────────┘

Total: ~3 minutos ⏱️
```

---

**¿Problemas? Revisa la sección de solución rápida arriba ⬆️**

**¿Todo funciona? ¡Disfruta tu chatbot de IA! 🎉**
