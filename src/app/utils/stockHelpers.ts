import { type Product } from '../types/product';

/**
 * Calcula si un producto está agotado (stock = 0) de forma derivada
 * No es un estado manual, se calcula en tiempo real basado en stock
 */
export function isOutOfStockDerived(product: Product): boolean {
  if (!product.hasVariants) {
    // Producto simple: revisar stock directo
    return product.stock <= 0;
  }

  // Producto con variantes: sumar stock de todas las variantes
  if (!product.variants || product.variants.length === 0) {
    return true; // Sin variantes configuradas = agotado
  }

  const totalStock = product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
  return totalStock <= 0;
}

/**
 * Obtiene el stock total de un producto (simple o con variantes)
 */
export function getTotalStock(product: Product): number {
  if (!product.hasVariants) {
    return product.stock;
  }

  if (!product.variants || product.variants.length === 0) {
    return 0;
  }

  return product.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
}

/**
 * Verifica si un producto tiene stock bajo (< 10)
 */
export function isLowStock(product: Product, threshold: number = 10): boolean {
  const totalStock = getTotalStock(product);
  return totalStock > 0 && totalStock < threshold;
}
