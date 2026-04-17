# ✅ Checklist de Verificación

## 📋 Verificar que Todo Funciona

### 1. Verificar Conexión y Configuración

- [ ] **Ejecutar diagnóstico completo**
  ```bash
  node diagnostico_completo.js
  ```
  
  **Resultado esperado**:
  ```
  ✅ Conexión exitosa
  ✅ Roles encontrados: 3
  ✅ Módulos encontrados: 21
  ⚠️  NO HAY USUARIOS (si no has creado ninguno)
  ```

---

### 2. Crear Primer Usuario

Elige UNA de estas opciones:

#### Opción A: Registro desde la Aplicación (Recomendado)

- [ ] Abrir la aplicación en el navegador
- [ ] Click en "¿No tienes cuenta? Regístrate aquí"
- [ ] Llenar formulario:
  - [ ] Nombre completo
  - [ ] Email válido
  - [ ] Seleccionar rol "Administrador"
  - [ ] Password de 8+ caracteres
  - [ ] Confirmar password
- [ ] Click en "Crear Cuenta"
- [ ] Verificar login automático ✅
- [ ] Verificar que aparecen los módulos

#### Opción B: SQL en Supabase

- [ ] Abrir Supabase Dashboard
- [ ] Ir a SQL Editor
- [ ] Copiar contenido de `crear_usuario_admin.sql`
- [ ] Ejecutar script
- [ ] Verificar mensaje de éxito
- [ ] Anotar credenciales:
  ```
  Email: admin@agroverde.com
  Password: 12345678
  ```

---

### 3. Verificar Usuario Creado

- [ ] **Listar usuarios**
  ```bash
  node listar_usuarios_sistema.js
  ```
  
  **Resultado esperado**:
  ```
  ✅ Total de usuarios: 1
  1. tu@email.com
     - Nombre: Tu Nombre
     - Rol: Administrador
     - Activo: ✅
     - Legacy: ✅ No
  ```

- [ ] **Verificar permisos** (editar email en el script primero)
  ```bash
  # Editar diagnostico_permisos.js con tu email
  node diagnostico_permisos.js
  ```
  
  **Resultado esperado**:
  ```
  ✅ Usuario encontrado: tu@email.com
  ✅ Permisos encontrados: [número] módulos
  ```

---

### 4. Probar Login

- [ ] Abrir la aplicación
- [ ] Ingresar credenciales
- [ ] Click en "Iniciar Sesión"
- [ ] **Verificar en consola del navegador (F12)**:
  ```
  ✅ Contraseña correcta para: tu@email.com
  ✅ Usuario del sistema encontrado
  ✅ Permisos cargados: [número] módulos
  ✅ Login exitoso - Guardando sesión...
  ```
- [ ] Verificar que aparece el dashboard
- [ ] Verificar que aparecen los módulos en el sidebar

---

### 5. Verificar Módulos Visibles

- [ ] **Módulos siempre visibles** (para todos):
  - [ ] Servidor
  - [ ] Base de Datos

- [ ] **Módulos con permisos** (según tu rol):
  - [ ] Pesadas
  - [ ] Facturas Factoría
  - [ ] Clientes
  - [ ] Suplidores
  - [ ] Inventario
  - [ ] (y otros según permisos)

---

### 6. Verificar Sesión Persistente

- [ ] Cerrar el navegador
- [ ] Abrir nuevamente la aplicación
- [ ] **Verificar en consola**:
  ```
  🔄 Verificando usuario del sistema en Supabase...
  ✅ Usuario verificado en Supabase
  ```
- [ ] Verificar que sigue logueado
- [ ] Verificar que aparecen los módulos

---

### 7. Probar Logout

- [ ] Click en "Cerrar Sesión"
- [ ] Verificar que vuelve a la pantalla de login
- [ ] Verificar que localStorage se limpió
- [ ] Probar login nuevamente

---

### 8. Probar Registro de Segundo Usuario

- [ ] Click en "¿No tienes cuenta? Regístrate aquí"
- [ ] Crear usuario con rol "Visualizador" o "Facturador"
- [ ] Verificar login automático
- [ ] Verificar que tiene menos módulos que el admin
- [ ] Logout
- [ ] Login con el primer usuario (admin)
- [ ] Verificar que tiene todos los módulos

---

### 9. Verificar Errores Corregidos

#### Error 406 (Corregido)

- [ ] Abrir DevTools (F12) → Network
- [ ] Hacer login
- [ ] Verificar que NO hay error 406
- [ ] Verificar que la petición NO incluye `password=` en la URL

#### Error 409 (Corregido)

- [ ] Intentar registrar usuario con email existente
- [ ] Verificar mensaje: "El correo electrónico ya está registrado"
- [ ] Verificar que NO hay error 409

#### Usuarios Legacy (Eliminados)

- [ ] Verificar en consola que NO aparece:
  ```
  ⚠️ Usuario legacy detectado
  ```
- [ ] Verificar que todos los usuarios son tipo "sistema"

---

### 10. Verificar Permisos Estrictos

- [ ] Login con usuario NO administrador
- [ ] Intentar acceder a módulos sin permisos
- [ ] Verificar que NO aparecen en el sidebar
- [ ] Verificar en consola:
  ```
  🔒 Acceso denegado a [modulo] (puede_ver)
  ```

---

## 🐛 Troubleshooting

### ❌ No puedo crear usuario (registro)

**Verificar**:
- [ ] Hay roles en la tabla `roles`
- [ ] Email no existe ya
- [ ] Password tiene 8+ caracteres
- [ ] Rol está seleccionado

**Solución**:
```bash
node diagnostico_completo.js
```

---

### ❌ Error al hacer login

**Verificar**:
- [ ] Usuario existe en `usuarios_sistema`
- [ ] Usuario está activo (`activo = true`)
- [ ] Password es correcto
- [ ] No hay errores en consola

**Solución**:
```bash
node listar_usuarios_sistema.js
```

---

### ❌ No aparecen módulos después del login

**Verificar**:
- [ ] Usuario tiene permisos asignados
- [ ] Permisos tienen `puede_ver = true`
- [ ] Revisar logs en consola

**Solución**:
```bash
node diagnostico_permisos.js
```

---

### ❌ Sesión no persiste

**Verificar**:
- [ ] localStorage está habilitado
- [ ] No hay errores en consola
- [ ] Usuario sigue activo en BD

**Solución**:
- Limpiar localStorage
- Hacer login nuevamente

---

## ✅ Checklist Final

### Funcionalidades Básicas
- [ ] ✅ Registro de usuarios funciona
- [ ] ✅ Login funciona
- [ ] ✅ Logout funciona
- [ ] ✅ Sesión persiste
- [ ] ✅ Permisos se verifican
- [ ] ✅ Módulos aparecen según permisos

### Seguridad
- [ ] ✅ No hay error 406 (password en URL)
- [ ] ✅ No hay error 409 (tabla legacy)
- [ ] ✅ Usuarios legacy bloqueados
- [ ] ✅ Sesiones se verifican contra BD
- [ ] ✅ Permisos estrictos

### Documentación
- [ ] ✅ README_USUARIOS.md leído
- [ ] ✅ RESUMEN_FINAL.md leído
- [ ] ✅ Scripts de utilidad probados

---

## 🎉 ¡Sistema Verificado!

Si todos los checks están ✅, el sistema está funcionando correctamente.

### Próximos Pasos

1. **Crear más usuarios** según necesites
2. **Configurar permisos** específicos por rol
3. **Implementar hash de passwords** (producción)
4. **Configurar backup** de la base de datos
5. **Monitorear logs** del sistema

---

## 📞 Soporte

Si algún check falla:

1. Revisar logs en consola (F12)
2. Ejecutar `node diagnostico_completo.js`
3. Revisar documentación correspondiente
4. Verificar tablas en Supabase

---

## 📝 Notas

- ⚠️ Passwords en texto plano (temporal)
- 🔐 Implementar hash en producción
- 📊 Monitorear uso del sistema
- 🔄 Hacer backups regulares
