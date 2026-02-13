import type { Product } from '../types/product';

/**
 * Calcula el stock total de un producto (considerando variantes si las tiene)
 */
export function calculateTotalStock(product: Product): number {
  if (product.hasVariants && product.variants && product.variants.length > 0) {
    return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  }
  return product.stock;
}

/**
 * Verifica si un producto está agotado (stock total = 0)
 */
export function isOutOfStock(product: Product): boolean {
  return calculateTotalStock(product) === 0;
}

/**
 * Obtiene el precio efectivo de un producto
 * Si tiene variantes, retorna el precio más bajo
 */
export function getEffectivePrice(product: Product): number {
  if (product.hasVariants && product.variants && product.variants.length > 0) {
    // Si tiene variantes, buscar el precio más bajo
    const variantPrices = product.variants
      .map(v => v.price ?? product.price)
      .filter(p => p > 0);
    
    if (variantPrices.length > 0) {
      return Math.min(...variantPrices);
    }
  }
  return product.price;
}

/**
 * Valida si un producto cumple los requisitos mínimos para ser publicado
 */
export interface PublishValidationResult {
  canPublish: boolean;
  reasons: string[];
}

export function validateProductForPublish(product: Partial<Product>): PublishValidationResult {
  const reasons: string[] = [];

  // 1. Debe tener nombre
  if (!product.name || product.name.trim() === '') {
    reasons.push('Falta el nombre del producto');
  }

  // 2. Debe tener SKU
  if (!product.sku || product.sku.trim() === '') {
    reasons.push('Falta el SKU del producto');
  }

  // 3. Debe tener categoría
  if (!product.categoryId) {
    reasons.push('Falta asignar una categoría');
  }

  // 4. Debe tener precio efectivo > 0
  if (product.hasVariants && product.variants && product.variants.length > 0) {
    // Si tiene variantes, validar que al menos una tenga precio válido
    const hasValidPrice = product.variants.some(v => {
      const variantPrice = v.price ?? product.price ?? 0;
      return variantPrice > 0;
    });
    
    if (!hasValidPrice) {
      reasons.push('Ninguna variante tiene un precio válido');
    }
  } else {
    // Si no tiene variantes, validar precio del producto
    if (!product.price || product.price <= 0) {
      reasons.push('El precio debe ser mayor a 0');
    }
  }

  // 5. Debe tener al menos 1 imagen (producto o variantes)
  const hasProductImages = product.images && product.images.length > 0;
  const hasVariantImages = product.hasVariants && 
    product.variants && 
    product.variants.some(v => v.imageUrl);

  if (!hasProductImages && !hasVariantImages) {
    reasons.push('Debe tener al menos una imagen');
  }

  return {
    canPublish: reasons.length === 0,
    reasons,
  };
}

/**
 * Obtiene el badge de estado operativo basado en el status
 */
export function getOperationalStatusLabel(status: Product['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'Publicado';
    case 'PAUSED':
      return 'Oculto';
    case 'DRAFT':
      return 'Borrador';
    case 'OUT_OF_STOCK':
      return 'Agotado'; // Este no debería usarse directamente, pero por compatibilidad
    default:
      return status;
  }
}

/**
 * Determina si se debe mostrar el badge "Agotado" (derivado)
 * Este badge es adicional al badge de estado operativo
 */
export function shouldShowOutOfStockBadge(product: Product): boolean {
  // Solo mostrar si el producto está publicado o oculto (pero no borrador)
  // Y si está efectivamente agotado
  return (product.status === 'ACTIVE' || product.status === 'PAUSED') && isOutOfStock(product);
}

/**
 * Retorna el label del botón de acción rápida según el estado
 */
export function getQuickActionLabel(product: Product): 'Publicar' | 'Ocultar' | null {
  if (product.status === 'ACTIVE') {
    return 'Ocultar';
  }
  if (product.status === 'PAUSED' || product.status === 'DRAFT') {
    return 'Publicar';
  }
  return null;
}

/**
 * Retorna el nuevo status al aplicar la acción rápida
 */
export function getTargetStatusForQuickAction(currentStatus: Product['status']): Product['status'] {
  if (currentStatus === 'ACTIVE') {
    return 'PAUSED';
  }
  // PAUSED o DRAFT -> ACTIVE
  return 'ACTIVE';
}