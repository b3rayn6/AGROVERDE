# 📝 Instrucciones para Crear Usuarios

## 🚨 Problema Actual

**No hay usuarios en la tabla `usuarios_sistema`**, por eso el login falla con error 406 y "Credenciales incorrectas".

---

## ✅ Solución: Crear Usuario Administrador

### Opción 1: Usando SQL (Recomendado)

1. **Abrir Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto: `njzpozedfitrwphrjmsb`

2. **Ir al SQL Editor**
   - Click en "SQL Editor" en el menú lateral
   - Click en "New query"

3. **Ejecutar el script**
   - Abre el archivo: `crear_usuario_admin.sql`
   - Copia y pega el contenido en el SQL Editor
   - **IMPORTANTE**: Cambia el email y password si lo deseas
   - Click en "Run" o presiona `Ctrl + Enter`

4. **Verificar creación**
   - El script mostrará:
     - ✅ Usuario creado
     - ✅ Permisos asignados
     - ✅ Total de módulos con acceso

---

### Opción 2: Usando la Interfaz de Supabase

1. **Ir a Table Editor**
   - Click en "Table Editor"
   - Selecciona la tabla `usuarios_sistema`

2. **Insertar nuevo usuario**
   - Click en "Insert" → "Insert row"
   - Llenar los campos:
     ```
     email: admin@agroverde.com
     password: 12345678
     nombre_completo: Administrador del Sistema
     rol_id: [ID del rol Administrador]
     activo: true
     ```

3. **Asignar permisos**
   - Ve a la tabla `permisos_usuario`
   - Inserta permisos para cada módulo que necesites

---

## 🔐 Credenciales por Defecto

Después de ejecutar el script SQL:

```
Email: admin@agroverde.com
Password: 12345678
```

⚠️ **IMPORTANTE**: Cambia el password después del primer login.

---

## 📊 Verificar que Funciona

### 1. Ejecutar diagnóstico
```bash
node diagnostico_permisos.js
```

Deberías ver:
```
✅ Usuario encontrado: admin@agroverde.com
✅ Permisos encontrados: [número] módulos
```

### 2. Probar login en la aplicación
- Abre la aplicación
- Ingresa: `admin@agroverde.com`
- Password: `12345678`
- Deberías ver todos los módulos disponibles

---

## 🐛 Troubleshooting

### Error: "Usuario no encontrado"
- ✅ Verifica que ejecutaste el script SQL
- ✅ Verifica que el usuario está activo (`activo = true`)
- ✅ Ejecuta: `node listar_usuarios_sistema.js`

### Error: "Sin permisos"
- ✅ Verifica que se asignaron permisos
- ✅ Ejecuta la parte 4 del script SQL (asignar permisos)
- ✅ Verifica en la tabla `permisos_usuario`

### Error 406
- ✅ Ya está corregido en el código
- ✅ Asegúrate de tener la última versión de `Login.jsx`

---

## 📝 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `crear_usuario_admin.sql` | Crea usuario admin con todos los permisos |
| `listar_usuarios_sistema.js` | Lista todos los usuarios |
| `diagnostico_permisos.js` | Verifica permisos de un usuario |
| `limpiar_usuarios_legacy.sql` | Limpia usuarios legacy (opcional) |

---

## 🎯 Próximos Pasos

1. ✅ Ejecutar `crear_usuario_admin.sql` en Supabase
2. ✅ Verificar con `node listar_usuarios_sistema.js`
3. ✅ Probar login en la aplicación
4. ✅ Crear más usuarios según necesites
5. ✅ Configurar permisos específicos por rol

---

## 🔒 Seguridad

- ⚠️ Los passwords están en texto plano (temporal)
- 🔐 En producción, implementar hashing (bcrypt, argon2)
- 🔑 Cambiar passwords por defecto
- 🛡️ Implementar rate limiting en login
- 📧 Implementar recuperación de contraseña

---

## 💡 Notas

- Los módulos "Servidor" y "Base de Datos" son visibles para todos
- Otros módulos requieren permisos explícitos
- Los usuarios legacy ya no son soportados
- Las sesiones se verifican contra la base de datos en cada carga
