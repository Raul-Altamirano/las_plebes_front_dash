import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type SystemRole } from '../types/user';
import { type Permission, ROLE_PERMISSIONS } from '../types/permissions';

interface RolesContextValue {
  roles: SystemRole[];
  getRoleById: (id: string) => SystemRole | undefined;
  getRoleByName: (name: string) => SystemRole | undefined;
  createRole: (role: Omit<SystemRole, 'id' | 'createdAt' | 'updatedAt'>) => SystemRole;
  updateRole: (id: string, updates: Partial<Omit<SystemRole, 'id' | 'createdAt' | 'isSystem'>>) => void;
  deleteRole: (id: string) => boolean;
  duplicateRole: (id: string, newName: string) => SystemRole;
  isNameAvailable: (name: string, excludeId?: string) => boolean;
}

const RolesContext = createContext<RolesContextValue | undefined>(undefined);

const STORAGE_KEY = 'ecommerce_admin_roles';

// Seed inicial de roles del sistema
const SEED_ROLES: SystemRole[] = [
  {
    id: 'role-super-admin',
    name: 'SUPER_ADMIN',
    description: 'Acceso completo al sistema, incluye gestión de usuarios y roles',
    permissions: ROLE_PERMISSIONS.SUPER_ADMIN,
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role-admin',
    name: 'ADMIN',
    description: 'Administrador con acceso completo excepto gestión de usuarios',
    permissions: ROLE_PERMISSIONS.ADMIN,
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role-catalog',
    name: 'CATALOG',
    description: 'Gestor de catálogo, productos, categorías y promociones',
    permissions: ROLE_PERMISSIONS.CATALOG,
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role-ops',
    name: 'OPS',
    description: 'Operaciones: inventario, pedidos y devoluciones',
    permissions: ROLE_PERMISSIONS.OPS,
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'role-viewer',
    name: 'VIEWER',
    description: 'Solo lectura de productos, categorías, pedidos y clientes',
    permissions: ROLE_PERMISSIONS.VIEWER,
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function RolesProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<SystemRole[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as SystemRole[];
      }
    } catch (error) {
      console.error('Error loading roles from localStorage:', error);
    }
    // Si no hay datos, usar seed
    return SEED_ROLES;
  });

  // Persistir en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  }, [roles]);

  const getRoleById = (id: string): SystemRole | undefined => {
    return roles.find(r => r.id === id);
  };

  const getRoleByName = (name: string): SystemRole | undefined => {
    return roles.find(r => r.name === name);
  };

  const isNameAvailable = (name: string, excludeId?: string): boolean => {
    return !roles.some(r => r.name === name && r.id !== excludeId);
  };

  const createRole = (data: Omit<SystemRole, 'id' | 'createdAt' | 'updatedAt'>): SystemRole => {
    const newRole: SystemRole = {
      ...data,
      id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRoles(prev => [...prev, newRole]);
    return newRole;
  };

  const updateRole = (id: string, updates: Partial<Omit<SystemRole, 'id' | 'createdAt' | 'isSystem'>>) => {
    setRoles(prev =>
      prev.map(role =>
        role.id === id
          ? { ...role, ...updates, updatedAt: new Date().toISOString() }
          : role
      )
    );
  };

  const deleteRole = (id: string): boolean => {
    const role = getRoleById(id);
    if (!role || role.isSystem) {
      return false; // No se puede eliminar rol de sistema
    }
    setRoles(prev => prev.filter(r => r.id !== id));
    return true;
  };

  const duplicateRole = (id: string, newName: string): SystemRole => {
    const original = getRoleById(id);
    if (!original) {
      throw new Error('Role not found');
    }

    const duplicated: SystemRole = {
      ...original,
      id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newName,
      description: `${original.description || ''} (copia)`,
      isSystem: false, // Los duplicados nunca son de sistema
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setRoles(prev => [...prev, duplicated]);
    return duplicated;
  };

  const value: RolesContextValue = {
    roles,
    getRoleById,
    getRoleByName,
    createRole,
    updateRole,
    deleteRole,
    duplicateRole,
    isNameAvailable,
  };

  return <RolesContext.Provider value={value}>{children}</RolesContext.Provider>;
}

export function useRoles() {
  const context = useContext(RolesContext);
  if (context === undefined) {
    throw new Error('useRoles must be used within a RolesProvider');
  }
  return context;
}
