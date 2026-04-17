# 🚨 INSTRUCCIONES URGENTES - Error de Conexión

## ❌ Problema Actual

Tu aplicación no puede conectarse a Supabase. El error es:
```
ERR_NAME_NOT_RESOLVED
https://njzpozedfitrwphrjmsb.supabase.co
```

Esto significa que **el proyecto de Supabase no existe o está pausado**.

---

## ✅ SOLUCIÓN RÁPIDA (5 minutos)

### Paso 1: Verificar tu Proyecto de Supabase

1. **Abre**: https://supabase.com/dashboard
2. **Inicia sesión** con tu cuenta
3. **Busca** el proyecto con referencia: `njzpozedfitrwphrjmsb`

**¿Qué ves?**

#### Opción A: El proyecto aparece pero está pausado
- ✅ Haz clic en **"Resume"** o **"Reactivar"**
- ⏳ Espera 2-3 minutos
- ✅ Continúa al **Paso 2**

#### Opción B: El proyecto NO aparece
- ❌ El proyecto fue eliminado o nunca existió
- ✅ Continúa al **Paso 1B** (crear nuevo proyecto)

---

### Paso 1B: Crear Nuevo Proyecto (si es necesario)

1. En https://supabase.com/dashboard haz clic en **"New Project"**

2. Completa el formulario:
   - **Name**: `AgroVerde` (o el nombre que prefieras)
   - **Database Password**: Crea una contraseña segura y **guárdala**
   - **Region**: Selecciona `us-east-1` (más cercano a RD)

3. Haz clic en **"Create new project"**

4. ⏳ Espera 2-3 minutos mientras se crea

5. Una vez creado, ve a **Settings** → **API**

6. **Copia estas dos cosas**:
   ```
   Project URL: https://xxxxx.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

### Paso 2: Actualizar el Archivo .env

1. **Abre** el archivo `.env` en la raíz de tu proyecto

2. **Reemplaza** las líneas con tus nuevas credenciales:
   ```env
   VITE_SUPABASE_URL=https://TU_NUEVA_URL.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ_TU_NUEVA_KEY_COMPLETA_AQUI
   ```

3. **Guarda** el archivo

---

### Paso 3: Reiniciar el Servidor

**MUY IMPORTANTE**: Debes reiniciar el servidor después de cambiar el `.env`

1. En la terminal donde corre el servidor, presiona **Ctrl+C** para detenerlo

2. Ejecuta nuevamente:
   ```bash
   npm run dev
   ```

3. Espera a que diga: `Local: http://localhost:3000/`

---

### Paso 4: Crear las Tablas en Supabase

1. En el dashboard de Supabase, ve a **SQL Editor** (icono de código)

2. Haz clic en **"New query"**

3. **Copia TODO** el contenido del archivo `inicializar_sistema_usuarios.sql`

4. **Pégalo** en el editor

5. Haz clic en **"Run"** (botón verde)

6. Deberías ver: `Success. No rows returned`

7. Ve a **Table Editor** y verifica que aparezcan estas tablas:
   - ✅ `roles`
   - ✅ `usuarios_sistema`
   - ✅ `modulos`
   - ✅ `permisos_usuario`
   - ✅ `users`

---

### Paso 5: Probar el Login

1. Abre tu aplicación: http://localhost:3000

2. Intenta hacer login con:
   ```
   Email: admin@agroverde.com
   Contraseña: admin123
   ```

3. **¿Funcionó?**
   - ✅ **SÍ**: ¡Perfecto! Ya puedes usar el sistema
   - ❌ **NO**: Continúa al paso de verificación

---

## 🔍 Verificación Rápida

Si aún tienes problemas, ejecuta este comando:

```bash
npm run verificar
```

Esto te mostrará si tu configuración es correcta.

---

## 🆘 Solución de Problemas Comunes

### Error: "Credenciales incorrectas"
- ✅ Verifica que ejecutaste el script SQL
- ✅ Usa exactamente: `admin@agroverde.com` / `admin123`
- ✅ Verifica en **Table Editor** → `usuarios_sistema` que existe el usuario

### Error: "No se puede conectar"
- ✅ Verifica que el proyecto de Supabase esté activo (no pausado)
- ✅ Verifica que copiaste correctamente la URL y la API Key
- ✅ Reinicia el servidor después de cambiar el `.env`

### Error: "Tabla no existe"
- ✅ Ejecuta el script `inicializar_sistema_usuarios.sql` en SQL Editor
- ✅ Verifica en **Table Editor** que las tablas existen

### El servidor no inicia
```bash
# Detener cualquier proceso en el puerto 3000
# En Windows PowerShell:
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force

# Luego iniciar nuevamente:
npm run dev
```

---

## 📋 Checklist Final

Antes de pedir ayuda, verifica:

- [ ] El proyecto de Supabase existe y está activo (no pausado)
- [ ] Copiaste correctamente la URL en `.env`
- [ ] Copiaste correctamente la API Key en `.env`
- [ ] Reiniciaste el servidor después de cambiar `.env`
- [ ] Ejecutaste el script SQL `inicializar_sistema_usuarios.sql`
- [ ] Las tablas aparecen en **Table Editor**
- [ ] Limpiaste el caché del navegador (Ctrl+Shift+R)

---

## 💡 Comandos Útiles

```bash
# Verificar configuración
npm run verificar

# Reiniciar servidor
# Ctrl+C para detener, luego:
npm run dev

# Ver contenido del .env
Get-Content .env

# Limpiar caché de npm (si hay problemas)
npm cache clean --force
npm install
```

---

## 📞 ¿Necesitas Ayuda?

Si después de seguir todos estos pasos aún tienes problemas:

1. **Abre la consola del navegador** (F12)
2. **Copia todos los errores** que aparezcan en rojo
3. **Toma una captura** del dashboard de Supabase mostrando tu proyecto
4. **Comparte** el contenido de tu archivo `.env` (sin la API Key completa)

---

## 🎯 Resumen Ultra-Rápido

```bash
# 1. Crear/Reactivar proyecto en Supabase
# 2. Copiar URL y API Key
# 3. Actualizar .env
# 4. Reiniciar servidor (Ctrl+C, luego npm run dev)
# 5. Ejecutar SQL en Supabase
# 6. Login: admin@agroverde.com / admin123
```

---

**⏱️ Tiempo estimado**: 5-10 minutos

**🎯 Resultado esperado**: Sistema funcionando con login exitoso
