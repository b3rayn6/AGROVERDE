# Sistema de Diseño AgroVerde

## 📋 Descripción General

Este documento describe el sistema de diseño moderno y responsivo implementado para todos los módulos de AgroVerde. El sistema está construido con React, Tailwind CSS y componentes reutilizables que garantizan consistencia visual en todas las pantallas.

## 🎨 Paleta de Colores

### Colores Primarios
- **Primary**: Verde (#22c55e) - Color principal de la marca
- **Secondary**: Teal (#14b8a6) - Color secundario complementario

### Colores de Estado
- **Success**: Verde (#10b981)
- **Warning**: Ámbar (#f59e0b)
- **Danger**: Rojo (#ef4444)
- **Info**: Azul (#3b82f6)

### Colores Neutros
- **Gray**: Escala de grises del 50 al 900
- **White**: #ffffff
- **Black**: #000000

## 📱 Breakpoints Responsivos

```javascript
{
  'xs': '475px',    // Móviles pequeños
  'sm': '640px',    // Móviles
  'md': '768px',    // Tablets
  'lg': '1024px',   // Laptops
  'xl': '1280px',   // Desktops
  '2xl': '1536px',  // Pantallas grandes
  '3xl': '1920px',  // Pantallas extra grandes
}
```

## 🧩 Componentes Disponibles

### 1. Card
Contenedor versátil para agrupar contenido relacionado.

```jsx
import { Card, CardHeader, CardTitle, CardContent } from './components/ui';

<Card variant="elevated" hover>
  <CardHeader>
    <CardTitle>Título de la Tarjeta</CardTitle>
  </CardHeader>
  <CardContent>
    Contenido aquí
  </CardContent>
</Card>
```

**Variantes**: `default`, `elevated`, `glass`, `gradient`
**Padding**: `none`, `sm`, `default`, `lg`

### 2. Button
Botones con múltiples estilos y tamaños.

```jsx
import { Button } from './components/ui';
import { Plus } from 'lucide-react';

<Button 
  variant="primary" 
  size="default" 
  icon={Plus}
  loading={false}
>
  Agregar Nuevo
</Button>
```

**Variantes**: `primary`, `secondary`, `success`, `danger`, `warning`, `info`, `outline`, `ghost`, `link`
**Tamaños**: `xs`, `sm`, `default`, `lg`, `xl`

### 3. Input
Campos de entrada con validación y estilos consistentes.

```jsx
import { Input } from './components/ui';
import { User } from 'lucide-react';

<Input
  label="Nombre"
  placeholder="Ingrese su nombre"
  icon={User}
  error="Este campo es requerido"
  required
/>
```

### 4. Select
Selector desplegable estilizado.

```jsx
import { Select } from './components/ui';

<Select
  label="Categoría"
  options={[
    { value: '1', label: 'Opción 1' },
    { value: '2', label: 'Opción 2' },
  ]}
  placeholder="Seleccionar..."
/>
```

### 5. Modal
Ventanas modales responsivas.

```jsx
import { Modal, ModalFooter } from './components/ui';
import { Button } from './components/ui';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Título del Modal"
  size="lg"
  footer={
    <ModalFooter>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancelar
      </Button>
      <Button variant="primary">
        Guardar
      </Button>
    </ModalFooter>
  }
>
  Contenido del modal
</Modal>
```

**Tamaños**: `sm`, `default`, `lg`, `xl`, `2xl`, `full`

### 6. Table
Tablas responsivas con scroll horizontal.

```jsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './components/ui';

<Table responsive striped hover>
  <TableHeader>
    <TableRow>
      <TableHead>Columna 1</TableHead>
      <TableHead>Columna 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Dato 1</TableCell>
      <TableCell>Dato 2</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### 7. Stats
Tarjetas de estadísticas con iconos.

```jsx
import { Stats, StatsGrid } from './components/ui';
import { DollarSign } from 'lucide-react';

<StatsGrid>
  <Stats
    title="Ventas Totales"
    value="$125,000"
    icon={DollarSign}
    variant="success"
    trend="up"
    trendValue="+12%"
  />
</StatsGrid>
```

**Variantes**: `default`, `primary`, `success`, `warning`, `danger`, `info`

### 8. Badge
Etiquetas para estados y categorías.

```jsx
import { Badge } from './components/ui';

<Badge variant="success" dot>
  Activo
</Badge>
```

**Variantes**: `default`, `primary`, `success`, `danger`, `warning`, `info`, `purple`, `pink`
**Tamaños**: `sm`, `default`, `lg`

### 9. Alert
Mensajes de alerta y notificaciones.

```jsx
import { Alert } from './components/ui';

<Alert 
  variant="success" 
  title="¡Éxito!"
  onClose={() => {}}
>
  La operación se completó correctamente.
</Alert>
```

**Variantes**: `info`, `success`, `warning`, `danger`

### 10. Container
Contenedores para layouts consistentes.

```jsx
import { Container, Section, Page, PageContent } from './components/ui';

<Page>
  <Section variant="gradient">
    <Container size="default" padding="lg">
      Contenido aquí
    </Container>
  </Section>
</Page>
```

## 🎭 Animaciones

### Clases de Animación Disponibles
- `animate-fade-in` - Aparición suave
- `animate-slide-up` - Deslizar hacia arriba
- `animate-slide-down` - Deslizar hacia abajo
- `animate-scale-in` - Escalar desde el centro
- `animate-shimmer` - Efecto de brillo
- `animate-bounce-subtle` - Rebote sutil
- `animate-pulse-glow` - Pulso con brillo
- `animate-gradient` - Gradiente animado

### Efectos Hover
- `hover-lift` - Elevar al pasar el mouse
- `hover-scale` - Escalar al pasar el mouse
- `hover-glow` - Brillo al pasar el mouse

## 📐 Espaciado Consistente

### Padding y Margin
- Usar múltiplos de 4px: `p-1` (4px), `p-2` (8px), `p-4` (16px), etc.
- Responsive: `p-4 sm:p-6 lg:p-8`

### Gap en Grids y Flex
- `gap-2` (8px), `gap-4` (16px), `gap-6` (24px)
- Responsive: `gap-4 sm:gap-6`

## 🔤 Tipografía

### Tamaños de Texto
- `text-xs` - 12px
- `text-sm` - 14px
- `text-base` - 16px
- `text-lg` - 18px
- `text-xl` - 20px
- `text-2xl` - 24px
- `text-3xl` - 30px

### Pesos de Fuente
- `font-normal` - 400
- `font-medium` - 500
- `font-semibold` - 600
- `font-bold` - 700

### Responsive
```jsx
<h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
  Título Responsivo
</h1>
```

## 📱 Mejores Prácticas Responsivas

### 1. Mobile First
Diseñar primero para móviles y luego escalar hacia arriba.

```jsx
<div className="w-full sm:w-1/2 lg:w-1/3">
  Contenido
</div>
```

### 2. Grids Responsivos
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* Items */}
</div>
```

### 3. Ocultar/Mostrar Elementos
```jsx
<div className="hidden sm:block">
  Visible solo en pantallas medianas y grandes
</div>

<div className="block sm:hidden">
  Visible solo en móviles
</div>
```

### 4. Padding y Spacing Responsivo
```jsx
<div className="p-4 sm:p-6 lg:p-8">
  Contenido con padding adaptativo
</div>
```

### 5. Texto Responsivo
```jsx
<p className="text-sm sm:text-base lg:text-lg">
  Texto que se adapta al tamaño de pantalla
</p>
```

## 🎨 Gradientes Personalizados

### Clases Disponibles
- `gradient-green` - Verde
- `gradient-blue` - Azul
- `gradient-purple` - Púrpura
- `gradient-amber` - Ámbar
- `gradient-emerald` - Esmeralda

### Uso
```jsx
<div className="gradient-green p-6 rounded-xl text-white">
  Contenido con gradiente
</div>
```

## 🔄 Scrollbar Personalizado

### Clases Disponibles
- `scrollbar-hide` - Ocultar scrollbar
- `scrollbar-custom` - Scrollbar estilizado
- `scrollbar-modal` - Scrollbar para modales

## 💡 Ejemplos de Uso Completo

### Formulario Responsivo
```jsx
import { Card, CardHeader, CardTitle, CardContent, Input, Select, Button } from './components/ui';
import { Save } from 'lucide-react';

<Card variant="elevated">
  <CardHeader>
    <CardTitle>Nuevo Registro</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input
        label="Nombre"
        placeholder="Ingrese nombre"
        required
      />
      <Select
        label="Categoría"
        options={categories}
        required
      />
    </div>
    <div className="mt-6 flex justify-end gap-3">
      <Button variant="secondary">
        Cancelar
      </Button>
      <Button variant="primary" icon={Save}>
        Guardar
      </Button>
    </div>
  </CardContent>
</Card>
```

### Dashboard con Estadísticas
```jsx
import { Container, StatsGrid, Stats } from './components/ui';
import { DollarSign, Users, Package, TrendingUp } from 'lucide-react';

<Container size="default" padding="lg">
  <StatsGrid>
    <Stats
      title="Ventas Totales"
      value="$125,000"
      icon={DollarSign}
      variant="success"
      trend="up"
      trendValue="+12%"
    />
    <Stats
      title="Clientes"
      value="1,234"
      icon={Users}
      variant="info"
    />
    <Stats
      title="Productos"
      value="567"
      icon={Package}
      variant="warning"
    />
    <Stats
      title="Crecimiento"
      value="+23%"
      icon={TrendingUp}
      variant="primary"
    />
  </StatsGrid>
</Container>
```

## 🚀 Migración de Componentes Existentes

Para migrar un componente existente al nuevo sistema de diseño:

1. Importar los componentes UI necesarios
2. Reemplazar divs genéricos con componentes semánticos
3. Aplicar clases responsivas
4. Usar el sistema de colores consistente
5. Implementar animaciones donde sea apropiado

## 📚 Recursos Adicionales

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/)
- [React Documentation](https://react.dev/)

---

**Última actualización**: Abril 2026
**Versión**: 1.0.0
