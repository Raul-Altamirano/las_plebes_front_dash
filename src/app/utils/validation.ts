import type { Product, ProductStatus } from '../types/product';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateProductDraft(product: Partial<Product>, allProducts: Product[], currentId?: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Name required
  if (!product.name || product.name.trim() === '') {
    errors.push({ field: 'name', message: 'El nombre del producto es requerido' });
  }

  // SKU required and unique (solo si no tiene variantes)
  if (!product.hasVariants) {
    if (!product.sku || product.sku.trim() === '') {
      errors.push({ field: 'sku', message: 'El SKU es requerido' });
    } else {
      const isDuplicate = allProducts.some(
        p => p.sku.toLowerCase() === product.sku!.toLowerCase() && p.id !== currentId
      );
      if (isDuplicate) {
        errors.push({ field: 'sku', message: 'Este SKU ya está en uso' });
      }
    }
  }

  // Category required
  if (!product.categoryId) {
    errors.push({ field: 'categoryId', message: 'La categoría es requerida' });
  }

  // Validaciones de variantes
  if (product.hasVariants) {
    if (!product.variants || product.variants.length === 0) {
      errors.push({ field: 'variants', message: 'Debes agregar al menos una variante' });
    } else {
      // Validar cada variante
      product.variants.forEach((variant, index) => {
        // SKU requerido y único
        if (!variant.sku || variant.sku.trim() === '') {
          errors.push({ 
            field: `variant-${index}-sku`, 
            message: `Variante ${index + 1}: SKU requerido` 
          });
        } else {
          // Verificar unicidad global (contra otros productos y sus variantes)
          const skuInUse = allProducts.some(p => {
            if (p.id === currentId) return false;
            if (p.sku.toLowerCase() === variant.sku.toLowerCase()) return true;
            return p.variants?.some(v => v.sku.toLowerCase() === variant.sku.toLowerCase());
          });
          
          if (skuInUse) {
            errors.push({ 
              field: `variant-${index}-sku`, 
              message: `Variante ${index + 1}: SKU ya está en uso` 
            });
          }
        }

        // Al menos una opción (talla o color)
        if (!variant.options.size && !variant.options.color) {
          warnings.push({ 
            field: `variant-${index}-options`, 
            message: `Variante ${index + 1}: Debe tener al menos talla o color` 
          });
        }

        // Stock >= 0
        if (variant.stock < 0) {
          errors.push({ 
            field: `variant-${index}-stock`, 
            message: `Variante ${index + 1}: Stock no puede ser negativo` 
          });
        }
      });
    }
  } else {
    // Stock must be >= 0 para productos sin variantes
    if (product.stock !== undefined && product.stock < 0) {
      errors.push({ field: 'stock', message: 'El stock no puede ser negativo' });
    }
  }

  // Price warning for draft
  if (product.status === 'DRAFT' && (!product.price || product.price === 0)) {
    warnings.push({ field: 'price', message: 'Considera agregar un precio antes de activar el producto' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateProductActive(product: Partial<Product>, allProducts: Product[], currentId?: string): ValidationResult {
  // First validate draft requirements
  const draftValidation = validateProductDraft(product, allProducts, currentId);
  const errors = [...draftValidation.errors];
  const warnings: ValidationError[] = [];

  // Price required and > 0 for ACTIVE
  if (product.status === 'ACTIVE') {
    // Validar precio efectivo (producto o variantes)
    if (product.hasVariants) {
      // Debe existir precio en el producto o en todas las variantes
      const hasProductPrice = product.price && product.price > 0;
      const allVariantsHavePrice = product.variants?.every(v => 
        (v.price && v.price > 0) || hasProductPrice
      );
      
      if (!hasProductPrice && !allVariantsHavePrice) {
        errors.push({ 
          field: 'price', 
          message: 'Debe existir un precio en el producto o en todas las variantes' 
        });
      }
    } else {
      if (!product.price || product.price <= 0) {
        errors.push({ field: 'price', message: 'El precio debe ser mayor a 0 para productos activos' });
      }
    }

    // At least one image required for ACTIVE (producto o variantes)
    const hasProductImages = product.images && product.images.length > 0;
    const hasVariantImages = product.variants?.some(v => v.imageUrl);
    
    if (!hasProductImages && !hasVariantImages) {
      errors.push({ 
        field: 'images', 
        message: 'Debes agregar al menos una imagen en el producto o en las variantes' 
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}