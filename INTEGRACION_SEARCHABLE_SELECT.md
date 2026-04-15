# Integración de SearchableSelect - Guía Completa

## ✅ Cambios Realizados

### 1. Componente Creado
- **Archivo**: `components/SearchableSelect.jsx`
- **Descripción**: Componente reutilizable de select con búsqueda integrada
- **Características**:
  - Muestra todos los elementos en un dropdown
  - Permite filtrar escribiendo en tiempo real
  - Búsqueda por campo principal y secundario
  - Diseño moderno y responsivo
  - Cierre automático al hacer clic fuera
  - Botón para limpiar selección

### 2. Módulos Actualizados

#### ✅ FacturasVenta (`components/FacturasVenta.jsx`)
- **Selección de Cliente**: Ahora usa SearchableSelect
  - Búsqueda por nombre o cédula
  - Muestra todos los clientes en lista desplegable
- **Selección de Producto**: Ahora usa SearchableSelect
  - Búsqueda por nombre o código
  - Muestra stock disponible

#### ✅ FacturasCompra (`components/FacturasCompra.jsx`)
- **Selección de Suplidor**: Ahora usa SearchableSelect
  - Búsqueda por nombre o RNC
  - Muestra todos los suplidores en lista desplegable
- **Selección de Producto**: Ahora usa SearchableSelect
  - Búsqueda por nombre o código

#### ✅ CuentasPorCobrar (`components/CuentasPorCobrar.jsx`)
- Import agregado, listo para integración

---

## 📋 Módulos Pendientes de Actualización

### Módulos que necesitan integración:

1. **CompensacionCuentas.jsx**
   - Selección de cliente

2. **CompensacionPesadas.jsx**
   - Selección de cuenta/cliente

3. **NuevaFacturaFactoria.jsx**
   - Selección de productor/cliente

4. **NuevaPesada.jsx**
   - Selección de productor
   - Selección de chofer
   - Selección de variedad

5. **PagoObreros.jsx**
   - Selección de obrero

6. **RegistroFlete.jsx**
   - Selección de productor
   - Selección de factoría

7. **Prestamos.jsx** (si existe)
   - Selección de cliente

8. **Nomina.jsx**
   - Selección de empleado

---

## 🔧 Cómo Integrar SearchableSelect en Otros Módulos

### Paso 1: Importar el componente

```javascript
import SearchableSelect from './SearchableSelect';
```

### Paso 2: Reemplazar el `<select>` tradicional

**ANTES:**
```javascript
<select
  value={formData.cliente_id}
  onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
>
  <option value="">Seleccione un cliente</option>
  {clientes.map(c => (
    <option key={c.id} value={c.id}>{c.nombre}</option>
  ))}
</select>
```

**DESPUÉS:**
```javascript
<SearchableSelect
  options={clientes}
  value={formData.cliente_id}
  onChange={(value) => setFormData({ ...formData, cliente_id: value })}
  placeholder="Seleccione un cliente"
  searchPlaceholder="Buscar cliente por nombre o cédula..."
  displayField="nombre"
  valueField="id"
  secondaryField="cedula"
  required
/>
```

### Paso 3: Configurar los parámetros

#### Parámetros del componente:

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `options` | Array | Lista de opciones a mostrar | `clientes`, `suplidores`, `productos` |
| `value` | String/Number | Valor seleccionado actualmente | `formData.cliente_id` |
| `onChange` | Function | Función que se ejecuta al seleccionar | `(value) => setFormData({...formData, cliente_id: value})` |
| `placeholder` | String | Texto cuando no hay selección | `"Seleccione un cliente"` |
| `searchPlaceholder` | String | Texto en el campo de búsqueda | `"Buscar cliente..."` |
| `displayField` | String | Campo a mostrar en la lista | `"nombre"` |
| `valueField` | String | Campo del valor (ID) | `"id"` |
| `secondaryField` | String (opcional) | Campo secundario (cédula, código) | `"cedula"`, `"codigo"`, `"rnc"` |
| `disabled` | Boolean | Deshabilitar el componente | `false` |
| `required` | Boolean | Campo requerido | `true` |
| `className` | String | Clases CSS adicionales | `"mb-4"` |

---

## 📝 Ejemplos de Uso por Tipo de Dato

### Para Clientes:
```javascript
<SearchableSelect
  options={clientes}
  value={formData.cliente_id}
  onChange={(value) => setFormData({ ...formData, cliente_id: value })}
  placeholder="Seleccione un cliente"
  searchPlaceholder="Buscar por nombre o cédula..."
  displayField="nombre"
  valueField="id"
  secondaryField="cedula"
  required
/>
```

### Para Suplidores:
```javascript
<SearchableSelect
  options={suplidores}
  value={formData.suplidor_id}
  onChange={(value) => setFormData({ ...formData, suplidor_id: value })}
  placeholder="Seleccione un suplidor"
  searchPlaceholder="Buscar por nombre o RNC..."
  displayField="nombre"
  valueField="id"
  secondaryField="rnc"
  required
/>
```

### Para Productos/Mercancías:
```javascript
<SearchableSelect
  options={mercancias}
  value={formData.mercancia_id}
  onChange={(value) => setFormData({ ...formData, mercancia_id: value })}
  placeholder="Seleccione un producto"
  searchPlaceholder="Buscar por nombre o código..."
  displayField="nombre"
  valueField="id"
  secondaryField="codigo"
  required
/>
```

### Para Empleados/Obreros:
```javascript
<SearchableSelect
  options={empleados}
  value={formData.empleado_id}
  onChange={(value) => setFormData({ ...formData, empleado_id: value })}
  placeholder="Seleccione un empleado"
  searchPlaceholder="Buscar por nombre..."
  displayField="nombre"
  valueField="id"
  secondaryField="cedula"
  required
/>
```

### Para Productores:
```javascript
<SearchableSelect
  options={productores}
  value={formData.productor_id}
  onChange={(value) => setFormData({ ...formData, productor_id: value })}
  placeholder="Seleccione un productor"
  searchPlaceholder="Buscar productor..."
  displayField="nombre"
  valueField="id"
  secondaryField="codigo"
  required
/>
```

### Para Choferes:
```javascript
<SearchableSelect
  options={choferes}
  value={formData.chofer_id}
  onChange={(value) => setFormData({ ...formData, chofer_id: value })}
  placeholder="Seleccione un chofer"
  searchPlaceholder="Buscar chofer..."
  displayField="nombre"
  valueField="id"
  secondaryField="cedula"
  required
/>
```

---

## 🎯 Beneficios de la Integración

1. **Experiencia de Usuario Mejorada**
   - No es necesario escribir para ver las opciones
   - Búsqueda en tiempo real
   - Interfaz más intuitiva

2. **Consistencia Visual**
   - Mismo diseño en todos los módulos
   - Comportamiento uniforme

3. **Mejor Rendimiento**
   - Filtrado eficiente en el cliente
   - No requiere consultas adicionales a la base de datos

4. **Accesibilidad**
   - Cierre automático al hacer clic fuera
   - Navegación con teclado
   - Indicadores visuales claros

---

## ⚠️ Notas Importantes

1. **No eliminar el estado de búsqueda anterior**: Si el módulo ya tiene un estado como `busquedaProducto`, puedes eliminarlo ya que SearchableSelect maneja su propia búsqueda interna.

2. **Validación**: El componente respeta el atributo `required`, por lo que las validaciones de formulario seguirán funcionando.

3. **Compatibilidad**: El componente es compatible con todos los navegadores modernos.

4. **Personalización**: Si necesitas estilos específicos, puedes pasar clases CSS adicionales mediante el prop `className`.

---

## 🚀 Próximos Pasos

1. Revisar cada módulo de la lista "Pendientes"
2. Identificar todos los `<select>` que necesitan actualización
3. Aplicar el patrón de reemplazo mostrado arriba
4. Probar cada módulo después de la integración
5. Verificar que las validaciones funcionen correctamente

---

## 📞 Soporte

Si encuentras algún problema durante la integración, revisa:
- Que el import esté correcto
- Que los nombres de los campos (`displayField`, `valueField`) coincidan con tu estructura de datos
- Que el array de `options` esté cargado correctamente
