# 🚨 Error: ERR_NAME_NOT_RESOLVED - Supabase

## 📋 Error Detectado

```
GET https://njzpozedfitrwphrjmsb.supabase.co/rest/v1/usuarios_sistema
net::ERR_NAME_NOT_RESOLVED
```

Este error significa que **el navegador no puede resolver la URL de Supabase**. La URL no existe o el proyecto fue pausado/eliminado.

## 🎯 Causa Principal

Tu proyecto de Supabase con la URL `https://njzpozedfitrwphrjmsb.supabase.co` está:
- ❌ **Pausado** (inactivo por falta de uso)
- ❌ **Eliminado** (borrado del dashboard)
- ❌ **Nunca existió** (URL incorrecta)

## ✅ Solución Paso a Paso

### Paso 1: Verificar el Estado del Proyecto

1. **Ir a Supabase Dashboard**:
   - Abre: https://supabase.com/dashboard
   - Inicia sesión con tu cuenta

2. **Buscar tu proyecto**:
   - Busca el proyecto con referencia: `njzpozedfitrwphrjmsb`
   - Verifica su estado

### Paso 2A: Si el Proyecto Está Pausado

1. **Reactivar el proyecto**:
   - Haz clic en el proyecto
   - Busca el botón "Resume" o "Reactivar"
   - Espera unos minutos a que se active

2. **Verificar la conexión**:
   - Ejecuta el servidor de desarrollo: `npm run dev`
   - Intenta hacer login nuevamente

### Paso 2B: Si el Proyecto No Existe

Necesitas crear un nuevo proyecto de Supabase:

#### 1. Crear Nuevo Proyecto

1. Ve a https://supabase.com/dashboard
2. Haz clic en "New Project"
3. Completa:
   - **Name**: AgroVerde (o el nombre que prefieras)
   - **Database Password**: Guarda esta contraseña (la necesitarás)
   - **Region**: Selecciona la más cercana a República Dominicana (ej: us-east-1)
4. Haz clic en "Create new project"
5. Espera 2-3 minutos mientras se crea

#### 2. Obtener las Credenciales

1. Una vez creado, ve a **Settings** → **API**
2. Copia:
   - **Project URL** (ej: `https://xxxxx.supabase.co`)
   - **anon public** key (la clave larga que empieza con `eyJ...`)

#### 3. Actualizar el Archivo .env

Abre el archivo `.env` en la raíz del proyecto y actualiza:

```env
VITE_SUPABASE_URL=https://TU_NUEVA_URL.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ_TU_NUEVA_KEY_AQUI...
```

**⚠️ IMPORTANTE**: Después de cambiar el `.env`, debes **reiniciar el servidor**:
```bash
# Detener el servidor (Ctrl+C)
# Luego iniciar nuevamente:
npm run dev
```

#### 4. Crear las Tablas en el Nuevo Proyecto

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Copia el contenido del archivo `inicializar_sistema_usuarios.sql`
3. Pégalo en el editor
4. Haz clic en **Run**
5. Verifica que se crearon las tablas en **Table Editor**

#### 5. Probar la Conexión

1. Abre tu aplicación: http://localhost:5173
2. Intenta hacer login con:
   ```
   Email: admin@agroverde.com
   Contraseña: admin123
   ```

### Paso 3: Verificar la Conexión

Puedes usar el componente de verificación que creé:

1. Abre la consola del navegador (F12)
2. Escribe: `window.location.href = '/verificar-conexion'`
3. O agrega temporalmente un botón en el login

## 🔧 Comandos Útiles

### Reiniciar el Servidor de Desarrollo
```bash
# Detener (Ctrl+C en la terminal)
# Luego:
npm run dev
```

### Verificar Variables de Entorno
```bash
# En Windows PowerShell:
Get-Content .env

# Debe mostrar:
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

### Limpiar Caché del Navegador
```
1. Abre DevTools (F12)
2. Haz clic derecho en el botón de recargar
3. Selecciona "Empty Cache and Hard Reload"
```

## 📝 Checklist de Verificación

- [ ] El proyecto de Supabase existe y está activo
- [ ] La URL en `.env` es correcta
- [ ] La API Key en `.env` es correcta
- [ ] Reiniciaste el servidor después de cambiar `.env`
- [ ] Las tablas están creadas en Supabase
- [ ] RLS está deshabilitado (para desarrollo)
- [ ] Limpiaste el caché del navegador

## 🆘 Si Aún No Funciona

### Verificar que el .env se está cargando

Agrega esto temporalmente en `src/lib/supabase.js`:

```javascript
console.log('🔍 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('🔍 Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
```

Luego abre la consola del navegador y verifica que se muestren los valores correctos.

### Verificar la URL manualmente

Abre en tu navegador:
```
https://TU_URL.supabase.co/rest/v1/
```

Deberías ver un mensaje de error de Supabase (es normal), pero NO un error de "sitio no encontrado".

## 📞 Información Adicional

### ¿Por qué se pausan los proyectos?

Supabase pausa proyectos gratuitos después de:
- 1 semana de inactividad
- No hay conexiones a la base de datos

### ¿Cómo evitar que se pause?

1. Usa el proyecto regularmente
2. Considera el plan Pro si es para producción
3. Configura un "keep-alive" (ping periódico)

### ¿Puedo recuperar los datos?

- Si el proyecto fue **pausado**: Sí, solo reactívalo
- Si el proyecto fue **eliminado**: No, los datos se pierden permanentemente

## 🎯 Próximos Pasos Recomendados

1. ✅ Crear nuevo proyecto de Supabase (si es necesario)
2. ✅ Actualizar `.env` con las nuevas credenciales
3. ✅ Reiniciar el servidor de desarrollo
4. ✅ Ejecutar `inicializar_sistema_usuarios.sql`
5. ✅ Probar login con admin@agroverde.com / admin123
6. ✅ Crear tus propios usuarios
7. ✅ Cambiar la contraseña del admin

## 💡 Consejo Pro

Guarda las credenciales de Supabase en un lugar seguro:
- URL del proyecto
- API Keys (anon y service_role)
- Contraseña de la base de datos

Esto te ahorrará tiempo si necesitas reconfigurar el proyecto.
