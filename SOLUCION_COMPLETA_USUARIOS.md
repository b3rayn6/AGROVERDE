# 🔧 SOLUCIÓN COMPLETA: Usuarios y Login

## Fecha: 2024-04-17
## Estado: ✅ CORREGIDO

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. Error 406 en Login
- ❌ El código filtraba por `password` en la query de Supabase
- ❌ Supabase rechaza esto por seguridad

### 2. Usuarios Legacy Activos
- ❌ El sistema permitía login con usuarios de la tabla `users` (legacy)
- ❌ Usuario `admin@gmail.com` entraba como legacy sin permisos configurados

### 3. No Aparecen Usuarios en Gestión
- ❌ Posible problema de permisos en Supabase
- ❌ Usuarios no creados en `usuarios_sistema`

---

## ✅ SOLUCIONES APLICADAS

### 1. Corregido Error 406
**Archivo**: `src/components/Login.jsx`, `components/Login.jsx`

**Antes**:
```javascript
// ❌ Filtra por password - causa error 406
.eq('password', password)
```

**Después**:
```javascript
// ✅ Obtiene usuario y verifica password en cliente
const { data: usuariosSistema } = await supabase
  .from('usuarios_sistema')
  .select('*')
  .eq('email', email)
  .eq('activo', true);

// Verificar password en el cliente
if (usuariosSistema[0].password === password) {
  // Login exitoso
}
```

### 2. Eliminado Soporte de Usuarios Legacy
**Archivos**: `src/App.jsx`, `src/components/Login.jsx`

**Cambios**:
- ❌ Eliminado fallback a tabla `users`
- ❌ Eliminado `tipo === 'legacy'` en permisos
- ✅ Solo usuarios de `usuarios_sistema` pueden entrar
- ✅ Sesiones legacy se limpian automáticamente

**Código**:
```javascript
// ❌ ANTES - Permitía usuarios legacy
if (user.tipo === 'legacy') return true;

// ✅ AHORA - Solo usuarios sistema
if (user.tipo !== 'sistema') {
  console.warn('⚠️ Usuario no es del sistema - acceso denegado');
  return false;
}
```

### 3. Script SQL para Crear Usuarios
**Archivo**: `verificar_y_crear_usuarios.sql`

**Funciones**:
1. ✅ Verifica usuarios existentes
2. ✅ Crea rol de Administrador si no existe
3. ✅ Crea usuarios de prueba:
   - `agroverde@gmail.com` / `12345678`
   - `admin@gmail.com` / `12345678`
4. ✅ Asigna permisos completos a administradores
5. ✅ Muestra resumen de usuarios y permisos

---

## 📋 PASOS PARA SOLUCIONAR

### PASO 1: Ejecutar Script SQL en Supabase

1. Ve a Supabase Dashboard
2. SQL Editor → New Query
3. Copia y pega el contenido de `verificar_y_crear_usuarios.sql`
4. Ejecuta el script (Run)
5. Verifica los resultados

**Deberías ver**:
```
✅ Rol Administrador creado/existe
✅ Usuario agroverde@gmail.com creado/existe
✅ Usuario admin@gmail.com creado/existe
✅ Permisos completos asignados
```

### PASO 2: Limpiar Sesión Local

1. Abre la aplicación en el navegador
2. Abre DevTools (F12)
3. Console → Ejecuta:
```javascript
localStorage.clear();
location.reload();
```

### PASO 3: Hacer Login con Usuario del Sistema

**Credenciales de prueba**:
```
Email: agroverde@gmail.com
Password: 12345678
```

O:
```
Email: admin@gmail.com
Password: 12345678
```

### PASO 4: Verificar en Gestión de Usuarios

1. Una vez dentro, ve a "Usuarios"
2. Deberías ver los usuarios creados
3. Puedes crear más usuarios desde ahí
4. Puedes configurar permisos por usuario

---

## 🔍 VERIFICACIÓN

### En la Consola del Navegador (F12):

**Login exitoso**:
```
🔐 Intentando login con: agroverde@gmail.com
📊 Resultado usuarios_sistema: {id: 1, email: "agroverde@gmail.com", ...}
✅ Contraseña correcta
✅ Login exitoso
```

**NO deberías ver**:
```
❌ Error 406
❌ Usuario legacy detectado
❌ Credenciales incorrectas (si las credenciales son correctas)
```

### En Gestión de Usuarios:

**Deberías ver**:
- ✅ Lista de usuarios del sistema
- ✅ Botón "Nuevo Usuario"
- ✅ Opciones para editar/eliminar
- ✅ Configurar permisos por usuario

**NO deberías ver**:
- ❌ "No hay usuarios registrados" (si ejecutaste el script SQL)
- ❌ Errores de carga
- ❌ Usuarios de la tabla `users` (legacy)

---

## 📊 ESTRUCTURA DE DATOS

### Tabla: usuarios_sistema
```sql
id              SERIAL PRIMARY KEY
email           VARCHAR UNIQUE NOT NULL
password        VARCHAR NOT NULL
nombre_completo VARCHAR NOT NULL
rol_id          INTEGER REFERENCES roles(id)
activo          BOOLEAN DEFAULT true
legacy_id       UUID (para migración)
created_at      TIMESTAMP DEFAULT NOW()
```

### Tabla: roles
```sql
id          SERIAL PRIMARY KEY
nombre      VARCHAR UNIQUE NOT NULL
descripcion TEXT
```

### Tabla: modulos
```sql
id     SERIAL PRIMARY KEY
codigo VARCHAR UNIQUE NOT NULL
nombre VARCHAR NOT NULL
```

### Tabla: permisos_usuario
```sql
id              SERIAL PRIMARY KEY
usuario_id      INTEGER REFERENCES usuarios_sistema(id)
modulo_id       INTEGER REFERENCES modulos(id)
puede_ver       BOOLEAN DEFAULT false
puede_crear     BOOLEAN DEFAULT false
puede_editar    BOOLEAN DEFAULT false
puede_eliminar  BOOLEAN DEFAULT false
UNIQUE(usuario_id, modulo_id)
```

---

## 🔒 SEGURIDAD

### ✅ Mejoras Implementadas:

1. **Password no va en URL**
   - Antes: `?password=12345678` ❌
   - Ahora: Verificación en cliente ✅

2. **Solo usuarios del sistema**
   - Antes: Legacy + Sistema ❌
   - Ahora: Solo Sistema ✅

3. **Sesiones validadas**
   - Antes: Confiaba en localStorage ❌
   - Ahora: Verifica en DB al cargar ✅

4. **Permisos granulares**
   - Antes: Todo o nada ❌
   - Ahora: Por módulo y acción ✅

---

## 🆘 TROUBLESHOOTING

### Problema: "No hay usuarios registrados"

**Solución**:
1. Ejecuta `verificar_y_crear_usuarios.sql` en Supabase
2. Verifica que los usuarios se crearon:
```sql
SELECT * FROM usuarios_sistema;
```

### Problema: "Credenciales incorrectas" (pero son correctas)

**Solución**:
1. Verifica que el usuario existe:
```sql
SELECT email, password FROM usuarios_sistema WHERE email = 'agroverde@gmail.com';
```
2. Verifica que el usuario está activo:
```sql
SELECT email, activo FROM usuarios_sistema WHERE email = 'agroverde@gmail.com';
```
3. Limpia localStorage y recarga:
```javascript
localStorage.clear();
location.reload();
```

### Problema: "Sigo entrando con admin@gmail.com legacy"

**Solución**:
1. Limpia localStorage:
```javascript
localStorage.clear();
```
2. Cierra todas las pestañas de la aplicación
3. Abre de nuevo y haz login
4. Verifica en consola que dice `tipo: 'sistema'` no `tipo: 'legacy'`

### Problema: "No veo el módulo de Usuarios"

**Solución**:
1. Verifica que tienes permisos:
```sql
SELECT * FROM permisos_usuario 
WHERE usuario_id = (SELECT id FROM usuarios_sistema WHERE email = 'tu@email.com')
AND modulo_id = (SELECT id FROM modulos WHERE codigo = 'gestion_usuarios');
```
2. Si no existe, ejecuta el script SQL que crea permisos para administradores

---

## 📝 ARCHIVOS MODIFICADOS

### Código:
1. ✅ `src/components/Login.jsx` - Corregido error 406, eliminado legacy
2. ✅ `components/Login.jsx` - Corregido error 406, eliminado legacy
3. ✅ `src/App.jsx` - Eliminado soporte legacy
4. ✅ `components/GestionUsuarios.jsx` - Ya estaba correcto

### Documentación:
1. ✅ `SOLUCION_ERROR_406_LOGIN.md` - Explicación del error 406
2. ✅ `verificar_y_crear_usuarios.sql` - Script para crear usuarios
3. ✅ `SOLUCION_COMPLETA_USUARIOS.md` - Este archivo

---

## 🎯 RESULTADO ESPERADO

### Después de aplicar todas las correcciones:

1. ✅ Login funciona sin error 406
2. ✅ Solo usuarios del sistema pueden entrar
3. ✅ Usuarios legacy son rechazados
4. ✅ Gestión de Usuarios muestra usuarios
5. ✅ Puedes crear nuevos usuarios
6. ✅ Puedes configurar permisos
7. ✅ Sesiones se validan correctamente

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Código corregido y subido
2. ⏳ Ejecutar script SQL en Supabase
3. ⏳ Limpiar localStorage
4. ⏳ Probar login con usuarios del sistema
5. ⏳ Verificar Gestión de Usuarios
6. ⏳ Configurar variables de entorno en Vercel
7. ⏳ Probar en producción

---

**¡Todo listo! Ejecuta el script SQL y prueba el login! 🎉**
