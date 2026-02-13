import { useState } from 'react';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ProductVariant } from '../types/product';
import { useProductsStore } from '../store/ProductsContext';

interface VariantEditorProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  productSku?: string;
  productPrice?: number;
  productId?: string;
  disabled?: boolean;
  error?: string;
  // Callbacks adicionales para gestionar hasVariants
  hasVariants?: boolean;
  onToggleVariants?: (enabled: boolean) => void;
  onStockChange?: (totalStock: number) => void;
}

export function VariantEditor({ 
  variants, 
  onChange,
  productSku = '',
  productPrice = 0,
  productId,
  disabled = false,
  error,
  hasVariants = false,
  onToggleVariants,
  onStockChange
}: VariantEditorProps) {
  const { isSkuAvailable } = useProductsStore();
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorData, setGeneratorData] = useState({
    sizes: '',
    colors: ''
  });

  const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

  // Notificar cambio de stock total cuando cambian las variantes
  const handleVariantsChange = (newVariants: ProductVariant[]) => {
    onChange(newVariants);
    if (onStockChange && hasVariants) {
      const newTotalStock = newVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
      onStockChange(newTotalStock);
    }
  };

  const handleToggleVariants = (enabled: boolean) => {
    if (onToggleVariants) {
      onToggleVariants(enabled);
      if (!enabled) {
        // Limpiar variantes al desactivar
        onChange([]);
      }
    }
  };

  const addVariant = () => {
    const newVariant: ProductVariant = {
      id: Math.random().toString(36).substring(7),
      sku: `${productSku}-VAR-${variants.length + 1}`,
      options: {},
      stock: 0,
      updatedAt: new Date().toISOString()
    };
    handleVariantsChange([...variants, newVariant]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value, updatedAt: new Date().toISOString() };
    handleVariantsChange(updated);
  };

  const updateVariantOption = (index: number, option: 'size' | 'color', value: string) => {
    const updated = [...variants];
    updated[index] = {
      ...updated[index],
      options: { ...updated[index].options, [option]: value || undefined },
      updatedAt: new Date().toISOString()
    };
    handleVariantsChange(updated);
  };

  const removeVariant = (index: number) => {
    const updated = variants.filter((_, i) => i !== index);
    handleVariantsChange(updated);
  };

  const generateVariants = () => {
    const sizes = generatorData.sizes.split(',').map(s => s.trim()).filter(Boolean);
    const colors = generatorData.colors.split(',').map(c => c.trim()).filter(Boolean);

    if (sizes.length === 0 && colors.length === 0) {
      return;
    }

    const generated: ProductVariant[] = [];
    
    if (sizes.length > 0 && colors.length > 0) {
      // Combinación de tallas y colores
      sizes.forEach(size => {
        colors.forEach(color => {
          const sizeCode = size.replace(/\s+/g, '');
          const colorCode = color.substring(0, 3).toUpperCase();
          generated.push({
            id: Math.random().toString(36).substring(7),
            sku: `${productSku}-${sizeCode}-${colorCode}`,
            options: { size, color },
            stock: 0,
            updatedAt: new Date().toISOString()
          });
        });
      });
    } else if (sizes.length > 0) {
      // Solo tallas
      sizes.forEach(size => {
        const sizeCode = size.replace(/\s+/g, '');
        generated.push({
          id: Math.random().toString(36).substring(7),
          sku: `${productSku}-${sizeCode}`,
          options: { size },
          stock: 0,
          updatedAt: new Date().toISOString()
        });
      });
    } else {
      // Solo colores
      colors.forEach(color => {
        const colorCode = color.substring(0, 3).toUpperCase();
        generated.push({
          id: Math.random().toString(36).substring(7),
          sku: `${productSku}-${colorCode}`,
          options: { color },
          stock: 0,
          updatedAt: new Date().toISOString()
        });
      });
    }

    handleVariantsChange([...variants, ...generated]);
    setShowGenerator(false);
    setGeneratorData({ sizes: '', colors: '' });
  };

  const getVariantSkuError = (sku: string, currentIndex: number): string | null => {
    // Check duplicates within variants
    const duplicateInVariants = variants.some(
      (v, i) => i !== currentIndex && v.sku.toLowerCase() === sku.toLowerCase()
    );
    if (duplicateInVariants) {
      return 'SKU duplicado en variantes';
    }

    // Check global availability (excluding current product)
    if (!isSkuAvailable(sku, productId)) {
      return 'SKU ya existe en otro producto';
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onToggleVariants && (
            <Switch
              id="has-variants"
              checked={hasVariants}
              onCheckedChange={handleToggleVariants}
              disabled={disabled}
            />
          )}
          <div>
            <Label htmlFor="has-variants" className="cursor-pointer">
              Este producto tiene variantes
            </Label>
            {hasVariants && (
              <p className="text-sm text-gray-500">
                Stock total derivado: {totalStock} unidades
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {hasVariants && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowGenerator(!showGenerator)}
                disabled={disabled}
              >
                <Wand2 className="size-4 mr-2" />
                Generar variantes
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVariant}
                disabled={disabled}
              >
                <Plus className="size-4 mr-2" />
                Agregar variante
              </Button>
            </div>
          </div>

          {showGenerator && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-medium mb-3">Generador de variantes</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="gen-sizes">Tallas (separadas por coma)</Label>
                  <Input
                    id="gen-sizes"
                    placeholder="Ej: 25, 26, 27, 28"
                    value={generatorData.sizes}
                    onChange={(e) => setGeneratorData(prev => ({ ...prev, sizes: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">Opcional</p>
                </div>
                <div>
                  <Label htmlFor="gen-colors">Colores (separados por coma)</Label>
                  <Input
                    id="gen-colors"
                    placeholder="Ej: Negro, Café, Miel"
                    value={generatorData.colors}
                    onChange={(e) => setGeneratorData(prev => ({ ...prev, colors: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">Opcional</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={generateVariants}>
                  Generar
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setShowGenerator(false);
                    setGeneratorData({ sizes: '', colors: '' });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {variants.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                No hay variantes. Usa "Agregar variante" o "Generar variantes" para comenzar.
              </div>
            ) : (
              variants.map((variant, index) => {
                const skuError = getVariantSkuError(variant.sku, index);
                const hasOptions = variant.options.size || variant.options.color;
                
                return (
                  <Card key={variant.id} className="p-4">
                    <div className="grid grid-cols-12 gap-3">
                      {/* Talla */}
                      <div className="col-span-2">
                        <Label htmlFor={`variant-size-${index}`}>Talla</Label>
                        <Input
                          id={`variant-size-${index}`}
                          placeholder="25"
                          value={variant.options.size || ''}
                          onChange={(e) => updateVariantOption(index, 'size', e.target.value)}
                          disabled={disabled}
                        />
                      </div>

                      {/* Color */}
                      <div className="col-span-2">
                        <Label htmlFor={`variant-color-${index}`}>Color</Label>
                        <Input
                          id={`variant-color-${index}`}
                          placeholder="Negro"
                          value={variant.options.color || ''}
                          onChange={(e) => updateVariantOption(index, 'color', e.target.value)}
                          disabled={disabled}
                        />
                      </div>

                      {/* SKU */}
                      <div className="col-span-3">
                        <Label htmlFor={`variant-sku-${index}`}>
                          SKU <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`variant-sku-${index}`}
                          placeholder="BV-001-25-NEG"
                          value={variant.sku}
                          onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                          className={skuError ? 'border-red-500' : ''}
                          disabled={disabled}
                        />
                        {skuError && (
                          <p className="text-xs text-red-500 mt-1">{skuError}</p>
                        )}
                        {!hasOptions && (
                          <p className="text-xs text-amber-600 mt-1">Debe tener al menos talla o color</p>
                        )}
                      </div>

                      {/* Stock */}
                      <div className="col-span-2">
                        <Label htmlFor={`variant-stock-${index}`}>Stock</Label>
                        <Input
                          id={`variant-stock-${index}`}
                          type="number"
                          min="0"
                          value={variant.stock}
                          onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value) || 0)}
                          disabled={disabled}
                        />
                      </div>

                      {/* Precio (opcional) */}
                      <div className="col-span-2">
                        <Label htmlFor={`variant-price-${index}`}>
                          Precio
                        </Label>
                        <Input
                          id={`variant-price-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={`${productPrice}`}
                          value={variant.price || ''}
                          onChange={(e) => updateVariant(index, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                          disabled={disabled}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {variant.price ? `$${variant.price}` : `Heredado: $${productPrice}`}
                        </p>
                      </div>

                      {/* Delete */}
                      <div className="col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariant(index)}
                          disabled={disabled}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}