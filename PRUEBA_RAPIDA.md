# 🚀 PRUEBA RÁPIDA - Gestión de Usuarios

## ⚡ Inicio Rápido (3 pasos)

### 1️⃣ Inicia el Servidor
```bash
npm run dev
```

### 2️⃣ Abre el Navegador
- Ve a: **http://localhost:5173**
- Presiona **F12** para abrir la consola

### 3️⃣ Inicia Sesión y Prueba
```
Email: agroverde@gmail.com
Contraseña: [tu contraseña]
```

Luego haz clic en **"Usuarios"** en el menú lateral.

---

## ✅ ¿Qué Deberías Ver?

### En la Pantalla:
- ✅ Tabla con el usuario "gestion"
- ✅ Botón "Nuevo Usuario" (esquina superior derecha)
- ✅ Acciones: Editar ✏️, Permisos 👁️, Eliminar 🗑️

### En la Consola (F12):
```
🔄 GestionUsuarios: Iniciando carga de datos...
👥 Usuarios cargados: [Array(1)]
🎭 Roles cargados: [Array(3)]
📦 Módulos cargados: [Array(21)]
✅ Estado actualizado - Usuarios: 1 Roles: 3 Módulos: 21
```

---

## 🧪 Pruebas Adicionales

### Crear un Nuevo Usuario
1. Haz clic en **"Nuevo Usuario"**
2. Completa:
   - Email: `test@agroverde.com`
   - Contraseña: `123456`
   - Nombre: `Usuario de Prueba`
   - Rol: Selecciona uno
   - ✓ Usuario Activo
3. Haz clic en **"Crear"**

### Editar Permisos
1. Haz clic en el ícono de ojo 👁️ junto a un usuario
2. Marca/desmarca los permisos por módulo
3. Haz clic en **"Guardar"**

---

## ❌ Si Algo Sale Mal

### No se cargan los usuarios
```bash
# Verifica la conexión
node test_usuarios.js
```

### No aparece el módulo de Usuarios
```bash
# Repara permisos
node reparar_permisos_usuarios.js admin agroverde@gmail.com
```

### Error al crear usuario
- ✅ Verifica que todos los campos estén completos
- ✅ Verifica que la contraseña tenga mínimo 6 caracteres
- ✅ Verifica que el email no esté duplicado
- ✅ Revisa los logs en la consola (F12)

---

## 📊 Verificación Rápida de Base de Datos

```bash
node test_usuarios.js
```

**Resultado esperado**:
```
✅ Usuarios encontrados: 1
✅ Roles encontrados: 3
✅ Módulos encontrados: 21
✅ Permisos encontrados: 21
```

---

## 🎯 Checklist Rápido

- [ ] Servidor iniciado (`npm run dev`)
- [ ] Navegador abierto (http://localhost:5173)
- [ ] Consola abierta (F12)
- [ ] Sesión iniciada
- [ ] Módulo "Usuarios" visible en el menú
- [ ] Tabla de usuarios cargada
- [ ] Logs en consola sin errores

---

## 📞 ¿Necesitas Ayuda?

1. **Revisa la consola** (F12) para ver errores específicos
2. **Ejecuta**: `node test_usuarios.js` para verificar la base de datos
3. **Lee**: `RESUMEN_SOLUCION_USUARIOS.md` para más detalles
4. **Captura**: Pantalla + logs de consola si el problema persiste

---

**¡Listo para probar! 🚀**
