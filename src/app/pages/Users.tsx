import { useState } from 'react';
import { Plus, Edit, Ban, CheckCircle, Mail, Download } from 'lucide-react';
import { useUsers } from '../store/UsersContext';
import { useRoles } from '../store/RolesContext';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { UserStatusBadge } from "../components/UserStatusBadge";
import { type SystemUser, USER_STATUS_LABELS } from '../types/user';
import { Button } from '../components/ui/button';
import { Badge } from '../components/Badge';
import { GenericDataTable } from '../components/GenericDataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toast } from 'sonner';
import { exportToCSV, formatDateForCSV } from '../utils/csvExport';
import { Card } from '../components/ui/card';

type FormMode = 'create' | 'edit';

interface UserFormData {
  name: string;
  email: string;
  roleId: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export function Users() {
  const { users, getUserById, createUser, updateUser, suspendUser, activateUser, isEmailAvailable, canDeleteSuperAdmin } = useUsers();
  const { roles, getRoleById } = useRoles();
  // const { currentUser, hasPermission } = useAuth();
  const { currentUser, ready, isAuthenticated, hasPermission } = useAuth();

  const { auditLog } = useAudit();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; userId: string; action: 'suspend' | 'activate' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    roleId: '',
    status: 'ACTIVE',
  });

  const canManageUsers = hasPermission('user:manage');
  const canExport = hasPermission('report:export');

  const handleOpenCreate = () => {
    if (!canManageUsers) {
      toast.error('No tienes permiso para crear usuarios');
      return;
    }
    setFormMode('create');
    setEditingUserId(null);
    setFormData({
      name: '',
      email: '',
      roleId: roles[0]?.id || '',
      status: 'ACTIVE',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: SystemUser) => {
    if (!canManageUsers) {
      toast.error('No tienes permiso para editar usuarios');
      return;
    }
    setFormMode('edit');
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      status: user.status,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ready) return; // o muestra loader
if (!isAuthenticated || !currentUser) {
  toast.error("Sesión no lista. Vuelve a iniciar sesión.");
  return;
}

    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('El email es requerido');
      return;
    }

    // Validación simple de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('El email no es válido');
      return;
    }

    if (!formData.roleId) {
      toast.error('El rol es requerido');
      return;
    }

    // Verificar que el email no esté en uso
    if (!isEmailAvailable(formData.email, editingUserId || undefined)) {
      toast.error('Este email ya está en uso');
      return;
    }

    if (formMode === 'create') {
      const newUser = createUser({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        roleId: formData.roleId,
        status: formData.status,
      });

      const role = getRoleById(formData.roleId);
auditLog({
  action: "USER_CREATED",
  entity: {
    type: "user",
    id: newUser.id,
    label: newUser.name,
  },
  changes: [
    { field: "email", from: null, to: newUser.email },
    { field: "roleId", from: null, to: newUser.roleId },
    { field: "roleName", from: null, to: role?.name || "Unknown" },
    { field: "status", from: null, to: newUser.status },
  ],
  metadata: {
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRoleName: currentUser.roleName ?? currentUser.roleId ?? "—",
  },
});


      toast.success(`Usuario ${newUser.name} creado exitosamente`);
    } else if (editingUserId) {
      const oldUser = getUserById(editingUserId);
      if (!oldUser) return;

      // Validación: no cambiar rol del último super admin
      if (oldUser.roleId !== formData.roleId && !canDeleteSuperAdmin(editingUserId, oldUser.roleId)) {
        toast.error('No puedes cambiar el rol del último Super Admin activo');
        return;
      }

      const changes = [];
      if (oldUser.name !== formData.name) {
        changes.push({ field: 'name', from: oldUser.name, to: formData.name });
      }
      if (oldUser.email !== formData.email) {
        changes.push({ field: 'email', from: oldUser.email, to: formData.email });
      }
      if (oldUser.roleId !== formData.roleId) {
        const oldRole = getRoleById(oldUser.roleId);
        const newRole = getRoleById(formData.roleId);
        changes.push({ field: 'roleId', from: oldUser.roleId, to: formData.roleId });
        changes.push({ field: 'roleName', from: oldRole?.name || 'Unknown', to: newRole?.name || 'Unknown' });
      }
      if (oldUser.status !== formData.status) {
        changes.push({ field: 'status', from: oldUser.status, to: formData.status });
      }

      updateUser(editingUserId, {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        roleId: formData.roleId,
        status: formData.status,
      });

      const oldRole = getRoleById(oldUser.roleId);

      auditLog({
        action: 'USER_UPDATED',
        entity: {
    type: "user",
    id: editingUserId,
    label: oldUser.name,
  },
  changes: [
    { field: "email", from: oldUser.email, to: formData.email },
    { field: "roleId", from: oldUser.roleId, to: formData.roleId },
    { field: "roleName", from: oldRole?.name || 'Unknown', to: getRoleById(formData.roleId)?.name || "Unknown" },
    { field: "status", from: oldUser.status, to: formData.status },
  ],
  metadata: {
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRoleName: currentUser.roleName ?? currentUser.roleId ?? "—",
  },
      });

      toast.success(`Usuario ${formData.name} actualizado exitosamente`);
    }

    setIsFormOpen(false);
  };

  const handleSuspendActivate = (userId: string, action: 'suspend' | 'activate') => {
    const user = getUserById(userId);
    if (!user) return;

    // Validación: no suspender al último super admin
    if (action === 'suspend' && !canDeleteSuperAdmin(userId, user.roleId)) {
      toast.error('No puedes suspender al último Super Admin activo');
      return;
    }

    setConfirmDialog({ open: true, userId, action });
  };

  const confirmSuspendActivate = () => {
    if (!confirmDialog) return;

    const user = getUserById(confirmDialog.userId);
    if (!user) return;

    if (!currentUser) {
      toast.error('Sesión no lista. Vuelve a iniciar sesión.');
      return;
    }

    if (confirmDialog.action === 'suspend') {
      suspendUser(confirmDialog.userId);
      auditLog({
        action: 'USER_SUSPENDED',
          entity: {
    type: "user",
    id: user.id,
    label: user.name,
  },
        
  metadata: {
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRoleName: currentUser.roleName ?? currentUser.roleId ?? "—",
  },
        changes: [{ field: 'status', from: 'ACTIVE', to: 'SUSPENDED' }],
      });
      toast.success(`Usuario ${user.name} suspendido`);
    } else {
      activateUser(confirmDialog.userId);
      auditLog({
        action: 'USER_ACTIVATED',
          entity: {
    type: "user",
    id: user.id,
    label: user.name,
  },
        metadata: {
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRoleName: currentUser.roleName ?? currentUser.roleId ?? "—",
        },
        changes: [{ field: 'status', from: 'SUSPENDED', to: 'ACTIVE' }],
      });
      toast.success(`Usuario ${user.name} activado`);
    }

    setConfirmDialog(null);
  };

  const columns = [
    {
      key: 'name',
      label: 'Nombre',
      render: (user: SystemUser) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{user.name}</span>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Mail className="w-3 h-3" />
            {user.email}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Rol',
      render: (user: SystemUser) => {
        const role = getRoleById(user.roleId);
        return (
          <div className="flex flex-col">
            <span className="font-medium text-gray-700">{role?.name || 'Sin rol'}</span>
            {role?.description && (
              <span className="text-xs text-gray-500">{role.description}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Estado',
      render: (user: SystemUser) => (
<UserStatusBadge status={user.status as any} />
      ),
    },
    {
      key: 'created',
      label: 'Creado',
      render: (user: SystemUser) => new Date(user.createdAt).toLocaleDateString('es-ES'),
    },
  ];

  const actions = canManageUsers
    ? [
        {
          label: 'Editar',
          icon: Edit,
          onClick: (user: SystemUser) => handleOpenEdit(user),
        },
        {
          label: (user: SystemUser) => (user.status === 'ACTIVE' ? 'Suspender' : 'Activar'),
          icon: (user: SystemUser) => (user.status === 'ACTIVE' ? Ban : CheckCircle),
          onClick: (user: SystemUser) =>
            handleSuspendActivate(user.id, user.status === 'ACTIVE' ? 'suspend' : 'activate'),
          variant: (user: SystemUser) => (user.status === 'ACTIVE' ? 'destructive' : 'default'),
        },
      ]
    : [];

  const exportUsersToCSV = () => {
    setIsExporting(true);
    const csvData = users.map(user => ({
      Nombre: user.name,
      Email: user.email,
      Rol: getRoleById(user.roleId)?.name || 'Sin rol',
      Estado: USER_STATUS_LABELS[user.status],
      Creado: formatDateForCSV(new Date(user.createdAt)),
    }));
    exportToCSV(csvData, 'usuarios');
    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona los usuarios del sistema</p>
        </div>
        <div className="flex gap-2">
          {users.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={exportUsersToCSV} 
                    disabled={!canExport || isExporting}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? 'Exportando...' : 'Exportar CSV'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {!canExport 
                    ? 'No tienes permiso para exportar reportes' 
                    : 'Exporta la lista de usuarios a un archivo CSV'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {canManageUsers && (
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Usuarios</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">{users.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Activos</div>
          <div className="text-2xl font-semibold text-green-600 mt-1">
            {users.filter((u) => u.status === 'ACTIVE').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Suspendidos</div>
          <div className="text-2xl font-semibold text-red-600 mt-1">
            {users.filter((u) => u.status === 'SUSPENDED').length}
          </div>
        </div>
      </div>

      {/* Table */}
      <GenericDataTable 
        data={users} 
        columns={columns} 
        actions={actions} 
        getKey={(user) => user.id}
      />

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Completa los datos del nuevo usuario'
                : 'Modifica los datos del usuario'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleId">Rol *</Label>
              <Select value={formData.roleId} onValueChange={(value) => setFormData({ ...formData, roleId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{role.name}</span>
                        {role.description && <span className="text-xs text-gray-500">{role.description}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formMode === 'edit' && (
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select value={formData.status} onValueChange={(value: 'ACTIVE' | 'SUSPENDED') => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {formMode === 'create' ? 'Crear' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.open}
          title={confirmDialog.action === 'suspend' ? 'Suspender usuario' : 'Activar usuario'}
          message={
            confirmDialog.action === 'suspend'
              ? `¿Estás seguro de que deseas suspender este usuario? No podrá acceder al sistema.`
              : `¿Estás seguro de que deseas activar este usuario?`
          }
          confirmLabel={confirmDialog.action === 'suspend' ? 'Suspender' : 'Activar'}
          variant={confirmDialog.action === 'suspend' ? 'destructive' : 'default'}
          onConfirm={confirmSuspendActivate}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}