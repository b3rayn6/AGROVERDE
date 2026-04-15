# ❓ Preguntas Frecuentes - Chatbot de IA

## 🔑 Configuración y Setup

### ¿Es realmente gratis?
**Sí, 100% gratis.** Groq ofrece 14,400 solicitudes por día sin costo alguno. No necesitas tarjeta de crédito.

### ¿Necesito tarjeta de crédito?
**No.** Solo necesitas una cuenta de Google o email para registrarte en Groq.

### ¿Dónde obtengo la API key?
Visita [https://console.groq.com/keys](https://console.groq.com/keys), regístrate y crea una API key.

### ¿Cómo configuro la API key?
Agrega `VITE_GROQ_API_KEY=tu_key_aqui` en el archivo `.env` y reinicia el servidor.

### ¿Funciona sin API key?
No, necesitas una API key válida de Groq para que el chatbot funcione.

---

## 🚀 Uso y Funcionalidad

### ¿Dónde está el botón del chatbot?
En la esquina inferior derecha de la pantalla, después de iniciar sesión. Es un botón morado/azul con un icono de estrella.

### ¿Qué tipo de preguntas puedo hacer?
Cualquier pregunta sobre el sistema AGROVERDE: módulos, funcionalidades, cómo usar características, etc.

### ¿El chatbot tiene memoria?
Sí, recuerda los últimos 10 mensajes de la conversación actual para mantener el contexto.

### ¿Puedo usar el chatbot en móvil?
Sí, el diseño es completamente responsive y funciona en todos los dispositivos.

### ¿Las respuestas son precisas?
El chatbot usa Llama 3.3 70B, uno de los modelos más avanzados. Las respuestas son muy precisas, pero siempre verifica información crítica.

---

## ⚡ Rendimiento

### ¿Qué tan rápido responde?
Groq es extremadamente rápido, generalmente responde en 1-3 segundos.

### ¿Por qué a veces es lento?
Puede ser tu conexión a internet o alta demanda en los servidores de Groq.

### ¿Puedo hacer más rápido el chatbot?
Sí, cambia el modelo a `llama-3.1-8b-instant` en el código (línea 88 de AIChatbot.jsx).

### ¿Cuántas preguntas puedo hacer?
14,400 por día con el plan gratuito de Groq.

---

## 🛠️ Problemas Comunes

### Error: "401 Unauthorized"
**Causa**: API key incorrecta o no configurada.
**Solución**: Verifica que tu API key esté correctamente en el archivo `.env` y que empiece con `gsk_`.

### Error: "429 Too Many Requests"
**Causa**: Has excedido el límite diario de 14,400 solicitudes.
**Solución**: Espera 24 horas o crea otra cuenta de Groq.

### El botón no aparece
**Causa**: No has iniciado sesión o hay un error en el código.
**Solución**: Inicia sesión en el sistema. Si persiste, revisa la consola del navegador (F12).

### El chatbot no responde
**Causa**: Problema de conexión o API key inválida.
**Solución**: 
1. Verifica tu conexión a internet
2. Confirma que la API key sea válida
3. Revisa la consola del navegador para errores

### Las respuestas están en inglés
**Causa**: El modelo puede responder en inglés si detecta contexto en inglés.
**Solución**: Haz tus preguntas en español claro. El modelo se adaptará.

### El chat se cierra solo
**Causa**: Esto no debería pasar. Puede ser un bug.
**Solución**: Reporta el problema con detalles de cuándo ocurre.

---

## 🎨 Personalización

### ¿Puedo cambiar los colores?
Sí, edita las clases de Tailwind en `components/AIChatbot.jsx`. Busca `from-purple-600 to-blue-600` y cámbialo.

### ¿Puedo mover el botón a la izquierda?
Sí, cambia `right-6` por `left-6` en las clases del botón flotante.

### ¿Puedo cambiar el modelo de IA?
Sí, edita la línea 88 de `AIChatbot.jsx` y cambia `llama-3.3-70b-versatile` por otro modelo disponible.

### ¿Puedo agregar más contexto sobre mi empresa?
Sí, edita el `systemContext` en la línea 50 de `AIChatbot.jsx` y agrega información específica.

### ¿Puedo cambiar el mensaje de bienvenida?
Sí, edita el estado inicial de `messages` en la línea 7 de `AIChatbot.jsx`.

---

## 🔒 Seguridad y Privacidad

### ¿Mis conversaciones son privadas?
Las conversaciones se envían a Groq para procesamiento. Lee la política de privacidad de Groq para más detalles.

### ¿Se guardan mis mensajes?
No, los mensajes solo se mantienen en memoria durante la sesión actual. Al cerrar el chat, se pierden.

### ¿Puedo agregar historial persistente?
Sí, pero requiere modificar el código para guardar mensajes en localStorage o una base de datos.

### ¿Es seguro poner mi API key en .env?
Sí, el archivo `.env` no se sube a Git (está en `.gitignore`). Nunca compartas tu API key públicamente.

---

## 💰 Costos y Límites

### ¿Cuánto cuesta Groq?
El plan gratuito es suficiente para la mayoría de usuarios. Si necesitas más, Groq ofrece planes pagos.

### ¿Qué pasa si excedo el límite?
Recibirás un error 429. Debes esperar 24 horas o actualizar a un plan pago.

### ¿Puedo usar otra API gratuita?
Sí, puedes usar Hugging Face, Cohere, o Together AI. Requiere modificar el código.

### ¿14,400 solicitudes son suficientes?
Para la mayoría de empresas, sí. Eso es ~600 solicitudes por hora, 24/7.

---

## 🔧 Técnico

### ¿Qué tecnologías usa?
- React para la UI
- Groq API para la IA
- Llama 3.3 70B como modelo
- Tailwind CSS para estilos
- Lucide Icons para iconos

### ¿Puedo integrar otro modelo?
Sí, pero requiere modificar el código de la API. Groq soporta varios modelos.

### ¿Funciona offline?
No, requiere conexión a internet para comunicarse con la API de Groq.

### ¿Puedo agregar comandos de voz?
Sí, pero requiere implementar Web Speech API. No está incluido por defecto.

### ¿Puedo exportar las conversaciones?
No está implementado, pero puedes agregar esta funcionalidad modificando el código.

---

## 📊 Comparación con Otras Opciones

### ¿Por qué Groq y no ChatGPT?
- ✅ Groq es más rápido
- ✅ Groq es gratis (14,400/día)
- ✅ ChatGPT API requiere pago
- ✅ Groq usa modelos open-source

### ¿Por qué no usar Hugging Face?
- ✅ Groq es más rápido
- ✅ Groq tiene mejor límite gratuito
- ❌ Hugging Face tiene más modelos disponibles

### ¿Por qué no usar Claude?
- ✅ Groq es gratis
- ❌ Claude API requiere pago desde el inicio
- ❌ Claude tiene mejor razonamiento en tareas complejas

---

## 🎯 Mejores Prácticas

### ¿Cómo hacer mejores preguntas?
- Sé específico: "¿Cómo registro una pesada?" vs "¿Cómo uso el sistema?"
- Da contexto: "En el módulo de inventario, ¿cómo...?"
- Pregunta paso a paso para tareas complejas

### ¿Cuándo NO usar el chatbot?
- Para tareas que requieren acceso directo a la base de datos
- Para operaciones críticas sin verificación
- Para información sensible o confidencial

### ¿Cómo verificar respuestas?
- Prueba las instrucciones en el sistema
- Consulta con un administrador para cambios importantes
- Usa el chatbot como guía, no como verdad absoluta

---

## 🚀 Futuras Mejoras

### ¿Qué características vendrán?
- Historial de conversaciones persistente
- Exportar chat a PDF
- Comandos de voz
- Sugerencias automáticas
- Integración directa con módulos

### ¿Puedo sugerir mejoras?
Sí, contacta al equipo de desarrollo con tus ideas.

### ¿Se actualizará el modelo?
Sí, cuando Groq lance nuevos modelos, se puede actualizar fácilmente.

---

## 📞 Soporte

### ¿Dónde obtengo ayuda?
- Lee la documentación: `CONFIGURACION_IA.md`
- Revisa la demo visual: `DEMO_VISUAL_CHATBOT.md`
- Contacta al equipo de desarrollo

### ¿Cómo reporto un bug?
Describe el problema con:
- Qué estabas haciendo
- Qué esperabas que pasara
- Qué pasó realmente
- Capturas de pantalla si es posible

---

## 🎉 Consejos Finales

1. **Experimenta**: Prueba diferentes tipos de preguntas
2. **Sé específico**: Preguntas claras = respuestas mejores
3. **Verifica**: Siempre confirma información crítica
4. **Reporta**: Si encuentras problemas, repórtalos
5. **Disfruta**: ¡Tienes un asistente de IA gratis y potente!

---

**¿Más preguntas? ¡Pregúntale al chatbot! 😄**
