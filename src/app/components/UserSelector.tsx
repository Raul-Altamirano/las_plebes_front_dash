import { User, ChevronDown } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useUsers } from '../store/UsersContext';
import { useRoles } from '../store/RolesContext';
import { useAudit } from '../store/AuditContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export function UserSelector() {
  const { currentUserId, setCurrentUser, currentUser } = useAuth();
  const { users } = useUsers();
  const { getRoleById } = useRoles();
  const { auditLog } = useAudit();

  const handleUserChange = (userId: string) => {
    const previousUser = currentUser;
    setCurrentUser(userId);
    
    const newUser = users.find(u => u.id === userId);
    const newRole = newUser ? getRoleById(newUser.roleId) : null;
    const previousRole = previousUser ? getRoleById(users.find(u => u.id === previousUser.id)?.roleId || '') : null;
    
    // Registrar el cambio en auditoría
    if (previousUser) {
      auditLog({
        action: 'CURRENT_USER_SWITCHED',
        entity: {
          type: 'user',
          id: userId,
          label: newUser?.name || 'Unknown',
        },
        changes: [
          { field: 'userId', from: previousUser.id, to: userId },
          { field: 'userName', from: previousUser.name, to: newUser?.name || 'Unknown' },
          { field: 'role', from: previousRole?.name || 'Unknown', to: newRole?.name || 'Unknown' },
        ],
      });
    }
  };

  const activeUsers = users.filter(u => u.status === 'ACTIVE');
  const currentUserData = users.find(u => u.id === currentUserId);
  const currentRole = currentUserData ? getRoleById(currentUserData.roleId) : null;

  return (
    <div className="p-4 border-t border-gray-200 space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <User className="w-4 h-4 flex-shrink-0" />
        <div className="flex-1 min-w-0">
<div className="font-medium">{currentUserData?.name ?? currentUser?.name ?? "—"}</div>
          <div className="text-xs text-gray-500 truncate">{currentUserData?.email ?? currentUser?.email ?? "—"}</div>
        </div>
      </div>
      
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
          <ChevronDown className="w-3.5 h-3.5" />
          Usuario activo:
        </label>
        <Select value={currentUserId} onValueChange={handleUserChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {activeUsers.map((user) => {
              const role = getRoleById(user.roleId);
              return (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-gray-500">
                      {role?.name || 'Sin rol'} · {user.email}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {currentRole && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            Rol: <span className="font-medium text-gray-700">{currentRole.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}