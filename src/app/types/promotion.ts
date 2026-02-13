// Tipos de descuento
export type DiscountType = 'PERCENT' | 'FIXED';

// Alcance de la promoción/cupón
export interface PromotionScope {
  all: boolean;
  categoryIds?: string[];
  productIds?: string[];
}

// Promoción (automática, sin código)
export interface Promotion {
  id: string;
  name: string;
  type: DiscountType;
  value: number; // PERCENT: 1-90, FIXED: > 0
  startsAt?: string; // ISO string
  endsAt?: string; // ISO string
  isActive: boolean;
  scope: PromotionScope;
  stackable: boolean;
  createdAt: string;
  updatedAt: string;
}

// Cupón (con código)
export interface Coupon {
  id: string;
  code: string; // uppercase, único
  type: DiscountType;
  value: number;
  minSubtotal?: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  usedCount: number;
  scope: PromotionScope;
  isActive: boolean;
  stackable: boolean;
  createdAt: string;
  updatedAt: string;
}

// Estados de promoción/cupón
export type PromotionStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE';

// Resultado del cálculo de descuento
export interface DiscountResult {
  originalPrice: number;
  discountedPrice: number;
  discount: number;
  appliedPromotions: {
    id: string;
    name: string;
    type: DiscountType;
    value: number;
  }[];
}
