# 🔄 Actualización del Sistema de Registro

## 🐛 Problema Original

```
❌ Error 409 (Conflict) al registrar usuario
❌ Intentaba crear en tabla "users" (legacy)
❌ Usuario ya existía en tabla legacy
```

---

## ✅ Solución Implementada

### Cambios en `Register.jsx`

#### Antes (❌):
```javascript
// Usaba tabla legacy "users"
await supabase
  .from('users')
  .insert([{
    nombre: formData.nombre,
    email: formData.email,
    password_hash: formData.password
  }])
```

#### Ahora (✅):
```javascript
// Usa tabla del sistema "usuarios_sistema"
await supabase
  .from('usuarios_sistema')
  .insert([{
    nombre_completo: formData.nombre_completo,
    email: formData.email,
    password: formData.password,
    rol_id: formData.rol_id,
    activo: true
  }])
```

---

## 🆕 Nuevas Características

### 1. Selección de Rol
- ✅ El usuario selecciona su rol al registrarse
- ✅ Roles cargados dinámicamente desde la BD
- ✅ Rol por defecto: "Usuario" o "Visualizador"

### 2. Permisos Automáticos
- ✅ Se asignan permisos básicos (solo lectura) automáticamente
- ✅ Módulos incluidos:
  - Pesadas
  - Facturas Factoría
  - Clientes
  - Suplidores
  - Inventario

### 3. Validaciones Mejoradas
- ✅ Password mínimo 8 caracteres (antes 6)
- ✅ Verificación de email duplicado antes de insertar
- ✅ Validación de rol seleccionado
- ✅ Mensajes de error más claros

### 4. Integración Completa
- ✅ Usuario creado en `usuarios_sistema`
- ✅ Permisos asignados en `permisos_usuario`
- ✅ Login automático después del registro
- ✅ Sesión guardada correctamente

---

## 📋 Flujo de Registro Actualizado

```
1. Usuario llena formulario
   - Nombre completo
   - Email
   - Rol (selección)
   - Password (mín 8 caracteres)
   - Confirmar password
   ↓
2. Validaciones
   - Passwords coinciden
   - Email no existe
   - Rol seleccionado
   ↓
3. Crear usuario en usuarios_sistema
   ↓
4. Asignar permisos básicos (solo lectura)
   ↓
5. Cargar permisos del usuario
   ↓
6. Login automático
   ↓
7. Redirigir al dashboard
```

---

## 🎯 Campos del Formulario

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| Nombre Completo | text | ✅ | - |
| Email | email | ✅ | Único en BD |
| Rol | select | ✅ | Debe existir en roles |
| Password | password | ✅ | Mínimo 8 caracteres |
| Confirmar Password | password | ✅ | Debe coincidir |

---

## 🔐 Permisos por Defecto

Usuarios nuevos reciben **solo lectura** en:

```javascript
const modulosBasicos = [
  'pesadas',
  'facturas_factoria',
  'clientes',
  'suplidores',
  'inventario'
];

// Permisos asignados:
{
  puede_ver: true,
  puede_crear: false,
  puede_editar: false,
  puede_eliminar: false
}
```

---

## 🛠️ Roles Disponibles

Según el diagnóstico, hay 3 roles:

1. **Administrador** - Acceso total al sistema
2. **Facturador** - Puede crear y ver facturas
3. **Visualizador** - Solo puede ver reportes

---

## 📝 Logs del Sistema

### Registro Exitoso
```
🔐 Registrando nuevo usuario: usuario@ejemplo.com
✅ Usuario creado exitosamente: usuario@ejemplo.com
✅ Permisos básicos asignados
✅ Registro completado - Iniciando sesión...
```

### Registro Fallido (Email Duplicado)
```
🔐 Registrando nuevo usuario: admin@agroverde.com
❌ El correo electrónico ya está registrado
```

---

## 🚀 Cómo Usar

### Opción 1: Registro desde la Aplicación
1. Abrir la aplicación
2. Click en "¿No tienes cuenta? Regístrate aquí"
3. Llenar el formulario:
   - Nombre completo
   - Email
   - Seleccionar rol
   - Password (mín 8 caracteres)
   - Confirmar password
4. Click en "Crear Cuenta"
5. Login automático

### Opción 2: Crear Usuario Administrador (SQL)
```bash
# Para crear un admin con todos los permisos
# Ejecutar en Supabase SQL Editor:
# crear_usuario_admin.sql
```

### Opción 3: CLI Interactivo
```bash
node crear_usuario_cli.js
```

---

## ⚠️ Notas Importantes

1. **Usuarios nuevos tienen permisos limitados**
   - Solo lectura en módulos básicos
   - Un administrador debe asignar más permisos si es necesario

2. **Módulos siempre visibles**
   - "Servidor" y "Base de Datos" son visibles para todos
   - Independiente de los permisos

3. **Passwords en texto plano**
   - ⚠️ Temporal para desarrollo
   - 🔐 En producción usar bcrypt/argon2

4. **Rol requerido**
   - No se puede crear usuario sin rol
   - Rol por defecto: "Usuario" o "Visualizador"

---

## 🔍 Troubleshooting

### Error: "El correo ya está registrado"
**Causa**: Email existe en `usuarios_sistema`

**Solución**:
- Usar otro email
- O iniciar sesión con ese email

### Error: "Debes seleccionar un rol"
**Causa**: No hay roles en la BD o no se seleccionó

**Solución**:
```sql
-- Verificar roles en Supabase
SELECT * FROM roles;
```

### Error: "La contraseña debe tener al menos 8 caracteres"
**Causa**: Password muy corto

**Solución**: Usar password de 8+ caracteres

### No aparecen roles en el select
**Causa**: No hay roles en la tabla `roles`

**Solución**:
```sql
-- Crear roles básicos
INSERT INTO roles (nombre, descripcion) VALUES
  ('Administrador', 'Acceso total al sistema'),
  ('Usuario', 'Acceso limitado'),
  ('Visualizador', 'Solo lectura');
```

---

## 📊 Comparación: Antes vs Ahora

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Tabla | ❌ users (legacy) | ✅ usuarios_sistema |
| Rol | ❌ No disponible | ✅ Selección requerida |
| Permisos | ❌ No asignados | ✅ Básicos automáticos |
| Password mínimo | ❌ 6 caracteres | ✅ 8 caracteres |
| Verificación email | ❌ Solo en BD | ✅ Antes de insertar |
| Login automático | ❌ No | ✅ Sí |
| Error 409 | ❌ Sí | ✅ No |

---

## ✨ Resultado Final

- ✅ Registro funciona correctamente
- ✅ Usuarios creados en tabla correcta
- ✅ Permisos asignados automáticamente
- ✅ Login automático después del registro
- ✅ Sin errores 409
- ✅ Validaciones mejoradas
- ✅ Experiencia de usuario mejorada

---

## 🎓 Para Administradores

### Asignar más permisos a un usuario
```sql
-- Ver permisos actuales
SELECT u.email, m.nombre, p.*
FROM permisos_usuario p
JOIN usuarios_sistema u ON u.id = p.usuario_id
JOIN modulos m ON m.id = p.modulo_id
WHERE u.email = 'usuario@ejemplo.com';

-- Dar permisos de creación
UPDATE permisos_usuario
SET puede_crear = true
WHERE usuario_id = (SELECT id FROM usuarios_sistema WHERE email = 'usuario@ejemplo.com')
  AND modulo_id = (SELECT id FROM modulos WHERE codigo = 'pesadas');
```

### Cambiar rol de un usuario
```sql
UPDATE usuarios_sistema
SET rol_id = (SELECT id FROM roles WHERE nombre = 'Administrador')
WHERE email = 'usuario@ejemplo.com';
```

### Desactivar un usuario
```sql
UPDATE usuarios_sistema
SET activo = false
WHERE email = 'usuario@ejemplo.com';
```
