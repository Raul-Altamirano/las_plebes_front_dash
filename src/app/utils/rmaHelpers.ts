import { type RMAItem, type RMAReplacementItem, type RMAMoney, type RMASettlement, type RMA } from '../types/rma';
import { type OrderItem } from '../types/order';

/**
 * Calcula la cantidad máxima devolvible de un OrderItem
 * considerando devoluciones previas completadas/aprobadas
 */
export function calculateMaxReturnableQty(
  orderItem: OrderItem,
  allRmas: RMA[],
  orderId: string,
  excludeRmaId?: string // Para excluir el RMA actual en modo edición
): number {
  // Cantidad ya devuelta en RMAs completados o aprobados
  const qtyAlreadyReturned = allRmas
    .filter(rma => 
      rma.orderId === orderId && 
      rma.id !== excludeRmaId &&
      (rma.status === 'COMPLETED' || rma.status === 'APPROVED')
    )
    .reduce((total, rma) => {
      const returnedForThisItem = rma.returnItems
        .filter(item => item.originalOrderItemId === orderItem.id)
        .reduce((sum, item) => sum + item.qty, 0);
      return total + returnedForThisItem;
    }, 0);

  // Máxima cantidad devolvible = cantidad original - ya devuelta
  return Math.max(0, orderItem.qty - qtyAlreadyReturned);
}

/**
 * Obtiene información de retorno para cada item del pedido
 */
export interface OrderItemReturnInfo {
  orderItem: OrderItem;
  qtyPurchased: number;
  qtyAlreadyReturned: number;
  qtyAvailableToReturn: number;
  canReturn: boolean;
}

export function getOrderItemsReturnInfo(
  orderItems: OrderItem[],
  allRmas: RMA[],
  orderId: string,
  excludeRmaId?: string
): OrderItemReturnInfo[] {
  return orderItems.map(orderItem => {
    const maxQty = calculateMaxReturnableQty(orderItem, allRmas, orderId, excludeRmaId);
    const qtyAlreadyReturned = orderItem.qty - maxQty;
    
    return {
      orderItem,
      qtyPurchased: orderItem.qty,
      qtyAlreadyReturned,
      qtyAvailableToReturn: maxQty,
      canReturn: maxQty > 0,
    };
  });
}

/**
 * Calcula los totales monetarios de un RMA
 */
export function computeRmaMoney(
  returnItems: RMAItem[],
  replacementItems: RMAReplacementItem[]
): RMAMoney {
  // Subtotal de items devueltos
  const subtotalReturn = returnItems.reduce(
    (sum, item) => sum + item.qty * item.unitPriceAtSale,
    0
  );

  // Subtotal de items de reemplazo
  const subtotalReplacement = replacementItems.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0
  );

  // Diferencia (positivo = cliente debe pagar más, negativo = cliente recibe reembolso)
  const difference = subtotalReplacement - subtotalReturn;

  // Determinar tipo de liquidación
  let settlement: RMASettlement;
  if (difference > 0) {
    settlement = 'CHARGE_CUSTOMER';
  } else if (difference < 0) {
    settlement = 'REFUND_CUSTOMER';
  } else {
    settlement = 'EVEN';
  }

  return {
    subtotalReturn,
    subtotalReplacement,
    difference,
    settlement,
  };
}

/**
 * Formatea un número RMA
 */
export function formatRmaNumber(n: number): string {
  return `RMA-${String(n).padStart(6, '0')}`;
}

/**
 * Valida si un RMA puede ser completado
 */
export function canCompleteRma(
  replacementItems: RMAReplacementItem[],
  getProductStock: (productId: string, variantId?: string) => number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const item of replacementItems) {
    const availableStock = getProductStock(item.productId, item.variantId);
    if (availableStock < item.qty) {
      errors.push(
        `Stock insuficiente para ${item.nameSnapshot} (disponible: ${availableStock}, requerido: ${item.qty})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}