// src/app/types/product.ts

export type ProductStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "OUT_OF_STOCK";

export interface ProductImage {
  id: string;
  url: string;
  key?: string;       // para borrar de S3
  alt?: string;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku?: string;
  size?: string;
  color?: string;
  price?: number;
  cost?: number;
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
  images: ProductImage[];
  hasVariants?: boolean;
  variants?: ProductVariant[];
  trackCost?: boolean;
  createdAt: string;
  updatedAt: string;
}