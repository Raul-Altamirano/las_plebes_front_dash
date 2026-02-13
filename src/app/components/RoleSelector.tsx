import { User, Settings } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { Role, ROLE_LABELS } from '../types/permissions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'CATALOG', 'OPS', 'VIEWER'];

export function RoleSelector() {
  const { currentUser, setRole } = useAuth();

  return (
    <div className="p-4 border-t border-gray-200 space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <User className="w-4 h-4" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{currentUser.name}</div>
          <div className="text-xs text-gray-500 truncate">{currentUser.email}</div>
        </div>
      </div>
      
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5" />
          Simular rol:
        </label>
        <Select value={currentUser.role} onValueChange={(value) => setRole(value as Role)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
