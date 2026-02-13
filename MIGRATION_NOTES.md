# Notas de Migración - Sistema de Auditoría Mejorado

## Cambios Implementados

### 1. Modelo de Datos Actualizado

**Antes:**
```typescript
interface AuditEvent {
  id: string;
  timestamp: string; // ❌ Antiguo
  actor: {
    id: string;
    name: string;
    role: string; // ❌ Antiguo
  };
  action: AuditAction;
  entity: {
    type: string;
    id: string;
    name: string; // ❌ Antiguo
  };
  changes?: AuditChange[];
  metadata?: Record<string, any>;
}
```

**Después:**
```typescript
interface AuditEvent {
  id: string;
  ts: string; // ✅ Nuevo
  actor: {
    id: string;
    name: string;
    roleName?: string; // ✅ Nuevo
  };
  action: AuditAction;
  entity?: AuditEntity; // ✅ Opcional ahora
  changes?: AuditChange[];
  metadata?: Record<string, any>;
}

interface AuditEntity {
  type: AuditEntityType;
  id: string;
  label: string; // ✅ Nuevo (reemplaza 'name')
}
```

### 2. Migración Automática

El sistema incluye migración automática de eventos antiguos en `AuditContext.tsx`:

```typescript
function normalizeAuditEvent(event: any): AuditEvent {
  // Convierte 'timestamp' → 'ts'
  const ts = event.ts || event.timestamp || new Date().toISOString();
  
  // Convierte entity.name → entity.label
  let entity = event.entity;
  if (entity && !entity.label && entity.name) {
    entity = { ...entity, label: entity.name };
  }
  
  // Convierte actor.role → actor.roleName
  let actor = event.actor;
  if (actor && !actor.roleName && actor.role) {
    actor = { ...actor, roleName: actor.role };
  }

  return { id, ts, actor, action, entity, changes, metadata };
}
```

### 3. Validación de Timestamps

El componente `AuditEventCard` ahora valida timestamps antes de formatearlos:

```typescript
const formatTimestamp = (ts: string) => {
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) {
      return ts; // Retorna string raw si es inválido
    }
    return new Intl.DateTimeFormat('es-MX', { /* ... */ }).format(date);
  } catch (error) {
    return ts;
  }
};
```

### 4. Cambio de React Router

**Todos los imports** han sido actualizados de:
```typescript
import { Link, useNavigate } from 'react-router-dom'; // ❌
```

A:
```typescript
import { Link, useNavigate } from 'react-router'; // ✅
```

**Archivos actualizados:**
- `/src/app/App.tsx`
- `/src/app/components/SidebarNav.tsx`
- `/src/app/components/MobileDrawerNav.tsx`
- `/src/app/components/DataTable.tsx`
- `/src/app/components/NotAuthorized.tsx`
- `/src/app/components/AuditEventCard.tsx`
- `/src/app/pages/Dashboard.tsx`
- Todos los demás archivos de páginas

## Compatibilidad con Eventos Antiguos

✅ **Los eventos antiguos siguen funcionando** gracias a la normalización automática.  
✅ **No se requiere borrar localStorage**.  
✅ **La migración es transparente** para el usuario.

## Limpiar Auditoría (Opcional)

Si quieres empezar con auditoría limpia:

```javascript
// En la consola del navegador:
localStorage.removeItem('ecommerce_admin_audit_log');
// Luego recargar la página
```

## Errores Resueltos

### ❌ Error Original
```
RangeError: Invalid time value
    at formatTimestamp (AuditEventCard.tsx:38:8)
```

**Causa:** Eventos antiguos tenían `timestamp` en lugar de `ts`, y algunos timestamps eran inválidos.

**Solución:** 
1. Normalización automática en carga
2. Validación de fechas antes de formatear
3. Fallback a string raw si la fecha es inválida

### ❌ Error de React Router
```
The requested module does not provide an export named 'Link'
```

**Causa:** Figma Make usa `react-router` en lugar de `react-router-dom`.

**Solución:** Todos los imports actualizados a `react-router`.

## Testing

Después de la migración, verificar:

1. ✅ La página `/audit` carga sin errores
2. ✅ Los eventos antiguos se muestran correctamente
3. ✅ Los nuevos eventos se crean con el formato correcto
4. ✅ Los enlaces funcionan correctamente
5. ✅ La navegación no arroja errores de router

## Notas Adicionales

- **localStorage key:** `ecommerce_admin_audit_log`
- **Formato de IDs:** `audit_${timestamp}_${random}`
- **Formato de timestamp:** ISO 8601 (`new Date().toISOString()`)
- **Persistencia:** Automática en cada cambio

---

**Fecha de migración:** 5 de febrero de 2026  
**Versión:** 2.0 (Auditoría Mejorada)
