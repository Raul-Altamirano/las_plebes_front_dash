import { useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { Card } from "./ui/card";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ProductVariant } from "../types/product";
import { useProductsStore } from "../store/ProductsContext";
import { ColorPicker } from "./ColorPicker";
import {
  getSkuBase,
  buildVariantSku,
  replaceSkuSize,
} from "../config/skuConfig";

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
  variantErrors?: Record<string, string>;
  disableSku?: boolean;
}

export function VariantEditor({
  variants,
  onChange,
  productSku = "",
  productPrice = 0,
  productId,
  disabled = false,
  error,
  hasVariants = false,
  onToggleVariants,
  onStockChange,
  disableSku = false,
  variantErrors = {},
}: VariantEditorProps) {
  const { isSkuAvailable } = useProductsStore();
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorData, setGeneratorData] = useState({
    sizes: "",
    colors: "",
  });

  const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

  // Notificar cambio de stock total cuando cambian las variantes
  const handleVariantsChange = (newVariants: ProductVariant[]) => {
    onChange(newVariants);
    if (onStockChange && hasVariants) {
      const newTotalStock = newVariants.reduce(
        (sum, v) => sum + (v.stock || 0),
        0,
      );
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

  // ─── Calcular siguiente número de versión disponible ──────────────────────
  const getNextVersion = (size?: string, excludeIndex?: number): number => {
    const base = getSkuBase(productSku);
    const sizeDigits = size ? size.replace(/[^0-9.]/g, '').replace('.', '').padStart(2, '0') : '01';

    let maxVersion = 0;
    variants.forEach((v, i) => {
      if (excludeIndex !== undefined && i === excludeIndex) return;
      if (!v.sku) return;
      const parts = v.sku.split('-');
      if (parts.slice(0, 2).join('-') !== base) return;
      if (parts[2] !== sizeDigits) return;
      const ver = parseInt(parts[3] || '0', 10);
      if (ver > maxVersion) maxVersion = ver;
    });
    return maxVersion + 1;
  };

  const addVariant = () => {
    const versionNum = getNextVersion(undefined);
    const newVariant: ProductVariant = {
      colorHex: "#000000",
      id: Math.random().toString(36).substring(7),
      sku: buildVariantSku(productSku, undefined, versionNum),
      size: undefined,
      color: undefined,
      stock: 0,
      updatedAt: new Date().toISOString(),
    };
    handleVariantsChange([...variants, newVariant]);
  };

  const updateVariant = (
    index: number,
    field: keyof ProductVariant,
    value: any,
  ) => {
    const updated = [...variants];
    updated[index] = {
      ...updated[index],
      [field]: value,
      updatedAt: new Date().toISOString(),
    };
    handleVariantsChange(updated);
  };

  const updateVariantOption = (
    index: number,
    option: "size" | "color",
    value: string,
  ) => {
    const updated = [...variants];
    updated[index] = {
      ...updated[index],
      [option]: value || undefined,
      updatedAt: new Date().toISOString(),
    };

    // ─── Auto-regenerar SKU cuando cambia la talla ────────────────────────
    if (option === "size" && productSku) {
      updated[index].sku = replaceSkuSize(
        updated[index].sku || "",
        productSku,
        value || undefined,
      );
    }

    handleVariantsChange(updated);
  };

  const removeVariant = (index: number) => {
    const updated = variants.filter((_, i) => i !== index);
    handleVariantsChange(updated);
  };

  const generateVariants = () => {
    const sizes = generatorData.sizes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const colors = generatorData.colors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (sizes.length === 0 && colors.length === 0) {
      return;
    }

    const generated: ProductVariant[] = [];

    if (sizes.length > 0 && colors.length > 0) {
      // Combinación de tallas y colores
      sizes.forEach((size) => {
        colors.forEach((color, colorIdx) => {
          generated.push({
            id: Math.random().toString(36).substring(7),
            sku: buildVariantSku(productSku, size, colorIdx + 1),
            size: size,
            color: color,
            stock: 0,
            colorHex: "#000000",
            updatedAt: new Date().toISOString(),
          });
        });
      });
    } else if (sizes.length > 0) {
      // Solo tallas — cada talla es versión 01
      sizes.forEach((size) => {
        generated.push({
          id: Math.random().toString(36).substring(7),
          sku: buildVariantSku(productSku, size, 1),
          size: size,
          stock: 0,
          colorHex: "#000000",
          updatedAt: new Date().toISOString(),
        });
      });
    } else {
      // Solo colores — sin talla, versión incremental
      colors.forEach((color, idx) => {
        generated.push({
          id: Math.random().toString(36).substring(7),
          sku: buildVariantSku(productSku, undefined, idx + 1),
          color: color,
          stock: 0,
          colorHex: "#000000",
          updatedAt: new Date().toISOString(),
        });
      });
    }

    handleVariantsChange([...variants, ...generated]);
    setShowGenerator(false);
    setGeneratorData({ sizes: "", colors: "" });
  };

  const getVariantSkuError = (
    sku: string,
    currentIndex: number,
  ): string | null => {
    // Check duplicates within variants
    const duplicateInVariants = variants.some(
      (v, i) => i !== currentIndex && v.sku.toLowerCase() === sku.toLowerCase(),
    );
    if (duplicateInVariants) {
      return "SKU duplicado en variantes";
    }

    // Check global availability (excluding current product)
    if (!isSkuAvailable(sku, productId)) {
      return "SKU ya existe en otro producto";
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

      {error && <p className="text-sm text-red-600">{error}</p>}

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
                    onChange={(e) =>
                      setGeneratorData((prev) => ({
                        ...prev,
                        sizes: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">Opcional</p>
                </div>
                <div>
                  <Label htmlFor="gen-colors">
                    Colores (separados por coma)
                  </Label>
                  <Input
                    id="gen-colors"
                    placeholder="Ej: Negro, Café, Miel"
                    value={generatorData.colors}
                    onChange={(e) =>
                      setGeneratorData((prev) => ({
                        ...prev,
                        colors: e.target.value,
                      }))
                    }
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
                    setGeneratorData({ sizes: "", colors: "" });
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
                No hay variantes. Usa "Agregar variante" o "Generar variantes"
                para comenzar.
              </div>
            ) : (
              variants.map((variant, index) => {
                const skuError = getVariantSkuError(variant.sku, index);
                const hasOptions = variant.size || variant.color;

                return (
                  <Card key={variant.id} className="p-4">
                    <div className="grid grid-cols-12 gap-3">
                      {/* Talla */}
                      <div className="col-span-2">
                        <Label htmlFor={`variant-size-${index}`}>Talla</Label>
                        <Input
                          id={`variant-size-${index}`}
                          placeholder="25"
                          value={variant.size || ""}
                          onChange={(e) =>
                            updateVariantOption(index, "size", e.target.value)
                          }
                          disabled={disabled}
                          className={
                            variantErrors[`variant-${index}-options`]
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {!variant.size &&
                          !variant.color &&
                          variantErrors[`variant-${index}-options`] && (
                            <p className="text-xs text-red-500 mt-1">
                              {variantErrors[`variant-${index}-options`]}
                            </p>
                          )}
                      </div>

                      {/* Color */}
                      <div className="col-span-2">
                        <Label htmlFor={`variant-color-${index}`}>Color</Label>
                        <Input
                          id={`variant-color-${index}`}
                          placeholder="Negro"
                          value={variant.color || ""}
                          onChange={(e) =>
                            updateVariantOption(index, "color", e.target.value)
                          }
                          disabled={disabled}
                          className={
                            variantErrors[`variant-${index}-options`]
                              ? "border-red-500"
                              : ""
                          }
                        />
                      </div>

                      {/* SKU */}
                      <div className="col-span-3">
                        <Label htmlFor={`variant-sku-${index}`}>
                          SKU <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-1">
                          {/* Prefijo no editable: MARCA-NUMERO */}
                          <span className="px-2 py-2 text-xs bg-gray-100 border border-gray-300 rounded-lg text-gray-500 whitespace-nowrap">
                            {getSkuBase(productSku)}-
                          </span>
                          {/* SIZE-VERSION editable */}
                          <Input
                            id={`variant-sku-${index}`}
                            placeholder="25-01"
                            value={
                              variant.sku?.split("-").slice(2).join("-") || ""
                            }
                            onChange={(e) => {
                              const suffix = e.target.value
                                .toUpperCase()
                                .replace(/[^0-9-]/g, "");
                              const base = getSkuBase(productSku);
                              updateVariant(
                                index,
                                "sku",
                                `${base}-${suffix}`,
                              );
                            }}
                            className={skuError ? "border-red-500" : ""}
                            disabled={disabled || disableSku}
                            maxLength={9}
                          />
                        </div>
                        {skuError && (
                          <p className="text-xs text-red-500 mt-1">
                            {skuError}
                          </p>
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
                          onChange={(e) =>
                            updateVariant(
                              index,
                              "stock",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          disabled={disabled}
                        />
                      </div>

                      {/* Precio (opcional) */}
                      <div className="col-span-2">
                        <Label htmlFor={`variant-price-${index}`}>Precio</Label>
                        <Input
                          id={`variant-price-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={`${productPrice}`}
                          value={variant.price || ""}
                          onChange={(e) =>
                            updateVariant(
                              index,
                              "price",
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            )
                          }
                          disabled={disabled}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {variant.price
                            ? `$${variant.price}`
                            : `Heredado: $${productPrice}`}
                        </p>
                      </div>
                      {/* Segunda fila: Color Hex */}
                      <div className="col-span-12 border-t pt-3">
                        <ColorPicker
                          label="Color visual"
                          value={variant.colorHex || "#000000"}
                          onChange={(color) =>
                            updateVariant(index, "colorHex", color)
                          }
                          disabled={disabled}
                        />
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