// src/api/identity.ts
import { apiFetch, setToken } from "./http";

// ================== AUTH ==================
export type LoginBody = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    roleId: string;
    roleName?: string;          // puede venir o no
    permissions: string[];
    status: string;
    lastLoginAt?: string;
  };
};

export type MeResponse = {
  user: {
    sub?: string;
    tenantId: string;
    permissions: string[];
    email?: string;
    roleId?: string;
    roleName?: string;
    name?: string;
    status?: string;
    iat?: number;
    exp?: number;
    [k: string]: any;
  };
};

export async function health() {
  return apiFetch<{ ok: true }>("/health", { auth: false, label: "identity.health" });
}

export async function login(body: LoginBody, tenantId = "lasplebes") {
  const res = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    auth: false,
    tenant: tenantId, // ✅ login requiere X-Tenant-Id
    label: "auth.login",
    body: JSON.stringify(body),
  });

  setToken(res.accessToken);
  return res;
}

export async function me() {
  return apiFetch<MeResponse>("/auth/me", { label: "auth.me" });
}

export async function logout() {
  try {
    await apiFetch<void>("/auth/logout", { method: "POST", label: "auth.logout" });
  } finally {
    setToken(null);
  }
}

// ================== USERS ==================
export type UserStatus = "ACTIVE" | "SUSPENDED";

export type SystemUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  roleId: string;
  roleName?: string;           // lo puedes enriquecer en FE
  permissions?: string[];      // normalmente NO lo necesitas aquí, pero ok
  status: UserStatus | string; // tolerante por si backend manda otro
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
};

export async function listUsers() {
  return apiFetch<{ items: SystemUser[] }>("/users", { label: "users.list" });
}

export async function getUser(id: string) {
  return apiFetch<SystemUser>(`/users/${id}`, { label: "users.get" });
}

export async function createUser(payload: Partial<SystemUser> & { password?: string }) {
  return apiFetch<{ id: string }>("/users", {
    method: "POST",
    label: "users.create",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: string, payload: Partial<SystemUser>) {
  return apiFetch<{ ok: true }>(`/users/${id}`, {
    method: "PUT",
    label: "users.update",
    body: JSON.stringify(payload),
  });
}

export async function updateUserStatus(id: string, status: UserStatus) {
  return apiFetch<{ ok: true }>(`/users/${id}/status`, {
    method: "PATCH",
    label: "users.status",
    body: JSON.stringify({ status }),
  });
}

// ================== ROLES ==================
export type SystemRole = {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;          // 👈 tu Mongo lo trae
  createdAt?: string;
  updatedAt?: string;
};

export async function listRoles() {
  return apiFetch<{ items: SystemRole[] }>("/roles", { label: "roles.list" });
}

export async function createRole(payload: Partial<SystemRole>) {
  return apiFetch<{ id: string }>("/roles", {
    method: "POST",
    label: "roles.create",
    body: JSON.stringify(payload),
  });
}

export async function updateRole(id: string, payload: Partial<SystemRole>) {
  return apiFetch<{ ok: true }>(`/roles/${id}`, {
    method: "PUT",
    label: "roles.update",
    body: JSON.stringify(payload),
  });
}

// ================== HELPERS (FE) ==================
// Enriquecer users con roleName cuando el backend solo manda roleId
export function enrichUsersWithRoleName(users: SystemUser[], roles: SystemRole[]) {
  const map = new Map<string, SystemRole>();
  for (const r of roles) map.set(r.id, r);

  return users.map((u) => {
    const role = map.get(u.roleId);
    return {
      ...u,
      roleName: u.roleName ?? role?.name ?? "—",
    };
  });
}

// Stats rápidos para tus cards
export function getUserStats(users: SystemUser[]) {
  const total = users.length;
  const active = users.filter((u) => u.status === "ACTIVE").length;
  const suspended = users.filter((u) => u.status === "SUSPENDED").length;
  return { total, active, suspended };
}
