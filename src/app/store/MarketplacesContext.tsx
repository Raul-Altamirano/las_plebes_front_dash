// src/app/store/MarketplacesContext.tsx
import React, {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from "react";
import type {
  MarketplacePlatform, MarketplaceConnection, ProductMarketplaceStatus, PlatformStats,
} from "../types/marketplace";
import { useAudit } from "./AuditContext";
import { useAuth } from "./AuthContext";
import {
  getPublishedProducts, syncProductApi, syncAllProductsApi, unpublishProductApi,
  initFacebookOAuth, getFacebookStatus, setupFacebookAccount, setPrimaryAccount,
  toggleFacebookPage, selectPageCatalog, refreshPageCatalogs, removeFacebookAccount,
} from "../../api/marketplaces";
import type {
  FacebookStatusResponse, FacebookAccount, SetupAccountConfig, FacebookCatalog,
} from "../../api/marketplaces";
import { listProducts } from "../../api/products";

interface MarketplacesState {
  connections: MarketplaceConnection[];
  productStatuses: ProductMarketplaceStatus[];
  platformStats: PlatformStats[];
  loading: boolean;
  syncing: boolean;
  facebookStatus: FacebookStatusResponse | null;
  wizardAccountId: string | null;
  wizardIsFirst: boolean;
  showWizard: boolean;
}

interface MarketplacesContextValue extends MarketplacesState {
  connectPlatform: (platform: MarketplacePlatform) => Promise<void>;
  disconnectPlatform: (platform: MarketplacePlatform) => Promise<void>;
  syncAllProducts: (platform: MarketplacePlatform, pageId?: string) => Promise<void>;
  unpublishAllProducts: (platform: MarketplacePlatform, pageId?: string) => Promise<void>;
  toggleProductPlatform: (productId: string, platform: MarketplacePlatform, enabled: boolean, pageId?: string) => Promise<void>;
  syncProduct: (productId: string, platform: MarketplacePlatform, pageId?: string) => Promise<void>;
  getConnectionStatus: (platform: MarketplacePlatform) => MarketplaceConnection | undefined;
  getPlatformStats: (platform: MarketplacePlatform) => PlatformStats | undefined;
  getProductStatuses: (platform: MarketplacePlatform) => ProductMarketplaceStatus[];
  getProductStatus: (productId: string, platform: MarketplacePlatform) => ProductMarketplaceStatus | undefined;
  isPlatformConnected: (platform: MarketplacePlatform) => boolean;
  refreshFacebook: () => Promise<void>;
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
  pageId?: string | null,
  pageName?: string | null,
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
  // Extra fields for page tracking
  publishedPageId: pageId ?? undefined,
  publishedPageName: pageName ?? undefined,
} as any);

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

  useEffect(() => { reloadFacebookStatus(); }, []);
  useEffect(() => { loadFacebookProducts(); }, []);
  useEffect(() => {
    setState((prev) => ({ ...prev, platformStats: calculateStats(prev.productStatuses) }));
  }, [state.productStatuses]);

  const reloadFacebookStatus = useCallback(async () => {
    try {
      const fb = await getFacebookStatus();
      console.log("[MARKETPLACE] reloadFacebookStatus:", fb);
      setState((prev) => {
        const hasActivePages = fb.accounts?.some((a: FacebookAccount) => a.pages.some((p) => p.isActive));
        return {
          ...prev,
          facebookStatus: fb,
          connections: prev.connections.map((c) =>
            c.platform === "FACEBOOK"
              ? { ...c, status: (fb.connected && hasActivePages ? "CONNECTED" : "DISCONNECTED") as any, accountName: fb.accounts?.[0]?.userName || "Facebook", connectedAt: fb.accounts?.[0]?.connectedAt || undefined }
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
          (fbStatus as any)?.pageId ?? null,
          (fbStatus as any)?.pageName ?? null,
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

  const connectPlatform = async (platform: MarketplacePlatform) => {
    if (platform === "FACEBOOK") {
      const { authUrl } = await initFacebookOAuth();
      if (!authUrl) throw new Error("No auth URL received");
      window.location.href = authUrl;
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
    setState((prev) => ({
      ...prev,
      connections: prev.connections.map((c) =>
        c.platform === platform ? { ...c, status: "CONNECTED", accountName: "Mock", connectedAt: new Date().toISOString() } : c
      ),
    }));
    auditLog({ action: "MARKETPLACE_CONNECTED", entity: { type: "marketplace", id: platform, label: platform }, metadata: { platform, userId: currentUser?.id } });
  };

  const disconnectPlatform = async (platform: MarketplacePlatform) => {
    if (platform === "FACEBOOK") {
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

  const syncAllProducts = async (platform: MarketplacePlatform, pageId?: string) => {
    setState((prev) => ({ ...prev, syncing: true }));
    try {
      if (platform === "FACEBOOK") {
        console.log(`[MARKETPLACE] syncAll pageId=${pageId}`);
        const result = await syncAllProductsApi(pageId);
        await loadFacebookProducts();
        auditLog({ action: "MARKETPLACE_SYNC_ALL", entity: { type: "marketplace", id: platform, label: platform }, metadata: { platform, pageId, synced: result.synced, errors: result.errors.length, userId: currentUser?.id } });
      }
    } finally {
      setState((prev) => ({ ...prev, syncing: false }));
    }
  };

  const unpublishAllProducts = async (platform: MarketplacePlatform, pageId?: string) => {
    if (platform === "FACEBOOK") {
      const published = state.productStatuses.filter((s) => s.platform === "FACEBOOK" && s.syncStatus === "SYNCED");
      await Promise.allSettled(published.map((s) => {
        const storedPageId = (s as any).publishedPageId || pageId;
        return unpublishProductApi(s.productId, storedPageId);
      }));
      await loadFacebookProducts();
    }
    auditLog({ action: "MARKETPLACE_UNPUBLISH_ALL", entity: { type: "marketplace", id: platform, label: platform }, metadata: { platform, pageId, userId: currentUser?.id } });
  };

  const toggleProductPlatform = async (productId: string, platform: MarketplacePlatform, enabled: boolean, pageId?: string) => {
    if (platform === "FACEBOOK") {
      if (enabled) {
        setState((prev) => ({
          ...prev,
          productStatuses: prev.productStatuses.map((s) =>
            s.productId === productId && s.platform === "FACEBOOK" ? { ...s, syncStatus: "PENDING", isPublished: true } : s
          ),
        }));
        try {
          await syncProductApi(productId, pageId);
          await loadFacebookProducts();
        } catch (err: any) {
          setState((prev) => ({
            ...prev,
            productStatuses: prev.productStatuses.map((s) =>
              s.productId === productId && s.platform === "FACEBOOK"
                ? { ...s, syncStatus: "ERROR", isPublished: false, errorMessage: err?.message || "Error" } : s
            ),
          }));
        }
      } else {
        await unpublishProductApi(productId, pageId);
        await loadFacebookProducts();
      }
    }
    auditLog({ action: "MARKETPLACE_PRODUCT_TOGGLED", entity: { type: "marketplace", id: `${platform}-${productId}`, label: `${platform}-${productId}` }, metadata: { platform, productId, enabled, pageId, userId: currentUser?.id } });
  };

  const syncProduct = async (productId: string, platform: MarketplacePlatform, pageId?: string) => {
    if (platform === "FACEBOOK") {
      await syncProductApi(productId, pageId);
      await loadFacebookProducts();
    }
  };

  const setupAccount = async (accountId: string, config: SetupAccountConfig) => {
    await setupFacebookAccount(accountId, config);
    await reloadFacebookStatus();
    closeWizard();
    auditLog({ action: "MARKETPLACE_CONNECTED", entity: { type: "marketplace", id: accountId, label: accountId }, metadata: { accountId, config, userId: currentUser?.id } });
  };

  const setAsPrimary = async (accountId: string) => { await setPrimaryAccount(accountId); await reloadFacebookStatus(); };
  const togglePage = async (accountId: string, pageId: string, active: boolean) => { await toggleFacebookPage(accountId, pageId, active); await reloadFacebookStatus(); };
  const setCatalog = async (accountId: string, pageId: string, catalogId: string) => { await selectPageCatalog(accountId, pageId, catalogId); await reloadFacebookStatus(); };
  const refreshCatalogs = async (accountId: string, pageId: string) => { const r = await refreshPageCatalogs(accountId, pageId); await reloadFacebookStatus(); return r; };
  const removeAccount = async (accountId: string) => {
    await removeFacebookAccount(accountId);
    await reloadFacebookStatus();
    auditLog({ action: "MARKETPLACE_DISCONNECTED", entity: { type: "marketplace", id: accountId, label: accountId }, metadata: { accountId, userId: currentUser?.id } });
  };
  const openWizard = (accountId: string, isFirst: boolean) => { setState((prev) => ({ ...prev, wizardAccountId: accountId, wizardIsFirst: isFirst, showWizard: true })); };
  const closeWizard = () => { setState((prev) => ({ ...prev, wizardAccountId: null, wizardIsFirst: false, showWizard: false })); };

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