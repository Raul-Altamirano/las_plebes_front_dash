import { marketingFetch } from './marketing.client';
import type { Coupon } from '../app/types/promotion';

export type CouponType = 'PERCENT' | 'FIXED' | 'FREESHIP';

export type CreateCouponDto = {
  code: string;
  type: CouponType;
  value: number;
  isActive?: boolean;
  usageLimit?: number;
  minSubtotal?: number;
  startsAt?: string;
  endsAt?: string;
  stackable?: boolean;
  scope?: {
    all: boolean;
    categoryIds?: string[];
    productIds?: string[];
  };
};

export interface RedeemCouponDto {
  code: string;
  customerId?: string;
  orderId?: string;
  subtotal?: number;
}

export interface RedeemCouponResponse {
  coupon: Coupon;
  discount: number;
  finalAmount: number;
}

/** Normaliza el shape del BE → shape interno de la app */
function mapCoupon(raw: any): Coupon {
  return {
    id:           raw.id,
    code:         raw.code,
    type:         raw.type,
    value:        raw.value,
    // BE devuelve `active`, la app usa `isActive`
    isActive:     raw.isActive ?? raw.active ?? false,
    // BE devuelve `usageLimit`, la app también usa `usageLimit`
    usageLimit:   raw.usageLimit ?? raw.maxUses ?? undefined,
    // BE devuelve `usedCount`, la app usa `usedCount`
    usedCount:    raw.usedCount ?? raw.usageCount ?? 0,
    // BE devuelve `minOrderAmount` o puede ser `minSubtotal`
    minSubtotal:  raw.minSubtotal ?? raw.minOrderAmount ?? undefined,
    startsAt:     raw.startsAt ?? undefined,
    endsAt:       raw.endsAt ?? undefined,
    stackable:    raw.stackable ?? false,
    // BE no devuelve scope todavía → default a "todos"
    scope:        raw.scope ?? { all: true },
    createdAt:    raw.createdAt,
    updatedAt:    raw.updatedAt,
  };
}

export const couponsApi = {
list: async (): Promise<Coupon[]> => {
  const res = await marketingFetch<{ items: any[] }>('/coupons');
  return (res?.items ?? []).map(mapCoupon);
},

get: async (id: string): Promise<Coupon> => {
  const res = await marketingFetch<any>(`/coupons/${id}`);
  return mapCoupon(res);
},

create: async (dto: CreateCouponDto): Promise<Coupon> => {
  const res = await marketingFetch<any>('/coupons', {
    method: 'POST', body: JSON.stringify(dto),
  });
  return mapCoupon(res);
},

  update: async (id: string, dto: Partial<CreateCouponDto>): Promise<Coupon> => {
    const raw = await marketingFetch(`/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return mapCoupon(raw?.data ?? raw);
  },

  remove: (id: string): Promise<void> =>
    marketingFetch(`/coupons/${id}`, { method: 'DELETE' }),

  redeem: async (dto: RedeemCouponDto): Promise<RedeemCouponResponse> => {
    const raw = await marketingFetch('/coupons/redeem', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return raw?.data ?? raw;
  },
};