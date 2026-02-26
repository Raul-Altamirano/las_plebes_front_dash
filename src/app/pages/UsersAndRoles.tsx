import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../store/AuthContext';
import { Users } from './Users';
import { Roles } from './Roles';
import { NotAuthorized } from '../components/NotAuthorized';
import { RefreshButton } from "../components/RefreshButton";
import { useUsers } from "../store/UsersContext";
import { useRoles } from "../store/RolesContext";

export function UsersAndRoles() {
  const { hasPermission } = useAuth();
  // ✅ hooks DENTRO del componente
  const { status: usersStatus, lastFetch: usersLastFetch, refresh: refreshUsers } = useUsers();
  const { status: rolesStatus, lastFetch: rolesLastFetch, refresh: refreshRoles } = useRoles();

  const [activeTab, setActiveTab] = useState(() => {
    if (hasPermission('user:manage')) return 'users';
    if (hasPermission('role:manage')) return 'roles';
    return 'users';
  });

  const canManageUsers = hasPermission('user:manage');
  const canManageRoles = hasPermission('role:manage');

  if (!canManageUsers && !canManageRoles) return <NotAuthorized />;
  if (canManageUsers && !canManageRoles) return <Users />;
  if (!canManageUsers && canManageRoles) return <Roles />;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="flex items-center justify-between mb-6">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        {/* Refresh según tab activo */}
        {activeTab === "users" && (
          <RefreshButton status={usersStatus} lastFetch={usersLastFetch} onRefresh={refreshUsers} />
        )}
        {activeTab === "roles" && (
          <RefreshButton status={rolesStatus} lastFetch={rolesLastFetch} onRefresh={refreshRoles} />
        )}
      </div>

      <TabsContent value="users">
        <Users />
      </TabsContent>

      <TabsContent value="roles">
        <Roles />
      </TabsContent>
    </Tabs>
  );
}