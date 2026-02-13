import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../store/AuthContext';
import { Users } from './Users';
import { Roles } from './Roles';
import { NotAuthorized } from '../components/NotAuthorized';

export function UsersAndRoles() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    // Default to the first tab the user has access to
    if (hasPermission('user:manage')) return 'users';
    if (hasPermission('role:manage')) return 'roles';
    return 'users';
  });

  const canManageUsers = hasPermission('user:manage');
  const canManageRoles = hasPermission('role:manage');

  // Si no tiene ninguno de los dos permisos, mostrar NotAuthorized
  if (!canManageUsers && !canManageRoles) {
    return <NotAuthorized />;
  }

  // Si solo tiene uno de los dos permisos, mostrar solo ese
  if (canManageUsers && !canManageRoles) {
    return <Users />;
  }

  if (!canManageUsers && canManageRoles) {
    return <Roles />;
  }

  // Si tiene ambos, mostrar tabs
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="users">Usuarios</TabsTrigger>
        <TabsTrigger value="roles">Roles</TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <Users />
      </TabsContent>

      <TabsContent value="roles">
        <Roles />
      </TabsContent>
    </Tabs>
  );
}
