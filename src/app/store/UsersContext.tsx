import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";
import { type SystemUser } from "../types/user";

import { useAuth } from "../store/AuthContext";

import {
  listUsers,
  listRoles,
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  updateUserStatus as apiUpdateUserStatus,
  enrichUsersWithRoleName,
  type UserStatus,
} from "../../api/identity";

interface UsersContextValue {
  users: SystemUser[];
  getUserById: (id: string) => SystemUser | undefined;
  getUserByEmail: (email: string) => SystemUser | undefined;
  createUser: (user: Omit<SystemUser, "id" | "createdAt" | "updatedAt"> & { password?: string }) => SystemUser;
  updateUser: (id: string, updates: Partial<Omit<SystemUser, "id" | "createdAt">>) => void;
  suspendUser: (id: string) => void;
  activateUser: (id: string) => void;
  isEmailAvailable: (email: string, excludeId?: string) => boolean;
  canDeleteSuperAdmin: (userId: string, roleId: string) => boolean;
}

const UsersContext = createContext<UsersContextValue | undefined>(undefined);

const norm = (s: string) => String(s || "").trim().toLowerCase();

export function UsersProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const [users, setUsers] = useState<SystemUser[]>([]);

  const refresh = async () => {
    if (!isAuthenticated) return;

    try {
      const uRes = await listUsers();
      const raw = (uRes?.items ?? []) as any as SystemUser[];

      // enriquecer roleName desde roles para UI
      try {
        const rRes = await listRoles();
        const enriched = enrichUsersWithRoleName(raw as any, (rRes?.items ?? []) as any);
        setUsers(enriched as any);
      } catch {
        setUsers(raw);
      }
    } catch (e) {
      toast.error("No se pudieron cargar usuarios");
      // console.error(e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) void refresh();
    else setUsers([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const getUserById = (id: string) => users.find((u) => u.id === id);

  const getUserByEmail = (email: string) => users.find((u) => norm(u.email) === norm(email));

  const isEmailAvailable = (email: string, excludeId?: string) => {
    const e = norm(email);
    return !users.some((u) => norm(u.email) === e && u.id !== excludeId);
  };

  const canDeleteSuperAdmin = (userId: string, roleId: string) => {
    if (roleId !== "role-super-admin") return true;
    const activeSupers = users.filter((u) => u.roleId === "role-super-admin" && u.status === "ACTIVE");
    return activeSupers.length > 1 || activeSupers[0]?.id !== userId;
  };

  const createUser = (data: Omit<SystemUser, "id" | "createdAt" | "updatedAt"> & { password?: string }): SystemUser => {
    const tempId = `tmp-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const newUser: SystemUser = {
      ...(data as any),
      id: tempId,
      createdAt: now,
      updatedAt: now,
    };

    setUsers((prev) => [...prev, newUser]);

    (async () => {
      try {
        const res = await apiCreateUser(data as any);

        // reemplaza id temporal por id real
        setUsers((prev) =>
          prev.map((u) => (u.id === tempId ? ({ ...u, id: res.id, updatedAt: new Date().toISOString() } as any) : u))
        );

        await refresh();
      } catch (e: any) {
        setUsers((prev) => prev.filter((u) => u.id !== tempId));
        toast.error(e?.message || "Error creando usuario");
        await refresh();
      }
    })();

    return newUser;
  };

  const updateUser = (id: string, updates: Partial<Omit<SystemUser, "id" | "createdAt">>) => {
    // optimistic
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? ({ ...user, ...updates, updatedAt: new Date().toISOString() } as any) : user))
    );

    (async () => {
      try {
        await apiUpdateUser(id, updates as any);
        await refresh();
      } catch (e: any) {
        toast.error(e?.message || "Error actualizando usuario");
        await refresh();
      }
    })();
  };

  const suspendUser = (id: string) => {
    const u = getUserById(id);
    if (u && u.roleId === "role-super-admin" && !canDeleteSuperAdmin(u.id, u.roleId)) {
      toast.error("No puedes suspender al último Super Admin activo");
      return;
    }

    setUsers((prev) => prev.map((x) => (x.id === id ? ({ ...x, status: "SUSPENDED" } as any) : x)));

    (async () => {
      try {
        await apiUpdateUserStatus(id, "SUSPENDED" as UserStatus);
        await refresh();
      } catch (e: any) {
        toast.error(e?.message || "Error suspendiendo usuario");
        await refresh();
      }
    })();
  };

  const activateUser = (id: string) => {
    setUsers((prev) => prev.map((x) => (x.id === id ? ({ ...x, status: "ACTIVE" } as any) : x)));

    (async () => {
      try {
        await apiUpdateUserStatus(id, "ACTIVE" as UserStatus);
        await refresh();
      } catch (e: any) {
        toast.error(e?.message || "Error activando usuario");
        await refresh();
      }
    })();
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
    throw new Error("useUsers must be used within a UsersProvider");
  }
  return context;
}