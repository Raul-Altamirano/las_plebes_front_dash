import { useCallback, useEffect, useMemo, useState } from "react";
import { identityApi } from "../../api/identity";
import type { SystemUser } from "../../types/user";
import type { SystemRole } from "../../types/permissions";

export function useUsersRoles() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rolesById = useMemo(() => {
    const map = new Map<string, SystemRole>();
    for (const r of roles) map.set((r as any).id ?? (r as any)._id ?? r["_id"], r);
    return map;
  }, [roles]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => (u as any).status === "ACTIVE").length;
    const suspended = users.filter(u => (u as any).status === "SUSPENDED").length;
    return { total, active, suspended };
  }, [users]);

  const enrichUsers = useCallback((raw: SystemUser[]) => {
    return raw.map(u => {
      const roleId = (u as any).roleId;
      const role = roleId ? rolesById.get(roleId) : undefined;
      return {
        ...u,
        roleName: (u as any).roleName ?? role?.name ?? "—",
      } as any;
    });
  }, [rolesById]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [rolesRes, usersRes] = await Promise.all([
        identityApi.roles.list(),
        identityApi.users.list(),
      ]);

      setRoles(rolesRes.items ?? []);
      // OJO: rolesById depende de roles, así que enriquecemos después con useEffect simple
      setUsers(usersRes.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Error loading users/roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // cuando cambian roles o users, re-enriquece (sin refetch)
  const usersWithRoleName = useMemo(() => enrichUsers(users), [users, enrichUsers]);

  // actions
  const createUser = useCallback(async (payload: any) => {
    await identityApi.users.create(payload);
    await refresh();
  }, [refresh]);

  const updateUser = useCallback(async (id: string, payload: any) => {
    await identityApi.users.update(id, payload);
    await refresh();
  }, [refresh]);

  const toggleUserStatus = useCallback(async (u: any) => {
    const next = u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    await identityApi.users.setStatus(u.id ?? u._id ?? u._id?.$oid, next);
    await refresh();
  }, [refresh]);

  const createRole = useCallback(async (payload: any) => {
    await identityApi.roles.create(payload);
    await refresh();
  }, [refresh]);

  const updateRole = useCallback(async (id: string, payload: any) => {
    await identityApi.roles.update(id, payload);
    await refresh();
  }, [refresh]);

  return {
    users: usersWithRoleName,
    roles,
    rolesById,
    stats,
    loading,
    error,
    refresh,
    createUser,
    updateUser,
    toggleUserStatus,
    createRole,
    updateRole,
  };
}
