// ── Tipos base ────────────────────────────────────────────────────────────────
export type DiscountType = 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';

export type PromotionStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE';

/** Alcance interno del FE (el BE lo llama `appliesTo`, la API layer convierte) */
export interface PromotionScope {
  all: boolean;
  categoryIds?: string[];
  productIds?: string[];
}

// ── Promoción ─────────────────────────────────────────────────────────────────
export interface Promotion {
  id: string;
  name: string;
  description?: string;
  type: DiscountType;
  value: number;
  currency: string;
  isActive: boolean;
  status: PromotionStatus;       // computado por el BE en cada respuesta
  stackable: boolean;
  couponRequired: boolean;       // false = auto-aplica · true = necesita código
  startsAt?: string;
  endsAt?: string;
  scope: PromotionScope;
  // ── campos de control de descuento (Modelo A) ─────────────────────────────
  minSubtotal?: number;          // mínimo subtotal de participantes
  minDiscountPct?: number;       // piso del descuento como % del subtotal
  maxDiscountPct?: number;       // techo del descuento como % del subtotal
  createdAt: string;
  updatedAt: string;
}

// ── Cupón (Modelo A: solo activador, la lógica vive en la Promo) ──────────────
export interface Coupon {
  id: string;
  code: string;                  // MAYÚSCULAS, único por tenant
  promotionId: string;           // requerido — apunta a la promo con la lógica
  isActive: boolean;
  startsAt?: string;             // puede estrechar las fechas de la promo
  endsAt?: string;
  usageLimit?: number;           // null = ilimitado (global)
  perCustomerLimit: number;      // default 1
  usedCount: number;
  createdAt: string;
  updatedAt: string;
  // Desnormalizado opcionalmente por el FE para mostrar en tabla
  promotion?: Pick<Promotion, 'id' | 'name' | 'type' | 'value' | 'currency' | 'status'>;
}

// ── Resultado del cálculo de descuento ────────────────────────────────────────
export interface CartItem {
  productId: string;
  categoryIds?: string[];
  categoryId?: string;
  price: number;
  qty: number;
}

export interface DiscountCalculation {
  participatingItems: CartItem[];
  subtotal: number;
  rawDiscount: number;
  discountAmount: number;
  currency: string;
}

export interface CouponValidationResult {
  valid: boolean;
  errorCode?: string;
  message?: string;
  coupon?: Coupon;
  promotion?: Promotion;
  calculation?: DiscountCalculation;
}

// ── Warnings al activar promo con conflictos ──────────────────────────────────
export interface PromotionWarning {
  promotionId: string;
  promotionName: string;
  conflictingProductIds: string[];
  conflictingCategoryIds: string[];
  message: string;
}
