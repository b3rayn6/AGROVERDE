# 🤖 Configuración del Asistente Administrativo de IA

## ✨ Características

El sistema AGROVERDE ahora incluye un **asistente administrativo de IA** con capacidades completas de gestión que puede:

### Funcionalidades Administrativas:
- 👥 **Crear, modificar y eliminar usuarios**
- 📊 **Gestionar TODOS los módulos del sistema**
- ✍️ **Registrar operaciones en cualquier módulo**
- 🔍 **Consultar información en tiempo real**
- 💼 **Ejecutar tareas administrativas completas**
- 🎯 **Conocimiento completo del sistema AGROVERDE**
- ⚡ **Respuestas rápidas y precisas**
- 🎨 **Interfaz moderna y atractiva**
- 📱 **Diseño responsive**

### Módulos que puede gestionar:
- ✅ Pesadas
- ✅ Facturas Factoría
- ✅ Comparación Pesadas/Facturas
- ✅ Registro de Flete
- ✅ Pago de Obreros
- ✅ Préstamos
- ✅ Inventario
- ✅ Facturas Compra/Venta
- ✅ Suplidores
- ✅ Clientes
- ✅ Ventas Diarias
- ✅ Cuentas por Cobrar/Pagar
- ✅ Cuadre de Caja
- ✅ Activos Fijos (PPE)
- ✅ Utilidad Neta
- ✅ Gestión de Usuarios

---

## 🔑 Configuración de la API Key (GRATIS)

### Paso 1: Obtener tu API Key de Groq (100% GRATIS)

1. **Visita**: [https://console.groq.com](https://console.groq.com)
2. **Regístrate** con tu cuenta de Google o email
3. **Ve a "API Keys"** en el menú lateral
4. **Crea una nueva API Key** haciendo clic en "Create API Key"
5. **Copia la key** (empieza con `gsk_...`)

### Paso 2: Configurar en tu proyecto

#### Opción A: Archivo .env (Recomendado)

1. Abre o crea el archivo `.env` en la raíz del proyecto
2. Agrega la siguiente línea:

```env
VITE_GROQ_API_KEY=gsk_tu_api_key_aqui
```

3. Reemplaza `gsk_tu_api_key_aqui` con tu API key real
4. Guarda el archivo
5. **Reinicia el servidor de desarrollo** (Ctrl+C y luego `npm run dev`)

#### Opción B: Configuración directa en el código

Si prefieres no usar variables de entorno, puedes editar el archivo `components/AIChatbot.jsx`:

```javascript
// Busca esta línea (aproximadamente línea 85):
'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY || 'gsk_demo_key'}`

// Reemplázala por:
'Authorization': `Bearer gsk_tu_api_key_aqui`
```

---

## 🎯 Límites del Plan Gratuito de Groq

Groq ofrece un plan gratuito muy generoso:

- ✅ **14,400 solicitudes por día**
- ✅ **Sin tarjeta de crédito requerida**
- ✅ **Acceso a modelos de última generación**
- ✅ **Respuestas ultra rápidas** (más rápido que ChatGPT)

### Modelos disponibles:
- `llama-3.3-70b-versatile` (Recomendado - usado por defecto)
- `llama-3.1-8b-instant` (Más rápido, menos preciso)
- `mixtral-8x7b-32768` (Contexto largo)
- `gemma-7b-it` (Ligero y eficiente)

---

## 🚀 Uso del Asistente Administrativo

1. **Busca el botón flotante** en la esquina inferior derecha (icono de estrella con badge "AI")
2. **Haz clic** para abrir el chat
3. **Escribe tu solicitud** (crear usuario, registrar operación, consultar datos, etc.)
4. **Presiona Enter** o el botón de enviar
5. **Recibe respuestas y confirmaciones instantáneas** de la IA

### Ejemplos de comandos administrativos:

**Gestión de Usuarios:**
- "Crea un nuevo usuario llamado Juan Pérez con email juan@agroverde.com"
- "Modifica el rol del usuario María a administrador"
- "Elimina el usuario con ID 123"
- "Lista todos los usuarios activos"

**Registro de Operaciones:**
- "Registra una nueva pesada de 500kg de café del cliente ABC"
- "Crea una factura de venta para el cliente XYZ por $1,500"
- "Registra un pago de obreros por $2,000"
- "Agrega un nuevo producto al inventario: Café Premium, 100 unidades"

**Consultas:**
- "¿Cuántas pesadas se registraron hoy?"
- "Muéstrame las facturas pendientes de pago"
- "¿Cuál es el saldo actual de caja?"
- "Lista los clientes con cuentas por cobrar"

**Gestión de Módulos:**
- "Explícame cómo funciona el módulo de compensación de cuentas"
- "¿Cómo registro un nuevo flete?"
- "Ayúdame a hacer el cuadre de caja"
- "¿Cómo calculo la utilidad neta?"

---

## 🔧 Alternativas de APIs Gratuitas

Si Groq no funciona para ti, aquí hay otras opciones gratuitas:

### 1. **Hugging Face Inference API**
- URL: https://huggingface.co/inference-api
- Límite: 30,000 caracteres/mes gratis
- Modelos: Llama, Mistral, Falcon, etc.

### 2. **Cohere**
- URL: https://cohere.com
- Límite: 100 llamadas/mes gratis
- Modelos: Command, Command-Light

### 3. **Together AI**
- URL: https://together.ai
- Límite: $25 de crédito gratis
- Modelos: Llama, Mistral, etc.

---

## 🛠️ Solución de Problemas

### Error: "401 Unauthorized"
- ✅ Verifica que tu API key esté correctamente configurada
- ✅ Asegúrate de que la key empiece con `gsk_`
- ✅ Reinicia el servidor de desarrollo

### Error: "429 Too Many Requests"
- ✅ Has excedido el límite diario
- ✅ Espera 24 horas o crea otra cuenta

### El chatbot no responde
- ✅ Abre la consola del navegador (F12) para ver errores
- ✅ Verifica tu conexión a internet
- ✅ Confirma que la API key sea válida

### Respuestas lentas
- ✅ Groq es muy rápido, si es lento puede ser tu conexión
- ✅ Considera cambiar a un modelo más ligero como `llama-3.1-8b-instant`

---

## 📝 Personalización

### Cambiar el modelo de IA

Edita `components/AIChatbot.jsx`, línea ~88:

```javascript
model: 'llama-3.3-70b-versatile', // Cambia esto
```

Opciones:
- `llama-3.3-70b-versatile` - Mejor calidad (por defecto)
- `llama-3.1-8b-instant` - Más rápido
- `mixtral-8x7b-32768` - Contexto muy largo

### Cambiar el contexto del sistema

Edita el `systemContext` en `components/AIChatbot.jsx` (línea ~50) para personalizar el conocimiento de la IA.

---

## 📚 Recursos Adicionales

- [Documentación de Groq](https://console.groq.com/docs)
- [Modelos disponibles](https://console.groq.com/docs/models)
- [Límites y precios](https://console.groq.com/docs/rate-limits)

---

## 🎉 ¡Listo!

Tu asistente administrativo de IA está configurado y listo para usar. Ahora puedes:

✅ **Crear usuarios** directamente desde el chat
✅ **Gestionar todos los módulos** con comandos simples
✅ **Registrar operaciones** en tiempo real
✅ **Consultar información** instantáneamente
✅ **Ejecutar tareas administrativas** completas

**Nota importante**: El asistente tiene acceso completo al sistema y puede ejecutar operaciones administrativas. Úsalo con responsabilidad y verifica las operaciones críticas antes de confirmarlas.

**Tip**: Para mejores resultados, sé específico en tus solicitudes. Por ejemplo:
- ❌ "Crea un usuario"
- ✅ "Crea un usuario llamado Juan Pérez con email juan@agroverde.com y rol de administrador"
