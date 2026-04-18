// src/app/store/MarketplacesContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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
  initFacebookOAuth,
  getFacebookStatus,
  setupFacebookAccount,
  setPrimaryAccount,
  toggleFacebookPage,
  selectPageCatalog,
  refreshPageCatalogs,
  removeFacebookAccount,
} from "../../api/marketplaces";
import type {
  FacebookStatusResponse,
  FacebookAccount,
  SetupAccountConfig,
  FacebookCatalog,
} from "../../api/marketplaces";
import { listProducts } from "../../api/products";

// ─── State ──────────────────────────────────────────────────────
interface MarketplacesState {
  connections: MarketplaceConnection[];
  productStatuses: ProductMarketplaceStatus[];
  platformStats: PlatformStats[];
  loading: boolean;
  syncing: boolean;
  // Facebook multi-account
  facebookStatus: FacebookStatusResponse | null;
  wizardAccountId: string | null; // accountId for post-OAuth wizard
  wizardIsFirst: boolean;
  showWizard: boolean;
}

interface MarketplacesContextValue extends MarketplacesState {
  // Platform-level (legacy compat)
  connectPlatform: (platform: MarketplacePlatform) => Promise<void>;
  disconnectPlatform: (platform: MarketplacePlatform) => Promise<void>;
  syncAllProducts: (platform: MarketplacePlatform) => Promise<void>;
  unpublishAllProducts: (platform: MarketplacePlatform) => Promise<void>;
  toggleProductPlatform: (productId: string, platform: MarketplacePlatform, enabled: boolean) => Promise<void>;
  syncProduct: (productId: string, platform: MarketplacePlatform) => Promise<void>;
  getConnectionStatus: (platform: MarketplacePlatform) => MarketplaceConnection | undefined;
  getPlatformStats: (platform: MarketplacePlatform) => PlatformStats | undefined;
  getProductStatuses: (platform: MarketplacePlatform) => ProductMarketplaceStatus[];
  getProductStatus: (productId: string, platform: MarketplacePlatform) => ProductMarketplaceStatus | undefined;
  isPlatformConnected: (platform: MarketplacePlatform) => boolean;
  refreshFacebook: () => Promise<void>;
  // Facebook multi-account
  reloadFacebookStatus: () => Promise<void>;
  setupAccount: (accountId: string, config: SetupAccountConfig) => Promise<void>;
  setAsPrimary: (accountId: string) => Promise<void>;
  togglePage: (accountId: string, pageId: string, active: boolean) => Promise<void>;
  setCatalog: (accountId: string, pageId: string, catalogId: string) => Promise<void>;
  refreshCatalogs: (accountId: string, pageId: string) => Promise<{ catalogs: FacebookCatalog[]; activeCatalogId: string | null }>;
  removeAccount: (accountId: string) => Promise<void>;
  closeWizard: () => void;
  openWizard: (accountId: string, isFirst: boolean) => void;
}

const MarketplacesContext = createContext<MarketplacesContextValue | null>(null);
const STORAGE_KEY = "pochteca_marketplaces_connections_v3";

const INITIAL_CONNECTIONS: MarketplaceConnection[] = [
  { platform: "FACEBOOK", status: "DISCONNECTED" },
  { platform: "INSTAGRAM", status: "DISCONNECTED" },
  { platform: "WHATSAPP", status: "DISCONNECTED" },
  { platform: "TIKTOK", status: "DISCONNECTED" },
];

// ─── Helpers ────────────────────────────────────────────────────
const calculateStats = (statuses: ProductMarketplaceStatus[]): PlatformStats[] => {
  const platforms: MarketplacePlatform[] = ["FACEBOOK", "INSTAGRAM", "WHATSAPP", "TIKTOK"];
  return platforms.map((platform) => {
    const items = statuses.filter((s) => s.platform === platform);
    return {
      platform,
      totalPublished: items.filter((s) => s.syncStatus === "SYNCED").length,
      totalUnpublished: items.filter((s) => s.syncStatus === "UNPUBLISHED").length,
      totalErrors: items.filter((s) => s.syncStatus === "ERROR").length,
      totalSales: 0,
      totalRevenue: 0,
    };
  });
};

const mapToStatus = (
  product: { _id: string; name: string; sku: string; price: number; images?: { url: string; isPrimary?: boolean }[]; stock?: number },
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
  productImage: product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url ?? "",
  platform,
  isPublished: syncStatus === "SYNCED",
  syncStatus,
  lastSyncedAt: lastSyncedAt ?? undefined,
  errorMessage: errorMessage ?? undefined,
});

// ─── Provider ───────────────────────────────────────────────────
export function MarketplacesProvider({ children }: { children: ReactNode }) {
  const { auditLog } = useAudit();
  const { currentUser } = useAuth();

  const [state, setState] = useState<MarketplacesState>({
    connections: INITIAL_CONNECTIONS,
    productStatuses: [],
    platformStats: [],
    loading: true,
    syncing: false,
    facebookStatus: null,
    wizardAccountId: null,
    wizardIsFirst: false,
    showWizard: false,
  });

  // ── Load on mount ──
  useEffect(() => { reloadFacebookStatus(); }, []);
  useEffect(() => { loadFacebookProducts(); }, []);

  useEffect(() => {
    setState((prev) => ({ ...prev, platformStats: calculateStats(prev.productStatuses) }));
  }, [state.productStatuses]);

  // ── Reload Facebook status from BE ──
  const reloadFacebookStatus = useCallback(async () => {
    try {
      const fb = await getFacebookStatus();
      console.log("[MARKETPLACE] reloadFacebookStatus:", fb);

      setState((prev) => {
        const hasActivePages = fb.accounts?.some((a: FacebookAccount) =>
          a.pages.some((p) => p.isActive)
        );

        return {
          ...prev,
          facebookStatus: fb,
          connections: prev.connections.map((c) =>
            c.platform === "FACEBOOK"
              ? {
                  ...c,
                  status: (fb.connected && hasActivePages ? "CONNECTED" : "DISCONNECTED") as any,
                  accountName: fb.accounts?.[0]?.userName || "Facebook",
                  connectedAt: fb.accounts?.[0]?.connectedAt || undefined,
                }
              : c
          ),
        };
      });
    } catch (err) {
      console.log("[MARKETPLACE] Facebook not connected or error:", err);
    }
  }, []);

  const loadFacebookProducts = async () => {
    try {
      const [catalogRes, publishedProducts] = await Promise.all([
        listProducts({ limit: 200 }),
        getPublishedProducts().catch(() => []),
      ]);

      const allProducts = catalogRes?.items ?? [];
      const statuses: ProductMarketplaceStatus[] = allProducts.map((product) => {
        const pid = (product as any)._id ?? product.id ?? "";
        const published = publishedProducts.find((p) => p._id === pid);
        const fbStatus = published?.platforms?.facebook;
        return mapToStatus(
          { _id: pid, name: product.name, sku: product.sku ?? "", price: product.price ?? 0, stock: (product as any).stock ?? 0, images: (product as any).images ?? [] },
          "FACEBOOK",
          fbStatus?.syncStatus ?? "UNPUBLISHED",
          fbStatus?.lastSyncedAt ?? null,
          fbStatus?.errorMessage ?? null,
        );
      });

      setState((prev) => ({ ...prev, productStatuses: statuses, loading: false }));
    } catch (err) {
      console.error("[MARKETPLACE] Error loading Facebook products:", err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const refreshFacebook = async () => {
    setState((prev) => ({ ...prev, loading: true }));
    await loadFacebookProducts();
  };

  // ── Connect platform ──
  const connectPlatform = async (platform: MarketplacePlatform) => {
    if (platform === "FACEBOOK") {
      const { authUrl } = await initFacebookOAuth();
      if (!authUrl) throw new Error("No auth URL received");
      window.location.href = authUrl;
      return;
    }
    // Mock for other platforms
    await new Promise((r) => setTimeout(r, 2000));
    setState((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.platform === platform
          ? { ...c, status: "CONNECTED", accountName: "Mock", connectedAt: new Date().toISOString() }
          : c
      ),
    }));
    auditLog({ action: "MARKETPLACE_CONNECTED", entity: { type: "marketplace", id: platform, label: platform }, metadata: { platform, userId: currentUser?.id } });
  };

  // ── Disconnect platform ──
  const disconnectPlatform = async (platform: MarketplacePlatform) => {
    if (platform === "FACEBOOK") {
      const published = state.productStatuses.filter((s) => s.platform === "FACEBOOK" && s.syncStatus === "SYNCED");
      await Promise.allSettled(published.map((s) => unpublishProductApi(s.productId)));
      // Remove all accounts
      const accounts = state.facebookStatus?.accounts || [];
      for (const acc of accounts) {
        try { await removeFacebookAccount(acc.accountId); } catch (e) { console.error(e); }
      }
      await reloadFacebookStatus();
    }

    setState((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.platform === platform ? { ...c, status: "DISCONNECTED", accountName: undefined, connectedAt: undefined } : c
      ),
      productStatuses: prev.productStatuses.map((s) =>
        s.platform === platform ? { ...s, isPublished: false, syncStatus: "UNPUBLISHED" } : s
      ),
    }));

    auditLog({ action: "MARKETPLACE_DISCONNECTED", entity: { type: "marketplace", id: platform, label: platform }, metadata: { platform, userId: currentUser?.id } });
  };

  // ── Sync all ──
  const syncAllProducts = async (platform: MarketplacePlatform) => {
    setState((prev) => ({ ...prev, syncing: true }));
    try {
      if (platform === "FACEBOOK") {
        const result = await syncAllProductsApi();
        await loadFacebookProducts();
        auditLog({ action: "MARKETPLACE_SYNC_ALL", entity: { type: "marketplace", id: platform, label: platform }, metadata: { platform, synced: result.synced, errors: result.errors.length, userId: currentUser?.id } });
      } else {
        await new Promise((r) => setTimeout(r, 2000));
        const now = new Date().toISOString();
        setState((prev) => ({
          ...prev,
          productStatuses: prev.productStatuses.map((s) =>
            s.platform === platform && (s.syncStatus === "PENDING" || s.syncStatus === "ERROR")
              ? { ...s, syncStatus: "SYNCED", lastSyncedAt: now, errorMessage: undefined }
              : s
          ),
        }));
        auditLog({ action: "MARKETPLACE_SYNC_ALL", entity: { type: "marketplace", id: platform, label: platform }, metadata: { platform, userId: currentUser?.id } });
      }
    } finally {
      setState((prev) => ({ ...prev, syncing: false }));
    }
  };

  // ── Unpublish all ──
  const unpublishAllProducts = async (platform: MarketplacePlatform) => {
    if (platform === "FACEBOOK") {
      const published = state.productStatuses.filter((s) => s.platform === "FACEBOOK" && s.syncStatus === "SYNCED");
      await Promise.allSettled(published.map((s) => unpublishProductApi(s.productId)));
      await loadFacebookProducts();
    } else {
      setState((prev) => ({
        ...prev,
        productStatuses: prev.productStatuses.map((s) =>
          s.platform === platform ? { ...s, isPublished: false, syncStatus: "UNPUBLISHED" } : s
        ),
      }));
    }
    auditLog({ action: "MARKETPLACE_UNPUBLISH_ALL", entity: { type: "marketplace", id: platform, label: platform }, metadata: { platform, userId: currentUser?.id } });
  };

  // ── Toggle product ──
  const toggleProductPlatform = async (productId: string, platform: MarketplacePlatform, enabled: boolean) => {
    if (platform === "FACEBOOK") {
      if (enabled) {
        setState((prev) => ({
          ...prev,
          productStatuses: prev.productStatuses.map((s) =>
            s.productId === productId && s.platform === "FACEBOOK" ? { ...s, syncStatus: "PENDING", isPublished: true } : s
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
                ? { ...s, syncStatus: "ERROR", isPublished: false, errorMessage: err?.message || "Error" }
                : s
            ),
          }));
        }
      } else {
        await unpublishProductApi(productId);
        setState((prev) => ({
          ...prev,
          productStatuses: prev.productStatuses.map((s) =>
            s.productId === productId && s.platform === "FACEBOOK" ? { ...s, isPublished: false, syncStatus: "UNPUBLISHED" } : s
          ),
        }));
      }
    } else {
      setState((prev) => ({
        ...prev,
        productStatuses: prev.productStatuses.map((s) =>
          s.productId === productId && s.platform === platform
            ? { ...s, isPublished: enabled, syncStatus: enabled ? "PENDING" : "UNPUBLISHED" }
            : s
        ),
      }));
    }
    auditLog({ action: "MARKETPLACE_PRODUCT_TOGGLED", entity: { type: "marketplace", id: `${platform}-${productId}`, label: `${platform}-${productId}` }, metadata: { platform, productId, enabled, userId: currentUser?.id } });
  };

  // ── Sync single product ──
  const syncProduct = async (productId: string, platform: MarketplacePlatform) => {
    if (platform === "FACEBOOK") {
      await syncProductApi(productId);
      await loadFacebookProducts();
    } else {
      await new Promise((r) => setTimeout(r, 1000));
      setState((prev) => ({
        ...prev,
        productStatuses: prev.productStatuses.map((s) =>
          s.productId === productId && s.platform === platform
            ? { ...s, syncStatus: "SYNCED", lastSyncedAt: new Date().toISOString(), errorMessage: undefined }
            : s
        ),
      }));
    }
  };

  // ═══ Facebook multi-account operations ═══

  const setupAccount = async (accountId: string, config: SetupAccountConfig) => {
    await setupFacebookAccount(accountId, config);
    await reloadFacebookStatus();
    closeWizard();
    auditLog({ action: "MARKETPLACE_CONNECTED", entity: { type: "marketplace", id: accountId, label: accountId }, metadata: { accountId, config, userId: currentUser?.id } });
  };

  const setAsPrimary = async (accountId: string) => {
    await setPrimaryAccount(accountId);
    await reloadFacebookStatus();
  };

  const togglePage = async (accountId: string, pageId: string, active: boolean) => {
    await toggleFacebookPage(accountId, pageId, active);
    await reloadFacebookStatus();
  };

  const setCatalog = async (accountId: string, pageId: string, catalogId: string) => {
    await selectPageCatalog(accountId, pageId, catalogId);
    await reloadFacebookStatus();
  };

  const refreshCatalogs = async (accountId: string, pageId: string) => {
    const result = await refreshPageCatalogs(accountId, pageId);
    await reloadFacebookStatus();
    return result;
  };

  const removeAccount = async (accountId: string) => {
    await removeFacebookAccount(accountId);
    await reloadFacebookStatus();
    auditLog({ action: "MARKETPLACE_DISCONNECTED", entity: { type: "marketplace", id: accountId, label: accountId }, metadata: { accountId, userId: currentUser?.id } });
  };

  const openWizard = (accountId: string, isFirst: boolean) => {
    setState((prev) => ({ ...prev, wizardAccountId: accountId, wizardIsFirst: isFirst, showWizard: true }));
  };

  const closeWizard = () => {
    setState((prev) => ({ ...prev, wizardAccountId: null, wizardIsFirst: false, showWizard: false }));
  };

  // ── Getters ──
  const getConnectionStatus = (p: MarketplacePlatform) => state.connections.find((c) => c.platform === p);
  const getPlatformStats = (p: MarketplacePlatform) => state.platformStats.find((s) => s.platform === p);
  const getProductStatuses = (p: MarketplacePlatform) => state.productStatuses.filter((s) => s.platform === p);
  const getProductStatus = (id: string, p: MarketplacePlatform) => state.productStatuses.find((s) => s.productId === id && s.platform === p);
  const isPlatformConnected = (p: MarketplacePlatform) => getConnectionStatus(p)?.status === "CONNECTED";

  const value: MarketplacesContextValue = {
    ...state,
    connectPlatform, disconnectPlatform, syncAllProducts, unpublishAllProducts,
    toggleProductPlatform, syncProduct, getConnectionStatus, getPlatformStats,
    getProductStatuses, getProductStatus, isPlatformConnected, refreshFacebook,
    reloadFacebookStatus, setupAccount, setAsPrimary, togglePage, setCatalog,
    refreshCatalogs, removeAccount, closeWizard, openWizard,
  };

  return <MarketplacesContext.Provider value={value}>{children}</MarketplacesContext.Provider>;
}

export function useMarketplaces() {
  const context = useContext(MarketplacesContext);
  if (!context) throw new Error("useMarketplaces must be used within MarketplacesProvider");
  return context;
}