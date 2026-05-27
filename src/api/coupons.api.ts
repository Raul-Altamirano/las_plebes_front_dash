import { marketingFetch } from './marketing.client';
import type { Coupon, CartItem, CouponValidationResult } from '../app/types/promotion';

// ── DTOs ──────────────────────────────────────────────────────────────────────

/** Modelo A: el cupón ya no tiene type/value propios, apunta a una promoción */
export type CreateCouponDto = {
  code: string;
  promotionId: string;           // requerido — toda la lógica vive en la promo
  isActive?: boolean;
  startsAt?: string;             // opcional: estrecha las fechas de la promo
  endsAt?: string;
  usageLimit?: number;           // null/undefined = ilimitado
  perCustomerLimit?: number;     // default 1
};

export interface RedeemCouponDto {
  code: string;
  customerId: string;
  cartItems: CartItem[];
  orderId?: string;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function mapCoupon(raw: any): Coupon {
  return {
    id:               raw.id,
    code:             raw.code,
    promotionId:      raw.promotionId ?? '',
    isActive:         raw.isActive ?? raw.active ?? false,
    startsAt:         raw.startsAt  ?? undefined,
    endsAt:           raw.endsAt    ?? undefined,
    usageLimit:       raw.usageLimit  ?? undefined,
    perCustomerLimit: raw.perCustomerLimit ?? 1,
    usedCount:        raw.usedCount ?? 0,
    createdAt:        raw.createdAt,
    updatedAt:        raw.updatedAt,
    // Opcional: datos desnormalizados de la promo (si el BE los incluye en el futuro)
    promotion:        raw.promotion ?? undefined,
  };
}

/** FE → BE: convierte `isActive` → `active` */
function mapDtoToApi(dto: CreateCouponDto): Record<string, any> {
  const { isActive, ...rest } = dto;
  return { ...rest, active: isActive ?? true };
}

// ── API ───────────────────────────────────────────────────────────────────────

export const couponsApi = {
  list: async (): Promise<Coupon[]> => {
    const res = await marketingFetch<{ items: any[] }>('/coupons');
    return (res?.items ?? []).map(mapCoupon);
  },

  get: async (id: string): Promise<Coupon> => {
    const res = await marketingFetch<any>(`/coupons/${id}`);
    return mapCoupon(res?.data ?? res);
  },

  create: async (dto: CreateCouponDto): Promise<Coupon> => {
    const res = await marketingFetch<any>('/coupons', {
      method: 'POST',
      body: JSON.stringify(mapDtoToApi(dto)),
    });
    return mapCoupon(res?.data ?? res);
  },

  update: async (id: string, dto: Partial<CreateCouponDto>): Promise<Coupon> => {
    const res = await marketingFetch<any>(`/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(mapDtoToApi(dto as CreateCouponDto)),
    });
    return mapCoupon(res?.data ?? res);
  },

  remove: (id: string): Promise<void> =>
    marketingFetch(`/coupons/${id}`, { method: 'DELETE' }),

  /**
   * validate — valida y calcula el descuento SIN redimir.
   * Llamar al escribir el código en el carrito.
   */
  validate: async (code: string, customerId: string, cartItems: CartItem[]): Promise<CouponValidationResult> => {
    const res = await marketingFetch<any>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, customerId, cartItems }),
    });
    return res?.data ?? res;
  },

  /**
   * redeem — redime el cupón y registra el uso.
   * Solo llamar al CONFIRMAR la orden, no al escribir el código.
   */
  redeem: async (dto: RedeemCouponDto): Promise<CouponValidationResult> => {
    const res = await marketingFetch<any>('/coupons/redeem', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res?.data ?? res;
  },
};
