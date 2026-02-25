import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";
import { type SystemRole } from "../types/user";

// ✅ BE client
import {
  listRoles,
  createRole as apiCreateRole,
  updateRole as apiUpdateRole,
} from "../../api/identity";

import { useAuth } from "../store/AuthContext";

interface RolesContextValue {
  roles: SystemRole[];
  getRoleById: (id: string) => SystemRole | undefined;
  getRoleByName: (name: string) => SystemRole | undefined;
  createRole: (role: Omit<SystemRole, "id" | "createdAt" | "updatedAt">) => SystemRole;
  updateRole: (id: string, updates: Partial<Omit<SystemRole, "id" | "createdAt" | "isSystem">>) => void;
  deleteRole: (id: string) => boolean;
  duplicateRole: (id: string, newName: string) => SystemRole;
  isNameAvailable: (name: string, excludeId?: string) => boolean;
}

const RolesContext = createContext<RolesContextValue | undefined>(undefined);

export function RolesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const [roles, setRoles] = useState<SystemRole[]>([]);

  const refresh = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await listRoles();
      setRoles((res?.items ?? []) as any);
    } catch (e) {
      // No matamos la app si falla
      toast.error("No se pudieron cargar roles");
      // console.error(e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) void refresh();
    else setRoles([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const getRoleById = (id: string) => roles.find((r) => r.id === id);
  const getRoleByName = (name: string) => roles.find((r) => r.name === name);

  const isNameAvailable = (name: string, excludeId?: string) => {
    return !roles.some((r) => r.name === name && r.id !== excludeId);
  };

  const createRole = (data: Omit<SystemRole, "id" | "createdAt" | "updatedAt">): SystemRole => {
    const tempId = `tmp-role-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const newRole: SystemRole = {
      ...(data as any),
      id: tempId,
      createdAt: now,
      updatedAt: now,
    };

    // optimistic add
    setRoles((prev) => [...prev, newRole]);

    (async () => {
      try {
        const res = await apiCreateRole({
          name: newRole.name,
          description: newRole.description,
          permissions: newRole.permissions,
          isSystem: false,
        } as any);

        // reemplaza id temporal por id real
        setRoles((prev) =>
          prev.map((r) => (r.id === tempId ? ({ ...r, id: res.id, updatedAt: new Date().toISOString() } as any) : r))
        );

        // MVP: refresh para asegurar consistencia
        await refresh();
      } catch (e: any) {
        // rollback
        setRoles((prev) => prev.filter((r) => r.id !== tempId));
        toast.error(e?.message || "Error creando rol");
        await refresh();
      }
    })();

    return newRole;
  };

  const updateRole = (id: string, updates: Partial<Omit<SystemRole, "id" | "createdAt" | "isSystem">>) => {
    // optimistic
    setRoles((prev) =>
      prev.map((role) => (role.id === id ? ({ ...role, ...updates, updatedAt: new Date().toISOString() } as any) : role))
    );

    (async () => {
      try {
        await apiUpdateRole(id, updates as any);
        await refresh();
      } catch (e: any) {
        toast.error(e?.message || "Error actualizando rol");
        await refresh();
      }
    })();
  };

  // ❌ Tu BE no tiene DELETE /roles (por lo que vimos en identity.ts)
  const deleteRole = (_id: string) => {
    toast.error("Eliminar roles no está soportado por el backend");
    return false;
  };

  // ✅ Se soporta duplicado usando POST /roles con permisos del rol origen
  const duplicateRole = (id: string, newName: string): SystemRole => {
    const original = getRoleById(id);
    if (!original) throw new Error("Role not found");

    return createRole({
      name: newName,
      description: `${original.description || ""} (copia)`,
      permissions: original.permissions,
      isSystem: false,
    } as any);
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
    throw new Error("useRoles must be used within a RolesProvider");
  }
  return context;
}