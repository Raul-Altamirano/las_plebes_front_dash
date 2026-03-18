import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type {
  MarketplacePlatform,
  MarketplaceConnection,
  ProductMarketplaceStatus,
  PlatformStats,
} from "../types/marketplace";
import { useAudit } from "./AuditContext";
import { useAuth } from "./AuthContext";
import {
  getPublishedProducts,
  syncProductApi,
  syncAllProductsApi,
  unpublishProductApi,
} from "../../api/marketplaces";
import { listProducts } from "../../api/products";

interface MarketplacesState {
  connections: MarketplaceConnection[];
  productStatuses: ProductMarketplaceStatus[];
  platformStats: PlatformStats[];
  loading: boolean;
  syncing: boolean;
}

interface MarketplacesContextValue extends MarketplacesState {
  connectPlatform: (platform: MarketplacePlatform) => Promise<void>;
  disconnectPlatform: (platform: MarketplacePlatform) => Promise<void>;
  syncAllProducts: (platform: MarketplacePlatform) => Promise<void>;
  unpublishAllProducts: (platform: MarketplacePlatform) => Promise<void>;
  toggleProductPlatform: (
    productId: string,
    platform: MarketplacePlatform,
    enabled: boolean,
  ) => Promise<void>;
  syncProduct: (
    productId: string,
    platform: MarketplacePlatform,
  ) => Promise<void>;
  getConnectionStatus: (
    platform: MarketplacePlatform,
  ) => MarketplaceConnection | undefined;
  getPlatformStats: (
    platform: MarketplacePlatform,
  ) => PlatformStats | undefined;
  getProductStatuses: (
    platform: MarketplacePlatform,
  ) => ProductMarketplaceStatus[];
  getProductStatus: (
    productId: string,
    platform: MarketplacePlatform,
  ) => ProductMarketplaceStatus | undefined;
  isPlatformConnected: (platform: MarketplacePlatform) => boolean;
  refreshFacebook: () => Promise<void>;
}

const MarketplacesContext = createContext<MarketplacesContextValue | null>(
  null,
);
const STORAGE_KEY = "pochteca_marketplaces_connections";

// ─── Conexiones iniciales ────────────────────────────────────────────────────
const INITIAL_CONNECTIONS: MarketplaceConnection[] = [
  {
    platform: "FACEBOOK",
    status: "CONNECTED",
    accountName: "Las Plebes",
    connectedAt: new Date().toISOString(),
  },
  { platform: "INSTAGRAM", status: "DISCONNECTED" },
  { platform: "WHATSAPP", status: "DISCONNECTED" },
  { platform: "TIKTOK", status: "DISCONNECTED" },
];

// ─── Helper: calcular stats por plataforma ───────────────────────────────────
const calculateStats = (
  statuses: ProductMarketplaceStatus[],
): PlatformStats[] => {
  const platforms: MarketplacePlatform[] = [
    "FACEBOOK",
    "INSTAGRAM",
    "WHATSAPP",
    "TIKTOK",
  ];
  return platforms.map((platform) => {
    const items = statuses.filter((s) => s.platform === platform);
    return {
      platform,
      totalPublished: items.filter((s) => s.syncStatus === "SYNCED").length,
      totalUnpublished: items.filter((s) => s.syncStatus === "UNPUBLISHED")
        .length,
      totalErrors: items.filter((s) => s.syncStatus === "ERROR").length,
      totalSales: 0, // futuro: analytics BE
      totalRevenue: 0, // futuro: analytics BE
    };
  });
};

// ─── Helper: mapear producto BE → ProductMarketplaceStatus ───────────────────
const mapToStatus = (
  product: {
    _id: string;
    name: string;
    sku: string;
    price: number;
    images?: { url: string; isPrimary?: boolean }[];
    stock?: number;
  },
  platform: MarketplacePlatform,
  syncStatus: ProductMarketplaceStatus["syncStatus"],
  lastSyncedAt?: string | null,
  errorMessage?: string | null,
): ProductMarketplaceStatus => ({
  productId: product._id,
  productName: product.name,
  productSku: product.sku,
  productPrice: product.price,
  productStock: product.stock ?? 0,
  productImage:
    product.images?.find((i) => i.isPrimary)?.url ??
    product.images?.[0]?.url ??
    "",
  platform,
  isPublished: syncStatus === "SYNCED",
  syncStatus,
  lastSyncedAt: lastSyncedAt ?? undefined,
  errorMessage: errorMessage ?? undefined,
});

// ─── Provider ────────────────────────────────────────────────────────────────
export function MarketplacesProvider({ children }: { children: ReactNode }) {
  const { auditLog } = useAudit();
  const { currentUser } = useAuth();

  const [state, setState] = useState<MarketplacesState>({
    connections: INITIAL_CONNECTIONS,
    productStatuses: [],
    platformStats: [],
    loading: true,
    syncing: false,
  });

  // ── Cargar estado de conexiones desde localStorage ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const conns: MarketplaceConnection[] = JSON.parse(stored);
        setState((prev) => ({ ...prev, connections: conns }));
      }
    } catch (_) {}
  }, []);

  // ── Cargar productos de Facebook desde BE al montar ──
  useEffect(() => {
    loadFacebookProducts();
  }, []);

  // ── Persistir conexiones en localStorage ──
  useEffect(() => {
    if (!state.loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.connections));
    }
  }, [state.connections, state.loading]);

  // ── Recalcular stats cuando cambien los statuses ──
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      platformStats: calculateStats(prev.productStatuses),
    }));
  }, [state.productStatuses]);

  const loadFacebookProducts = async () => {
    try {
      // Traer todos los productos del catálogo
      const [catalogRes, publishedProducts] = await Promise.all([
        listProducts({ limit: 200 }),
        getPublishedProducts(),
      ]);

      const allProducts = catalogRes?.items ?? [];
      const publishedIds = new Set(publishedProducts.map((p) => p._id));

      const statuses: ProductMarketplaceStatus[] = allProducts.map(
        (product) => {
          const published = publishedProducts.find(
            (p) => p._id === (product as any)._id || p._id === product.id,
          );
          const fbStatus = published?.platforms?.facebook;

          return mapToStatus(
            { ...product, _id: (product as any)._id ?? product.id },
            "FACEBOOK",
            fbStatus?.syncStatus ?? "UNPUBLISHED",
            fbStatus?.lastSyncedAt,
            fbStatus?.errorMessage,
          );
        },
      );

      setState((prev) => ({
        ...prev,
        productStatuses: statuses,
        loading: false,
      }));
    } catch (err) {
      console.error("[Marketplaces] Error cargando Facebook:", err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const refreshFacebook = async () => {
    setState((prev) => ({ ...prev, loading: true }));
    await loadFacebookProducts();
  };

  // ── connectPlatform ──────────────────────────────────────────────────────
  const connectPlatform = async (platform: MarketplacePlatform) => {
    // Solo Facebook tiene BE por ahora
    setState((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.platform === platform
          ? {
              ...c,
              status: "CONNECTED",
              accountName: "Las Plebes",
              connectedAt: new Date().toISOString(),
            }
          : c,
      ),
    }));
    auditLog("MARKETPLACE_CONNECTED", "marketplace", platform, {
      platform,
      userId: currentUser?.id,
    });
  };

  // ── disconnectPlatform ───────────────────────────────────────────────────
  const disconnectPlatform = async (platform: MarketplacePlatform) => {
    if (platform === "FACEBOOK") {
      // Despublicar todos en BE
      const published = state.productStatuses.filter(
        (s) => s.platform === "FACEBOOK" && s.syncStatus === "SYNCED",
      );
      await Promise.allSettled(
        published.map((s) => unpublishProductApi(s.productId)),
      );
    }

    setState((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.platform === platform
          ? {
              ...c,
              status: "DISCONNECTED",
              accountName: undefined,
              connectedAt: undefined,
            }
          : c,
      ),
      productStatuses: prev.productStatuses.map((s) =>
        s.platform === platform
          ? { ...s, isPublished: false, syncStatus: "UNPUBLISHED" }
          : s,
      ),
    }));

    auditLog("MARKETPLACE_DISCONNECTED", "marketplace", platform, {
      platform,
      userId: currentUser?.id,
    });
  };

  // ── syncAllProducts ──────────────────────────────────────────────────────
  const syncAllProducts = async (platform: MarketplacePlatform) => {
    setState((prev) => ({ ...prev, syncing: true }));
    try {
      if (platform === "FACEBOOK") {
        const result = await syncAllProductsApi();
        await loadFacebookProducts(); // refrescar desde BE
        auditLog("MARKETPLACE_SYNC_ALL", "marketplace", platform, {
          platform,
          synced: result.synced,
          errors: result.errors.length,
          userId: currentUser?.id,
        });
      } else {
        // Mock para otras plataformas
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const now = new Date().toISOString();
        setState((prev) => ({
          ...prev,
          productStatuses: prev.productStatuses.map((s) =>
            s.platform === platform &&
            (s.syncStatus === "PENDING" || s.syncStatus === "ERROR")
              ? {
                  ...s,
                  syncStatus: "SYNCED",
                  lastSyncedAt: now,
                  errorMessage: undefined,
                }
              : s,
          ),
        }));
        auditLog("MARKETPLACE_SYNC_ALL", "marketplace", platform, {
          platform,
          userId: currentUser?.id,
        });
      }
    } finally {
      setState((prev) => ({ ...prev, syncing: false }));
    }
  };

  // ── unpublishAllProducts ─────────────────────────────────────────────────
  const unpublishAllProducts = async (platform: MarketplacePlatform) => {
    if (platform === "FACEBOOK") {
      const published = state.productStatuses.filter(
        (s) => s.platform === "FACEBOOK" && s.syncStatus === "SYNCED",
      );
      await Promise.allSettled(
        published.map((s) => unpublishProductApi(s.productId)),
      );
      await loadFacebookProducts();
    } else {
      setState((prev) => ({
        ...prev,
        productStatuses: prev.productStatuses.map((s) =>
          s.platform === platform
            ? { ...s, isPublished: false, syncStatus: "UNPUBLISHED" }
            : s,
        ),
      }));
    }
    auditLog("MARKETPLACE_UNPUBLISH_ALL", "marketplace", platform, {
      platform,
      userId: currentUser?.id,
    });
  };

  // ── toggleProductPlatform ────────────────────────────────────────────────
  const toggleProductPlatform = async (
    productId: string,
    platform: MarketplacePlatform,
    enabled: boolean,
  ) => {
    if (platform === "FACEBOOK") {
      if (enabled) {
        // Optimistic update a PENDING
        setState((prev) => ({
          ...prev,
          productStatuses: prev.productStatuses.map((s) =>
            s.productId === productId && s.platform === "FACEBOOK"
              ? { ...s, syncStatus: "PENDING", isPublished: true }
              : s,
          ),
        }));
        try {
          await syncProductApi(productId);
          await loadFacebookProducts();
        } catch (err: any) {
          setState((prev) => ({
            ...prev,
            productStatuses: prev.productStatuses.map((s) =>
              s.productId === productId && s.platform === "FACEBOOK"
                ? {
                    ...s,
                    syncStatus: "ERROR",
                    isPublished: false,
                    errorMessage: err?.message || "Error al sincronizar",
                  }
                : s,
            ),
          }));
        }
      } else {
        await unpublishProductApi(productId);
        setState((prev) => ({
          ...prev,
          productStatuses: prev.productStatuses.map((s) =>
            s.productId === productId && s.platform === "FACEBOOK"
              ? { ...s, isPublished: false, syncStatus: "UNPUBLISHED" }
              : s,
          ),
        }));
      }
    } else {
      setState((prev) => ({
        ...prev,
        productStatuses: prev.productStatuses.map((s) =>
          s.productId === productId && s.platform === platform
            ? {
                ...s,
                isPublished: enabled,
                syncStatus: enabled ? "PENDING" : "UNPUBLISHED",
              }
            : s,
        ),
      }));
    }
    auditLog(
      "MARKETPLACE_PRODUCT_TOGGLED",
      "marketplace",
      `${platform}-${productId}`,
      {
        platform,
        productId,
        enabled,
        userId: currentUser?.id,
      },
    );
  };

  // ── syncProduct ──────────────────────────────────────────────────────────
  const syncProduct = async (
    productId: string,
    platform: MarketplacePlatform,
  ) => {
    if (platform === "FACEBOOK") {
      await syncProductApi(productId);
      await loadFacebookProducts();
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        productStatuses: prev.productStatuses.map((s) =>
          s.productId === productId && s.platform === platform
            ? {
                ...s,
                syncStatus: "SYNCED",
                lastSyncedAt: now,
                errorMessage: undefined,
              }
            : s,
        ),
      }));
    }
  };

  // ── Getters ──────────────────────────────────────────────────────────────
  const getConnectionStatus = (p: MarketplacePlatform) =>
    state.connections.find((c) => c.platform === p);
  const getPlatformStats = (p: MarketplacePlatform) =>
    state.platformStats.find((s) => s.platform === p);
  const getProductStatuses = (p: MarketplacePlatform) =>
    state.productStatuses.filter((s) => s.platform === p);
  const getProductStatus = (id: string, p: MarketplacePlatform) =>
    state.productStatuses.find((s) => s.productId === id && s.platform === p);
  const isPlatformConnected = (p: MarketplacePlatform) =>
    getConnectionStatus(p)?.status === "CONNECTED";

  const value: MarketplacesContextValue = {
    ...state,
    connectPlatform,
    disconnectPlatform,
    syncAllProducts,
    unpublishAllProducts,
    toggleProductPlatform,
    syncProduct,
    getConnectionStatus,
    getPlatformStats,
    getProductStatuses,
    getProductStatus,
    isPlatformConnected,
    refreshFacebook,
  };

  return (
    <MarketplacesContext.Provider value={value}>
      {children}
    </MarketplacesContext.Provider>
  );
}

export function useMarketplaces() {
  const context = useContext(MarketplacesContext);
  if (!context)
    throw new Error("useMarketplaces must be used within MarketplacesProvider");
  return context;
}
