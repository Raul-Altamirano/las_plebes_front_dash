// Helper utilities for cost and margin calculations

import { Product, ProductVariant } from '../types/product';
import { OrderItem } from '../types/order';

/**
 * Calcula el costo efectivo de un producto o variante
 * Regla: variant.cost ?? product.cost ?? null
 */
export function getEffectiveCost(product: Product, variant?: ProductVariant): number | null {
  // Si el producto no trackea costo, retornar null
  if (product.trackCost === false) {
    return null;
  }

  // Si hay variante y tiene costo, usar ese
  if (variant?.cost !== undefined && variant.cost !== null) {
    return variant.cost;
  }

  // Sino, usar el costo del producto
  if (product.cost !== undefined && product.cost !== null) {
    return product.cost;
  }

  // No hay costo disponible
  return null;
}

/**
 * Calcula ganancia unitaria
 * @param price - Precio de venta
 * @param cost - Costo unitario
 * @returns ganancia (price - cost) o null si no hay costo
 */
export function calculateUnitProfit(price: number, cost: number | null): number | null {
  if (cost === null || cost === undefined) return null;
  return price - cost;
}

/**
 * Calcula margen porcentual
 * @param profit - Ganancia
 * @param price - Precio de venta
 * @returns margen % (profit / price * 100) o null
 */
export function calculateMarginPercent(profit: number | null, price: number): number | null {
  if (profit === null || price === 0) return null;
  return (profit / price) * 100;
}

/**
 * Calcula todos los datos de costo para una línea de pedido
 */
export function calculateLineCostData(
  unitPrice: number,
  qty: number,
  unitCost: number | null
): {
  lineCostTotal: number | null;
  lineProfit: number | null;
  lineMarginPct: number | null;
} {
  if (unitCost === null) {
    return {
      lineCostTotal: null,
      lineProfit: null,
      lineMarginPct: null,
    };
  }

  const lineTotal = unitPrice * qty;
  const lineCostTotal = unitCost * qty;
  const lineProfit = lineTotal - lineCostTotal;
  const lineMarginPct = lineTotal > 0 ? (lineProfit / lineTotal) * 100 : null;

  return {
    lineCostTotal,
    lineProfit,
    lineMarginPct,
  };
}

/**
 * Calcula totales de costo y ganancia para un pedido completo
 */
export function calculateOrderCostTotals(items: OrderItem[]): {
  totalCost: number;
  totalProfit: number;
  avgMarginPct: number | null;
  itemsWithCost: number;
  itemsWithoutCost: number;
} {
  let totalCost = 0;
  let totalRevenue = 0;
  let itemsWithCost = 0;
  let itemsWithoutCost = 0;

  items.forEach((item) => {
    if (item.lineCostTotal !== null && item.lineCostTotal !== undefined) {
      totalCost += item.lineCostTotal;
      totalRevenue += item.lineTotal;
      itemsWithCost++;
    } else {
      itemsWithoutCost++;
    }
  });

  const totalProfit = totalRevenue - totalCost;
  const avgMarginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : null;

  return {
    totalCost,
    totalProfit,
    avgMarginPct,
    itemsWithCost,
    itemsWithoutCost,
  };
}

/**
 * Formatea un número como moneda
 */
export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

/**
 * Formatea un porcentaje
 */
export function formatPercent(percent: number | null, decimals = 1): string {
  if (percent === null || percent === undefined) return '—';
  return `${percent.toFixed(decimals)}%`;
}

/**
 * Verifica si un precio está por debajo del costo (warning flag)
 */
export function isBelowCost(price: number, cost: number | null): boolean {
  if (cost === null) return false;
  return price < cost;
}