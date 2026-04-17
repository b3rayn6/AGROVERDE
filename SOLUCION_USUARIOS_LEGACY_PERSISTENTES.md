# 🔒 Solución: Usuarios Legacy Persistentes

## 🐛 Problema

Después del deploy, todavía puedes entrar con un usuario legacy.

### Causas Posibles:

1. **Sesión guardada en localStorage** del navegador
2. **Usuario legacy activo en la base de datos**
3. **Caché del navegador** con código antiguo

---

## ✅ Solución Completa

### Paso 1: Limpiar localStorage del Navegador

#### Opción A: Desde la Consola del Navegador
```javascript
// Abrir DevTools (F12) → Console
localStorage.removeItem('user_session');
localStorage.clear(); // Limpiar todo
location.reload(); // Recargar página
```

#### Opción B: Desde la Aplicación
1. Abrir DevTools (F12)
2. Ir a "Application" → "Local Storage"
3. Buscar `user_session`
4. Click derecho → Delete
5. Recargar la página (F5)

---

### Paso 2: Desactivar Usuarios Legacy en la Base de Datos

**Ejecutar en Supabase SQL Editor**:

```sql
-- Desactivar todos los usuarios legacy
UPDATE usuarios_sistema
SET activo = false
WHERE legacy_id IS NOT NULL;

-- Verificar
SELECT email, activo, legacy_id
FROM usuarios_sistema
WHERE legacy_id IS NOT NULL;
```

O usar el script completo:
```bash
# Ejecutar en Supabase SQL Editor
# Ver archivo: desactivar_usuarios_legacy.sql
```

---

### Paso 3: Limpiar Caché del Navegador

#### Chrome/Edge:
1. `Ctrl + Shift + Delete`
2. Seleccionar "Cached images and files"
3. Click en "Clear data"
4. Recargar la página con `Ctrl + F5`

#### Firefox:
1. `Ctrl + Shift + Delete`
2. Seleccionar "Cache"
3. Click en "Clear Now"
4. Recargar con `Ctrl + F5`

---

### Paso 4: Verificar Código Actualizado

El código actualizado ahora incluye:

#### App.jsx - Limpieza Automática
```javascript
// 🧹 LIMPIEZA FORZADA al cargar
useEffect(() => {
  const limpiarSesionesLegacy = () => {
    const savedSession = localStorage.getItem('user_session');
    if (savedSession) {
      const userData = JSON.parse(savedSession);
      
      // Si no es tipo 'sistema', limpiar
      if (!userData.tipo || userData.tipo !== 'sistema') {
        console.warn('🧹 Sesión legacy detectada');
        localStorage.removeItem('user_session');
      }
    }
  };
  
  limpiarSesionesLegacy();
}, []);
```

#### Login.jsx - Bloqueo de Legacy
```javascript
// 🔒 VERIFICACIÓN: Bloquear usuarios legacy
if (usuarioSistema.legacy_id) {
  throw new Error('Usuario legacy no soportado');
}
```

---

## 🔍 Diagnóstico

### Verificar si hay usuarios legacy activos

```bash
node diagnostico_completo.js
```

**Buscar en la salida**:
```
⚠️ Hay usuarios legacy en el sistema
```

### Verificar sesión en localStorage

```javascript
// En consola del navegador (F12)
const session = localStorage.getItem('user_session');
const userData = JSON.parse(session);
console.log('Tipo:', userData.tipo);
console.log('Legacy ID:', userData.legacy_id);

// Si tipo !== 'sistema' o legacy_id existe → PROBLEMA
```

---

## 🛠️ Solución Paso a Paso

### 1. Limpiar localStorage (Todos los usuarios)

**Crear archivo HTML temporal**:

```html
<!-- limpiar_sesiones.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Limpiar Sesiones Legacy</title>
</head>
<body>
  <h1>Limpieza de Sesiones Legacy</h1>
  <button onclick="limpiar()">Limpiar Sesiones</button>
  <div id="resultado"></div>
  
  <script>
    function limpiar() {
      const session = localStorage.getItem('user_session');
      
      if (!session) {
        document.getElementById('resultado').innerHTML = 
          '<p style="color: orange;">No hay sesión guardada</p>';
        return;
      }
      
      try {
        const userData = JSON.parse(session);
        
        if (!userData.tipo || userData.tipo !== 'sistema') {
          localStorage.removeItem('user_session');
          document.getElementById('resultado').innerHTML = 
            '<p style="color: green;">✅ Sesión legacy eliminada</p>' +
            '<p>Email: ' + (userData.email || 'N/A') + '</p>' +
            '<p>Tipo: ' + (userData.tipo || 'undefined') + '</p>';
        } else {
          document.getElementById('resultado').innerHTML = 
            '<p style="color: blue;">✅ Sesión válida (sistema)</p>' +
            '<p>Email: ' + userData.email + '</p>';
        }
      } catch (error) {
        localStorage.removeItem('user_session');
        document.getElementById('resultado').innerHTML = 
          '<p style="color: red;">❌ Sesión corrupta eliminada</p>';
      }
      
      setTimeout(() => location.reload(), 2000);
    }
  </script>
</body>
</html>
```

**Usar**:
1. Guardar como `limpiar_sesiones.html`
2. Abrir en el navegador
3. Click en "Limpiar Sesiones"

---

### 2. Desactivar en Base de Datos

**Ejecutar en Supabase**:

```sql
-- Ver usuarios legacy
SELECT id, email, nombre_completo, legacy_id, activo
FROM usuarios_sistema
WHERE legacy_id IS NOT NULL;

-- Desactivar
UPDATE usuarios_sistema
SET activo = false
WHERE legacy_id IS NOT NULL;

-- Confirmar
SELECT 
  COUNT(*) FILTER (WHERE legacy_id IS NOT NULL AND activo = true) as legacy_activos,
  COUNT(*) FILTER (WHERE legacy_id IS NOT NULL AND activo = false) as legacy_desactivados
FROM usuarios_sistema;
```

**Resultado esperado**:
```
legacy_activos: 0
legacy_desactivados: [número]
```

---

### 3. Forzar Logout de Todos los Usuarios

**Agregar en App.jsx** (temporal):

```javascript
// Al inicio del componente
useEffect(() => {
  // Forzar logout de todos
  localStorage.removeItem('user_session');
  console.log('🔒 Sesión limpiada - Todos deben hacer login nuevamente');
}, []);
```

**Después de que todos hagan login nuevamente, remover este código.**

---

## 🔒 Prevención Futura

### 1. Validación Estricta en Login

```javascript
// Ya implementado en Login.jsx
if (usuarioSistema.legacy_id) {
  throw new Error('Usuario legacy no soportado');
}
```

### 2. Limpieza Automática en App.jsx

```javascript
// Ya implementado
useEffect(() => {
  const limpiarSesionesLegacy = () => {
    // Limpiar sesiones legacy automáticamente
  };
  limpiarSesionesLegacy();
}, []);
```

### 3. Verificación en Cada Carga

```javascript
// Ya implementado
if (!userData.tipo || userData.tipo !== 'sistema') {
  localStorage.removeItem('user_session');
  return;
}
```

---

## 📊 Checklist de Verificación

- [ ] ✅ Limpiar localStorage del navegador
- [ ] ✅ Desactivar usuarios legacy en BD
- [ ] ✅ Limpiar caché del navegador
- [ ] ✅ Verificar código actualizado (git pull)
- [ ] ✅ Hacer nuevo deploy
- [ ] ✅ Probar login con usuario legacy (debe fallar)
- [ ] ✅ Probar login con usuario sistema (debe funcionar)
- [ ] ✅ Verificar logs en consola

---

## 🎯 Resultado Esperado

### Al intentar login con usuario legacy:

**En consola**:
```
❌ BLOQUEADO: Usuario legacy detectado
   - Email: usuario@ejemplo.com
   - Legacy ID: [uuid]
Error: Este usuario es legacy y ya no está soportado
```

**En pantalla**:
```
❌ Este usuario es legacy y ya no está soportado. 
   Contacta al administrador.
```

### Al cargar con sesión legacy guardada:

**En consola**:
```
🧹 LIMPIEZA FORZADA: Sesión legacy detectada
   - Tipo: legacy
   - Email: usuario@ejemplo.com
✅ Sesión legacy eliminada
```

**En pantalla**:
```
Pantalla de login (sin sesión)
```

---

## 🆘 Si Sigue sin Funcionar

### 1. Verificar que el código está actualizado

```bash
git pull origin feature/actualizacion-gestion-usuarios
```

### 2. Verificar que el deploy se completó

- Revisar logs del deploy
- Verificar que no hay errores de build
- Confirmar que la versión desplegada es la correcta

### 3. Hard Refresh del navegador

```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### 4. Modo incógnito

Abrir la aplicación en modo incógnito para probar sin caché ni sesiones.

### 5. Verificar en Supabase

```sql
-- Ver si hay usuarios legacy activos
SELECT * FROM usuarios_sistema 
WHERE legacy_id IS NOT NULL AND activo = true;

-- Si hay resultados, ejecutar:
UPDATE usuarios_sistema 
SET activo = false 
WHERE legacy_id IS NOT NULL;
```

---

## 📝 Logs Útiles

### Login exitoso (usuario sistema):
```
🔐 Intentando login con: usuario@sistema.com
✅ Usuario del sistema encontrado: usuario@sistema.com
✅ Permisos cargados: 5 módulos
✅ Login exitoso - Guardando sesión...
```

### Login bloqueado (usuario legacy):
```
🔐 Intentando login con: usuario@legacy.com
✅ Usuario del sistema encontrado: usuario@legacy.com
❌ BLOQUEADO: Usuario legacy detectado
   - Email: usuario@legacy.com
   - Legacy ID: abc-123-def
Error: Este usuario es legacy y ya no está soportado
```

### Sesión legacy limpiada:
```
🧹 LIMPIEZA FORZADA: Sesión legacy detectada
   - Tipo: legacy
   - Email: usuario@legacy.com
✅ Sesión legacy eliminada
```

---

## ✅ Confirmación Final

Después de aplicar todas las soluciones:

1. ✅ No puedes hacer login con usuario legacy
2. ✅ Sesiones legacy se limpian automáticamente
3. ✅ Solo usuarios sistema pueden acceder
4. ✅ Logs muestran bloqueos correctamente

**¡Sistema seguro!** 🔒
