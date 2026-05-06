// src/app/services/ordersApi.ts
import { createApiClient } from '../../api/http';

const BASE_URL =
  (import.meta.env.VITE_ORDERS_API_BASE_URL as string | undefined) ??
  'https://8q4cr0oale.execute-api.us-east-1.amazonaws.com';

const apiFetch = createApiClient(BASE_URL);

const BASE = '/api/v1/orders';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'DRAFT'
  | 'HOLD_REVIEW'
  | 'PENDING_CONTACT'
  | 'PLACED'
  | 'PAID'
  | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FULFILLED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'CASH'
  | 'TRANSFER'
  | 'CARD_LINK'
  | 'CARD_TERMINAL'
  | 'OTHER';

export type OrderChannel = 'ONLINE' | 'MANUAL';

export interface OrderItemDTO {
  productId?: string;
  variantId?: string;
  skuSnapshot?: string;
  nameSnapshot: string;
  color?: string;
  size?: string;
  qty: number;
  unitPrice: number;
  unitCost?: number;
  optionsSnapshot?: Record<string, string>;
  lineTotal?: number;
}

export interface OrderCustomer {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface OrderShippingAddress {
  cp: string;
  city?: string;
  state?: string;
  line1?: string;
  reference?: string;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  tenantId: string;
  status: OrderStatus;
  channel: OrderChannel;
  paymentMethod: PaymentMethod;
  customer: OrderCustomer;
  shippingAddress?: OrderShippingAddress;
  items: OrderItemDTO[];
  subtotal: number;
  discountTotal?: number;
  shipping: number;
  total: number;
  pdfUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderBody {
  customer: OrderCustomer;
  items: OrderItemDTO[];
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  channel?: OrderChannel;
  shippingAddress?: OrderShippingAddress;
  discountTotal?: number;
  shipping?: number;
  notes?: string;
}

export interface ListOrdersParams {
  search?: string;
  status?: OrderStatus;
  channel?: OrderChannel;
  paymentMethod?: PaymentMethod;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface ListOrdersResponse {
  data: OrderDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const ordersApi = {
  /**
   * GET /api/v1/orders
   * Listado con filtros y paginación
   */
  async list(params: ListOrdersParams = {}): Promise<ListOrdersResponse> {
    const qs = new URLSearchParams();
    if (params.search)        qs.set('search', params.search);
    if (params.status)        qs.set('status', params.status);
    if (params.channel)       qs.set('channel', params.channel);
    if (params.paymentMethod) qs.set('paymentMethod', params.paymentMethod);
    if (params.fromDate)      qs.set('fromDate', params.fromDate);
    if (params.toDate)        qs.set('toDate', params.toDate);
    if (params.page != null)  qs.set('page', String(params.page));
    if (params.limit != null) qs.set('limit', String(params.limit));

    const path = qs.toString() ? `${BASE}?${qs}` : BASE;
    return apiFetch<ListOrdersResponse>(path, { label: 'orders.list' });
  },

  /**
   * GET /api/v1/orders/:id
   * Acepta _id de MongoDB o orderNumber (LP-2026-XXXXXX)
   */
async getById(id: string): Promise<OrderDTO> {
  const res = await apiFetch<{ data: OrderDTO }>(`${BASE}/${id}`, { label: 'orders.getById' });
  return res.data;
},

  /**
   * POST /api/v1/orders
   * Crear orden manual desde el dash
   */
async create(body: CreateOrderBody): Promise<OrderDTO> {
  const res = await apiFetch<{ data: OrderDTO }>(BASE, {
    method: 'POST',
    body: JSON.stringify(body),
    label: 'orders.create',
  });
  return res.data;
},

  /**
   * PATCH /api/v1/orders/:id/status
   */
async updateStatus(id: string, status: OrderStatus): Promise<OrderDTO> {
  const res = await apiFetch<{ data: OrderDTO }>(`${BASE}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    label: 'orders.updateStatus',
  });
  return res.data;
},

  /**
   * POST /api/v1/orders/:id/approve-review
   * HOLD_REVIEW → PLACED
   */
async approveReview(id: string): Promise<OrderDTO> {
  const res = await apiFetch<{ data: OrderDTO }>(`${BASE}/${id}/approve-review`, {
    method: 'POST',
    body: JSON.stringify({}),
    label: 'orders.approveReview',
  });
  return res.data;
},

  /**
   * POST /api/v1/orders/:id/reject-review
   * HOLD_REVIEW → CANCELLED
   */
async rejectReview(id: string): Promise<OrderDTO> {
  const res = await apiFetch<{ data: OrderDTO }>(`${BASE}/${id}/reject-review`, {
    method: 'POST',
    body: JSON.stringify({}),
    label: 'orders.rejectReview',
  });
  return res.data;
},
};