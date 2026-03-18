// src/api/marketplaces.ts
import { createApiClient } from './http';

const apiFetch = createApiClient(
  (import.meta.env.VITE_META_BASE_URL as string | undefined) ?? '/api/meta'
);

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

export async function getPublishedProducts(): Promise<PublishedProduct[]> {
  const res = await apiFetch<{ status: string; data: PublishedProduct[] }>(
    '/products', { label: 'meta.getPublished' }
  );
  return res.data;
}

export async function syncProductApi(productId: string): Promise<PublishedProduct> {
  const res = await apiFetch<{ status: string; data: PublishedProduct }>(
    `/products/${productId}/sync`,
    { method: 'POST', label: 'meta.syncProduct' }
  );
  return res.data;
}

export async function syncAllProductsApi(): Promise<SyncAllResult> {
  const res = await apiFetch<{ status: string; data: SyncAllResult }>(
    '/products/sync-all',
    { method: 'POST', label: 'meta.syncAll' }
  );
  return res.data;
}

export async function unpublishProductApi(productId: string): Promise<void> {
  await apiFetch(
    `/products/${productId}`,
    { method: 'DELETE', label: 'meta.unpublish' }
  );
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const res = await apiFetch<{ status: string; data: CatalogProduct[] }>(
    '/catalog/products', { label: 'meta.getCatalog' }
  );
  return res.data;
}