import { marketingFetch } from './marketing.client';
import type { Promotion, PromotionScope, PromotionWarning } from '../app/types/promotion';

export type CreatePromotionDto = {
  name: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  isActive?: boolean;
  stackable?: boolean;
  couponRequired?: boolean;      // false = auto · true = solo con código
  startsAt?: string;
  endsAt?: string;
  scope?: PromotionScope;
  // Control de descuento
  minSubtotal?: number;
  minDiscountPct?: number;
  maxDiscountPct?: number;
};

export interface CreatePromotionResult {
  promotion: Promotion;
  warnings?: PromotionWarning[];
}

// ── Mappers ───────────────────────────────────────────────────────────────────

/** BE → FE: convierte `appliesTo` → `scope`, `active` → `isActive` */
function mapPromotion(raw: any): Promotion {
  return {
    id:             raw.id,
    name:           raw.name ?? '',
    description:    raw.description ?? undefined,
    type:           raw.type,
    value:          raw.value,
    currency:       raw.currency ?? 'MXN',
    // BUG FIX: BE usa `active`, FE usa `isActive`
    isActive:       raw.isActive ?? raw.active ?? false,
    // BE computa `status` en cada respuesta; si no viene, se infiere localmente
    status:         raw.status ?? inferStatus(raw),
    stackable:      raw.stackable ?? false,
    couponRequired: raw.couponRequired ?? false,
    startsAt:       raw.startsAt ?? undefined,
    endsAt:         raw.endsAt ?? undefined,
    // BUG FIX: BE usa `appliesTo`, FE usa `scope`
    scope:          raw.appliesTo ?? raw.scope ?? { all: true },
    minSubtotal:    raw.minSubtotal ?? undefined,
    minDiscountPct: raw.minDiscountPct ?? undefined,
    maxDiscountPct: raw.maxDiscountPct ?? undefined,
    createdAt:      raw.createdAt,
    updatedAt:      raw.updatedAt,
  };
}

/** Inferencia local de status como fallback (el BE ya lo manda, pero por si acaso) */
function inferStatus(raw: any): Promotion['status'] {
  const now = new Date();
  if (raw.endsAt && now > new Date(raw.endsAt))    return 'EXPIRED';
  if (!raw.active && !raw.isActive)                 return 'INACTIVE';
  if (raw.startsAt && now < new Date(raw.startsAt)) return 'SCHEDULED';
  return 'ACTIVE';
}

/** FE → BE: convierte `scope` → `appliesTo`, `isActive` → `active` */
function mapDtoToApi(dto: CreatePromotionDto): Record<string, any> {
  const { scope, isActive, ...rest } = dto;
  return {
    ...rest,
    active:     isActive ?? true,
    appliesTo:  scope ? {
      all:         scope.all,
      productIds:  scope.productIds  ?? [],
      categoryIds: scope.categoryIds ?? [],
    } : undefined,
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

export const promotionsApi = {
  list: async (): Promise<Promotion[]> => {
    const res = await marketingFetch<any>('/promotions');
    const items = res?.items ?? (Array.isArray(res) ? res : []);
    return items.map(mapPromotion);
  },

  get: async (id: string): Promise<Promotion> => {
    const res = await marketingFetch<any>(`/promotions/${id}`);
    const raw = res?.data ?? res;
    return mapPromotion(raw);
  },

  create: async (dto: CreatePromotionDto): Promise<CreatePromotionResult> => {
    const res = await marketingFetch<any>('/promotions', {
      method: 'POST',
      body: JSON.stringify(mapDtoToApi(dto)),
    });
    const raw = res?.data ?? res;
    return {
      promotion: mapPromotion(raw),
      warnings:  raw.warnings ?? res?.warnings ?? undefined,
    };
  },

  update: async (id: string, dto: Partial<CreatePromotionDto>): Promise<CreatePromotionResult> => {
    const res = await marketingFetch<any>(`/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(mapDtoToApi(dto as CreatePromotionDto)),
    });
    const raw = res?.data ?? res;
    return {
      promotion: mapPromotion(raw),
      warnings:  raw.warnings ?? res?.warnings ?? undefined,
    };
  },

  /** BUG FIX: BE espera `active` no `isActive` */
  toggle: async (id: string, isActive: boolean): Promise<Promotion> => {
    const res = await marketingFetch<any>(`/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ active: isActive }),
    });
    return mapPromotion(res?.data ?? res);
  },

  remove: (id: string): Promise<void> =>
    marketingFetch(`/promotions/${id}`, { method: 'DELETE' }),
};
