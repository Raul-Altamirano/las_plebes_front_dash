import { useState } from 'react';
import { type Permission } from '../types/permissions';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Search } from 'lucide-react';

interface PermissionsMatrixProps {
  selectedPermissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
}

// Agrupar permisos por módulo
const PERMISSION_GROUPS: Record<string, { label: string; permissions: Permission[] }> = {
  products: {
    label: 'Productos',
    permissions: [
      'product:read',
      'product:create',
      'product:update',
      'product:delete',
      'product:publish',
    ],
  },
  inventory: {
    label: 'Inventario',
    permissions: ['inventory:update'],
  },
  media: {
    label: 'Medios',
    permissions: ['media:upload'],
  },
  categories: {
    label: 'Categorías',
    permissions: [
      'category:read',
      'category:create',
      'category:update',
      'category:archive',
    ],
  },
  promotions: {
    label: 'Promociones',
    permissions: [
      'promo:read',
      'promo:create',
      'promo:update',
      'promo:toggle',
    ],
  },
  coupons: {
    label: 'Cupones',
    permissions: [
      'coupon:read',
      'coupon:create',
      'coupon:update',
      'coupon:toggle',
    ],
  },
  orders: {
    label: 'Pedidos',
    permissions: [
      'order:read',
      'order:create',
      'order:update',
      'order:fulfill',
      'order:cancel',
      'order:refund',
    ],
  },
  customers: {
    label: 'Clientes',
    permissions: [
      'customer:read',
      'customer:create',
      'customer:update',
    ],
  },
  costs: {
    label: 'Costos y Márgenes',
    permissions: [
      'cost:read',
      'cost:update',
    ],
  },
  rma: {
    label: 'Cambios/Devoluciones',
    permissions: [
      'rma:read',
      'rma:create',
      'rma:update',
      'rma:complete',
      'rma:cancel',
    ],
  },
  users: {
    label: 'Usuarios y Roles',
    permissions: [
      'user:manage',
      'role:manage',
    ],
  },
  system: {
    label: 'Sistema',
    permissions: [
      'settings:read',
      'audit:read',
      'report:export',
    ],
  },
};

// Labels amigables para permisos
const PERMISSION_LABELS: Record<Permission, string> = {
  'product:read': 'Ver productos',
  'product:create': 'Crear productos',
  'product:update': 'Editar productos',
  'product:delete': 'Eliminar productos',
  'product:publish': 'Publicar/despublicar',
  'inventory:update': 'Ajustar inventario',
  'media:upload': 'Subir imágenes',
  'category:read': 'Ver categorías',
  'category:create': 'Crear categorías',
  'category:update': 'Editar categorías',
  'category:archive': 'Archivar categorías',
  'promo:read': 'Ver promociones',
  'promo:create': 'Crear promociones',
  'promo:update': 'Editar promociones',
  'promo:toggle': 'Activar/desactivar',
  'coupon:read': 'Ver cupones',
  'coupon:create': 'Crear cupones',
  'coupon:update': 'Editar cupones',
  'coupon:toggle': 'Activar/desactivar',
  'order:read': 'Ver pedidos',
  'order:create': 'Crear pedidos',
  'order:update': 'Editar pedidos',
  'order:fulfill': 'Completar pedidos',
  'order:cancel': 'Cancelar pedidos',
  'order:refund': 'Reembolsar pedidos',
  'customer:read': 'Ver clientes',
  'customer:create': 'Crear clientes',
  'customer:update': 'Editar clientes',
  'cost:read': 'Ver costos y márgenes',
  'cost:update': 'Editar costos',
  'rma:read': 'Ver RMAs',
  'rma:create': 'Crear RMAs',
  'rma:update': 'Editar RMAs',
  'rma:complete': 'Completar RMAs',
  'rma:cancel': 'Cancelar RMAs',
  'user:manage': 'Gestionar usuarios',
  'role:manage': 'Gestionar roles',
  'settings:read': 'Ver configuración',
  'audit:read': 'Ver auditoría',
  'report:export': 'Exportar reportes',
};

export function PermissionsMatrix({ selectedPermissions, onChange, disabled }: PermissionsMatrixProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const togglePermission = (permission: Permission) => {
    if (disabled) return;
    
    if (selectedPermissions.includes(permission)) {
      onChange(selectedPermissions.filter((p) => p !== permission));
    } else {
      onChange([...selectedPermissions, permission]);
    }
  };

  const toggleGroup = (groupPermissions: Permission[]) => {
    if (disabled) return;

    const allSelected = groupPermissions.every((p) => selectedPermissions.includes(p));
    
    if (allSelected) {
      // Deseleccionar todos del grupo
      onChange(selectedPermissions.filter((p) => !groupPermissions.includes(p)));
    } else {
      // Seleccionar todos del grupo
      const newPermissions = [...selectedPermissions];
      groupPermissions.forEach((p) => {
        if (!newPermissions.includes(p)) {
          newPermissions.push(p);
        }
      });
      onChange(newPermissions);
    }
  };

  // Filtrar permisos por búsqueda
  const filteredGroups = Object.entries(PERMISSION_GROUPS).reduce((acc, [key, group]) => {
    if (searchQuery.trim() === '') {
      acc[key] = group;
      return acc;
    }

    const query = searchQuery.toLowerCase();
    const matchingPermissions = group.permissions.filter((permission) => {
      const label = PERMISSION_LABELS[permission].toLowerCase();
      return label.includes(query) || permission.includes(query);
    });

    if (matchingPermissions.length > 0 || group.label.toLowerCase().includes(query)) {
      acc[key] = {
        ...group,
        permissions: searchQuery.trim() === '' ? group.permissions : matchingPermissions,
      };
    }

    return acc;
  }, {} as typeof PERMISSION_GROUPS);

  const totalPermissions = Object.values(PERMISSION_GROUPS).reduce(
    (acc, group) => acc + group.permissions.length,
    0
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar permisos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <span className="font-medium text-blue-900">
          {selectedPermissions.length} de {totalPermissions} permisos seleccionados
        </span>
      </div>

      {/* Groups */}
      <div className="space-y-4">
        {Object.entries(filteredGroups).map(([key, group]) => {
          const groupPermissions = group.permissions;
          const selectedCount = groupPermissions.filter((p) => selectedPermissions.includes(p)).length;
          const allSelected = selectedCount === groupPermissions.length && groupPermissions.length > 0;
          const someSelected = selectedCount > 0 && selectedCount < groupPermissions.length;

          return (
            <div key={key} className="border border-gray-200 rounded-lg p-4 space-y-3">
              {/* Group Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected}
                    // @ts-ignore - indeterminate is valid
                    indeterminate={someSelected}
                    onCheckedChange={() => toggleGroup(groupPermissions)}
                    disabled={disabled}
                  />
                  <Label className="font-medium text-gray-900 cursor-pointer" onClick={() => !disabled && toggleGroup(groupPermissions)}>
                    {group.label}
                  </Label>
                </div>
                <span className="text-xs text-gray-500">
                  {selectedCount}/{groupPermissions.length}
                </span>
              </div>

              {/* Permissions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                {groupPermissions.map((permission) => (
                  <div key={permission} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedPermissions.includes(permission)}
                      onCheckedChange={() => togglePermission(permission)}
                      disabled={disabled}
                      id={permission}
                    />
                    <Label
                      htmlFor={permission}
                      className="text-sm text-gray-700 cursor-pointer"
                    >
                      {PERMISSION_LABELS[permission]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(filteredGroups).length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron permisos que coincidan con "{searchQuery}"
        </div>
      )}
    </div>
  );
}
