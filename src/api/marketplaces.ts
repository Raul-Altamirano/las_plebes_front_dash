// src/api/marketplaces.ts
import { createApiClient } from './http';

const apiFetch = createApiClient(
  (import.meta.env.VITE_META_BASE_URL as string | undefined) ?? '/api/meta'
);

const authFetch = createApiClient(
  (import.meta.env.VITE_META_API_ROOT as string | undefined) ?? '/api/meta-root'
);

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface FacebookPlatformStatus {
  metaId: string | null;
  retailerId: string | null;
  syncStatus: 'SYNCED' | 'UNPUBLISHED' | 'ERROR' | 'PENDING';
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

export interface PublishedProduct {
  _id: string;
  name: string;
  sku: string;
  price: number;
  status: string;
  platforms: { facebook?: FacebookPlatformStatus };
}

export interface SyncAllResult {
  synced: number;
  errors: { batch: number; error: string }[];
  total: number;
}

export interface FacebookCatalog {
  id: string;
  name: string;
}

export interface FacebookPage {
  pageId: string;
  pageName: string;
  category?: string | null;
  instagramId?: string | null;
  instagramUsername?: string | null;
  isActive: boolean;
  catalogs: FacebookCatalog[];
  activeCatalogId: string | null;
  connectedAt: string;
}

export interface FacebookAccount {
  accountId: string;
  userName: string;
  isPrimary: boolean;
  connectedAt: string;
  pages: FacebookPage[];
}

export interface FacebookStatusResponse {
  connected: boolean;
  accounts: FacebookAccount[];
  primaryAccountId: string | null;
  plan: {
    planId: string;
    limits: {
      facebookPages: number;
      facebookAccounts: number;
    };
  };
  usage: {
    totalAccounts: number;
    activePages: number;
  };
}

export interface SetupAccountConfig {
  isPrimary?: boolean;
  pages: { pageId: string; isActive: boolean; activeCatalogId: string | null }[];
}

// ═══════════════════════════════════════════════════════════════
// OAuth / Connection endpoints
// ═══════════════════════════════════════════════════════════════

export async function initFacebookOAuth(): Promise<{ authUrl: string }> {
  const res = await authFetch<any>(
    '/auth/facebook/init',
    { method: 'POST', label: '[MARKETPLACE] oauthInit' }
  );
  const authUrl = res.authUrl ?? res.data?.authUrl;
  if (!authUrl) {
    console.error('[MARKETPLACE] initFacebookOAuth — No authUrl in response:', res);
    throw new Error('No se recibió URL de autorización de Facebook');
  }
  return { authUrl };
}

export async function getFacebookStatus(): Promise<FacebookStatusResponse> {
  const res = await authFetch<any>(
    '/auth/facebook/status',
    { label: '[MARKETPLACE] fbStatus' }
  );
  const fb = res.data ?? res;
  console.log('[MARKETPLACE] getFacebookStatus — parsed:', fb);
  return fb;
}

export async function setupFacebookAccount(
  accountId: string,
  config: SetupAccountConfig
): Promise<any> {
  const res = await authFetch<any>(
    `/auth/facebook/accounts/${accountId}/setup`,
    { method: 'POST', body: JSON.stringify(config), label: '[MARKETPLACE] setupAccount' }
  );
  return res.data ?? res;
}

export async function setPrimaryAccount(accountId: string): Promise<void> {
  await authFetch(`/auth/facebook/accounts/${accountId}/primary`, {
    method: 'PATCH',
    label: '[MARKETPLACE] setPrimary',
  });
}

export async function toggleFacebookPage(
  accountId: string, pageId: string, active: boolean
): Promise<void> {
  await authFetch(`/auth/facebook/accounts/${accountId}/pages/${pageId}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
    label: '[MARKETPLACE] togglePage',
  });
}

export async function selectPageCatalog(
  accountId: string, pageId: string, catalogId: string
): Promise<void> {
  await authFetch(`/auth/facebook/accounts/${accountId}/pages/${pageId}/catalog`, {
    method: 'PATCH',
    body: JSON.stringify({ catalogId }),
    label: '[MARKETPLACE] selectCatalog',
  });
}

export async function refreshPageCatalogs(
  accountId: string, pageId: string
): Promise<{ catalogs: FacebookCatalog[]; activeCatalogId: string | null }> {
  const res = await authFetch<any>(
    `/auth/facebook/accounts/${accountId}/pages/${pageId}/refresh-catalogs`,
    { method: 'POST', label: '[MARKETPLACE] refreshCatalogs' }
  );
  return res.data ?? res;
}

export async function removeFacebookAccount(accountId: string): Promise<void> {
  await authFetch(`/auth/facebook/accounts/${accountId}`, {
    method: 'DELETE',
    label: '[MARKETPLACE] removeAccount',
  });
}

// ═══════════════════════════════════════════════════════════════
// Product sync endpoints — now accept pageId
// ═══════════════════════════════════════════════════════════════

export async function getPublishedProducts(): Promise<PublishedProduct[]> {
  try {
    const res = await apiFetch<{ status: string; data: PublishedProduct[] }>(
      '/products',
      { label: '[MARKETPLACE] getPublished' }
    );
    return res?.data ?? [];
  } catch (err) {
    console.error('[MARKETPLACE] getPublished — error:', err);
    return [];
  }
}

export async function syncProductApi(productId: string, pageId?: string): Promise<PublishedProduct> {
  const res = await apiFetch<{ status: string; data: PublishedProduct }>(
    `/products/${productId}/sync`,
    {
      method: 'POST',
      body: pageId ? JSON.stringify({ pageId }) : undefined,
      label: '[MARKETPLACE] syncProduct',
    }
  );
  return res.data;
}

export async function syncAllProductsApi(pageId?: string): Promise<SyncAllResult> {
  const res = await apiFetch<{ status: string; data: SyncAllResult }>(
    '/products/sync-all',
    {
      method: 'POST',
      body: pageId ? JSON.stringify({ pageId }) : undefined,
      label: '[MARKETPLACE] syncAll',
    }
  );
  return res.data;
}

export async function unpublishProductApi(productId: string, pageId?: string): Promise<void> {
  await apiFetch(`/products/${productId}`, {
    method: 'DELETE',
    body: pageId ? JSON.stringify({ pageId }) : undefined,
    label: '[MARKETPLACE] unpublish',
  });
}