// src/app/store/ColorsContext.tsx
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  listColors,
  createColor as apiCreateColor,
  updateColor as apiUpdateColor,
  deleteColor as apiDeleteColor,
} from "../../api/colors.api";
import type { Color, ColorFormData } from "../types/color.types";

// ─── Cache localStorage ───────────────────────────────────────────────────────
const LS_KEY = "cache:colors";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { data: Color[]; ts: number };

function readCache(): Color[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(data: Color[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

function clearCache() {
  localStorage.removeItem(LS_KEY);
}

// ─── State ────────────────────────────────────────────────────────────────────
export type FetchStatus = "idle" | "loading" | "success" | "error";

interface State {
  colors: Color[];
  status: FetchStatus;
  error: string | null;
  lastFetch: number | null;
}

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_OK"; payload: Color[] }
  | { type: "FETCH_ERROR"; payload: string }
  | { type: "SET_FROM_CACHE"; payload: Color[] }
  | { type: "UPSERT"; payload: Color }
  | { type: "REMOVE"; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, status: "loading", error: null };
    case "FETCH_OK":
      return {
        ...state,
        status: "success",
        colors: action.payload,
        lastFetch: Date.now(),
        error: null,
      };
    case "FETCH_ERROR":
      return { ...state, status: "error", error: action.payload };
    case "SET_FROM_CACHE":
      return { ...state, status: "success", colors: action.payload, error: null };
    case "UPSERT": {
      const exists = state.colors.some((c) => c.id === action.payload.id);
      const next = exists
        ? state.colors.map((c) => (c.id === action.payload.id ? action.payload : c))
        : [action.payload, ...state.colors];
      return { ...state, colors: next };
    }
    case "REMOVE":
      return { ...state, colors: state.colors.filter((c) => c.id !== action.payload) };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface ColorsContextValue {
  colors: Color[];
  status: FetchStatus;
  error: string | null;
  lastFetch: number | null;
  refresh: () => Promise<void>;
  createColor: (payload: ColorFormData) => Promise<void>;
  updateColor: (id: string, payload: Partial<ColorFormData>) => Promise<void>;
  deleteColor: (id: string) => Promise<void>;
  getById: (id: string) => Color | undefined;
}

const ColorsContext = createContext<ColorsContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ColorsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    colors: [],
    status: "idle",
    error: null,
    lastFetch: null,
  });

  const refresh = useCallback(async () => {
    dispatch({ type: "FETCH_START" });
    try {
      const colors = await listColors();
      writeCache(colors);
      dispatch({ type: "FETCH_OK", payload: colors });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error al cargar colores";
      dispatch({ type: "FETCH_ERROR", payload: message });
    }
  }, []);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      dispatch({ type: "SET_FROM_CACHE", payload: cached });
    }
    refresh();
  }, [refresh]);

  const createColor = useCallback(
    async (payload: ColorFormData) => {
      const created = await apiCreateColor(payload);
      dispatch({ type: "UPSERT", payload: created });
      writeCache([created, ...state.colors]);
    },
    [state.colors]
  );

  const updateColor = useCallback(
    async (id: string, payload: Partial<ColorFormData>) => {
      const updated = await apiUpdateColor(id, payload);
      dispatch({ type: "UPSERT", payload: updated });
      writeCache(state.colors.map((c) => (c.id === id ? updated : c)));
    },
    [state.colors]
  );

  const deleteColor = useCallback(async (id: string) => {
    await apiDeleteColor(id);
    dispatch({ type: "REMOVE", payload: id });
    clearCache();
  }, []);

  const getById = useCallback(
    (id: string) => state.colors.find((c) => c.id === id),
    [state.colors]
  );

  return (
    <ColorsContext.Provider
      value={{
        colors: state.colors,
        status: state.status,
        error: state.error,
        lastFetch: state.lastFetch,
        refresh,
        createColor,
        updateColor,
        deleteColor,
        getById,
      }}
    >
      {children}
    </ColorsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useColorsStore() {
  const ctx = useContext(ColorsContext);
  if (!ctx) {
    if (import.meta.env.DEV) {
      return {
        colors: [] as Color[],
        status: "idle" as FetchStatus,
        error: null,
        lastFetch: null,
        refresh: async () => {},
        createColor: async (_payload: ColorFormData) => {},
        updateColor: async (_id: string, _payload: Partial<ColorFormData>) => {},
        deleteColor: async (_id: string) => {},
        getById: (_id: string): Color | undefined => undefined,
      };
    }
    throw new Error("useColorsStore must be used within ColorsProvider");
  }
  return ctx;
}

export const useColors = useColorsStore;