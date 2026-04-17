# 🔧 Solución: Usuarios no aparecen en Gestión de Usuarios

## 📋 Problema Identificado

El sistema permite login con credenciales antiguas, pero al entrar a "Gestión de Usuarios" no aparecen los usuarios registrados.

## 🎯 Causas Posibles

1. **Tablas no existen**: Las tablas `usuarios_sistema`, `roles`, `modulos` no están creadas en Supabase
2. **RLS (Row Level Security) activo**: Supabase tiene políticas de seguridad que bloquean las consultas
3. **Permisos insuficientes**: El usuario no tiene permisos para leer las tablas
4. **Datos en tabla incorrecta**: Los usuarios están en `users` (legacy) pero el componente busca en `usuarios_sistema`

## ✅ Soluciones Paso a Paso

### Opción 1: Usar el Componente de Diagnóstico (RECOMENDADO)

1. **Acceder al diagnóstico temporal**:
   - Abre la consola del navegador (F12)
   - En la consola, escribe: `window.location.hash = '#diagnostico'`
   - O modifica temporalmente el código para agregar un botón de diagnóstico

2. **Agregar botón de diagnóstico temporal**:
   ```javascript
   // En App.jsx, agregar en el header:
   <button onClick={() => setActiveModule('diagnostico')}>
     🔍 Diagnóstico
   </button>
   ```

3. **Revisar los resultados**:
   - ✅ Verde = Tabla existe y tiene datos
   - ❌ Rojo = Error (ver detalles del error)
   - ⚠️ Amarillo = Tabla vacía

### Opción 2: Ejecutar Script SQL en Supabase

1. **Ir a Supabase Dashboard**:
   - Abre https://supabase.com
   - Selecciona tu proyecto
   - Ve a "SQL Editor"

2. **Ejecutar el script de inicialización**:
   - Abre el archivo `inicializar_sistema_usuarios.sql`
   - Copia todo el contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en "Run"

3. **Verificar la creación**:
   - El script creará:
     - ✅ Tabla `roles` con 3 roles básicos
     - ✅ Tabla `usuarios_sistema` 
     - ✅ Tabla `modulos` con 22 módulos
     - ✅ Tabla `permisos_usuario`
     - ✅ Usuario admin por defecto

4. **Credenciales del admin creado**:
   ```
   Email: admin@agroverde.com
   Contraseña: admin123
   ```
   ⚠️ **IMPORTANTE**: Cambiar esta contraseña después del primer login

### Opción 3: Verificar RLS (Row Level Security)

Si las tablas existen pero no cargan datos:

1. **Ir a Supabase Dashboard** → **Authentication** → **Policies**

2. **Deshabilitar RLS temporalmente** (solo para desarrollo):
   ```sql
   ALTER TABLE usuarios_sistema DISABLE ROW LEVEL SECURITY;
   ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
   ALTER TABLE modulos DISABLE ROW LEVEL SECURITY;
   ALTER TABLE permisos_usuario DISABLE ROW LEVEL SECURITY;
   ```

3. **O crear políticas permisivas** (mejor para producción):
   ```sql
   -- Permitir lectura a todos los usuarios autenticados
   CREATE POLICY "Permitir lectura usuarios_sistema" 
   ON usuarios_sistema FOR SELECT 
   USING (true);

   CREATE POLICY "Permitir lectura roles" 
   ON roles FOR SELECT 
   USING (true);

   CREATE POLICY "Permitir lectura modulos" 
   ON modulos FOR SELECT 
   USING (true);
   ```

### Opción 4: Verificar Manualmente en Supabase

1. **Ir a Table Editor** en Supabase
2. **Buscar las tablas**:
   - `usuarios_sistema`
   - `roles`
   - `modulos`
   - `permisos_usuario`

3. **Si no existen**, ejecutar el script `inicializar_sistema_usuarios.sql`

4. **Si existen pero están vacías**, insertar datos manualmente o con el script

## 🔍 Verificación con SQL

Ejecuta este script en Supabase SQL Editor para verificar:

```sql
-- Ver usuarios del sistema
SELECT * FROM usuarios_sistema;

-- Ver usuarios legacy
SELECT * FROM users;

-- Ver roles
SELECT * FROM roles;

-- Ver módulos
SELECT * FROM modulos;

-- Ver permisos
SELECT 
    u.email,
    m.nombre as modulo,
    p.puede_ver,
    p.puede_crear
FROM permisos_usuario p
JOIN usuarios_sistema u ON p.usuario_id = u.id
JOIN modulos m ON p.modulo_id = m.id;
```

## 📝 Cambios Realizados en el Código

### 1. Login.jsx
- ✅ Mejorado manejo de errores con `.maybeSingle()`
- ✅ Verificación de contraseña en código (no en SQL)
- ✅ Soporte para `password` y `password_hash`

### 2. Register.jsx
- ✅ Verificación previa de email existente
- ✅ Mejor manejo de errores
- ✅ Guardado automático de sesión
- ✅ Tipo de usuario agregado

### 3. GestionUsuarios.jsx
- ✅ Manejo de errores mejorado
- ✅ Fallback a consulta simple si falla el JOIN
- ✅ Logs detallados en consola
- ✅ Mensajes de error más claros

### 4. DiagnosticoUsuarios.jsx (NUEVO)
- ✅ Componente para diagnosticar problemas
- ✅ Muestra estado de todas las tablas
- ✅ Detalles de errores
- ✅ Conteo de registros

## 🚀 Próximos Pasos

1. **Ejecutar el script SQL** en Supabase
2. **Probar login** con las credenciales del admin
3. **Verificar que aparezcan usuarios** en Gestión de Usuarios
4. **Crear usuarios adicionales** desde la interfaz
5. **Configurar permisos** para cada usuario

## ⚠️ Notas Importantes

- Las contraseñas están en **texto plano** (no hasheadas)
  - Para producción, implementar bcrypt o similar
- RLS está **deshabilitado** para desarrollo
  - Para producción, configurar políticas apropiadas
- El usuario admin tiene **todos los permisos**
  - Cambiar la contraseña después del primer login

## 🆘 Si Aún No Funciona

1. **Revisar la consola del navegador** (F12) para ver errores
2. **Revisar los logs de Supabase** en el dashboard
3. **Verificar la URL y API Key** en `src/lib/supabase.js`
4. **Verificar que el proyecto de Supabase esté activo**
5. **Contactar soporte** con los logs de error

## 📞 Información de Depuración

Cuando el componente carga, revisa la consola del navegador:
- `🔄 GestionUsuarios: Iniciando carga de datos...`
- `👥 Usuarios cargados: [...]`
- `🎭 Roles cargados: [...]`
- `📦 Módulos cargados: [...]`

Si ves errores, copia el mensaje completo para diagnóstico.
