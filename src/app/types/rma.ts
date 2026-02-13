// RMA (Return Merchandise Authorization) module types

export type RMAType = "RETURN" | "EXCHANGE";
export type RMAStatus = "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED";
export type RMAReturnReason = "SIZE" | "DEFECT" | "NOT_LIKED" | "WRONG_ITEM" | "OTHER";
export type RMASettlement = "REFUND_CUSTOMER" | "CHARGE_CUSTOMER" | "EVEN";
export type RMAPaymentMethod = "CASH" | "TRANSFER" | "OTHER";

export interface RMAItem {
  id: string;
  originalOrderItemId?: string; // link si viene de un item del pedido
  skuSnapshot: string;
  nameSnapshot: string;
  optionsSnapshot?: { size?: string; color?: string };
  qty: number;
  unitPriceAtSale: number;      // del snapshot del pedido (no editable)
  unitCostAtSale?: number;      // si existe (COGS snapshot)
  productId?: string;           // para reponer inventario
  variantId?: string;
}

export interface RMAReplacementItem {
  id: string;
  productId: string;
  variantId?: string;
  skuSnapshot: string;
  nameSnapshot: string;
  optionsSnapshot?: { size?: string; color?: string };
  qty: number;
  unitPrice: number;            // precio del cambio (editable V1)
  unitCost?: number;            // opcional (si cost:read)
}

export interface RMAMoney {
  subtotalReturn: number;       // sum(return qty * unitPriceAtSale)
  subtotalReplacement: number;  // sum(replacement qty * unitPrice)
  difference: number;           // replacement - return
  settlement: RMASettlement;
  method?: RMAPaymentMethod;
  ref?: string;
}

export interface RMA {
  id: string;
  rmaNumber: string;            // RMA-000123
  type: RMAType;
  status: RMAStatus;
  orderId: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  reason?: RMAReturnReason;
  notes?: string;
  returnItems: RMAItem[];
  replacementItems: RMAReplacementItem[];
  money: RMAMoney;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;         // Cuando se aplicó el inventario
  cancelledAt?: string;
}

// Status labels
export const RMA_STATUS_LABELS: Record<RMAStatus, string> = {
  DRAFT: 'Borrador',
  APPROVED: 'Aprobado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

// Status colors for badges
export const RMA_STATUS_COLORS: Record<RMAStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red'> = {
  DRAFT: 'gray',
  APPROVED: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

// Type labels
export const RMA_TYPE_LABELS: Record<RMAType, string> = {
  RETURN: 'Devolución',
  EXCHANGE: 'Cambio',
};

// Reason labels
export const RMA_REASON_LABELS: Record<RMAReturnReason, string> = {
  SIZE: 'Talla incorrecta',
  DEFECT: 'Defecto o daño',
  NOT_LIKED: 'No le gustó',
  WRONG_ITEM: 'Artículo equivocado',
  OTHER: 'Otro',
};

// Settlement labels
export const RMA_SETTLEMENT_LABELS: Record<RMASettlement, string> = {
  REFUND_CUSTOMER: 'Reembolsar al cliente',
  CHARGE_CUSTOMER: 'Cobro adicional al cliente',
  EVEN: 'Sin diferencia',
};

// Payment method labels
export const RMA_PAYMENT_METHOD_LABELS: Record<RMAPaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

// Query params for RMA list
export interface RMAQueryParams {
  search?: string;          // RMA# o pedido#
  type?: RMAType;
  status?: RMAStatus;
  fromDate?: string;
  toDate?: string;
}
