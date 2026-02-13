import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import { type UserStatus } from '../types/user';
import { type SystemUser } from "../types/user";

interface UsersContextValue {
  users: SystemUser[];
  getUserById: (id: string) => SystemUser | undefined;
  getUserByEmail: (email: string) => SystemUser | undefined;
  createUser: (user: Omit<SystemUser, 'id' | 'createdAt' | 'updatedAt'>) => SystemUser;
  updateUser: (id: string, updates: Partial<Omit<SystemUser, 'id' | 'createdAt'>>) => void;
  suspendUser: (id: string) => void;
  activateUser: (id: string) => void;
  isEmailAvailable: (email: string, excludeId?: string) => boolean;
  canDeleteSuperAdmin: (userId: string, roleId: string) => boolean;
}

const UsersContext = createContext<UsersContextValue | undefined>(undefined);

const STORAGE_KEY = 'ecommerce_admin_users';

// Seed inicial de usuarios
const SEED_USERS: SystemUser[] = [
  {
    id: 'user-super-admin-1',
    name: 'Super Admin',
    email: 'sadmin@local.dev',
    roleId: 'role-super-admin',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user-admin-1',
    name: 'Administrador',
    email: 'admin@local.dev',
    roleId: 'role-admin',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user-catalog-1',
    name: 'Juan Catálogo',
    email: 'catalog@example.com',
    roleId: 'role-catalog',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user-ops-1',
    name: 'María Operaciones',
    email: 'ops@example.com',
    roleId: 'role-ops',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user-viewer-1',
    name: 'Ana Viewer',
    email: 'viewer@example.com',
    roleId: 'role-viewer',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<SystemUser[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        let parsedUsers = JSON.parse(stored) as SystemUser[];
        let needsUpdate = false;
        
        // Migración 1: actualizar email del Super Admin si tiene el email antiguo
        const superAdminIndex = parsedUsers.findIndex(
          u => u.id === 'user-super-admin-1' && u.email === 'admin@example.com'
        );
        
        if (superAdminIndex !== -1) {
          parsedUsers[superAdminIndex] = {
            ...parsedUsers[superAdminIndex],
            email: 'sadmin@local.dev',
            updatedAt: new Date().toISOString(),
          };
          needsUpdate = true;
          console.log('✅ Migración 1: email de Super Admin actualizado a sadmin@local.dev');
        }
        
        // Migración 2: agregar usuario Admin si no existe
        const adminExists = parsedUsers.some(u => u.id === 'user-admin-1');
        if (!adminExists) {
          parsedUsers.push({
            id: 'user-admin-1',
            name: 'Administrador',
            email: 'admin@local.dev',
            roleId: 'role-admin',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          needsUpdate = true;
          console.log('✅ Migración 2: usuario Administrador agregado (admin@local.dev)');
        }
        
        // Persistir migraciones
        if (needsUpdate) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedUsers));
        }
        
        return parsedUsers;
      }
    } catch (error) {
      console.error('Error loading users from localStorage:', error);
    }
    // Si no hay datos, usar seed
    return SEED_USERS;
  });

  // Persistir en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  const getUserById = (id: string): SystemUser | undefined => {
    return users.find(u => u.id === id);
  };

  const getUserByEmail = (email: string): SystemUser | undefined => {
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  };

  const isEmailAvailable = (email: string, excludeId?: string): boolean => {
    return !users.some(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== excludeId);
  };

  const createUser = (data: Omit<SystemUser, 'id' | 'createdAt' | 'updatedAt'>): SystemUser => {
    const newUser: SystemUser = {
      ...data,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<Omit<SystemUser, 'id' | 'createdAt'>>) => {
    setUsers(prev =>
      prev.map(user =>
        user.id === id
          ? { ...user, ...updates, updatedAt: new Date().toISOString() }
          : user
      )
    );
  };

  const suspendUser = (id: string) => {
    updateUser(id, { status: 'SUSPENDED' });
  };

  const activateUser = (id: string) => {
    updateUser(id, { status: 'ACTIVE' });
  };

  // Verifica si es seguro suspender/eliminar un usuario SUPER_ADMIN
  const canDeleteSuperAdmin = (userId: string, roleId: string): boolean => {
    // Si el roleId no es super-admin, siempre se puede
    if (roleId !== 'role-super-admin') {
      return true;
    }

    // Contar cuántos super admins activos hay
    const activeSuperAdmins = users.filter(
      u => u.roleId === 'role-super-admin' && u.status === 'ACTIVE'
    );

    // Si solo hay uno y es el mismo usuario, no se puede
    return activeSuperAdmins.length > 1 || activeSuperAdmins[0]?.id !== userId;
  };

  const value: UsersContextValue = {
    users,
    getUserById,
    getUserByEmail,
    createUser,
    updateUser,
    suspendUser,
    activateUser,
    isEmailAvailable,
    canDeleteSuperAdmin,
  };

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers() {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UsersProvider');
  }
  return context;
}