# 🔐 Usuarios y Credenciales - Dashboard Las Plebes

## Usuarios Disponibles (5 Roles)

### 1. Super Admin
- **Email:** `sadmin@local.dev`
- **Password:** `1` (o cualquier dígito 1-9)
- **Rol:** SUPER_ADMIN
- **Permisos:** Acceso completo al sistema, incluye gestión de usuarios y roles

### 2. Administrador
- **Email:** `admin@local.dev`
- **Password:** `1` (o cualquier dígito 1-9)
- **Rol:** ADMIN
- **Permisos:** Acceso completo excepto gestión de usuarios y roles

### 3. Gestor de Catálogo
- **Email:** `catalog@example.com`
- **Password:** `1` (o cualquier dígito 1-9)
- **Rol:** CATALOG
- **Permisos:** Gestión de productos, categorías, promociones y cupones

### 4. Operaciones
- **Email:** `ops@example.com`
- **Password:** `1` (o cualquier dígito 1-9)
- **Rol:** OPS
- **Permisos:** Gestión de inventario, pedidos, devoluciones y cobertura

### 5. Viewer (Solo Lectura)
- **Email:** `viewer@example.com`
- **Password:** `1` (o cualquier dígito 1-9)
- **Rol:** VIEWER
- **Permisos:** Solo lectura de productos, categorías, pedidos y clientes

---

## Matriz de Permisos por Rol

| Módulo | Super Admin | Admin | Catalog | Ops | Viewer |
|--------|------------|-------|---------|-----|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Productos | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ Solo Stock | ✅ Read |
| Categorías | ✅ CRUD | ✅ CRUD | ✅ CRUD | ❌ | ✅ Read |
| Promociones | ✅ CRUD | ✅ CRUD | ✅ CRUD | ❌ | ❌ |
| Cupones | ✅ CRUD | ✅ CRUD | ✅ CRUD | ❌ | ❌ |
| Pedidos | ✅ CRUD | ✅ CRUD | ❌ | ✅ CRUD | ✅ Read |
| Cambios/Devoluciones | ✅ CRUD | ✅ CRUD | ❌ | ✅ CRUD | ❌ |
| Cobertura | ✅ CRUD | ✅ CRUD | ❌ | ✅ CRUD | ❌ |
| Clientes | ✅ CRUD | ✅ CRUD | ❌ | ✅ CRUD | ✅ Read |
| Usuarios y Roles | ✅ CRUD | ❌ | ❌ | ❌ | ❌ |
| Auditoría | ✅ Read | ✅ Read | ❌ | ❌ | ❌ |
| Configuración | 🚧 Pronto | 🚧 Pronto | 🚧 Pronto | 🚧 Pronto | 🚧 Pronto |

---

## Notas Importantes

- **Validación de Password:** Solo acepta dígitos del 1 al 9 (simulación)
- **Persistencia:** Los datos se almacenan en localStorage del navegador
- **Auditoría:** Todos los logins/logouts quedan registrados
- **Migración Automática:** Al recargar, los usuarios se crean/actualizan automáticamente
- **Estado:** Todos los usuarios están en estado `ACTIVE`

---

## Para Probar los Flujos

### Recomendación de pruebas:

1. **Super Admin** → Probar gestión de usuarios, roles y todos los módulos
2. **Admin** → Probar gestión operativa completa (sin usuarios)
3. **Catalog** → Probar gestión de productos, categorías, promos
4. **Ops** → Probar pedidos, RMAs, inventario, cobertura
5. **Viewer** → Verificar que solo puede ver, no editar

---

## Eliminar Simulador

✅ **UserSelector eliminado** de:
- Sidebar desktop (inferior izquierdo)
- Drawer mobile (inferior)

Ahora cada sesión es independiente. Para cambiar de usuario, haz logout y vuelve a hacer login con otro email.

---

## Preparación para Deploy Local

Todos los usuarios están listos. Puedes proceder con:

1. **Pruebas de flujos** por cada rol
2. **Verificación de permisos** en cada módulo
3. **Deploy local** en tu MacBook

¡Todo listo para producción local! 🚀
