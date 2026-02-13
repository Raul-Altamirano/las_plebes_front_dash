# Sistema de Auditoría Mejorado

## Descripción General

El sistema de auditoría ha sido completamente renovado para proporcionar información rica, útil y consistente sobre todas las acciones realizadas en el sistema, con especial énfasis en eventos de **Cobertura** y **Pedidos en Revisión**.

## Modelo de Datos Estandarizado

### AuditEvent (Nuevo)

```typescript
interface AuditEvent {
  id: string;
  ts: string; // ISO timestamp
  actor: {
    id: string;
    name: string;
    roleName?: string; // Rol del actor en el momento de la acción
  };
  action: AuditAction; // e.g., "COVERAGE_ZIP_CREATED"
  entity?: AuditEntity; // Entidad afectada
  changes?: AuditChange[]; // Lista de cambios (antes/después)
  metadata?: Record<string, any>; // Contexto adicional
}
```

### AuditEntity

```typescript
interface AuditEntity {
  type: AuditEntityType; // 'coverageZip', 'order', 'customer', etc.
  id: string;
  label: string; // Label legible: "CP 03100", "ORD-000123"
}
```

### AuditChange

```typescript
interface AuditChange {
  field: string; // Nombre del campo
  from?: any; // Valor anterior
  to?: any; // Valor nuevo
}
```

## Helper Centralizado: `auditLog()`

### Ubicación
`/src/app/store/AuditContext.tsx`

### Uso

```typescript
import { useAudit } from '../store/AuditContext';

const { auditLog } = useAudit();

// Ejemplo: Crear un CP
auditLog({
  action: 'COVERAGE_ZIP_CREATED',
  entity: {
    type: 'coverageZip',
    id: newZip.id,
    label: `CP ${newZip.zip}`,
  },
  metadata: {
    zip: newZip.zip,
    status: newZip.status,
  },
});

// Ejemplo: Cambio de estado con diff
auditLog({
  action: 'COVERAGE_ZIP_STATUS_CHANGED',
  entity: {
    type: 'coverageZip',
    id: zip.id,
    label: `CP ${zip.zip}`,
  },
  changes: [
    {
      field: 'status',
      from: 'REVIEW',
      to: 'ENABLED',
    },
  ],
  metadata: {
    reason: 'Aprobado por operaciones',
  },
});
```

### Ventajas

✅ **Captura automática del actor** (currentUser desde AuthContext)  
✅ **Generación automática de ID y timestamp**  
✅ **Persistencia automática en localStorage**  
✅ **Tipado fuerte** (TypeScript)

## Utility: `diffFields()`

### Ubicación
`/src/app/utils/auditHelpers.ts`

### Uso

```typescript
import { diffFields } from '../utils/auditHelpers';

const changes = diffFields(
  oldZip,
  newZip,
  ['zip', 'status', 'deliveryFee', 'minOrder', 'onlyMeetupPoint', 'meetupPointNote', 'reason', 'notes']
);

// Retorna solo los campos que cambiaron:
// [
//   { field: 'deliveryFee', from: 50, to: 75 },
//   { field: 'minOrder', from: null, to: 500 }
// ]
```

### Características

- ✅ Compara solo los campos especificados
- ✅ Excluye automáticamente `updatedAt` y `createdAt`
- ✅ Normaliza `undefined` y `null` para evitar ruido
- ✅ Soporta arrays y objetos anidados

## Eventos de Cobertura (CPs)

### COVERAGE_ZIP_CREATED

```typescript
auditLog({
  action: 'COVERAGE_ZIP_CREATED',
  entity: {
    type: 'coverageZip',
    id: 'cov_123',
    label: 'CP 03100',
  },
  metadata: {
    zip: '03100',
    status: 'ENABLED',
  },
});
```

### COVERAGE_ZIP_UPDATED

```typescript
const changes = diffFields(oldZip, newZip, [
  'zip', 'status', 'deliveryFee', 'minOrder', 
  'onlyMeetupPoint', 'meetupPointNote', 'reason', 'notes'
]);

if (changes.length > 0) {
  auditLog({
    action: 'COVERAGE_ZIP_UPDATED',
    entity: {
      type: 'coverageZip',
      id: zip.id,
      label: `CP ${zip.zip}`,
    },
    changes,
  });
}
```

### COVERAGE_ZIP_STATUS_CHANGED

```typescript
auditLog({
  action: 'COVERAGE_ZIP_STATUS_CHANGED',
  entity: {
    type: 'coverageZip',
    id: zip.id,
    label: `CP ${zip.zip}`,
  },
  changes: [
    {
      field: 'status',
      from: 'REVIEW',
      to: 'ENABLED',
    },
  ],
  metadata: {
    reason: 'Política de seguridad',
  },
});
```

### COVERAGE_IMPORT

```typescript
auditLog({
  action: 'COVERAGE_IMPORT',
  metadata: {
    mode: 'merge', // o 'skip'
    rowsTotal: 100,
    createdCount: 75,
    updatedCount: 20,
    skippedCount: 5,
    errorCount: 0, // opcional
    errorsSample: [], // máximo 3 errores
  },
});
```

### COVERAGE_EXPORT

```typescript
auditLog({
  action: 'COVERAGE_EXPORT',
  metadata: {
    countExported: 156,
    filtersApplied: {}, // opcional, si exportas filtrado
  },
});
```

## Eventos de Pedidos en Revisión

### ORDER_REVIEW_FLAGGED

Cuando un pedido pasa a `HOLD_REVIEW` por CP en zona de revisión:

```typescript
auditLog({
  action: 'ORDER_REVIEW_FLAGGED',
  entity: {
    type: 'order',
    id: order.id,
    label: order.orderNumber,
  },
  metadata: {
    zip: '03100',
    zipStatus: 'REVIEW',
    channel: order.channel,
    total: order.total,
  },
});
```

### ORDER_REVIEW_APPROVED

Cuando se aprueba un pedido en revisión:

```typescript
auditLog({
  action: 'ORDER_REVIEW_APPROVED',
  entity: {
    type: 'order',
    id: order.id,
    label: order.orderNumber,
  },
  changes: [
    {
      field: 'status',
      from: 'HOLD_REVIEW',
      to: 'PLACED', // o 'PAID' según tu regla
    },
  ],
  metadata: {
    approvedByPolicy: true,
    zip: '03100',
  },
});
```

### ORDER_REVIEW_REJECTED

Cuando se rechaza un pedido en revisión:

```typescript
auditLog({
  action: 'ORDER_REVIEW_REJECTED',
  entity: {
    type: 'order',
    id: order.id,
    label: order.orderNumber,
  },
  changes: [
    {
      field: 'status',
      from: 'HOLD_REVIEW',
      to: 'CANCELLED',
    },
  ],
  metadata: {
    zip: '03100',
    reasonNote: 'Zona de alto riesgo',
  },
});
```

## UI de Auditoría

### Componente: AuditEventCard

Ubicación: `/src/app/components/AuditEventCard.tsx`

#### Características

✅ **Header compacto** con acción, tipo de entidad y label  
✅ **Actor con rol** y timestamp formateado  
✅ **Enlaces clickeables** a la entidad afectada  
✅ **Sección de cambios colapsable** (antes/después con colores)  
✅ **Metadata colapsable** en formato JSON  
✅ **Responsive** y accesible

#### Enlaces Automáticos

El componente genera enlaces inteligentes según el tipo de entidad:

| Tipo | Enlace |
|------|--------|
| `coverageZip` | `/coverage?zip=03100` |
| `order` | `/orders/:id` |
| `customer` | `/customers/:id` |
| `product` | `/products/:id/edit` |
| `rma` | `/rma/:id` |
| `user` | `/users` |
| `role` | `/users` |

### Página: Audit

Ubicación: `/src/app/pages/Audit.tsx`

#### Funcionalidades

- 🔍 **Búsqueda global** por entidad, usuario o acción
- 🎛️ **Filtro por acción** (dropdown con acciones disponibles)
- 📊 **Contador de eventos** filtrados vs totales
- 📋 **Lista de tarjetas** con todos los eventos
- 🔄 **Estado vacío** inteligente

## Helpers de Utilidad

### `formatChange(change)`

Formatea un cambio para mostrar en texto:

```typescript
formatChange({
  field: 'status',
  from: 'REVIEW',
  to: 'ENABLED',
});
// => "status: REVIEW → ENABLED"
```

### `getEntityTypeLabel(type)`

Convierte el tipo técnico en label legible:

```typescript
getEntityTypeLabel('coverageZip'); // => "CP"
getEntityTypeLabel('order'); // => "Pedido"
getEntityTypeLabel('customer'); // => "Cliente"
```

### `getFieldLabel(field)`

Convierte nombres de campos en labels amigables:

```typescript
getFieldLabel('deliveryFee'); // => "Costo de envío"
getFieldLabel('minOrder'); // => "Monto mínimo"
getFieldLabel('onlyMeetupPoint'); // => "Solo punto de encuentro"
```

## Flujo Completo: Ejemplo Real

### Escenario: Cambiar CP de REVIEW a ENABLED

```typescript
// 1. En CoverageContext.tsx
const updateZip = (id: string, patch: Partial<CoverageZip>): boolean => {
  const existing = state.coverageZips.find((z) => z.id === id);
  if (!existing) return false;

  const updated: CoverageZip = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  dispatch({ type: 'UPDATE_ZIP', payload: updated });

  // 2. Detectar cambio de estado
  if (patch.status && patch.status !== existing.status) {
    auditLog({
      action: 'COVERAGE_ZIP_STATUS_CHANGED',
      entity: {
        type: 'coverageZip',
        id: existing.id,
        label: `CP ${existing.zip}`,
      },
      changes: [
        {
          field: 'status',
          from: existing.status,
          to: patch.status,
        },
      ],
      metadata: {
        reason: patch.reason,
      },
    });
  }

  return true;
};
```

### Resultado en Auditoría

```
┌────────────────────────────────────────────────────────────────┐
│ Estado de CP cambiado · CP · CP 03100 🔗                      │
│ Carlos Admin · SUPER_ADMIN · 5 feb 2026, 14:30:15            │
├────────────────────────────────────────────────────────────────┤
│ ▼ Cambios (1)                                                 │
│   status: REVIEW → ENABLED                                     │
├────────────────────────────────────────────────────────────────┤
│ ▼ Detalles adicionales                                        │
│   {                                                            │
│     "reason": "Política de seguridad"                         │
│   }                                                            │
└────────────────────────────────────────────────────────────────┘
```

## Migración de Código Legacy

Si tienes código usando el sistema antiguo de auditoría, migra así:

### Antes (Sistema Antiguo)

```typescript
logEvent({
  action: 'PRODUCT_UPDATED',
  entityType: 'product',
  entityId: product.id,
  entityName: product.name,
  userId: currentUser.id,
  userName: currentUser.name,
  userRole: currentUser.role,
  changes: [{ field: 'price', from: 100, to: 150 }],
});
```

### Después (Sistema Nuevo)

```typescript
auditLog({
  action: 'PRODUCT_UPDATED',
  entity: {
    type: 'product',
    id: product.id,
    label: product.name,
  },
  changes: [
    {
      field: 'price',
      from: 100,
      to: 150,
    },
  ],
});
```

## Reglas de Oro

1. ✅ **Siempre incluye `entity`** si el evento afecta una entidad concreta
2. ✅ **Usa `changes`** solo cuando hay un antes/después claro
3. ✅ **Usa `metadata`** para contexto adicional (no duplicar info de `entity`)
4. ✅ **Usa labels descriptivos** en `entity.label` ("CP 03100", no "03100")
5. ✅ **Usa `diffFields()`** para detectar cambios automáticamente
6. ✅ **No registres timestamp** en metadata (ya está en `ts`)
7. ✅ **No registres actor** en metadata (ya está en `actor`)

## Persistencia

- Todos los eventos se guardan en **localStorage** bajo la clave `ecommerce_admin_audit_log`
- Formato: Array de `AuditEvent` en JSON
- Límite teórico: ~5-10 MB (suficiente para miles de eventos)
- En producción, migrar a backend para evitar pérdida de datos

## Próximos Pasos

- [ ] Paginación/Scroll infinito en lista de auditoría
- [ ] Exportar log de auditoría a CSV
- [ ] Filtro por fecha (rango)
- [ ] Filtro por actor
- [ ] Filtro por tipo de entidad
- [ ] Endpoint backend para sincronizar eventos
- [ ] Retención automática (eliminar eventos > 90 días)

## Soporte

Para dudas o mejoras, contactar al equipo de desarrollo.
