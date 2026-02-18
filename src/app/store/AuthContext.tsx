// src/app/store/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as identity from "../../api/identity";
import { setToken } from "../../api/http";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName?: string;
  permissions: string[];
  status?: string;
};

type AuthContextValue = {
  // ===== Nuevo (modelo claro) =====
  authUser: AuthUser | null;

  // Usuario "activo" en UI (selector). Solo guardamos el id.
  currentUserId: string;
  setCurrentUser: (userId: string) => void;

  // Usuario actual (puede ser null hasta que ready/login)
  currentUser: AuthUser | null;

  // Auth
  accessToken: string | null;
  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  logout: () => void;

  // Permisos
  hasPermission: (perm: string) => boolean;
  hasAnyPermission: (permissions: readonly string[]) => boolean;

  // ===== Compat con código viejo =====
  user: AuthUser | null; // alias de authUser
  isAuthenticated: boolean;
  isAuthed: boolean;
  ready: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const LS_TOKEN = "accessToken";
const LS_USER = "authUser";
const LS_CURRENT_USER_ID = "currentUserId";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [ready, setReady] = useState(false);

  // Bootstrap desde localStorage
  useEffect(() => {
    const token = localStorage.getItem(LS_TOKEN);
    const userRaw = localStorage.getItem(LS_USER);
    const storedCurrentId = localStorage.getItem(LS_CURRENT_USER_ID);

    const parsedUser = userRaw ? (JSON.parse(userRaw) as AuthUser) : null;

    setAccessToken(token);
    setAuthUser(parsedUser);

    // Si hay usuario autenticado, por default currentUserId = su id
    const fallbackId = parsedUser?.id ?? "";
    const nextCurrentId = storedCurrentId || fallbackId;
    setCurrentUserId(nextCurrentId);

    // sincroniza token en el api client
    setToken(token);

    setReady(true);
  }, []);

  const hasPermission = (permission: string) => {
    return !!authUser?.permissions?.includes(permission);
  };

  const hasAnyPermission = (permissions: readonly string[]) => {
    return permissions.some((p) => authUser?.permissions?.includes(p));
  };

  const login = async (email: string, password: string, tenantId?: string) => {
    const res = await identity.login({ email, password }, tenantId);

    setAccessToken(res.accessToken);
    setAuthUser(res.user);

    localStorage.setItem(LS_TOKEN, res.accessToken);
    localStorage.setItem(LS_USER, JSON.stringify(res.user));

    // usuario activo por default: el autenticado
    setCurrentUserId(res.user.id);
    localStorage.setItem(LS_CURRENT_USER_ID, res.user.id);

    setToken(res.accessToken);
  };

  const logout = () => {
    setAccessToken(null);
    setAuthUser(null);
    setCurrentUserId("");

    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_CURRENT_USER_ID);

    setToken(null);
  };

  // lo que el selector necesita (cambiar id)
  const setCurrentUser = (userId: string) => {
    setCurrentUserId(userId);
    localStorage.setItem(LS_CURRENT_USER_ID, userId);
  };

  // En este archivo NO resolvemos el objeto del "usuario seleccionado" porque eso vive en UsersContext.
  // currentUser aquí representa al usuario autenticado real (o null).
  const currentUser = authUser;

  const value = useMemo<AuthContextValue>(
    () => ({
      // nuevo
      authUser,
      currentUserId,
      setCurrentUser,
      currentUser,

      // auth
      accessToken,
      login,
      logout,

      // permisos
      hasPermission,
      hasAnyPermission,

      // compat
      user: authUser,
      isAuthenticated: !!accessToken,
      isAuthed: !!accessToken,
      ready,
    }),
    [authUser, accessToken, ready, currentUserId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
