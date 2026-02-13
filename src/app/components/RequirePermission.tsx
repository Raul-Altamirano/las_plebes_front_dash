import { type ReactNode } from 'react';
import { useAuth } from '../store/AuthContext';
import { type Permission } from '../types/permissions';
import { NotAuthorized } from './NotAuthorized';

interface RequirePermissionProps {
  permission?: Permission;
  anyOf?: Permission[];
  children: ReactNode;
}

export function RequirePermission({ permission, anyOf, children }: RequirePermissionProps) {
  const { hasPermission, hasAnyPermission } = useAuth();

  // Si se especificó un permiso único
  if (permission && !hasPermission(permission)) {
    return <NotAuthorized />;
  }

  // Si se especificó una lista de permisos (cualquiera de ellos)
  if (anyOf && !hasAnyPermission(anyOf)) {
    return <NotAuthorized />;
  }

  return <>{children}</>;
}
