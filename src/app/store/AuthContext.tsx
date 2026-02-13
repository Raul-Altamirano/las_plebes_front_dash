import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type User, type Permission } from '../types/permissions';
import { useUsers } from './UsersContext';
import { useRoles } from './RolesContext';

interface AuthContextValue {
  isAuthenticated: boolean;
  currentUser: User | null;
  currentUserId: string | null;
  setCurrentUser: (userId: string) => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_KEY = 'session.currentUserId';
const AUTH_KEY = 'session.isAuthenticated';

// Temporary storage for audit logging before AuditProvider is ready
const PENDING_AUDIT_KEY = 'session.pendingAuditEvent';

export function AuthProvider({ children }: { children: ReactNode }) {
  const usersContext = useUsers();
  const rolesContext = useRoles();

  // Cargar sesión del localStorage
  const [currentUserId, setCurrentUserIdState] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      const isAuth = localStorage.getItem(AUTH_KEY);
      if (stored && isAuth === 'true') {
        return stored;
      }
    } catch (error) {
      console.error('Error loading session from localStorage:', error);
    }
    return null;
  });

  const isAuthenticated = currentUserId !== null;

  // Persistir sesión cuando cambie
  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem(SESSION_KEY, currentUserId);
      localStorage.setItem(AUTH_KEY, 'true');
    } else {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(AUTH_KEY);
    }
  }, [currentUserId]);

  // Resolver el usuario actual con permisos
  const currentUser: User | null = React.useMemo(() => {
    if (!currentUserId) {
      return null;
    }

    const systemUser = usersContext.getUserById(currentUserId);
    if (!systemUser) {
      // Fallback al primer super admin si no se encuentra
      const fallbackUser = usersContext.users[0];
      return {
        id: fallbackUser?.id || 'user-1',
        name: fallbackUser?.name || 'Admin User',
        email: fallbackUser?.email || 'admin@example.com',
        role: 'SUPER_ADMIN',
        permissions: rolesContext.getRoleById('role-super-admin')?.permissions || [],
      };
    }

    const systemRole = rolesContext.getRoleById(systemUser.roleId);
    if (!systemRole) {
      // Si no se encuentra el rol, dar permisos mínimos
      return {
        id: systemUser.id,
        name: systemUser.name,
        email: systemUser.email,
        role: 'VIEWER',
        permissions: [],
      };
    }

    return {
      id: systemUser.id,
      name: systemUser.name,
      email: systemUser.email,
      role: systemRole.name as any, // Para compatibilidad con el tipo Role
      permissions: systemRole.permissions,
    };
  }, [currentUserId, usersContext.users, rolesContext.roles, usersContext, rolesContext]);

  const setCurrentUser = (userId: string) => {
    setCurrentUserIdState(userId);
  };

  const hasPermission = (permission: Permission): boolean => {
    return currentUser?.permissions.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(p => currentUser?.permissions.includes(p)) || false;
  };

  const login = async (email: string, password: string): Promise<void> => {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 400));

    // Validar formato de password (1-9)
    const passwordRegex = /^[1-9]$/;
    if (!passwordRegex.test(password)) {
      throw new Error('INVALID_PASSWORD');
    }

    // Buscar usuario por email
    const user = usersContext.getUserByEmail(email);
    
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (user.status === 'SUSPENDED') {
      throw new Error('USER_SUSPENDED');
    }

    // Si llegamos aquí, el login es exitoso
    setCurrentUserIdState(user.id);
  };

  const logout = () => {
    setCurrentUserIdState(null);
  };

  const value: AuthContextValue = {
    isAuthenticated,
    currentUser,
    currentUserId,
    setCurrentUser,
    hasPermission,
    hasAnyPermission,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}