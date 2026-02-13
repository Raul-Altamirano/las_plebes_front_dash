// Order module types

export type OrderStatus = 'DRAFT' | 'PLACED' | 'PAID' | 'FULFILLED' | 'CANCELLED' | 'REFUNDED' | 'HOLD_REVIEW';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD_LINK' | 'OTHER';

export type SalesChannel = 'OFFLINE' | 'ONLINE' | 'WHATSAPP' | 'INSTAGRAM';

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  nameSnapshot: string;
  skuSnapshot: string;
  optionsSnapshot?: { size?: string; color?: string };
  unitPrice: number;
  qty: number;
  lineTotal: number;
  // Costos y ganancia (snapshots al momento de venta)
  unitCost?: number; // Snapshot del costo unitario efectivo
  lineCostTotal?: number; // unitCost * qty
  lineProfit?: number; // lineTotal - lineCostTotal
  lineMarginPct?: number; // (lineProfit / lineTotal) * 100
}

export interface CustomerSnapshot {
  name: string;
  phone?: string;
  email?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  channel: SalesChannel;
  paymentMethod: PaymentMethod;
  paymentRef?: string;
  customerId?: string;  // Referencia al cliente en directorio
  customer: CustomerSnapshot;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  notes?: string;
  deliveryZip?: string; // Added for coverage integration
  createdAt: string;
  updatedAt: string;
}

// Status labels
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Borrador',
  PLACED: 'Confirmado',
  PAID: 'Pagado',
  FULFILLED: 'Entregado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
  HOLD_REVIEW: 'En revisión',
};

// Status colors for badges
export const ORDER_STATUS_COLORS: Record<OrderStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  DRAFT: 'gray',
  PLACED: 'blue',
  PAID: 'green',
  FULFILLED: 'green',
  CANCELLED: 'red',
  REFUNDED: 'yellow',
  HOLD_REVIEW: 'yellow',
};

// Payment method labels
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD_LINK: 'Link de Pago',
  OTHER: 'Otro',
};

// Sales channel labels
export const SALES_CHANNEL_LABELS: Record<SalesChannel, string> = {
  OFFLINE: 'Tienda física',
  ONLINE: 'Tienda online',
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
};

// Configuration: when to decrement inventory
export const INVENTORY_DECREMENT_ON: OrderStatus = 'PLACED';