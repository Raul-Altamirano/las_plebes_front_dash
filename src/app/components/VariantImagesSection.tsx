// src/app/components/VariantImagesSection.tsx
import { ImageIcon } from 'lucide-react';
import type { ProductImage, ProductVariant, ColorGroup } from '../types/product';
import { VariantImagePicker } from './VariantImagePicker';

interface VariantImagesSectionProps {
  hasVariants:            boolean;
  variants:               ProductVariant[];
  productImages:          ProductImage[];
  colorGroups?:           ColorGroup[];
  onVariantImagesChange:  (variantId: string, images: ProductImage[]) => void;
  onVariantUploadRef?:    (variantId: string, ref: () => Promise<ProductImage[] | null>) => void;
  productId?:             string;
  categoryId?:            string;
  sku?:                   string;
}

export function VariantImagesSection({
  hasVariants,
  variants,
  productImages,
  colorGroups = [],
  onVariantImagesChange,
  onVariantUploadRef,
  productId,
  categoryId,
  sku,
}: VariantImagesSectionProps) {

  if (!hasVariants || !variants || variants.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">Imágenes por color</h3>
            <p className="text-sm text-gray-500">
              Activa variantes para asignar imágenes por color. Todas las tallas del mismo color comparten las mismas fotos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Agrupar variantes por colorId ────────────────────────────────────────
  const colorMap = new Map<string, { variants: ProductVariant[]; colorId: string; colorName: string; colorHex: string; colorNumber: string }>();

  variants.forEach((v) => {
    const key = v.colorId || 'sin-color';
    if (!colorMap.has(key)) {
      colorMap.set(key, {
        colorId:     v.colorId    || 'sin-color',
        colorName:   v.color      || 'Sin color',
        colorHex:    v.colorHex   || '#999',
        colorNumber: (v as any).colorNumber || '01',
        variants:    [],
      });
    }
    colorMap.get(key)!.variants.push(v);
  });

  // ─── Cuando cambian imágenes de un color → actualizar TODAS sus variantes ─
  const handleColorImagesChange = (colorRepId: string, images: ProductImage[]) => {
    // colorRepId = "color-rep-{colorId}"
    const colorId = colorRepId.replace('color-rep-', '');
    const group   = colorMap.get(colorId);
    if (!group) return;

    console.log(
      `[VariantImagesSection] color=${group.colorName} images=${images.length} → aplicando a ${group.variants.length} variante(s)`
    );

    // Aplicar las mismas imágenes a TODAS las variantes del color
    group.variants.forEach((v) => {
      onVariantImagesChange(v.id, images);
    });
  };

  // ─── Registrar uploadRef del color → registrar para todas sus variantes ───
  const handleColorUploadRef = (
    colorRepId: string,
    ref: () => Promise<ProductImage[] | null>
  ) => {
    const colorId = colorRepId.replace('color-rep-', '');
    const group   = colorMap.get(colorId);
    if (!group || !onVariantUploadRef) return;
    group.variants.forEach((v) => onVariantUploadRef(v.id, ref));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900 mb-1">Imágenes por color</h3>
        <p className="text-sm text-gray-500">
          Las fotos de cada color aplican a todas sus tallas automáticamente.
        </p>
      </div>

      <div className="space-y-3">
        {Array.from(colorMap.values()).map((group) => {
          // Representante del grupo — toma las imágenes del primer variant del color
          const sharedImages = group.variants[0]?.images ?? [];

          // Variante "representante" para el picker — id especial por color
          const representative: ProductVariant = {
            id:        `color-rep-${group.colorId}`,
            sku:       group.variants[0]?.sku ?? '',
            color:     group.colorName,
            colorId:   group.colorId,
            colorHex:  group.colorHex,
            images:    sharedImages,
            stock:     0,
            updatedAt: new Date().toISOString(),
          };

          // SKU de variante para el path en R2: "arena-01"
          const colorSlug    = group.colorName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
          const colorVariantSku = `${colorSlug}-${group.colorNumber}`;

          return (
            <div key={group.colorId}>
              {/* Header del grupo */}
              <div className="flex items-center gap-2 mb-1 px-1">
                <div
                  className="w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: group.colorHex }}
                />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  {group.colorName}
                </span>
                <span className="text-xs text-gray-400">
                  #{group.colorNumber} · {group.variants.length} talla(s):{' '}
                  {group.variants.map((v) => v.size).join(', ')}
                </span>
              </div>

              <VariantImagePicker
                variant={representative}
                productImages={productImages}
                onChange={handleColorImagesChange}
                onUploadRef={handleColorUploadRef}
                productId={productId}
                categoryId={categoryId}
                sku={sku}
                variantSku={colorVariantSku}   // "arena-01" → R2 path
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}