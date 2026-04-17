# 👥 Sistema de Usuarios - AGROVERDE

## 🎯 Resumen Ejecutivo

El sistema de usuarios legacy ha sido **completamente eliminado**. Ahora solo se permiten usuarios del sistema con permisos configurados en la base de datos.

---

## 📚 Documentación Disponible

| Archivo | Descripción |
|---------|-------------|
| `README_USUARIOS.md` | 📋 Este archivo - Índice general |
| `RESUMEN_CAMBIOS_COMPLETO.md` | 📖 Resumen técnico completo de todos los cambios |
| `ELIMINACION_USUARIOS_LEGACY.md` | 🔧 Detalles técnicos de la eliminación de legacy |
| `ACTUALIZACION_REGISTRO.md` | 🆕 Cambios en el sistema de registro |
| `INSTRUCCIONES_CREAR_USUARIOS.md` | 📝 Guía paso a paso para crear usuarios |

---

## 🚀 Quick Start

### 1. Registrar Nuevo Usuario (Aplicación)
```
1. Abrir la aplicación
2. Click en "¿No tienes cuenta? Regístrate aquí"
3. Llenar formulario (nombre, email, rol, password)
4. Click en "Crear Cuenta"
5. Login automático ✅
```

### 2. Crear Usuario Administrador (SQL)
```bash
# Abrir Supabase SQL Editor
# Ejecutar: crear_usuario_admin.sql
```

### 3. Crear Usuario (CLI Interactivo)
```bash
node crear_usuario_cli.js
```

### 4. Verificar Usuarios
```bash
node listar_usuarios_sistema.js
```

### 5. Verificar Permisos
```bash
node diagnostico_permisos.js
```

---

## 📁 Scripts Disponibles

### Scripts SQL (Ejecutar en Supabase)
- `crear_usuario_admin.sql` - Crea admin con todos los permisos
- `limpiar_usuarios_legacy.sql` - Limpia usuarios legacy (opcional)

### Scripts Node.js
- `crear_usuario_cli.js` - CLI interactivo para crear usuarios
- `listar_usuarios_sistema.js` - Lista todos los usuarios
- `diagnostico_permisos.js` - Verifica permisos de un usuario

---

## 🔐 Credenciales por Defecto

Después de ejecutar `crear_usuario_admin.sql`:

```
Email: admin@agroverde.com
Password: 12345678
```

⚠️ **CAMBIAR DESPUÉS DEL PRIMER LOGIN**

---

## 🛠️ Casos de Uso

### Crear Usuario Administrador
```bash
# Opción 1: SQL (Recomendado)
# Ejecutar crear_usuario_admin.sql en Supabase

# Opción 2: CLI
node crear_usuario_cli.js
# Seleccionar rol "Administrador"
# Asignar "Todos los permisos"
```

### Crear Usuario con Permisos Limitados
```bash
node crear_usuario_cli.js
# Seleccionar rol "Usuario"
# Asignar "Solo lectura"
```

### Verificar Estado del Sistema
```bash
# Ver todos los usuarios
node listar_usuarios_sistema.js

# Ver permisos de un usuario específico
# (Editar email en diagnostico_permisos.js)
node diagnostico_permisos.js
```

### Limpiar Usuarios Legacy
```sql
-- Ejecutar en Supabase SQL Editor
-- Ver: limpiar_usuarios_legacy.sql
```

---

## 🔍 Troubleshooting

### ❌ Error: "Usuario no encontrado"

**Causa**: No hay usuarios en `usuarios_sistema`

**Solución**:
```bash
# 1. Verificar
node listar_usuarios_sistema.js

# 2. Si está vacío, crear usuario
# Ejecutar crear_usuario_admin.sql en Supabase
```

### ❌ Error 406 (Not Acceptable)

**Causa**: Código antiguo con password en URL

**Solución**: ✅ Ya está corregido en `Login.jsx`

### ❌ Error: "Sin permisos"

**Causa**: Usuario sin permisos asignados

**Solución**:
```sql
-- Ejecutar en Supabase SQL Editor
-- Ver sección 4 de crear_usuario_admin.sql
```

### ❌ Usuario legacy detectado

**Causa**: Sesión antigua en localStorage

**Solución**: ✅ Se limpia automáticamente

---

## 📊 Estructura de Permisos

### Tabla: `usuarios_sistema`
```sql
- id (uuid)
- email (text, unique)
- password (text) -- ⚠️ Temporal, usar hash en producción
- nombre_completo (text)
- rol_id (uuid, FK a roles)
- activo (boolean)
- legacy_id (uuid, nullable) -- Para migración
- created_at (timestamp)
```

### Tabla: `permisos_usuario`
```sql
- id (uuid)
- usuario_id (uuid, FK a usuarios_sistema)
- modulo_id (uuid, FK a modulos)
- puede_ver (boolean)
- puede_crear (boolean)
- puede_editar (boolean)
- puede_eliminar (boolean)
```

### Tabla: `roles`
```sql
- id (uuid)
- nombre (text)
- descripcion (text)
```

### Tabla: `modulos`
```sql
- id (uuid)
- codigo (text, unique)
- nombre (text)
- activo (boolean)
```

---

## 🎯 Flujo de Autenticación

```
1. Usuario ingresa email/password
   ↓
2. Sistema busca en usuarios_sistema (sin password en query)
   ↓
3. Verifica password en el cliente
   ↓
4. Carga permisos desde permisos_usuario
   ↓
5. Guarda sesión en localStorage
   ↓
6. Muestra módulos según permisos
```

---

## 🔒 Seguridad

### ✅ Implementado
- Password NO va en URL (corregido error 406)
- Verificación de sesión en cada carga
- Permisos estrictos por módulo
- Usuarios legacy bloqueados
- Sesiones inválidas se limpian automáticamente

### ⚠️ Pendiente (Producción)
- [ ] Hash de passwords (bcrypt/argon2)
- [ ] Rate limiting en login
- [ ] Recuperación de contraseña
- [ ] 2FA (autenticación de dos factores)
- [ ] Logs de auditoría
- [ ] Expiración de sesiones

---

## 📝 Notas Importantes

1. **Módulos Especiales**: "Servidor" y "Base de Datos" son visibles para todos
2. **Otros Módulos**: Requieren permisos explícitos
3. **Usuarios Legacy**: Ya no son soportados
4. **Passwords**: Actualmente en texto plano (temporal)
5. **Sesiones**: Se verifican contra BD en cada carga

---

## 🆘 Soporte

### Orden de Diagnóstico
1. ✅ Ejecutar `node listar_usuarios_sistema.js`
2. ✅ Ejecutar `node diagnostico_permisos.js`
3. ✅ Revisar logs en consola del navegador (F12)
4. ✅ Verificar tabla `usuarios_sistema` en Supabase
5. ✅ Verificar tabla `permisos_usuario` en Supabase

### Logs Útiles
```javascript
// En la consola del navegador
🔐 Intentando login con: [email]
✅ Usuario del sistema encontrado: [email]
✅ Permisos cargados: [número] módulos
✅ Login exitoso - Guardando sesión...
```

---

## 📞 Contacto

Para problemas o preguntas:
1. Revisar documentación en este directorio
2. Ejecutar scripts de diagnóstico
3. Revisar logs del sistema
4. Verificar base de datos en Supabase

---

## ✨ Changelog

### v4 (2024-04-17)
- ✅ Eliminado soporte para usuarios legacy
- ✅ Corregido error 406 en login
- ✅ Implementado sistema de permisos estricto
- ✅ Agregados scripts de utilidad
- ✅ Documentación completa

### v3 (2024-04-14)
- Módulos Servidor y Base de Datos siempre visibles

### v2
- Sistema de permisos por módulo

### v1
- Sistema básico de usuarios
