import type { Product } from '../types/product';
import type { Promotion, Coupon, DiscountType, PromotionScope, PromotionStatus } from '../types/promotion';

/**
 * Verifica si una fecha está dentro del rango de validez
 */
export function isWithinDateRange(
  now: Date,
  startsAt?: string,
  endsAt?: string
): boolean {
  const nowTime = now.getTime();
  
  if (startsAt) {
    const startTime = new Date(startsAt).getTime();
    if (nowTime < startTime) return false;
  }
  
  if (endsAt) {
    const endTime = new Date(endsAt).getTime();
    if (nowTime > endTime) return false;
  }
  
  return true;
}

/**
 * Verifica si una promoción/cupón aplica a un producto específico
 */
export function appliesToProduct(scope: PromotionScope, product: Product): boolean {
  // Si aplica a todos los productos
  if (scope.all) return true;
  
  // Si aplica a categorías específicas
  if (scope.categoryIds && scope.categoryIds.length > 0) {
    if (product.categoryId && scope.categoryIds.includes(product.categoryId)) {
      return true;
    }
  }
  
  // Si aplica a productos específicos
  if (scope.productIds && scope.productIds.length > 0) {
    if (scope.productIds.includes(product.id)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calcula el precio con descuento aplicado
 */
export function computeDiscountedPrice(
  basePrice: number,
  discountType: DiscountType,
  value: number
): number {
  let discountedPrice = basePrice;
  
  if (discountType === 'PERCENT') {
    const discountAmount = (basePrice * value) / 100;
    discountedPrice = basePrice - discountAmount;
  } else if (discountType === 'FIXED') {
    discountedPrice = basePrice - value;
  }
  
  // Nunca bajar de 0
  return Math.max(0, discountedPrice);
}

/**
 * Calcula el precio efectivo de un producto considerando promociones activas
 * Para productos con variantes, usa variant.price ?? product.price
 */
export function getEffectivePrice(
  product: Product,
  promotions: Promotion[],
  now: Date = new Date()
): {
  basePrice: number;
  effectivePrice: number;
  discount: number;
  appliedPromotions: { id: string; name: string; type: DiscountType; value: number }[];
  hasDiscount: boolean;
} {
  const basePrice = product.price;
  
  // Filtrar promociones aplicables
  const applicablePromotions = promotions.filter(promo => {
    if (!promo.isActive) return false;
    if (!isWithinDateRange(now, promo.startsAt, promo.endsAt)) return false;
    if (!appliesToProduct(promo.scope, product)) return false;
    return true;
  });
  
  if (applicablePromotions.length === 0) {
    return {
      basePrice,
      effectivePrice: basePrice,
      discount: 0,
      appliedPromotions: [],
      hasDiscount: false
    };
  }
  
  // Ordenar por descuento (mayor a menor) para elegir la mejor
  const sortedPromotions = [...applicablePromotions].sort((a, b) => {
    const discountA = computeDiscountedPrice(basePrice, a.type, a.value);
    const discountB = computeDiscountedPrice(basePrice, b.type, b.value);
    return discountA - discountB; // Menor precio = mejor descuento
  });
  
  // Por simplicidad MVP: aplicar solo la mejor promoción
  // TODO: implementar stackable en V2
  const bestPromo = sortedPromotions[0];
  const effectivePrice = computeDiscountedPrice(basePrice, bestPromo.type, bestPromo.value);
  const discount = basePrice - effectivePrice;
  
  return {
    basePrice,
    effectivePrice,
    discount,
    appliedPromotions: [{
      id: bestPromo.id,
      name: bestPromo.name,
      type: bestPromo.type,
      value: bestPromo.value
    }],
    hasDiscount: discount > 0
  };
}

/**
 * Calcula el precio mínimo efectivo para productos con variantes
 */
export function getMinEffectivePrice(
  product: Product,
  promotions: Promotion[],
  now: Date = new Date()
): number {
  if (!product.hasVariants || !product.variants || product.variants.length === 0) {
    return getEffectivePrice(product, promotions, now).effectivePrice;
  }
  
  // Calcular precio efectivo para cada variante
  const variantPrices = product.variants.map(variant => {
    const variantPrice = variant.price ?? product.price;
    const variantProduct = { ...product, price: variantPrice };
    return getEffectivePrice(variantProduct, promotions, now).effectivePrice;
  });
  
  return Math.min(...variantPrices);
}

/**
 * Obtiene el estado de una promoción/cupón
 */
export function getPromotionStatus(
  isActive: boolean,
  startsAt?: string,
  endsAt?: string,
  now: Date = new Date()
): PromotionStatus {
  if (!isActive) return 'INACTIVE';
  
  if (startsAt) {
    const startTime = new Date(startsAt).getTime();
    if (now.getTime() < startTime) return 'SCHEDULED';
  }
  
  if (endsAt) {
    const endTime = new Date(endsAt).getTime();
    if (now.getTime() > endTime) return 'EXPIRED';
  }
  
  return 'ACTIVE';
}

/**
 * Valida el código de cupón
 */
export function validateCouponCode(code: string): { valid: boolean; error?: string } {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: 'El código es requerido' };
  }
  
  if (code.includes(' ')) {
    return { valid: false, error: 'El código no puede contener espacios' };
  }
  
  if (code.length < 3) {
    return { valid: false, error: 'El código debe tener al menos 3 caracteres' };
  }
  
  if (code.length > 20) {
    return { valid: false, error: 'El código no puede tener más de 20 caracteres' };
  }
  
  return { valid: true };
}

/**
 * Valida el valor del descuento
 */
export function validateDiscountValue(
  type: DiscountType,
  value: number
): { valid: boolean; error?: string } {
  if (type === 'PERCENT') {
    if (value < 1 || value > 90) {
      return { valid: false, error: 'El porcentaje debe estar entre 1 y 90' };
    }
  } else if (type === 'FIXED') {
    if (value <= 0) {
      return { valid: false, error: 'El monto debe ser mayor a 0' };
    }
  }
  
  return { valid: true };
}

/**
 * Valida las fechas de vigencia
 */
export function validateDateRange(
  startsAt?: string,
  endsAt?: string
): { valid: boolean; error?: string } {
  if (startsAt && endsAt) {
    const startTime = new Date(startsAt).getTime();
    const endTime = new Date(endsAt).getTime();
    
    if (endTime <= startTime) {
      return { valid: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio' };
    }
  }
  
  return { valid: true };
}