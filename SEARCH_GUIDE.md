# 🔍 Búsqueda Global - Guía de Usuario

> Sistema completo de búsqueda global con Command Palette y página de resultados

---

## ⚡ **Acceso Rápido**

### Método 1: Atajo de Teclado (Recomendado)
```
Mac: ⌘ + K
Windows/Linux: Ctrl + K
```

### Método 2: Click en Barra de Búsqueda
- Desktop: Click en el input de búsqueda en el header
- Mobile: Click en el ícono de lupa 🔍

---

## 🎯 **¿Qué se puede buscar?**

La búsqueda global busca en 4 entidades principales:

### 📦 **Productos**
- Nombre del producto
- SKU principal
- ID del producto
- SKU de variantes

**Ejemplos:**
```
"Bota"          → Encuentra: Bota Casual, Bota Deportiva
"SKU-001"       → Encuentra: Producto con ese SKU
"VAR-123"       → Encuentra: Producto con variante que tiene ese SKU
```

### 🛒 **Pedidos**
- Número de pedido
- ID del pedido
- Nombre del cliente
- Teléfono del cliente

**Ejemplos:**
```
"ORD-1001"      → Encuentra: Pedido #ORD-1001
"Juan"          → Encuentra: Pedidos de clientes llamados Juan
"555-1234"      → Encuentra: Pedidos del cliente con ese teléfono
```

### 👥 **Clientes**
- Nombre completo
- Email
- Teléfono

**Ejemplos:**
```
"María"         → Encuentra: María González, María Sánchez, etc.
"email@x.com"   → Encuentra: Cliente con ese email
"555-9876"      → Encuentra: Cliente con ese teléfono
```

### 🔄 **RMA (Cambios y Devoluciones)**
- Número de RMA
- ID de RMA
- Número de pedido asociado
- Nombre del cliente

**Ejemplos:**
```
"RMA-2001"      → Encuentra: RMA #RMA-2001
"ORD-1005"      → Encuentra: RMAs del pedido #ORD-1005
"Pedro"         → Encuentra: RMAs de clientes llamados Pedro
```

---

## 🎨 **Modos de Búsqueda**

### A) Command Palette (Modal Rápido)

**Flujo:**
1. Presiona `Cmd/Ctrl + K` o click en la barra de búsqueda
2. Modal aparece centrado
3. Escribe tu búsqueda
4. Resultados aparecen agrupados por tipo
5. Click en un resultado → navega a su detalle
6. `ESC` para cerrar

**Características:**
- ✅ Auto-focus en el input
- ✅ Debounce de 250ms (performance)
- ✅ Muestra hasta 10 resultados por categoría
- ✅ Navegación inmediata al hacer click
- ✅ Enter para ver todos los resultados

**Preview:**
```
┌─────────────────────────────────────────────┐
│ 🔍 Buscar productos, pedidos, clientes...  │
│                                       [×]   │
├─────────────────────────────────────────────┤
│                                             │
│ 📦 PRODUCTOS (3)                            │
│   ┌─────┐ Bota Casual                      │
│   │ 📦  │ SKU: SKU-001 • 2 variantes    →  │
│   └─────┘                                   │
│   ┌─────┐ Bota Deportiva                   │
│   │ 📦  │ SKU: SKU-002 • 3 variantes    →  │
│   └─────┘                                   │
│                                             │
│ 🛒 PEDIDOS (2)                              │
│   ┌─────┐ Pedido ORD-1001                  │
│   │ 🛒  │ Juan Pérez • DELIVERED        →  │
│   └─────┘                                   │
│                                             │
├─────────────────────────────────────────────┤
│ [Ver todos los resultados (5)]             │
└─────────────────────────────────────────────┘
```

---

### B) Página de Resultados Completos

**Acceso:**
- Presiona `Enter` en el modal
- Click en "Ver todos los resultados"
- URL: `/search?q=tu-búsqueda`

**Características:**
- ✅ Filtros por tipo (Todos, Productos, Pedidos, Clientes, RMA)
- ✅ Vista completa de todos los resultados
- ✅ Contador de resultados por categoría
- ✅ Navegación directa al hacer click
- ✅ Nota informativa si hay muchos resultados

**Preview:**
```
┌─────────────────────────────────────────────────────┐
│ 🔍 Resultados para "Bota"                           │
│ 5 resultados encontrados                            │
│                                                     │
│ 🔧 Filtros:                                         │
│ [Todos (5)] [Productos (3)] [Pedidos (2)]          │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ ┌───┐  PRODUCTO                               │  │
│ │ │📦 │  Bota Casual                            │  │
│ │ └───┘  SKU: SKU-001 • 2 variantes           → │  │
│ ├───────────────────────────────────────────────┤  │
│ │ ┌───┐  PRODUCTO                               │  │
│ │ │📦 │  Bota Deportiva                         │  │
│ │ └───┘  SKU: SKU-002 • 3 variantes           → │  │
│ ├───────────────────────────────────────────────┤  │
│ │ ┌───┐  PEDIDO                                 │  │
│ │ │🛒 │  Pedido ORD-1001                        │  │
│ │ └───┘  Juan Pérez • DELIVERED               → │  │
│ └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 **Tips de Uso**

### ✅ Búsquedas Efectivas
```
✓ "bota"        → Encuentra productos que contengan "bota"
✓ "ORD"         → Encuentra todos los pedidos (contienen "ORD")
✓ "555"         → Encuentra clientes/pedidos con ese teléfono
✓ "RMA-"        → Encuentra todas las RMAs
```

### ❌ Evita
```
✗ Espacios al inicio/final (se eliminan automáticamente)
✗ Búsquedas de 1 letra (probablemente demasiados resultados)
✗ Caracteres especiales sin significado
```

### 💡 Pro Tips
1. **Búsqueda rápida**: Usa ⌘K y selecciona directamente del modal
2. **Explorar resultados**: Usa Enter para ver la página completa con filtros
3. **Navegación**: Todos los resultados son clickeables y te llevan al detalle
4. **Case-insensitive**: No importan mayúsculas/minúsculas
5. **Debounced**: Espera 250ms antes de buscar (mejor performance)

---

## 🎯 **Casos de Uso Comunes**

### 1. Buscar un Producto por SKU
```
1. Presiona ⌘K
2. Escribe el SKU: "SKU-001"
3. Click en el resultado
4. ¡Estás en el editor del producto!
```

### 2. Encontrar Pedidos de un Cliente
```
1. Presiona ⌘K
2. Escribe el nombre: "Juan"
3. Ver todos los resultados (Enter)
4. Filtrar por "Pedidos"
5. Click en el pedido que necesitas
```

### 3. Localizar una RMA
```
1. Presiona ⌘K
2. Escribe: "RMA-2001"
3. Click en el resultado
4. ¡Estás en el detalle de la RMA!
```

### 4. Buscar Cliente por Teléfono
```
1. Presiona ⌘K
2. Escribe el teléfono: "555-1234"
3. Ver resultados de Clientes y Pedidos
4. Click en el resultado deseado
```

---

## 📱 **Responsive Design**

### Desktop
- Modal centrado con ancho máximo
- Muestra hint de atajo de teclado (⌘K)
- Input amplio y visible

### Mobile
- Modal fullscreen
- Ícono de lupa en header
- Touch-friendly buttons
- Auto-focus en input

---

## 🔧 **Características Técnicas**

### Performance
- **Debounce**: 250ms
- **Límite**: 10 resultados por categoría
- **Memoization**: Usa `useMemo` para optimizar
- **Indexing**: Búsqueda en memoria (ultra-rápida)

### Búsqueda
- **Case-insensitive**: No importan mayúsculas
- **Trim**: Elimina espacios al inicio/final
- **Substring match**: Encuentra coincidencias parciales
- **Multi-field**: Busca en múltiples campos simultáneamente

### UX
- **Auto-focus**: Input enfocado automáticamente
- **Keyboard shortcuts**: ESC para cerrar, Enter para ver todos
- **Click outside**: Cierra el modal
- **Navegación**: Directo a la página de detalle

---

## 🎨 **Iconografía**

```
📦 Package    → Productos
🛒 ShoppingCart → Pedidos
👥 Users      → Clientes
🔄 RotateCcw  → RMA (Cambios y Devoluciones)
```

---

## 🔒 **Permisos**

- ✅ **Búsqueda disponible para todos los usuarios autenticados**
- ✅ **No requiere permisos especiales**
- ✅ **Respeta permisos de navegación** (si no puedes ver Pedidos, no los verás en resultados)

---

## 🐛 **Troubleshooting**

### No aparece el modal al presionar ⌘K
- Verifica que estés en una página protegida (logueado)
- Refresca la página
- Intenta hacer click en el input de búsqueda

### No aparecen resultados
- Verifica que haya datos en los stores (Productos, Pedidos, etc.)
- Intenta con un término más general
- Revisa que la búsqueda no tenga caracteres especiales

### Modal no cierra con ESC
- Refresca la página
- Usa el botón [×] en el modal

---

## 📊 **Límites y Consideraciones**

### Límites
- **10 resultados máximo por categoría** en el modal
- **Todos los resultados** en la página de resultados
- **Debounce de 250ms** antes de ejecutar búsqueda

### Consideraciones
- La búsqueda es en **memoria** (datos ya cargados en los stores)
- No es búsqueda en **base de datos** (usa los datos ya disponibles)
- Resultados limitados a datos ya cargados en el contexto actual

---

## ✅ **Checklist de Verificación**

```
✓ Modal se abre con ⌘K
✓ Input tiene auto-focus
✓ Búsqueda muestra resultados agrupados
✓ Click en resultado navega correctamente
✓ ESC cierra el modal
✓ Enter abre página de resultados
✓ Página de resultados tiene filtros
✓ Filtros funcionan correctamente
✓ Navegación desde resultados funciona
✓ Responsive en mobile
```

---

## 🎉 **Resultado Final**

```
✅ Búsqueda global funcional
✅ Command Palette con ⌘K
✅ Página de resultados completa
✅ Navegación fluida
✅ Responsive design
✅ Performance optimizada
✅ UX pulida
```

---

**Última actualización:** 2026-02-12

**Status:** ✅ **PRODUCCIÓN-READY**
