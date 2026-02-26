import React, { createContext, useContext, useEffect, useReducer, useCallback, ReactNode } from "react";
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

// ─── Cache ────────────────────────────────────────────────────────────────────
const LS_KEY = "cache:users";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { data: SystemUser[]; ts: number };

function readCache(): SystemUser[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
    return entry.data;
  } catch { return null; }
}

function writeCache(data: SystemUser[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

function clearCache() {
  localStorage.removeItem(LS_KEY);
}

// ─── State ────────────────────────────────────────────────────────────────────
export type FetchStatus = "idle" | "loading" | "ready" | "error";

interface State {
  users: SystemUser[];
  status: FetchStatus;
  error: string | null;
  lastFetch: number | null;
}

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_OK"; payload: SystemUser[] }
  | { type: "FETCH_ERROR"; payload: string }
  | { type: "SET_FROM_CACHE"; payload: SystemUser[] }
  | { type: "UPSERT"; payload: SystemUser }
  | { type: "SET_STATUS"; payload: { id: string; status: UserStatus } }
  | { type: "REMOVE"; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, status: "loading", error: null };
    case "FETCH_OK":
      return { ...state, status: "ready", users: action.payload, lastFetch: Date.now(), error: null };
    case "FETCH_ERROR":
      return { ...state, status: "error", error: action.payload };
    case "SET_FROM_CACHE":
      return { ...state, status: "ready", users: action.payload, error: null };
    case "UPSERT": {
      const exists = state.users.some((u) => u.id === action.payload.id);
      const next = exists
        ? state.users.map((u) => (u.id === action.payload.id ? action.payload : u))
        : [...state.users, action.payload];
      return { ...state, users: next };
    }
    case "SET_STATUS":
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === action.payload.id ? { ...u, status: action.payload.status } : u
        ),
      };
    case "REMOVE":
      return { ...state, users: state.users.filter((u) => u.id !== action.payload) };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface UsersContextValue {
  users: SystemUser[];
  status: FetchStatus;
  error: string | null;
  lastFetch: number | null;
  refresh: () => Promise<void>;
  getUserById: (id: string) => SystemUser | undefined;
  getUserByEmail: (email: string) => SystemUser | undefined;
  createUser: (data: Omit<SystemUser, "id" | "createdAt" | "updatedAt"> & { password?: string }) => SystemUser;
  updateUser: (id: string, updates: Partial<Omit<SystemUser, "id" | "createdAt">>) => void;
  suspendUser: (id: string) => void;
  activateUser: (id: string) => void;
  isEmailAvailable: (email: string, excludeId?: string) => boolean;
  canDeleteSuperAdmin: (userId: string, roleId: string) => boolean;
}

const UsersContext = createContext<UsersContextValue | undefined>(undefined);

const norm = (s: string) => String(s || "").trim().toLowerCase();

// ─── Provider ─────────────────────────────────────────────────────────────────
export function UsersProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const [state, dispatch] = useReducer(reducer, {
    users: [],
    status: "idle",
    error: null,
    lastFetch: null,
  });

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    dispatch({ type: "FETCH_START" });
    try {
      const uRes = await listUsers();
      const raw = (uRes?.items ?? []) as any as SystemUser[];
      let enriched = raw;
      try {
        const rRes = await listRoles();
        enriched = enrichUsersWithRoleName(raw as any, (rRes?.items ?? []) as any) as any;
      } catch {}
      writeCache(enriched);
      dispatch({ type: "FETCH_OK", payload: enriched });
    } catch (e: any) {
      dispatch({ type: "FETCH_ERROR", payload: e?.message ?? "Error al cargar usuarios" });
      toast.error("No se pudieron cargar usuarios");
    }
  }, [isAuthenticated]);

  // Al montar: cache primero, fetch en background
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: "FETCH_OK", payload: [] });
      clearCache();
      return;
    }
    const cached = readCache();
    if (cached) dispatch({ type: "SET_FROM_CACHE", payload: cached });
    void refresh();
  }, [isAuthenticated, refresh]);

  const getUserById = useCallback(
    (id: string) => state.users.find((u) => u.id === id),
    [state.users]
  );

  const getUserByEmail = useCallback(
    (email: string) => state.users.find((u) => norm(u.email) === norm(email)),
    [state.users]
  );

  const isEmailAvailable = useCallback(
    (email: string, excludeId?: string) => {
      const e = norm(email);
      return !state.users.some((u) => norm(u.email) === e && u.id !== excludeId);
    },
    [state.users]
  );

  const canDeleteSuperAdmin = useCallback(
    (userId: string, roleId: string) => {
      if (roleId !== "role-super-admin") return true;
      const activeSupers = state.users.filter(
        (u) => u.roleId === "role-super-admin" && u.status === "ACTIVE"
      );
      return activeSupers.length > 1 || activeSupers[0]?.id !== userId;
    },
    [state.users]
  );

  const createUser = useCallback(
    (data: Omit<SystemUser, "id" | "createdAt" | "updatedAt"> & { password?: string }): SystemUser => {
      const tempId = `tmp-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date().toISOString();
      const newUser: SystemUser = { ...(data as any), id: tempId, createdAt: now, updatedAt: now };

      dispatch({ type: "UPSERT", payload: newUser });

      (async () => {
        try {
          const res = await apiCreateUser(data as any);
          dispatch({
            type: "UPSERT",
            payload: { ...newUser, id: res.id, updatedAt: new Date().toISOString() },
          });
          await refresh();
        } catch (e: any) {
          dispatch({ type: "REMOVE", payload: tempId });
          toast.error(e?.message || "Error creando usuario");
          await refresh();
        }
      })();

      return newUser;
    },
    [refresh]
  );

  const updateUser = useCallback(
    (id: string, updates: Partial<Omit<SystemUser, "id" | "createdAt">>) => {
      const current = state.users.find((u) => u.id === id);
      if (!current) return;
      dispatch({
        type: "UPSERT",
        payload: { ...current, ...updates, updatedAt: new Date().toISOString() } as SystemUser,
      });
      (async () => {
        try {
          await apiUpdateUser(id, updates as any);
          await refresh();
        } catch (e: any) {
          toast.error(e?.message || "Error actualizando usuario");
          await refresh();
        }
      })();
    },
    [state.users, refresh]
  );

  const suspendUser = useCallback(
    (id: string) => {
      const u = getUserById(id);
      if (u?.roleId === "role-super-admin" && !canDeleteSuperAdmin(u.id, u.roleId)) {
        toast.error("No puedes suspender al último Super Admin activo");
        return;
      }
      dispatch({ type: "SET_STATUS", payload: { id, status: "SUSPENDED" } });
      (async () => {
        try {
          await apiUpdateUserStatus(id, "SUSPENDED" as UserStatus);
          await refresh();
        } catch (e: any) {
          toast.error(e?.message || "Error suspendiendo usuario");
          await refresh();
        }
      })();
    },
    [getUserById, canDeleteSuperAdmin, refresh]
  );

  const activateUser = useCallback(
    (id: string) => {
      dispatch({ type: "SET_STATUS", payload: { id, status: "ACTIVE" } });
      (async () => {
        try {
          await apiUpdateUserStatus(id, "ACTIVE" as UserStatus);
          await refresh();
        } catch (e: any) {
          toast.error(e?.message || "Error activando usuario");
          await refresh();
        }
      })();
    },
    [refresh]
  );

  return (
    <UsersContext.Provider
      value={{
        users: state.users,
        status: state.status,
        error: state.error,
        lastFetch: state.lastFetch,
        refresh,
        getUserById,
        getUserByEmail,
        createUser,
        updateUser,
        suspendUser,
        activateUser,
        isEmailAvailable,
        canDeleteSuperAdmin,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error("useUsers must be used within UsersProvider");
  return ctx;
}