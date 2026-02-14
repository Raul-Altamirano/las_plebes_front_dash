// src/api/identity.ts
import { apiFetch, setToken } from "./http";

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
    roleName: string;
    permissions: string[];
    status: string;
    lastLoginAt?: string;
  };
};

export type MeResponse = {
  user: {
    // claims del token según tu /auth/me
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
      label: "auth.loginResponse",
    body: JSON.stringify(body),
  });

  // ✅ Guardar token para requests futuros
  setToken(res.accessToken);
  return res;
}

export async function me() {
  return apiFetch<MeResponse>("/auth/me", { label: "auth.me" });
}

export async function logout() {
  try {
    await apiFetch<void>("/auth/logout", { method: "POST" });
  } finally {
    setToken(null);
  }
}

// ============ USERS ============
export type SystemUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  roleId: string;
  roleName?: string;
  permissions?: string[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function listUsers() {
  return apiFetch<{ items: SystemUser[] }>("/users", {
      label: "auth.listUsers",
  });
}

export async function getUser(id: string) {
  return apiFetch<SystemUser>(`/users/${id}`, {
      label: "auth.getUser",
  });
}

export async function createUser(payload: Partial<SystemUser> & { password?: string }) {
  return apiFetch<{ id: string }>("/users", {
      label: "auth.createUser",

    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: string, payload: Partial<SystemUser>) {
  return apiFetch<{ ok: true }>(`/users/${id}`, {
      label: "auth.updateUser",

    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateUserStatus(id: string, status: string) {
  return apiFetch<{ ok: true }>(`/users/${id}/status`, {
      label: "auth.updateUserStatus",

    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ============ ROLES ============
export type SystemRole = {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  permissions: string[];
};

export async function listRoles() {
  return apiFetch<{ items: SystemRole[] }>("/roles", {
      label: "auth.listRoles",
  });
}

export async function createRole(payload: Partial<SystemRole>) {
  return apiFetch<{ id: string }>("/roles", {
      label: "auth.createRole",

    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRole(id: string, payload: Partial<SystemRole>) {
  return apiFetch<{ ok: true }>(`/roles/${id}`, {
      label: "auth.updateRole",

    method: "PUT",
    body: JSON.stringify(payload),
  });
}
