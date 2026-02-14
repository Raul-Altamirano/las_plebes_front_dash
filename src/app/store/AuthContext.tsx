// src/app/store/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as identity from "../../api/identity";
import { setToken } from "../../api/http";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  status: string;
  lastLoginAt?: string;
};

type AuthContextValue = {
  // compat + nuevo
  user: AuthUser | null;
  currentUser: AuthUser | null;

  accessToken: string | null;

  isAuthenticated: boolean; // compat con app vieja
  isAuthed: boolean;        // por si lo usabas
  ready: boolean;

  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  logout: () => void;

  // compat con SidebarNav / RequirePermission
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: readonly string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const LS_TOKEN = "accessToken";
const LS_USER = "authUser";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(LS_TOKEN);
    const userRaw = localStorage.getItem(LS_USER);

    const parsedUser = userRaw ? (JSON.parse(userRaw) as AuthUser) : null;

    setAccessToken(token);
    setUser(parsedUser);
    setToken(token);

    setReady(true);
  }, []);

  const hasPermission = (permission: string) => {
    return !!user?.permissions?.includes(permission);
  };

  const hasAnyPermission = (permissions: readonly string[]) => {
    return permissions.some((p) => user?.permissions?.includes(p));
  };

  const login = async (email: string, password: string, tenantId?: string) => {
    const res = await identity.login({ email, password }, tenantId);

    setAccessToken(res.accessToken);
    setUser(res.user);

    localStorage.setItem(LS_TOKEN, res.accessToken);
    localStorage.setItem(LS_USER, JSON.stringify(res.user));

    setToken(res.accessToken);
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
    setToken(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      currentUser: user, // compat con código viejo
      accessToken,
      isAuthenticated: !!accessToken,
      isAuthed: !!accessToken,
      ready,
      login,
      logout,
      hasPermission,
      hasAnyPermission,
    }),
    [user, accessToken, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
