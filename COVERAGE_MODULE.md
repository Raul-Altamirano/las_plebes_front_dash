# Módulo de Cobertura de Entrega

## Descripción General

El módulo de **Cobertura** permite controlar las entregas presenciales por código postal (CP) dentro de CDMX y área metropolitana. Implementa un sistema de allowlist con estados operativos y un flujo de aprobación para zonas en revisión.

## Características Principales

### 1. Gestión de Códigos Postales

- ✅ **CRUD completo** de códigos postales
- ✅ **Tres estados**: 
  - `ENABLED` - Zona habilitada para entregas normales
  - `REVIEW` - Zona que requiere aprobación manual
  - `DISABLED` - Zona bloqueada para entregas
- ✅ **Validación automática** de formato (5 dígitos)
- ✅ **Unicidad** garantizada por CP

### 2. Configuración Avanzada por CP

Cada código postal puede tener:
- **Costo de envío personalizado** (opcional)
- **Monto mínimo de compra** (opcional)
- **Modo "solo punto de encuentro"** (sin envío a domicilio)
- **Nota de punto de encuentro** (ej: "Metro Insurgentes")
- **Razón de bloqueo/revisión**:
  - Política de seguridad
  - Sin cobertura
  - Alto riesgo
  - Historial de fraude
  - Límite operacional
- **Notas adicionales**

### 3. Import/Export CSV

#### Formato CSV
```csv
zip,status,deliveryFee,minOrder,onlyMeetupPoint,meetupPointNote,reason,notes,updatedAt
01000,ENABLED,50,500,false,,,,"2024-02-05T10:00:00Z"
03100,REVIEW,75,800,false,,HIGH_RISK,"Zona bajo revisión por incidentes","2024-02-05T10:00:00Z"
06700,DISABLED,,,false,,FRAUD_HISTORY,"Bloqueado por fraudes recurrentes","2024-02-05T10:00:00Z"
```

#### Modos de Importación
- **Skip duplicates**: Ignora CPs que ya existen
- **Merge**: Actualiza CPs existentes con nueva información

#### Características del Importador
- ✅ Vista previa antes de aplicar
- ✅ Validación por fila con reporte de errores
- ✅ Soporte para valores con comas (entrecomillados)
- ✅ Contador de importados/actualizados/omitidos

### 4. Integración con Pedidos

#### Validación en Creación de Pedido
Cuando se crea un pedido con un código postal:

```javascript
const check = checkZipCoverage(zip, coverageZips);

if (!check.allowed) {
  // DISABLED - Bloquear creación del pedido
  alert('No se puede entregar en esta zona: ' + check.message);
  return;
}

if (check.requiresReview) {
  // REVIEW - Crear pedido con estado HOLD_REVIEW
  order.status = 'HOLD_REVIEW';
}
```

#### Nuevo Estado: HOLD_REVIEW
Pedidos en zonas de revisión entran en este estado especial:
- ⏸️ No se procesan automáticamente
- 👤 Requieren aprobación manual por usuario con permisos
- ✅ Se pueden **Aprobar** (pasa a PLACED o PAID)
- ❌ Se pueden **Rechazar** (pasa a CANCELLED)

### 5. RBAC y Permisos

#### Nuevos Permisos
```typescript
'coverage:read'    // Ver cobertura de CPs
'coverage:update'  // Actualizar cobertura
'coverage:import'  // Importar CSVs de cobertura
'coverage:export'  // Exportar CSVs de cobertura
```

#### Distribución por Rol
- **SUPER_ADMIN / ADMIN**: Todos los permisos
- **OPS**: `read` + `update` (gestión operativa)
- **VIEWER**: Solo `read`
- **CATALOG**: Sin acceso

### 6. Auditoría Completa

Eventos registrados:
- `COVERAGE_ZIP_CREATED` - CP agregado
- `COVERAGE_ZIP_UPDATED` - CP modificado
- `COVERAGE_ZIP_STATUS_CHANGED` - Cambio de estado
- `COVERAGE_ZIP_DELETED` - CP eliminado
- `COVERAGE_IMPORT` - Importación masiva
- `COVERAGE_EXPORT` - Exportación
- `ORDER_REVIEW_APPROVED` - Pedido en revisión aprobado
- `ORDER_REVIEW_REJECTED` - Pedido en revisión rechazado

## Flujos de Uso

### Caso 1: Configuración Inicial
1. Ir a **Cobertura** en el menú
2. Importar CSV con CPs de CDMX habilitados
3. Revisar KPIs (CPs habilitados/en revisión/bloqueados)

### Caso 2: Bloquear Zona por Seguridad
1. Buscar el CP en la tabla
2. Click en menú (⋮) → **Deshabilitar**
3. Seleccionar razón: "Política de seguridad"
4. Agregar nota explicativa

### Caso 3: Aprobar Pedido en Zona de Revisión
1. Ir a **Pedidos** → Filtrar por estado `HOLD_REVIEW`
2. Abrir detalle del pedido
3. Verificar información del cliente y CP
4. Click en **Aprobar zona** (requiere `order:update` o `coverage:update`)
5. El pedido cambia a `PLACED` y continúa flujo normal

### Caso 4: Configurar Punto de Encuentro
1. Agregar/Editar CP
2. Activar toggle **"Solo punto de encuentro"**
3. Especificar nota: "Metro Insurgentes - Salida Sur"
4. Configurar costo de envío si aplica

## Interfaz de Usuario

### KPIs Dashboard
```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│ 🗺️ CPs Habilitados  │ ⚠️ CPs en Revisión   │ 🚫 CPs Bloqueados   │
│       156           │         23           │         8           │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

### Tabla Principal
- **Búsqueda** por CP, notas
- **Filtro** por estado
- **Columnas**: CP, Estado, Fee, Mínimo, Meetup-only, Razón, Actualizado
- **Acciones rápidas**: Editar, Habilitar/Deshabilitar, Eliminar

### Modal de Formulario
- Campo CP (solo lectura en edición)
- Selector de estado con tooltip informativo
- Campos numéricos para fee/mínimo con validación
- Toggle para punto de encuentro
- Selector de razón (requerido si DISABLED)
- Textarea para notas

## Seguridad y Validaciones

✅ **Validaciones Frontend**:
- CP debe ser exactamente 5 dígitos
- No se permiten duplicados
- Razón requerida si estado = DISABLED
- Warning si meetup-only sin nota de punto

✅ **Validaciones Backend** (Store):
- Validación de formato en helpers
- Comprobación de unicidad
- Prevención de race conditions en imports

✅ **Control de Acceso**:
- Guards en rutas (`RequirePermission`)
- Botones condicionados por permisos
- Auditoría de todas las operaciones

## Archivos Creados

### Tipos
- `/src/app/types/coverage.ts` - Tipos, interfaces y constantes

### Store
- `/src/app/store/CoverageContext.tsx` - Context provider con store

### Componentes
- `/src/app/components/CoverageStatusBadge.tsx` - Badge de estado
- `/src/app/components/CoverageFormModal.tsx` - Modal crear/editar
- `/src/app/components/CsvImportModal.tsx` - Importador CSV
- `/src/app/components/CoverageTable.tsx` - Tabla principal

### Páginas
- `/src/app/pages/Coverage.tsx` - Página principal del módulo

### Utilidades
- `/src/app/utils/coverageHelpers.ts` - Validaciones, CSV, checks

## Próximos Pasos (Roadmap)

### V2 - Integración Completa con Checkout
- [ ] Validación de CP en formulario de checkout online
- [ ] Cálculo automático de costo de envío por CP
- [ ] Validación de monto mínimo antes de confirmar
- [ ] Mostrar punto de encuentro si aplica

### V3 - Analytics y Optimización
- [ ] Dashboard de cobertura con mapas de calor
- [ ] Métricas por CP (pedidos, conversión, incidencias)
- [ ] Sugerencias de expansión de cobertura
- [ ] Análisis de rentabilidad por zona

### V4 - Reglas Avanzadas
- [ ] Horarios de entrega por CP
- [ ] Días restringidos (ej: solo fines de semana)
- [ ] Tiempos de entrega estimados
- [ ] Zonas prioritarias vs estándar

## Notas Técnicas

- **Persistencia**: localStorage (clave: `ecommerce_admin_coverage`)
- **ID Format**: `cov_{timestamp}_{random9chars}`
- **Orden por defecto**: Alfabético por código postal
- **Responsive**: Tabla adaptativa en mobile
- **Performance**: Memoización con useMemo en filtros
- **Accesibilidad**: Labels, ARIA, keyboard navigation

## Soporte

Para dudas o reportes de bugs, contactar al equipo de desarrollo.
