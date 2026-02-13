import type { Promotion, Coupon } from '../types/promotion';

export const mockPromotions: Promotion[] = [
  {
    id: 'promo-1',
    name: 'Descuento de Bienvenida',
    type: 'PERCENT',
    value: 15,
    startsAt: '2026-02-01T00:00:00Z',
    endsAt: '2026-03-31T23:59:59Z',
    isActive: true,
    scope: {
      all: true,
    },
    stackable: false,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'promo-2',
    name: 'Botas en Oferta',
    type: 'PERCENT',
    value: 20,
    startsAt: '2026-02-01T00:00:00Z',
    endsAt: '2026-02-15T23:59:59Z',
    isActive: true,
    scope: {
      all: false,
      categoryIds: ['cat-1'], // Botas
    },
    stackable: false,
    createdAt: '2026-01-28T15:30:00Z',
    updatedAt: '2026-01-28T15:30:00Z',
  },
  {
    id: 'promo-3',
    name: 'Flash Sale Accesorios',
    type: 'FIXED',
    value: 10,
    startsAt: '2026-02-10T00:00:00Z',
    endsAt: '2026-02-12T23:59:59Z',
    isActive: false,
    scope: {
      all: false,
      categoryIds: ['cat-3'], // Accesorios
    },
    stackable: false,
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-02-05T09:00:00Z',
  },
];

export const mockCoupons: Coupon[] = [
  {
    id: 'coupon-1',
    code: 'VERANO2026',
    type: 'PERCENT',
    value: 25,
    minSubtotal: 100,
    startsAt: '2026-01-01T00:00:00Z',
    endsAt: '2026-06-30T23:59:59Z',
    usageLimit: 100,
    usedCount: 23,
    isActive: true,
    scope: {
      all: true,
    },
    stackable: false,
    createdAt: '2025-12-20T10:00:00Z',
    updatedAt: '2026-02-05T14:22:00Z',
  },
  {
    id: 'coupon-2',
    code: 'NUEVOCLIENTE',
    type: 'FIXED',
    value: 20,
    minSubtotal: 50,
    usageLimit: 500,
    usedCount: 142,
    isActive: true,
    scope: {
      all: true,
    },
    stackable: false,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-02-05T16:45:00Z',
  },
  {
    id: 'coupon-3',
    code: 'BOTAS50',
    type: 'FIXED',
    value: 50,
    minSubtotal: 200,
    startsAt: '2026-02-01T00:00:00Z',
    endsAt: '2026-02-28T23:59:59Z',
    isActive: true,
    scope: {
      all: false,
      categoryIds: ['cat-1'], // Solo Botas
    },
    stackable: false,
    createdAt: '2026-01-25T11:30:00Z',
    updatedAt: '2026-01-25T11:30:00Z',
  },
];
