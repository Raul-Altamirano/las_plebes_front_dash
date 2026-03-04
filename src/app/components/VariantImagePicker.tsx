import { useState } from 'react';
import { Copy, Star, Trash2, Upload, ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import type { ProductImage, ProductVariant } from '../types/product';
import { ImagePickerV2 } from './ImagePickerV2';

interface VariantImagePickerProps {
  variant: ProductVariant;
  productImages: ProductImage[]; // Imágenes del producto padre (fallback)
  onChange: (variantId: string, images: ProductImage[]) => void;
  productId?: string;
}

export function VariantImagePicker({ 
  variant, 
  productImages, 
  onChange,
  productId 
}: VariantImagePickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const variantImages = variant.images || [];
  const hasOwnImages = variantImages.length > 0;
  const displayImages = hasOwnImages ? variantImages : productImages;

  const handleCopyFromProduct = () => {
    // Copiar imágenes del producto a la variante
    const copiedImages = productImages.map(img => ({
      ...img,
      id: `${variant.id}-${img.id}`, // Nuevo ID único para la variante
    }));
    onChange(variant.id, copiedImages);
  };

  const handleClearImages = () => {
    onChange(variant.id, []);
  };

  const handleImagesChange = (images: ProductImage[]) => {
    onChange(variant.id, images);
  };

  // Label de la variante
  const variantLabel = [
    variant.options.color && `Color: ${variant.options.color}`,
    variant.options.size && `Talla: ${variant.options.size}`,
    `SKU: ${variant.sku}`,
  ]
    .filter(Boolean)
    .join(' | ');

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header - Collapsible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {variantLabel}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {hasOwnImages ? (
              <span className="text-green-600 font-medium">
                {variantImages.length} imagen{variantImages.length !== 1 ? 'es' : ''} específica{variantImages.length !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-gray-500">
                0 imágenes (usando fallback del producto)
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Indicador visual */}
          {hasOwnImages && (
            <div className="w-10 h-10 rounded border-2 border-blue-500 overflow-hidden flex-shrink-0">
              <img 
                src={variantImages[0].url} 
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content - Expandible */}
      {isExpanded && (
        <div className="p-4 bg-white border-t border-gray-200">
          {/* Actions */}
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={handleCopyFromProduct}
              disabled={productImages.length === 0}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Copy className="w-4 h-4" />
              Copiar desde producto
            </button>
            
            {hasOwnImages && (
              <button
                type="button"
                onClick={handleClearImages}
                className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Limpiar imágenes
              </button>
            )}
          </div>

          {/* Image Picker */}
<ImagePickerV2
  images={variantImages}
  onChange={handleImagesChange}
  maxImages={6}
  productId={productId}
  variantSku={variant.sku}  // ← agrega
/>

          {/* Fallback Info */}
          {!hasOwnImages && productImages.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                ℹ️ Esta variante usa las {productImages.length} imágenes generales del producto. 
                Sube imágenes específicas o copia las del producto para personalizarlas.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
