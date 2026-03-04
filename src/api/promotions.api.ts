import { marketingFetch } from './marketing.client';
import type { Promotion } from '../app/types/promotion';

export type CreatePromotionDto = {
  name: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
  stackable?: boolean;
  scope?: {
    all: boolean;
    categoryIds?: string[];
    productIds?: string[];
  };
};

/** Normaliza el shape del BE → shape interno de la app */
function mapPromotion(raw: any): Promotion {
  return {
    id:        raw.id,
    name:      raw.name ?? raw.description ?? '',
    type:      raw.type,
    value:     raw.value,
    isActive:  raw.isActive ?? raw.active ?? false,
    startsAt:  raw.startsAt ?? undefined,
    endsAt:    raw.endsAt ?? undefined,
    stackable: raw.stackable ?? false,
    scope:     raw.scope ?? { all: true },
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export const promotionsApi = {
  list: async (): Promise<Promotion[]> => {
    const res = await marketingFetch<any>('/promotions');
    const items = res?.items ?? (Array.isArray(res) ? res : []);
    return items.map(mapPromotion);
  },

  get: async (id: string): Promise<Promotion> => {
    const res = await marketingFetch<any>(`/promotions/${id}`);
    return mapPromotion(res);
  },

  create: async (dto: CreatePromotionDto): Promise<Promotion> => {
    const res = await marketingFetch<any>('/promotions', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return mapPromotion(res);
  },

  update: async (id: string, dto: Partial<CreatePromotionDto>): Promise<Promotion> => {
    const res = await marketingFetch<any>(`/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return mapPromotion(res);
  },

  toggle: async (id: string, isActive: boolean): Promise<Promotion> => {
    const res = await marketingFetch<any>(`/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
    return mapPromotion(res);
  },

  remove: (id: string): Promise<void> =>
    marketingFetch(`/promotions/${id}`, { method: 'DELETE' }),
};