import React, { createContext, useContext, useEffect, useReducer, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { type SystemRole } from "../types/user";
import { useAuth } from "../store/AuthContext";
import {
  listRoles,
  createRole as apiCreateRole,
  updateRole as apiUpdateRole,
} from "../../api/identity";

// ─── Cache ────────────────────────────────────────────────────────────────────
const LS_KEY = "cache:roles";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { data: SystemRole[]; ts: number };

function readCache(): SystemRole[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
    return entry.data;
  } catch { return null; }
}

function writeCache(data: SystemRole[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

// ─── State ────────────────────────────────────────────────────────────────────
export type FetchStatus = "idle" | "loading" | "ready" | "error";

interface State {
  roles: SystemRole[];
  status: FetchStatus;
  error: string | null;
  lastFetch: number | null;
}

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_OK"; payload: SystemRole[] }
  | { type: "FETCH_ERROR"; payload: string }
  | { type: "SET_FROM_CACHE"; payload: SystemRole[] }
  | { type: "UPSERT"; payload: SystemRole }
  | { type: "REMOVE"; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, status: "loading", error: null };
    case "FETCH_OK":
      return { ...state, status: "ready", roles: action.payload, lastFetch: Date.now(), error: null };
    case "FETCH_ERROR":
      return { ...state, status: "error", error: action.payload };
    case "SET_FROM_CACHE":
      return { ...state, status: "ready", roles: action.payload, error: null };
    case "UPSERT": {
      const exists = state.roles.some((r) => r.id === action.payload.id);
      const next = exists
        ? state.roles.map((r) => (r.id === action.payload.id ? action.payload : r))
        : [...state.roles, action.payload];
      return { ...state, roles: next };
    }
    case "REMOVE":
      return { ...state, roles: state.roles.filter((r) => r.id !== action.payload) };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface RolesContextValue {
  roles: SystemRole[];
  status: FetchStatus;
  error: string | null;
  lastFetch: number | null;
  refresh: () => Promise<void>;
  getRoleById: (id: string) => SystemRole | undefined;
  getRoleByName: (name: string) => SystemRole | undefined;
  createRole: (data: Omit<SystemRole, "id" | "createdAt" | "updatedAt">) => SystemRole;
  updateRole: (id: string, updates: Partial<Omit<SystemRole, "id" | "createdAt" | "isSystem">>) => void;
  deleteRole: (id: string) => boolean;
  duplicateRole: (id: string, newName: string) => SystemRole;
  isNameAvailable: (name: string, excludeId?: string) => boolean;
}

const RolesContext = createContext<RolesContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function RolesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const [state, dispatch] = useReducer(reducer, {
    roles: [],
    status: "idle",
    error: null,
    lastFetch: null,
  });

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    dispatch({ type: "FETCH_START" });
    try {
      const res = await listRoles();
      const items = (res?.items ?? []) as any as SystemRole[];
      writeCache(items);
      dispatch({ type: "FETCH_OK", payload: items });
    } catch (e: any) {
      dispatch({ type: "FETCH_ERROR", payload: e?.message ?? "Error al cargar roles" });
      toast.error("No se pudieron cargar roles");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: "FETCH_OK", payload: [] });
      return;
    }
    const cached = readCache();
    if (cached) dispatch({ type: "SET_FROM_CACHE", payload: cached });
    void refresh();
  }, [isAuthenticated, refresh]);

  const getRoleById = useCallback(
    (id: string) => state.roles.find((r) => r.id === id),
    [state.roles]
  );

  const getRoleByName = useCallback(
    (name: string) => state.roles.find((r) => r.name === name),
    [state.roles]
  );

  const isNameAvailable = useCallback(
    (name: string, excludeId?: string) =>
      !state.roles.some((r) => r.name === name && r.id !== excludeId),
    [state.roles]
  );

  const createRole = useCallback(
    (data: Omit<SystemRole, "id" | "createdAt" | "updatedAt">): SystemRole => {
      const tempId = `tmp-role-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date().toISOString();
      const newRole: SystemRole = { ...(data as any), id: tempId, createdAt: now, updatedAt: now };

      dispatch({ type: "UPSERT", payload: newRole });

      (async () => {
        try {
          const res = await apiCreateRole({
            name: newRole.name,
            description: newRole.description,
            permissions: newRole.permissions,
            isSystem: false,
          } as any);
          dispatch({
            type: "UPSERT",
            payload: { ...newRole, id: res.id, updatedAt: new Date().toISOString() },
          });
          await refresh();
        } catch (e: any) {
          dispatch({ type: "REMOVE", payload: tempId });
          toast.error(e?.message || "Error creando rol");
          await refresh();
        }
      })();

      return newRole;
    },
    [refresh]
  );

  const updateRole = useCallback(
    (id: string, updates: Partial<Omit<SystemRole, "id" | "createdAt" | "isSystem">>) => {
      const current = state.roles.find((r) => r.id === id);
      if (!current) return;
      dispatch({
        type: "UPSERT",
        payload: { ...current, ...updates, updatedAt: new Date().toISOString() } as SystemRole,
      });
      (async () => {
        try {
          await apiUpdateRole(id, updates as any);
          await refresh();
        } catch (e: any) {
          toast.error(e?.message || "Error actualizando rol");
          await refresh();
        }
      })();
    },
    [state.roles, refresh]
  );

  const deleteRole = useCallback((_id: string) => {
    toast.error("Eliminar roles no está soportado por el backend");
    return false;
  }, []);

  const duplicateRole = useCallback(
    (id: string, newName: string): SystemRole => {
      const original = getRoleById(id);
      if (!original) throw new Error("Role not found");
      return createRole({
        name: newName,
        description: `${original.description || ""} (copia)`,
        permissions: original.permissions,
        isSystem: false,
      } as any);
    },
    [getRoleById, createRole]
  );

  return (
    <RolesContext.Provider
      value={{
        roles: state.roles,
        status: state.status,
        error: state.error,
        lastFetch: state.lastFetch,
        refresh,
        getRoleById,
        getRoleByName,
        createRole,
        updateRole,
        deleteRole,
        duplicateRole,
        isNameAvailable,
      }}
    >
      {children}
    </RolesContext.Provider>
  );
}

export function useRoles() {
  const ctx = useContext(RolesContext);
  if (!ctx) throw new Error("useRoles must be used within RolesProvider");
  return ctx;
}