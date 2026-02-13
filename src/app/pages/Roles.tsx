import { useState } from 'react';
import { Plus, Edit, Copy, Trash2, Shield, Lock } from 'lucide-react';
import { useRoles } from '../store/RolesContext';
import { useUsers } from '../store/UsersContext';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { type SystemRole } from '../types/user';
import { type Permission } from '../types/permissions';
import { Button } from '../components/ui/button';
import { Badge } from '../components/Badge';
import { GenericDataTable } from '../components/GenericDataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
// import { Textarea } from '../components/ui/textarea';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PermissionsMatrix } from '../components/PermissionsMatrix';
import { toast } from 'sonner';

type FormMode = 'create' | 'edit';

interface RoleFormData {
  name: string;
  description: string;
  permissions: Permission[];
}

export function Roles() {
  const { roles, getRoleById, createRole, updateRole, deleteRole, duplicateRole, isNameAvailable } = useRoles();
  const { users } = useUsers();
  const { currentUser, hasPermission } = useAuth();
  const { auditLog } = useAudit();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; roleId: string } | null>(null);

  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissions: [],
  });

  const canManageRoles = hasPermission('role:manage');

  const handleOpenCreate = () => {
    if (!canManageRoles) {
      toast.error('No tienes permiso para crear roles');
      return;
    }
    setFormMode('create');
    setEditingRoleId(null);
    setFormData({
      name: '',
      description: '',
      permissions: [],
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (role: SystemRole) => {
    if (!canManageRoles) {
      toast.error('No tienes permiso para editar roles');
      return;
    }
    if (role.isSystem) {
      toast.error('No puedes editar un rol del sistema');
      return;
    }
    setFormMode('edit');
    setEditingRoleId(role.id);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions,
    });
    setIsFormOpen(true);
  };

  const handleDuplicate = (role: SystemRole) => {
    if (!canManageRoles) {
      toast.error('No tienes permiso para duplicar roles');
      return;
    }

    let baseName = `${role.name}_COPY`;
    let counter = 1;
    let newName = baseName;

    // Encontrar un nombre disponible
    while (!isNameAvailable(newName)) {
      newName = `${baseName}_${counter}`;
      counter++;
    }

    const duplicated = duplicateRole(role.id, newName);

    auditLog({
      action: 'ROLE_CLONED',
      entityType: 'role',
      entityId: duplicated.id,
      entityName: duplicated.name,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      changes: [
        { field: 'originalId', from: role.id, to: duplicated.id },
        { field: 'originalName', from: role.name, to: duplicated.name },
      ],
      metadata: { permissionsCount: duplicated.permissions.length },
    });

    toast.success(`Rol duplicado como ${duplicated.name}`);
  };

  const handleDelete = (roleId: string) => {
    if (!canManageRoles) {
      toast.error('No tienes permiso para eliminar roles');
      return;
    }

    const role = getRoleById(roleId);
    if (!role) return;

    if (role.isSystem) {
      toast.error('No puedes eliminar un rol del sistema');
      return;
    }

    // Verificar si hay usuarios con este rol
    const usersWithRole = users.filter((u) => u.roleId === roleId);
    if (usersWithRole.length > 0) {
      toast.error(`No puedes eliminar este rol porque ${usersWithRole.length} usuario(s) lo tienen asignado`);
      return;
    }

    setDeleteConfirm({ open: true, roleId });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    const role = getRoleById(deleteConfirm.roleId);
    if (!role) return;

    const success = deleteRole(deleteConfirm.roleId);
    if (success) {
      auditLog({
        action: 'ROLE_DELETED',
        entityType: 'role',
        entityId: deleteConfirm.roleId,
        entityName: role.name,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        metadata: { permissionsCount: role.permissions.length },
      });

      toast.success(`Rol ${role.name} eliminado`);
    } else {
      toast.error('No se pudo eliminar el rol');
    }

    setDeleteConfirm(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    // Verificar que el nombre no esté en uso
    if (!isNameAvailable(formData.name.trim(), editingRoleId || undefined)) {
      toast.error('Este nombre ya está en uso');
      return;
    }

    if (formMode === 'create') {
      const newRole = createRole({
        name: formData.name.trim(),
        description: formData.description.trim(),
        permissions: formData.permissions,
        isSystem: false,
      });

      auditLog({
        action: 'ROLE_CREATED',
        entityType: 'role',
        entityId: newRole.id,
        entityName: newRole.name,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        metadata: { permissionsCount: newRole.permissions.length },
      });

      toast.success(`Rol ${newRole.name} creado exitosamente`);
    } else if (editingRoleId) {
      const oldRole = getRoleById(editingRoleId);
      if (!oldRole) return;

      const changes = [];
      if (oldRole.name !== formData.name) {
        changes.push({ field: 'name', from: oldRole.name, to: formData.name });
      }
      if (oldRole.description !== formData.description) {
        changes.push({ field: 'description', from: oldRole.description || '', to: formData.description });
      }

      // Detectar cambios en permisos
      const addedPermissions = formData.permissions.filter((p) => !oldRole.permissions.includes(p));
      const removedPermissions = oldRole.permissions.filter((p) => !formData.permissions.includes(p));

      if (addedPermissions.length > 0 || removedPermissions.length > 0) {
        changes.push({
          field: 'permissions',
          from: oldRole.permissions.length,
          to: formData.permissions.length,
        });
      }

      updateRole(editingRoleId, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        permissions: formData.permissions,
      });

      auditLog({
        action: 'ROLE_UPDATED',
        entityType: 'role',
        entityId: editingRoleId,
        entityName: formData.name,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        changes,
        metadata: {
          permissionsCount: formData.permissions.length,
          addedPermissions,
          removedPermissions,
        },
      });

      toast.success(`Rol ${formData.name} actualizado exitosamente`);
    }

    setIsFormOpen(false);
  };

  const columns = [
    {
      key: 'name',
      label: 'Nombre',
      render: (role: SystemRole) => (
        <div className="flex items-center gap-2">
          {role.isSystem && (
            <Shield className="w-4 h-4 text-blue-600" title="Rol del sistema" />
          )}
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{role.name}</span>
            {role.description && (
              <span className="text-sm text-gray-500">{role.description}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'permissions',
      label: 'Permisos',
      render: (role: SystemRole) => (
        <Badge variant="default">{role.permissions.length} permisos</Badge>
      ),
    },
    {
      key: 'users',
      label: 'Usuarios',
      render: (role: SystemRole) => {
        const count = users.filter((u) => u.roleId === role.id).length;
        return <span className="text-gray-700">{count}</span>;
      },
    },
    {
      key: 'system',
      label: 'Tipo',
      render: (role: SystemRole) =>
        role.isSystem ? (
          <Badge variant="default">
            <Lock className="w-3 h-3 mr-1" />
            Sistema
          </Badge>
        ) : (
          <Badge variant="secondary">Personalizado</Badge>
        ),
    },
  ];

  const actions = canManageRoles
    ? [
        {
          label: 'Editar',
          icon: Edit,
          onClick: (role: SystemRole) => handleOpenEdit(role),
          hidden: (role: SystemRole) => role.isSystem,
        },
        {
          label: 'Duplicar',
          icon: Copy,
          onClick: (role: SystemRole) => handleDuplicate(role),
        },
        {
          label: 'Eliminar',
          icon: Trash2,
          onClick: (role: SystemRole) => handleDelete(role.id),
          variant: 'destructive',
          hidden: (role: SystemRole) => role.isSystem,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Roles</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona los roles y permisos del sistema</p>
        </div>
        {canManageRoles && (
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Rol
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Roles</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">{roles.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Roles de Sistema</div>
          <div className="text-2xl font-semibold text-blue-600 mt-1">
            {roles.filter((r) => r.isSystem).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Personalizados</div>
          <div className="text-2xl font-semibold text-purple-600 mt-1">
            {roles.filter((r) => !r.isSystem).length}
          </div>
        </div>
      </div>

      {/* Table */}
      <GenericDataTable 
        data={roles} 
        columns={columns} 
        actions={actions} 
        getKey={(role) => role.id}
      />

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Nuevo Rol' : 'Editar Rol'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Define un nuevo rol con permisos específicos'
                : 'Modifica el rol y sus permisos'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del rol *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: VENDEDOR, GERENTE"
                  required
                />
                <p className="text-xs text-gray-500">Usa MAYÚSCULAS y guiones bajos</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve descripción del rol"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Permisos *</Label>
              <PermissionsMatrix
                selectedPermissions={formData.permissions}
                onChange={(permissions) => setFormData({ ...formData, permissions })}
              />
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {formMode === 'create' ? 'Crear Rol' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={deleteConfirm.open}
          title="Eliminar rol"
          message="¿Estás seguro de que deseas eliminar este rol? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          variant="destructive"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}