// src/api/marketplaces.ts
import { createApiClient } from './http';

// ─── Client para endpoints de productos (/api/v1/meta/...) ──────────────────
const apiFetch = createApiClient(
  (import.meta.env.VITE_META_BASE_URL as string | undefined) ?? '/api/meta'
);

// ─── Client para endpoints de OAuth (/auth/facebook/...) ─────────────────────
// Apunta a la raíz del API Gateway, sin el prefijo /api/v1/meta
const authFetch = createApiClient(
  (import.meta.env.VITE_META_API_ROOT as string | undefined) ?? '/api/meta-root'
);

// ═════════════════════════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════════════════════════

export interface FacebookPlatformStatus {
  metaId:       string | null;
  retailerId:   string | null;
  syncStatus:   'SYNCED' | 'UNPUBLISHED' | 'ERROR' | 'PENDING';
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

export interface PublishedProduct {
  _id:       string;
  name:      string;
  sku:       string;
  price:     number;
  status:    string;
  platforms: { facebook?: FacebookPlatformStatus };
}

export interface SyncAllResult {
  synced: number;
  errors: { batch: number; error: string }[];
  total:  number;
}

export interface CatalogProduct {
  id:           string;
  name:         string;
  price:        string;
  availability: string;
  image_url:    string;
  retailer_id:  string;
}

export interface FacebookStatusResponse {
  connected:   boolean;
  status?:     string;
  pageName?:   string;
  pageId?:     string;
  catalogId?:  string;
  catalogs?:   { id: string; name: string }[];
  connectedAt?: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// OAuth / Connection endpoints  (/auth/facebook/...)
// ═════════════════════════════════════════════════════════════════════════════

/** POST /auth/facebook/init → devuelve { authUrl } para redirigir a Meta */
export async function initFacebookOAuth(): Promise<{ authUrl: string }> {
  const res = await authFetch<any>(
    '/auth/facebook/init',
    { method: 'POST', label: '[MARKETPLACE] oauthInit' }
  );
  // La Lambda puede devolver { authUrl } o { data: { authUrl } }
  const authUrl = res.authUrl ?? res.data?.authUrl;
  if (!authUrl) {
    console.error('[MARKETPLACE] initFacebookOAuth — No authUrl in response:', res);
    throw new Error('No se recibió URL de autorización de Facebook');
  }
  return { authUrl };
}

/** GET /auth/facebook/status → estado de conexión + catálogos */
export async function getFacebookStatus(): Promise<FacebookStatusResponse> {
  const res = await authFetch<any>(
    '/auth/facebook/status',
    { label: '[MARKETPLACE] fbStatus' }
  );
  // La Lambda puede devolver { data: { status, ... } } o { status, ... } directo
  const fb = res.data ?? res;
  console.log('[MARKETPLACE] getFacebookStatus — parsed:', fb);
  return fb;
}

/** DELETE /auth/facebook → desconectar Facebook */
export async function disconnectFacebookApi(): Promise<void> {
  await authFetch('/auth/facebook', {
    method: 'DELETE',
    label: '[MARKETPLACE] disconnect',
  });
}

/** POST /auth/facebook/refresh-catalogs → refrescar lista de catálogos */
export async function refreshFacebookCatalogs(): Promise<FacebookStatusResponse> {
  const res = await authFetch<{ status: string; data: FacebookStatusResponse }>(
    '/auth/facebook/refresh-catalogs',
    { method: 'POST', label: '[MARKETPLACE] refreshCatalogs' }
  );
  return res.data;
}

/** PATCH /auth/facebook/catalog → seleccionar catálogo activo */
export async function selectFacebookCatalog(catalogId: string): Promise<void> {
  await authFetch('/auth/facebook/catalog', {
    method: 'PATCH',
    body: JSON.stringify({ catalogId }),
    label: '[MARKETPLACE] selectCatalog',
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Product sync endpoints  (/api/v1/meta/products/...)
// ═════════════════════════════════════════════════════════════════════════════

export async function getPublishedProducts(): Promise<PublishedProduct[]> {
  try {
    const res = await apiFetch<{ status: string; data: PublishedProduct[] }>(
      '/products', { label: '[MARKETPLACE] getPublished' }
    );
    console.log('[MARKETPLACE] getPublished — raw res:', res);
    return res?.data ?? [];
  } catch (err) {
    console.error('[MARKETPLACE] getPublished — error:', err);
    return [];
  }
}

export async function syncProductApi(productId: string): Promise<PublishedProduct> {
  const res = await apiFetch<{ status: string; data: PublishedProduct }>(
    `/products/${productId}/sync`,
    { method: 'POST', label: '[MARKETPLACE] syncProduct' }
  );
  return res.data;
}

export async function syncAllProductsApi(): Promise<SyncAllResult> {
  const res = await apiFetch<{ status: string; data: SyncAllResult }>(
    '/products/sync-all',
    { method: 'POST', label: '[MARKETPLACE] syncAll' }
  );
  return res.data;
}

export async function unpublishProductApi(productId: string): Promise<void> {
  await apiFetch(
    `/products/${productId}`,
    { method: 'DELETE', label: '[MARKETPLACE] unpublish' }
  );
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const res = await apiFetch<{ status: string; data: CatalogProduct[] }>(
    '/catalog/products', { label: '[MARKETPLACE] getCatalog' }
  );
  return res.data;
}