// src/app/store/CategoryContext.tsx
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import * as categoriesApi from "../../api/categories";
import type { Category, CategoryFormData } from "../types/category";
import { useAudit } from "./AuditContext";

// ─── Cache localStorage ───────────────────────────────────────────────────────
const LS_KEY = "cache:categories";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

type CacheEntry = { data: Category[]; ts: number };

function readCache(): Category[] | null {
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

function writeCache(data: Category[]) {
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
  categories: Category[];
  status: FetchStatus;
  error: string | null;
  lastFetch: number | null;

}

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_OK"; payload: Category[] }
  | { type: "FETCH_ERROR"; payload: string }
  | { type: "SET_FROM_CACHE"; payload: Category[] }
  | { type: "UPSERT"; payload: Category }
  | { type: "REMOVE"; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, status: "loading", error: null };
    case "FETCH_OK":
      return {
        ...state,
        status: "success",
        categories: action.payload,
        lastFetch: Date.now(),
        error: null,
      };
    case "FETCH_ERROR":
      return { ...state, status: "error", error: action.payload };
    case "SET_FROM_CACHE":
      return { ...state, status: "success", categories: action.payload, error: null };
    case "UPSERT": {
      const exists = state.categories.some((c) => c.id === action.payload.id);
      const next = exists
        ? state.categories.map((c) =>
            c.id === action.payload.id ? action.payload : c
          )
        : [action.payload, ...state.categories];
      return { ...state, categories: next };
    }
    case "REMOVE":
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
      };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface CategoriesContextValue {
  categories: Category[];
  status: FetchStatus;
  error: string | null;
  lastFetch: number | null; 
  refresh: () => Promise<void>;
  createCategory: (payload: CategoryFormData) => Promise<void>;
  updateCategory: (id: string, payload: Partial<CategoryFormData>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  restoreCategory: (id: string) => Promise<void>;
  getById: (id: string) => Category | undefined;
isNameAvailable: (name: string, excludeId?: string) => boolean;
isSlugAvailable: (slug: string, excludeId?: string) => boolean;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function CategoriesProvider({ children }: { children: ReactNode }) {
  const audit = useAudit();

  const [state, dispatch] = useReducer(reducer, {
    categories: [],
    status: "idle",
    error: null,
    lastFetch: null,
  });

  // Fetch desde API → actualiza cache
  const refresh = useCallback(async () => {
    dispatch({ type: "FETCH_START" });
    try {
const res = await categoriesApi.listCategories(true);
      writeCache(res.items);
      dispatch({ type: "FETCH_OK", payload: res.items });
    } catch (e: any) {
      dispatch({ type: "FETCH_ERROR", payload: e?.message ?? "Error al cargar categorías" });
    }
  }, []);

  // Al montar: cache primero (UI instantánea), fetch en background
  useEffect(() => {
    const cached = readCache();
    if (cached) {
      dispatch({ type: "SET_FROM_CACHE", payload: cached });
    }
    refresh();
  }, [refresh]);

const createCategory = useCallback(
  async (payload: CategoryFormData) => {
    const res = await categoriesApi.createCategory(payload);
    const created = res.data;  // ✅ ya tipado correctamente
    dispatch({ type: "UPSERT", payload: created });
    writeCache([...state.categories, created]);
    audit.auditLog({
      action: "CATEGORY_CREATED",
      entity: { type: "category", id: created.id, label: created.name },
    });
  },
  [state.categories, audit]
);
  const updateCategory = useCallback(
    async (id: string, payload: Partial<CategoryFormData>) => {
      await categoriesApi.updateCategory(id, payload);
      const updated = await categoriesApi.getCategory(id);
      dispatch({ type: "UPSERT", payload: updated });
      const newList = state.categories.map((c) => (c.id === id ? updated : c));
      writeCache(newList);
      audit.auditLog({
        action: "CATEGORY_UPDATED",
        entity: { type: "category", id: updated.id, label: updated.name },
      });
    },
    [state.categories, audit]
  );



  const deleteCategory = useCallback(
    async (id: string) => {
      const cat = state.categories.find((c) => c.id === id);
      await categoriesApi.deleteCategory(id);
      dispatch({ type: "REMOVE", payload: id });
      const newList = state.categories.filter((c) => c.id !== id);
      writeCache(newList);
      clearCache(); // forzar re-fetch la próxima vez
      audit.auditLog({
        action: "CATEGORY_DELETED",
        entity: { type: "category", id, label: cat?.name ?? id },
      });
    },
    [state.categories, audit]
  );

  const restoreCategory = useCallback(async (id: string) => {
  const res = await categoriesApi.restoreCategory(id);
  const restored = res.data;
  dispatch({ type: "UPSERT", payload: restored });
  await refresh();
}, [refresh]);

  const getById = useCallback(
    (id: string) => state.categories.find((c) => c.id === id),
    [state.categories]
  );

const isNameAvailable = useCallback(
  (name: string, excludeId?: string) =>
    !state.categories.some(
      (c) => c.name?.toLowerCase() === name?.toLowerCase() && c.id !== excludeId
    ),
  [state.categories]
);
const isSlugAvailable = useCallback(
  (slug: string, excludeId?: string) =>
    !state.categories.some(
      (c) => c.slug?.toLowerCase() === slug?.toLowerCase() && c.id !== excludeId
    ),
  [state.categories]
);

  return (
    <CategoriesContext.Provider
      value={{
        categories: state.categories,
        status: state.status,
        error: state.error,
        lastFetch: state.lastFetch,
        refresh,
        createCategory,
        updateCategory,
        deleteCategory,
        getById,
        isSlugAvailable,
        isNameAvailable,
        restoreCategory,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useCategoriesStore() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    if (import.meta.env.DEV) {
      return {
        categories: [],
        status: "idle" as FetchStatus,
        error: null,
        lastFetch: null,
        refresh: async () => {},
        createCategory: async () => {},
        updateCategory: async () => {},
        deleteCategory: async () => {},
        restoreCategory: async () => {},
        getById: () => undefined,
        isNameAvailable: () => true,
        isSlugAvailable: () => true,
      };
    }
    throw new Error("useCategoriesStore must be used within CategoriesProvider");
  }
  return ctx;
}

// Al final de CategoryContext.tsx
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

export const useCategories = useCategoriesStore;