# Guía de Migración de Módulos al Nuevo Sistema de Diseño

## 📋 Objetivo

Esta guía te ayudará a migrar los módulos existentes de AgroVerde al nuevo sistema de diseño responsivo y moderno.

## 🎯 Checklist de Migración

Para cada módulo, asegúrate de completar:

- [ ] Importar componentes UI del nuevo sistema
- [ ] Reemplazar elementos HTML genéricos con componentes semánticos
- [ ] Aplicar clases responsivas (mobile-first)
- [ ] Implementar grid responsivo para layouts
- [ ] Actualizar formularios con nuevos componentes Input/Select
- [ ] Actualizar tablas con componente Table responsivo
- [ ] Agregar animaciones apropiadas
- [ ] Implementar estados de carga
- [ ] Agregar estados vacíos
- [ ] Probar en diferentes tamaños de pantalla

## 🔄 Patrón de Migración

### ANTES (Código Antiguo)
```jsx
export default function MiModulo({ user }) {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Título</h2>
        <div className="grid grid-cols-4 gap-4">
          {/* Stats */}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <table className="w-full">
          {/* Tabla */}
        </table>
      </div>
    </div>
  );
}
```

### DESPUÉS (Código Nuevo)
```jsx
import { 
  Container, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  StatsGrid,
  Stats,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from './ui';

export default function MiModulo({ user }) {
  return (
    <Container size="default" padding="lg">
      {/* Estadísticas */}
      <StatsGrid className="mb-6">
        <Stats
          title="Total"
          value="1,234"
          icon={IconComponent}
          variant="primary"
        />
        {/* Más stats */}
      </StatsGrid>

      {/* Tabla */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Título</CardTitle>
        </CardHeader>
        <CardContent>
          <Table responsive>
            <TableHeader>
              <TableRow>
                <TableHead>Columna 1</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Dato 1</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  );
}
```

## 📱 Patrones Responsivos Comunes

### 1. Layout Principal
```jsx
<Container size="default" padding="lg">
  {/* Contenido del módulo */}
</Container>
```

### 2. Grid de Estadísticas
```jsx
<StatsGrid className="mb-6">
  <Stats title="Stat 1" value="100" icon={Icon1} variant="primary" />
  <Stats title="Stat 2" value="200" icon={Icon2} variant="success" />
  <Stats title="Stat 3" value="300" icon={Icon3} variant="info" />
  <Stats title="Stat 4" value="400" icon={Icon4} variant="warning" />
</StatsGrid>
```

### 3. Barra de Acciones
```jsx
<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
  <div className="flex-1">
    <Input
      placeholder="Buscar..."
      icon={Search}
    />
  </div>
  <div className="flex flex-col sm:flex-row gap-2">
    <Button variant="secondary" icon={Filter}>
      Filtrar
    </Button>
    <Button variant="primary" icon={Plus}>
      Agregar
    </Button>
  </div>
</div>
```

### 4. Formulario en Modal
```jsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Nuevo Registro"
  size="lg"
  footer={
    <ModalFooter>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancelar
      </Button>
      <Button variant="primary" loading={loading} onClick={handleSubmit}>
        Guardar
      </Button>
    </ModalFooter>
  }
>
  <ModalBody>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input
        label="Campo 1"
        placeholder="Ingrese valor"
        required
      />
      <Select
        label="Campo 2"
        options={options}
        required
      />
    </div>
  </ModalBody>
</Modal>
```

### 5. Tabla Responsiva
```jsx
<Card variant="elevated">
  <CardHeader>
    <CardTitle>Lista de Registros</CardTitle>
  </CardHeader>
  <CardContent>
    {loading ? (
      <TableLoading colSpan={5} rows={5} />
    ) : data.length === 0 ? (
      <TableEmpty message="No hay registros disponibles" colSpan={5} />
    ) : (
      <Table responsive>
        <TableHeader>
          <TableRow>
            <TableHead>Columna 1</TableHead>
            <TableHead>Columna 2</TableHead>
            <TableHead align="right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.value}</TableCell>
              <TableCell align="right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" icon={Edit2}>
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                  <Button size="sm" variant="ghost" icon={Trash2}>
                    <span className="hidden sm:inline">Eliminar</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </CardContent>
</Card>
```

### 6. Estados de Carga
```jsx
{loading ? (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Cargando...</p>
    </div>
  </div>
) : (
  // Contenido
)}
```

### 7. Estados Vacíos
```jsx
{data.length === 0 && (
  <div className="text-center py-12">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Icon className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-800 mb-2">
      No hay datos
    </h3>
    <p className="text-gray-600 mb-6">
      Comienza agregando tu primer registro
    </p>
    <Button variant="primary" icon={Plus}>
      Agregar Nuevo
    </Button>
  </div>
)}
```

### 8. Alertas y Notificaciones
```jsx
{error && (
  <Alert variant="danger" title="Error" onClose={() => setError(null)}>
    {error}
  </Alert>
)}

{success && (
  <Alert variant="success" title="¡Éxito!" onClose={() => setSuccess(null)}>
    La operación se completó correctamente
  </Alert>
)}
```

### 9. Badges de Estado
```jsx
<Badge variant={status === 'active' ? 'success' : 'danger'} dot>
  {status === 'active' ? 'Activo' : 'Inactivo'}
</Badge>
```

### 10. Filtros Colapsables
```jsx
const [showFilters, setShowFilters] = useState(false);

<Card variant="elevated" className="mb-6">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Filtros</CardTitle>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
      >
        {showFilters ? 'Ocultar' : 'Mostrar'}
      </Button>
    </div>
  </CardHeader>
  {showFilters && (
    <CardContent>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input label="Filtro 1" />
        <Select label="Filtro 2" options={[]} />
        <Input type="date" label="Fecha Desde" />
        <Input type="date" label="Fecha Hasta" />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" size="sm">
          Limpiar
        </Button>
        <Button variant="primary" size="sm">
          Aplicar
        </Button>
      </div>
    </CardContent>
  )}
</Card>
```

## 🎨 Paleta de Variantes por Contexto

### Botones de Acción
- **Crear/Agregar**: `variant="primary"`
- **Editar**: `variant="info"`
- **Eliminar**: `variant="danger"`
- **Cancelar**: `variant="secondary"`
- **Exportar**: `variant="success"`
- **Filtrar**: `variant="secondary"`

### Stats por Tipo
- **Ingresos/Ventas**: `variant="success"`
- **Gastos**: `variant="danger"`
- **Totales**: `variant="primary"`
- **Información**: `variant="info"`
- **Alertas**: `variant="warning"`

### Badges por Estado
- **Activo/Completado**: `variant="success"`
- **Pendiente**: `variant="warning"`
- **Cancelado/Inactivo**: `variant="danger"`
- **En Proceso**: `variant="info"`

## 🔧 Utilidades Comunes

### Truncar Texto
```jsx
<p className="truncate max-w-xs">
  Texto largo que se truncará con...
</p>
```

### Ocultar en Móvil
```jsx
<span className="hidden sm:inline">
  Texto visible solo en pantallas medianas y grandes
</span>
```

### Espaciado Responsivo
```jsx
<div className="space-y-4 sm:space-y-6 lg:space-y-8">
  {/* Elementos con espaciado adaptativo */}
</div>
```

### Flex Responsivo
```jsx
<div className="flex flex-col sm:flex-row gap-4">
  {/* Elementos que cambian de columna a fila */}
</div>
```

## ✅ Checklist Final

Antes de considerar un módulo completamente migrado:

1. **Responsividad**
   - [ ] Probado en móvil (< 640px)
   - [ ] Probado en tablet (640px - 1024px)
   - [ ] Probado en desktop (> 1024px)

2. **Componentes**
   - [ ] Usa componentes UI del sistema
   - [ ] Botones con variantes apropiadas
   - [ ] Inputs y selects estilizados
   - [ ] Tablas responsivas

3. **Estados**
   - [ ] Estado de carga implementado
   - [ ] Estado vacío implementado
   - [ ] Manejo de errores con Alert

4. **Accesibilidad**
   - [ ] Labels en todos los inputs
   - [ ] Botones con texto descriptivo
   - [ ] Contraste de colores adecuado

5. **Performance**
   - [ ] Sin re-renders innecesarios
   - [ ] Lazy loading donde sea apropiado
   - [ ] Imágenes optimizadas

## 📞 Soporte

Si tienes dudas durante la migración, consulta:
- `SISTEMA_DISENO.md` - Documentación completa del sistema
- `components/ui/` - Código fuente de los componentes
- Ejemplos en módulos ya migrados

---

**¡Buena suerte con la migración!** 🚀
