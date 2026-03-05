import { AlertCircle, ImageIcon } from 'lucide-react';
import type { ProductImage, ProductVariant } from '../types/product';
import { VariantImagePicker } from './VariantImagePicker';

interface VariantImagesSectionProps {
  hasVariants: boolean;
  variants: ProductVariant[];
  productImages: ProductImage[];
  onVariantImagesChange: (variantId: string, images: ProductImage[]) => void;
    onVariantUploadRef?: (variantId: string, ref: () => Promise<ProductImage[] | null>) => void;

  productId?: string;
}

export function VariantImagesSection({ 
  hasVariants, 
  variants, 
  productImages,
  onVariantImagesChange,
    onVariantUploadRef,
  productId 
}: VariantImagesSectionProps) {
  // Si no tiene variantes, mostrar mensaje
  if (!hasVariants || !variants || variants.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              Imágenes por variante
            </h3>
            <p className="text-sm text-gray-500">
              Activa variantes para asignar imágenes específicas por talla/color.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Las variantes te permiten tener diferentes imágenes para cada combinación de color y talla.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Agrupar variantes por color (si existe)
  const variantsByColor = variants.reduce((acc, variant) => {
    const color = variant.color || 'Sin color';
    if (!acc[color]) {
      acc[color] = [];
    }
    acc[color].push(variant);
    return acc;
  }, {} as Record<string, ProductVariant[]>);

  const hasMultipleColors = Object.keys(variantsByColor).length > 1;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900 mb-1">
          Imágenes por variante
        </h3>
        <p className="text-sm text-gray-500">
          Asigna imágenes específicas para cada variante. Si no asignas imágenes, se usarán las del producto como fallback.
        </p>
      </div>

      {/* Warning si no hay imágenes del producto */}
      {productImages.length === 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-yellow-800">
              <strong>Recomendación:</strong> Sube primero las imágenes generales del producto. 
              Luego podrás copiarlas a las variantes y personalizarlas.
            </p>
          </div>
        </div>
      )}

      {/* Variantes agrupadas por color (si hay múltiples colores) */}
      {hasMultipleColors ? (
        <div className="space-y-6">
          {Object.entries(variantsByColor).map(([color, colorVariants]) => (
            <div key={color}>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3 px-1">
                {color}
              </h4>
              <div className="space-y-3">
                {colorVariants.map((variant) => (
                  <VariantImagePicker
                    key={variant.id}
                    variant={variant}
                    productImages={productImages}
                    onChange={onVariantImagesChange}
                    productId={productId}
                      onUploadRef={onVariantUploadRef}  // ← agrega esta línea

                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Sin agrupar si solo hay un color o ninguno
        <div className="space-y-3">
          {variants.map((variant) => (
            <VariantImagePicker
              key={variant.id}
              variant={variant}
              productImages={productImages}
              onChange={onVariantImagesChange}
              productId={productId}
                onUploadRef={onVariantUploadRef}  // ← agrega esta línea

            />
          ))}
        </div>
      )}
    </div>
  );
}
