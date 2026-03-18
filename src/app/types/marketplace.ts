/**
 * Types for Marketplaces Module
 * 
 * Gestión de conexiones y sincronización con plataformas
 * de venta como Facebook, Instagram, WhatsApp y TikTok
 */

export type MarketplacePlatform = 
  | 'FACEBOOK' 
  | 'INSTAGRAM' 
  | 'WHATSAPP' 
  | 'TIKTOK';

export type ConnectionStatus = 
  | 'DISCONNECTED' 
  | 'CONNECTED' 
  | 'ERROR';

export type SyncStatus = 
  | 'SYNCED' 
  | 'PENDING' 
  | 'ERROR' 
  | 'UNPUBLISHED';

export interface MarketplaceConnection {
  platform: MarketplacePlatform;
  status: ConnectionStatus;
  accountName?: string;
  connectedAt?: string;
  errorMessage?: string;
}

export interface ProductMarketplaceStatus {
  productId: string;
  productName: string;
  productImage: string;
  productSku: string;
  productPrice: number;
  productStock: number;
  platform: MarketplacePlatform;
  isPublished: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  errorMessage?: string;
}

export interface PlatformStats {
  platform: MarketplacePlatform;
  totalPublished: number;
  totalUnpublished: number;
  totalErrors: number;
  totalSales: number;       // simulado
  totalRevenue: number;     // simulado en MXN
}

// Labels y metadata para UI
export const PLATFORM_LABELS: Record<MarketplacePlatform, string> = {
  FACEBOOK: 'Facebook Marketplace',
  INSTAGRAM: 'Instagram Shopping',
  WHATSAPP: 'WhatsApp Catalog',
  TIKTOK: 'TikTok Shop',
};

export const PLATFORM_SHORT_LABELS: Record<MarketplacePlatform, string> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  WHATSAPP: 'WhatsApp',
  TIKTOK: 'TikTok',
};

export const PLATFORM_COLORS: Record<MarketplacePlatform, string> = {
  FACEBOOK: 'bg-blue-100 text-blue-800',
  INSTAGRAM: 'bg-pink-100 text-pink-800',
  WHATSAPP: 'bg-green-100 text-green-800',
  TIKTOK: 'bg-gray-800 text-white',
};

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  CONNECTED: 'Conectado',
  DISCONNECTED: 'Desconectado',
  ERROR: 'Error',
};

export const CONNECTION_STATUS_COLORS: Record<ConnectionStatus, string> = {
  CONNECTED: 'bg-green-100 text-green-800',
  DISCONNECTED: 'bg-gray-100 text-gray-600',
  ERROR: 'bg-red-100 text-red-800',
};

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  SYNCED: 'Sincronizado',
  PENDING: 'Pendiente',
  ERROR: 'Error',
  UNPUBLISHED: 'No publicado',
};

export const SYNC_STATUS_COLORS: Record<SyncStatus, string> = {
  SYNCED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  ERROR: 'bg-red-100 text-red-800',
  UNPUBLISHED: 'bg-gray-100 text-gray-600',
};
