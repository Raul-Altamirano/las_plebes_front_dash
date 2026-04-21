// src/app/types/product.ts

export type ProductStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "OUT_OF_STOCK";

export interface ProductImage {
  id: string;
  url: string;
  key?: string;
  alt?: string;
  isPrimary: boolean;
}

export interface ColorGroup {
  colorId:  string;
  colorName:    string;
  colorHex: string;
  images:   ProductImage[];
}

export interface ProductVariant {
  id: string;
  productId?: string;
  sku?: string;
  size?: string;
  color?: string;
  colorId?: string;
  price?: number;
  cost?: number;
  colorHex?: string;
  stock: number;
  images?: ProductImage[];
  updatedAt?: string;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  slug?: string;
  sku?: string;
  description?: string;
  categoryId?: string | null;
  status: ProductStatus;
  price?: number;
  cost?: number;
  stock?: number;
  images: ProductImage[];       // siempre vacío cuando usa colorGroups
  colorGroups?: ColorGroup[];
  hasVariants?: boolean;
  variants?: ProductVariant[];
  trackCost?: boolean;
  isArchived?: boolean;
  colorHex?: string;
  createdAt: string;
  updatedAt: string;
}