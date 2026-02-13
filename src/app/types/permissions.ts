// Permisos atómicos del sistema
export type Permission =
  | 'product:read'
  | 'product:create'
  | 'product:update'
  | 'product:delete'
  | 'product:publish'
  | 'inventory:update'
  | 'media:upload'
  | 'category:read'
  | 'category:create'
  | 'category:update'
  | 'category:archive'
  | 'promo:read'
  | 'promo:create'
  | 'promo:update'
  | 'promo:toggle'
  | 'coupon:read'
  | 'coupon:create'
  | 'coupon:update'
  | 'coupon:toggle'
  | 'order:read'
  | 'order:create'
  | 'order:update'
  | 'order:fulfill'
  | 'order:cancel'
  | 'order:refund'
  | 'customer:read'
  | 'customer:create'
  | 'customer:update'
  | 'cost:read'        // Ver costos y márgenes
  | 'cost:update'      // Editar costos
  | 'rma:read'         // Ver cambios/devoluciones
  | 'rma:create'       // Crear RMA
  | 'rma:update'       // Editar RMA (draft/approved)
  | 'rma:complete'     // Completar RMA (aplicar inventario)
  | 'rma:cancel'       // Cancelar RMA
  | 'coverage:read'    // Ver cobertura de CPs
  | 'coverage:update'  // Actualizar cobertura
  | 'coverage:import'  // Importar CSVs de cobertura
  | 'coverage:export'  // Exportar CSVs de cobertura
  | 'user:manage'      // Gestionar usuarios
  | 'role:manage'      // Gestionar roles
  | 'settings:read'
  | 'audit:read'
  | 'audit:purge'      // Purgar eventos antiguos
  | 'report:export';   // Exportar reportes con datos sensibles

// Roles del sistema
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CATALOG' | 'OPS' | 'VIEWER';

// Mapeo de roles a permisos
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'product:read',
    'product:create',
    'product:update',
    'product:delete',
    'product:publish',
    'inventory:update',
    'media:upload',
    'category:read',
    'category:create',
    'category:update',
    'category:archive',
    'promo:read',
    'promo:create',
    'promo:update',
    'promo:toggle',
    'coupon:read',
    'coupon:create',
    'coupon:update',
    'coupon:toggle',
    'order:read',
    'order:create',
    'order:update',
    'order:fulfill',
    'order:cancel',
    'order:refund',
    'customer:read',
    'customer:create',
    'customer:update',
    'cost:read',
    'cost:update',
    'rma:read',
    'rma:create',
    'rma:update',
    'rma:complete',
    'rma:cancel',
    'coverage:read',
    'coverage:update',
    'coverage:import',
    'coverage:export',
    'user:manage',
    'role:manage',
    'settings:read',
    'audit:read',
    'audit:purge',
    'report:export',
  ],
  ADMIN: [
    'product:read',
    'product:create',
    'product:update',
    'product:delete',
    'product:publish',
    'inventory:update',
    'media:upload',
    'category:read',
    'category:create',
    'category:update',
    'category:archive',
    'promo:read',
    'promo:create',
    'promo:update',
    'promo:toggle',
    'coupon:read',
    'coupon:create',
    'coupon:update',
    'coupon:toggle',
    'order:read',
    'order:create',
    'order:update',
    'order:fulfill',
    'order:cancel',
    'order:refund',
    'customer:read',
    'customer:create',
    'customer:update',
    'cost:read',
    'cost:update',
    'rma:read',
    'rma:create',
    'rma:update',
    'rma:complete',
    'rma:cancel',
    'coverage:read',
    'coverage:update',
    'coverage:import',
    'coverage:export',
    'settings:read',
    'audit:read',
    'audit:purge',
    'report:export',
  ],
  CATALOG: [
    'product:read',
    'product:create',
    'product:update',
    'product:publish',
    'media:upload',
    'category:read',
    'category:create',
    'category:update',
    'category:archive',
    'promo:read',
    'promo:create',
    'promo:update',
    'promo:toggle',
    'coupon:read',
    'coupon:create',
    'coupon:update',
    'coupon:toggle',
    'order:read',
    'customer:read',
    'rma:read',
    'cost:update', // Puede actualizar costos pero no necesariamente verlos en reportes
  ],
  OPS: [
    'product:read',
    'inventory:update',
    'category:read',
    'order:read',
    'order:update',
    'order:fulfill',
    'order:cancel',
    'customer:read',
    'customer:update',
    'rma:read',
    'rma:create',
    'rma:update',
    'rma:complete',
    'rma:cancel',
    'coverage:read',
    'coverage:update',
  ],
  VIEWER: [
    'product:read',
    'category:read',
    'order:read',
    'customer:read',
    'rma:read',
  ],
};

// Usuario del sistema (legacy, used for auth context)
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
}

// Estados del usuario
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

// Usuario del sistema (nueva estructura para módulo Users)
export interface SystemUser {
  id: string;
  name: string;
  email: string;
  roleId: string; // Referencia a SystemRole
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

// Rol del sistema (nueva estructura para módulo Roles)
export interface SystemRole {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean; // true para roles predefinidos (no se pueden eliminar)
  createdAt: string;
  updatedAt: string;
}

// Labels para estados
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
};

// Etiquetas amigables para roles
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  CATALOG: 'Catálogo',
  OPS: 'Operaciones',
  VIEWER: 'Visualizador',
};