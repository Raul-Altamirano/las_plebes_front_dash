// Product module types

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'OUT_OF_STOCK';

export interface ProductVariant {
  id: string;
  sku: string;
  options: {
    size?: string;
    color?: string;
  };
  price?: number;
  stock: number;
  status?: ProductStatus;
  imageUrl?: string;
  cost?: number; // COGS unitario para esta variante (opcional, hereda de product si no existe)
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: ProductStatus;
  categoryId: string | null;
  descriptionShort?: string;
  images: ProductImage[];
  updatedAt: string;
  isArchived: boolean;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  cost?: number; // COGS unitario (opcional)
  trackCost?: boolean; // Si false, no se rastrea costo (default: true)
}
