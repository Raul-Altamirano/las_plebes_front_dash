import type { Product, ProductStatus } from "../types/product";
import { buildSkuRegex, buildSkuPlaceholder } from "../config/skuConfig";
import { SKU_CONFIG } from "../config/skuConfig";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateProductDraft(
  product: Partial<Product>,
  allProducts: Product[],
  currentId?: string,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Name required
  if (!product.name || product.name.trim() === "") {
    errors.push({
      field: "name",
      message: "El nombre del producto es requerido",
    });
  }

  // Category required
  if (!product.categoryId) {
    errors.push({ field: "categoryId", message: "La categoría es requerida" });
  }

  // Validaciones de variantes
  // Validaciones de variantes
  if (product.hasVariants) {
    if (!product.variants || product.variants.length === 0) {
      errors.push({
        field: "variants",
        message: "Debes agregar al menos una variante",
      });
    } else {
      (product.variants ?? []).forEach((variant, index) => {
        // SKU requerido
        if (!variant.sku || variant.sku.trim() === "") {
          errors.push({
            field: `variant-${index}-sku`,
            message: `Variante ${index + 1}: SKU requerido`,
          });
        } else {
          const skuInUse = allProducts.some((p) => {
            if (p.id === currentId) return false;
            if (p.sku?.toLowerCase() === variant.sku?.toLowerCase())
              return true;
            return p.variants?.some(
              (v) => v.sku?.toLowerCase() === variant.sku?.toLowerCase(),
            );
          });
          if (skuInUse) {
            errors.push({
              field: `variant-${index}-sku`,
              message: `Variante ${index + 1}: SKU ya está en uso`,
            });
          }
        }

        // Al menos talla o color — ERROR no warning
        if (!variant.size && !variant.color) {
          errors.push({
            // ← errors no warnings
            field: `variant-${index}-options`,
            message: `Variante ${index + 1}: Debe tener al menos talla o color`,
          });
        }

        const normalizedSize = (variant.size ?? "").trim();
        const normalizedColorId = (variant.colorId ?? "").trim();

        if (normalizedSize && normalizedColorId) {
          const duplicateIndex = (product.variants ?? []).findIndex(
            (other, otherIndex) => {
              if (otherIndex === index) return false;

              const otherSize = (other.size ?? "").trim();
              const otherColorId = (other.colorId ?? "").trim();

              return (
                otherSize === normalizedSize &&
                otherColorId === normalizedColorId
              );
            },
          );

          if (duplicateIndex !== -1) {
            errors.push({
              field: `variant-${index}-combination`,
              message: `Variante ${index + 1}: la combinación color + talla ya existe`,
            });
          }
        }

        // Stock >= 0
        if (variant.stock < 0) {
          errors.push({
            field: `variant-${index}-stock`,
            message: `Variante ${index + 1}: Stock no puede ser negativo`,
          });
        }
      });
    }
  } else {
    // Sin variantes — SKU del producto requerido
    if (!product.sku || product.sku.trim() === "") {
      errors.push({ field: "sku", message: "El SKU es requerido" });
    } else {
      const isDuplicate = allProducts.some(
        (p) =>
          p.sku?.toLowerCase() === product.sku!.toLowerCase() &&
          p.id !== currentId,
      );
      if (isDuplicate) {
        errors.push({ field: "sku", message: "Este SKU ya está en uso" });
      }
      // ← AGREGA AQUÍ:
      if (!buildSkuRegex().test(product.sku!)) {
        errors.push({
          field: "sku",
          message: `Formato inválido. Esperado: ${buildSkuPlaceholder()}`,
        });
      }
    }
    if (product.stock !== undefined && product.stock < 0) {
      errors.push({
        field: "stock",
        message: "El stock no puede ser negativo",
      });
    }
  }

  // Price warning for draft
  if (product.status === "DRAFT" && (!product.price || product.price === 0)) {
    warnings.push({
      field: "price",
      message: "Considera agregar un precio antes de activar el producto",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateProductActive(
  product: Partial<Product>,
  allProducts: Product[],
  currentId?: string,
): ValidationResult {
  // First validate draft requirements
  const draftValidation = validateProductDraft(product, allProducts, currentId);
  const errors = [...draftValidation.errors];
  const warnings: ValidationError[] = [];

  // Price required and > 0 for ACTIVE
  if (product.status === "ACTIVE") {
    // Validar precio efectivo (producto o variantes)
    if (product.hasVariants) {
      // Debe existir precio en el producto o en todas las variantes
      const hasProductPrice = product.price && product.price > 0;
      const allVariantsHavePrice = product.variants?.every(
        (v) => (v.price && v.price > 0) || hasProductPrice,
      );

      if (!hasProductPrice && !allVariantsHavePrice) {
        errors.push({
          field: "price",
          message:
            "Debe existir un precio en el producto o en todas las variantes",
        });
      }
    } else {
      if (!product.price || product.price <= 0) {
        errors.push({
          field: "price",
          message: "El precio debe ser mayor a 0 para productos activos",
        });
      }
    }

    // At least one image required for ACTIVE
    // Fuente principal: colorGroups
    // Fallbacks: product.images y variant.images (compatibilidad MVP)
    const hasColorGroupImages =
      product.colorGroups?.some((group) => (group.images?.length ?? 0) > 0) ??
      false;

    const hasProductImages = (product.images?.length ?? 0) > 0;

    const hasVariantImages =
      product.variants?.some((v) => (v.images?.length ?? 0) > 0) ?? false;

    if (!hasColorGroupImages && !hasProductImages && !hasVariantImages) {
      errors.push({
        field: "images",
        message: "Debes agregar al menos una imagen en algún grupo de color",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
