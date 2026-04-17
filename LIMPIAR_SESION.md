# 🧹 Limpiar Sesión Guardada

## 🔍 Problema Identificado

Tu sistema está usando una **sesión guardada en localStorage** del navegador. Por eso:
- ✅ En tu PC funciona (tiene la sesión guardada)
- ❌ En otra PC no funciona (no tiene la sesión)
- ❌ El correo `admin@gmail.com` no existe en la base de datos

**El sistema NO está conectándose a Supabase**, solo está usando datos antiguos del navegador.

---

## ✅ SOLUCIÓN INMEDIATA

### Opción 1: Limpiar desde la Consola del Navegador (MÁS RÁPIDO)

1. **Abre tu aplicación** en el navegador
2. **Presiona F12** para abrir DevTools
3. **Ve a la pestaña "Console"**
4. **Escribe este comando** y presiona Enter:
   ```javascript
   localStorage.clear(); location.reload();
   ```
5. La página se recargará y te pedirá login nuevamente

### Opción 2: Limpiar desde Application/Storage

1. **Abre DevTools** (F12)
2. **Ve a la pestaña "Application"** (o "Almacenamiento" en español)
3. En el menú izquierdo, expande **"Local Storage"**
4. Haz clic en tu dominio (ej: `http://localhost:3000`)
5. Busca la clave `user_session`
6. **Haz clic derecho** → **Delete**
7. **Recarga la página** (F5)

### Opción 3: Limpiar Todo el Caché

1. **Presiona Ctrl+Shift+Delete**
2. Selecciona **"Cookies y otros datos de sitios"**
3. Selecciona **"Imágenes y archivos en caché"**
4. Haz clic en **"Borrar datos"**
5. **Recarga la página**

---

## 🔧 Solución Permanente: Agregar Botón de Logout Real

Voy a modificar el código para que el logout limpie correctamente la sesión.

---

## 🧪 Verificar que Funcionó

Después de limpiar la sesión:

1. **Recarga la página** (F5)
2. Deberías ver la **pantalla de login**
3. **NO** deberías entrar automáticamente

Ahora intenta hacer login:
- ❌ `admin@gmail.com` → Debería decir "Credenciales incorrectas"
- ✅ `admin@agroverde.com` / `admin123` → Debería funcionar (si ejecutaste el SQL)

---

## 🔍 Verificar qué Usuarios Existen

Para ver qué usuarios tienes en la base de datos:

1. Ve a **Supabase Dashboard** → **Table Editor**
2. Abre la tabla **`usuarios_sistema`**
3. Verás todos los usuarios registrados
4. Si está vacía, ejecuta el script `inicializar_sistema_usuarios.sql`

O en la tabla **`users`** (legacy):
1. Abre la tabla **`users`**
2. Verás los usuarios antiguos

---

## 🚨 Problema de Conexión a Supabase

Recuerda que el error original era:
```
ERR_NAME_NOT_RESOLVED
https://njzpozedfitrwphrjmsb.supabase.co
```

Esto significa que **Supabase no está accesible**. Debes:

1. ✅ Verificar que el proyecto existe y está activo
2. ✅ O crear un nuevo proyecto
3. ✅ Actualizar el `.env` con las nuevas credenciales
4. ✅ Reiniciar el servidor

---

## 📋 Pasos Completos para Solucionar Todo

### 1. Limpiar Sesión Local
```javascript
// En la consola del navegador (F12):
localStorage.clear();
location.reload();
```

### 2. Verificar/Crear Proyecto Supabase
- Ve a: https://supabase.com/dashboard
- Verifica que tu proyecto existe y está activo
- Si no existe, crea uno nuevo

### 3. Actualizar .env
```env
VITE_SUPABASE_URL=https://TU_URL.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ_TU_KEY_AQUI
```

### 4. Reiniciar Servidor
```bash
# Ctrl+C para detener
npm run dev
```

### 5. Ejecutar Script SQL
- En Supabase → SQL Editor
- Ejecutar `inicializar_sistema_usuarios.sql`

### 6. Probar Login
```
Email: admin@agroverde.com
Contraseña: admin123
```

---

## 💡 Entender el Problema

### ¿Por qué funcionaba en una PC y no en otra?

```
PC 1 (tu PC):
- localStorage tiene: { email: "admin@gmail.com", ... }
- El sistema carga esta sesión sin verificar
- ✅ Entra automáticamente (sin conectarse a Supabase)

PC 2 (otra PC):
- localStorage está vacío
- El sistema intenta conectarse a Supabase
- ❌ Supabase no responde (ERR_NAME_NOT_RESOLVED)
- ❌ No puede hacer login
```

### ¿Por qué admin@gmail.com no existe?

Ese correo estaba en una sesión antigua guardada en tu navegador, pero:
- ❌ No existe en la base de datos actual
- ❌ Probablemente era de una base de datos anterior
- ❌ O fue creado cuando Supabase funcionaba

---

## 🎯 Resumen Ultra-Rápido

```bash
# 1. Limpiar sesión (en consola del navegador F12):
localStorage.clear(); location.reload();

# 2. Verificar que Supabase funciona:
npm run verificar

# 3. Si Supabase no funciona:
# - Crear/reactivar proyecto en supabase.com
# - Actualizar .env
# - Reiniciar servidor (Ctrl+C, npm run dev)
# - Ejecutar SQL

# 4. Login con:
# admin@agroverde.com / admin123
```

---

## 🆘 Si Aún No Funciona

Comparte:
1. El resultado de `npm run verificar`
2. Los errores de la consola del navegador (F12)
3. Una captura del dashboard de Supabase
