// src/app/store/ProductsContext.tsx
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import * as productsApi from "../../api/products";
import type { Product, ProductStatus } from "../types/product";
import type { CreateProductPayload, UpdateProductPayload } from "../../api/products";
import { useAudit } from "./AuditContext";

// ─── Cache localStorage ───────────────────────────────────────────────────────
const LS_KEY = "cache:products";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { data: Product[]; ts: number };

function readCache(): Product[] | null {
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

function writeCache(data: Product[]) {
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
  products: Product[];
  status: FetchStatus;
  error: string | null;
  lastFetch: number | null;
}

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_OK"; payload: Product[] }
  | { type: "FETCH_ERROR"; payload: string }
  | { type: "SET_FROM_CACHE"; payload: Product[] }
  | { type: "UPSERT"; payload: Product }
  | { type: "REMOVE"; payload: string }
  | { type: "SET_STATUS"; payload: { id: string; status: ProductStatus } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, status: "loading", error: null };
    case "FETCH_OK":
      return {
        ...state,
        status: "ready",
        products: action.payload,
        lastFetch: Date.now(),
        error: null,
      };
    case "FETCH_ERROR":
      return { ...state, status: "error", error: action.payload };
    case "SET_FROM_CACHE":
      return { ...state, status: "ready", products: action.payload, error: null };
    case "UPSERT": {
      const exists = state.products.some((p) => p.id === action.payload.id);
      const next = exists
        ? state.products.map((p) => (p.id === action.payload.id ? action.payload : p))
        : [action.payload, ...state.products];
      return { ...state, products: next };
    }
    case "REMOVE":
      return { ...state, products: state.products.filter((p) => p.id !== action.payload) };
    case "SET_STATUS":
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.id ? { ...p, status: action.payload.status } : p
        ),
      };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface ProductsContextValue {
  products: Product[];
  status: FetchStatus;
  error: string | null;
  lastFetch: number | null;
  refresh: () => Promise<void>;
  createProduct: (payload: CreateProductPayload) => Promise<void>;
  updateProduct: (id: string, payload: UpdateProductPayload) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  publishProduct: (id: string) => Promise<void>;
  hideProduct: (id: string) => Promise<void>;
  adjustStock: (productId: string, delta: number, variantId?: string) => Promise<void>;
  getById: (id: string) => Product | undefined;
  isSkuAvailable: (sku: string, currentId?: string) => boolean;
    bulkUpdateStatus: (ids: string[], status: ProductStatus) => Promise<void>;

}

const ProductsContext = createContext<ProductsContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ProductsProvider({ children }: { children: ReactNode }) {
  const audit = useAudit();

  const [state, dispatch] = useReducer(reducer, {
    products: [],
    status: "idle",
    error: null,
    lastFetch: null,
  });

  const refresh = useCallback(async () => {
    dispatch({ type: "FETCH_START" });
    try {
      const res = await productsApi.listProducts();
      writeCache(res.items);
      dispatch({ type: "FETCH_OK", payload: res.items });
    } catch (e: any) {
      dispatch({ type: "FETCH_ERROR", payload: e?.message ?? "Error al cargar productos" });
    }
  }, []);

  // Al montar: cache primero, fetch en background
  useEffect(() => {
    const cached = readCache();
    if (cached) dispatch({ type: "SET_FROM_CACHE", payload: cached });
    refresh();
  }, [refresh]);

  const createProduct = useCallback(
    async (payload: CreateProductPayload) => {
      const res = await productsApi.createProduct(payload);
      const created = await productsApi.getProduct(res.id);
      dispatch({ type: "UPSERT", payload: created });
      writeCache([created, ...state.products]);
      audit.auditLog({
        action: "PRODUCT_CREATED",
        entity: { type: "product", id: created.id, label: created.name },
      });
    },
    [state.products, audit]
  );

  const updateProduct = useCallback(
    async (id: string, payload: UpdateProductPayload) => {
      await productsApi.updateProduct(id, payload);
      const updated = await productsApi.getProduct(id);
      dispatch({ type: "UPSERT", payload: updated });
      writeCache(state.products.map((p) => (p.id === id ? updated : p)));
      audit.auditLog({
        action: "PRODUCT_UPDATED",
        entity: { type: "product", id: updated.id, label: updated.name },
      });
    },
    [state.products, audit]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      const product = state.products.find((p) => p.id === id);
      await productsApi.deleteProduct(id);
      dispatch({ type: "REMOVE", payload: id });
      clearCache();
      audit.auditLog({
        action: "PRODUCT_DELETED",
        entity: { type: "product", id, label: product?.name ?? id },
      });
    },
    [state.products, audit]
  );

  const publishProduct = useCallback(
    async (id: string) => {
      const product = state.products.find((p) => p.id === id);
      await productsApi.updateProductStatus(id, "ACTIVE");
      dispatch({ type: "SET_STATUS", payload: { id, status: "ACTIVE" } });
      writeCache(state.products.map((p) => (p.id === id ? { ...p, status: "ACTIVE" } : p)));
      audit.auditLog({
        action: "PRODUCT_PUBLISHED",
        entity: { type: "product", id, label: product?.name ?? id },
        changes: [{ field: "status", from: product?.status, to: "ACTIVE" }],
      });
    },
    [state.products, audit]
  );

  const hideProduct = useCallback(
    async (id: string) => {
      const product = state.products.find((p) => p.id === id);
      await productsApi.updateProductStatus(id, "PAUSED");
      dispatch({ type: "SET_STATUS", payload: { id, status: "PAUSED" } });
      writeCache(state.products.map((p) => (p.id === id ? { ...p, status: "PAUSED" } : p)));
      audit.auditLog({
        action: "PRODUCT_HIDDEN",
        entity: { type: "product", id, label: product?.name ?? id },
        changes: [{ field: "status", from: product?.status, to: "PAUSED" }],
      });
    },
    [state.products, audit]
  );

  const adjustStock = useCallback(
    async (productId: string, delta: number, variantId?: string) => {
      await productsApi.adjustInventory({
        productId,
        variantId,
        delta,
        reason: "MANUAL",
      });
      // Re-fetch el producto para tener stock actualizado desde BE
      const updated = await productsApi.getProduct(productId);
      dispatch({ type: "UPSERT", payload: updated });
      writeCache(state.products.map((p) => (p.id === productId ? updated : p)));
    },
    [state.products]
  );

  const getById = useCallback(
    (id: string) => state.products.find((p) => p.id === id),
    [state.products]
  );
const bulkUpdateStatus = useCallback(
    async (ids: string[], status: ProductStatus) => {
      await Promise.all(ids.map(id => productsApi.updateProductStatus(id, status)));
      await refresh();
    },
    [refresh]
  );

  const isSkuAvailable = useCallback(
    (sku: string, currentId?: string): boolean => {
      const lower = sku.toLowerCase();
      return !state.products.some(
        (p) =>
          (p.sku?.toLowerCase() === lower && p.id !== currentId) ||
          p.variants?.some((v) => v.sku?.toLowerCase() === lower)
      );
    },
    [state.products]
  );

  return (
    <ProductsContext.Provider
      value={{
        products: state.products,
        status: state.status,
        error: state.error,
        lastFetch: state.lastFetch,
        refresh,
        createProduct,
        updateProduct,
        deleteProduct,
        publishProduct,
        hideProduct,
        adjustStock,
        getById,
        isSkuAvailable,
        bulkUpdateStatus
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useProductsStore() {
  const ctx = useContext(ProductsContext);
  if (!ctx) {
    if (import.meta.env.DEV) {
      return {
        products: [],
        status: "idle" as FetchStatus,
        error: null,
        lastFetch: null,
        refresh: async () => {},
        createProduct: async () => {},
        updateProduct: async () => {},
        deleteProduct: async () => {},
        publishProduct: async () => {},
        hideProduct: async () => {},
        adjustStock: async () => {},
        getById: () => undefined,
        isSkuAvailable: () => true,
         bulkUpdateStatus: async () => {},
      };
    }
    throw new Error("useProductsStore must be used within ProductsProvider");
  }
  return ctx;
}

export const useProducts = useProductsStore;