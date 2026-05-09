import { useState, useEffect } from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "./ui/card";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ProductVariant, ProductImage } from "../types/product";
import { useColors } from "../store/ColorsContext";
import { getSkuBase, sizeToSkuCode } from "../config/skuConfig";
import { VariantImagePicker } from "./VariantImagePicker";

// ─── Tallas por género ────────────────────────────────────────────────────────
const SIZES_MUJER  = ["22","22.5","23","23.5","24","24.5","25","25.5","26","26.5","27","27.5","28","28.5"];
const SIZES_HOMBRE = ["25","25.5","26","26.5","27","27.5","28","28.5","29","29.5","30","30.5","31","31.5","32"];

type Gender = "mujer" | "hombre";
function getSizes(gender: Gender) { return gender === "mujer" ? SIZES_MUJER : SIZES_HOMBRE; }

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ColorCard {
  tempId:        string;
  colorId:       string;
  colorName:     string;
  colorHex:      string;
  colorNumber:   string;
  selectedSizes: string[];
  stockMode:     "uniform" | "per-size";
  uniformStock:  number;
  stockPerSize:  Record<string, number>;
  price?:        number;
  images:        ProductImage[];
  showStock:     boolean;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface VariantEditorProps {
  variants:          ProductVariant[];
  onChange:          (variants: ProductVariant[]) => void;
  productSku?:       string;
  productPrice?:     number;
  productId?:        string;
  categoryId?:       string | null;
  productImages?:    ProductImage[];
  disabled?:         boolean;
  error?:            string;
  hasVariants?:      boolean;
  onToggleVariants?: (enabled: boolean) => void;
  onStockChange?:    (totalStock: number) => void;
  variantErrors?:    Record<string, string>;
  disableSku?:       boolean;
  onVariantUploadRef?: (variantId: string, ref: () => Promise<ProductImage[] | null>) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildVariantSkuFromColor(parentSku: string, size: string, colorNumber: string): string {
  const base     = getSkuBase(parentSku);
  const sizeCode = sizeToSkuCode(size);
  const colNum   = String(colorNumber).padStart(2, "0");
  return `${base}-${sizeCode}-${colNum}`;
}

function cardToVariants(card: ColorCard, productSku: string): ProductVariant[] {
  return card.selectedSizes.map((size) => ({
    id:        `${card.tempId}-${size}`,
    sku:       buildVariantSkuFromColor(productSku, size, card.colorNumber),
    size,
    colorId:   card.colorId,
    color:     card.colorName,
    colorHex:  card.colorHex,
    stock:     card.stockMode === "uniform" ? card.uniformStock : (card.stockPerSize[size] ?? 0),
    price:     card.price,
    images:    card.images,
    updatedAt: new Date().toISOString(),
  }));
}

function colorToSlug(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function VariantEditor({
  variants,
  onChange,
  productSku        = "",
  productPrice      = 0,
  productId,
  categoryId,
  productImages     = [],
  disabled          = false,
  error,
  hasVariants       = false,
  onToggleVariants,
  onStockChange,
  variantErrors     = {},
  onVariantUploadRef,
}: VariantEditorProps) {
  const { colors } = useColors();

  const [gender,     setGender]     = useState<Gender>("mujer");
  const [colorCards, setColorCards] = useState<ColorCard[]>([]);

  const sizes = getSizes(gender);

  // Sincronizar cards → variants al padre
  useEffect(() => {
    if (!hasVariants) return;
    const allVariants = colorCards.flatMap((card) => cardToVariants(card, productSku));
    console.log(
      `[VariantEditor] cards=${colorCards.length} variants=${allVariants.length}`,
      allVariants.map((v) => ({ sku: v.sku, size: v.size, color: v.color, stock: v.stock }))
    );
    onChange(allVariants);
    if (onStockChange) onStockChange(allVariants.reduce((s, v) => s + (v.stock || 0), 0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorCards, hasVariants, productSku]);

  const totalStock = colorCards.flatMap((c) =>
    c.selectedSizes.map((s) => c.stockMode === "uniform" ? c.uniformStock : (c.stockPerSize[s] ?? 0))
  ).reduce((a, b) => a + b, 0);

  // ── Agregar color card ─────────────────────────────────────────────────────
  const addColorCard = (colorId: string) => {
    if (colorCards.some((c) => c.colorId === colorId)) return;
    const color = colors.find((c) => c.id === colorId);
    if (!color) return;
    const newCard: ColorCard = {
      tempId:        `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      colorId:       color.id,
      colorName:     color.name,
      colorHex:      color.hex,
      colorNumber:   (color as any).colorNumber ?? "01",
      selectedSizes: [...sizes],
      stockMode:     "uniform",
      uniformStock:  0,
      stockPerSize:  {},
      images:        [],
      showStock:     false,
    };
    console.log(`[VariantEditor] addColorCard color=${color.name} colorNumber=${newCard.colorNumber} sizes=${newCard.selectedSizes.length}`);
    setColorCards((prev) => [...prev, newCard]);
  };

  const removeColorCard = (tempId: string) => {
    setColorCards((prev) => prev.filter((c) => c.tempId !== tempId));
  };

  const toggleSize = (tempId: string, size: string) => {
    setColorCards((prev) => prev.map((card) => {
      if (card.tempId !== tempId) return card;
      const has  = card.selectedSizes.includes(size);
      const next = has
        ? card.selectedSizes.filter((s) => s !== size)
        : [...card.selectedSizes, size].sort((a, b) => parseFloat(a) - parseFloat(b));
      return { ...card, selectedSizes: next };
    }));
  };

  const selectAllSizes = (tempId: string) => {
    setColorCards((prev) => prev.map((c) => c.tempId === tempId ? { ...c, selectedSizes: [...sizes] } : c));
  };

  const setUniformStock = (tempId: string, value: number) => {
    setColorCards((prev) => prev.map((c) => c.tempId === tempId ? { ...c, uniformStock: value, stockMode: "uniform" } : c));
  };

  const setOneToAll = (tempId: string) => {
    setColorCards((prev) => prev.map((c) => c.tempId === tempId ? { ...c, uniformStock: 1, stockMode: "uniform" } : c));
  };

  const setStockPerSize = (tempId: string, size: string, value: number) => {
    setColorCards((prev) => prev.map((card) => {
      if (card.tempId !== tempId) return card;
      return { ...card, stockMode: "per-size", stockPerSize: { ...card.stockPerSize, [size]: value } };
    }));
  };

  const toggleStockSection = (tempId: string) => {
    setColorCards((prev) => prev.map((c) => c.tempId === tempId ? { ...c, showStock: !c.showStock } : c));
  };

  const toggleStockMode = (tempId: string, mode: "uniform" | "per-size") => {
    setColorCards((prev) => prev.map((c) => c.tempId === tempId ? { ...c, stockMode: mode } : c));
  };

  // ── Imágenes por color ─────────────────────────────────────────────────────
  const handleColorImagesChange = (repId: string, images: ProductImage[]) => {
    const tempId = repId; // repId === card.tempId
    console.log(`[VariantEditor] imágenes actualizadas para card=${tempId} count=${images.length}`);
    setColorCards((prev) => prev.map((c) => c.tempId === tempId ? { ...c, images } : c));
  };

  const handleColorUploadRef = (repId: string, ref: () => Promise<ProductImage[] | null>) => {
    if (!onVariantUploadRef) return;
    // Registrar el ref para todas las variantes del card
    const card = colorCards.find((c) => c.tempId === repId);
    if (!card) return;
    card.selectedSizes.forEach((size) => {
      onVariantUploadRef(`${card.tempId}-${size}`, ref);
    });
  };

  const handleToggleVariants = (enabled: boolean) => {
    if (onToggleVariants) {
      onToggleVariants(enabled);
      if (!enabled) { setColorCards([]); onChange([]); }
    }
  };

  const selectedColorIds = colorCards.map((c) => c.colorId);

  return (
    <div className="space-y-4">

      {/* Toggle */}
      <div className="flex items-center gap-3">
        {onToggleVariants && (
          <Switch id="has-variants" checked={hasVariants} onCheckedChange={handleToggleVariants} disabled={disabled} />
        )}
        <div>
          <Label htmlFor="has-variants" className="cursor-pointer">Este producto tiene variantes</Label>
          {hasVariants && (
            <p className="text-sm text-gray-500">
              Stock total: {totalStock} uds · {colorCards.length} color(es) · {colorCards.reduce((s, c) => s + c.selectedSizes.length, 0)} combinaciones
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {hasVariants && (
        <div className="space-y-5">

          {/* Género */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">Tallas para:</span>
            {(["mujer", "hombre"] as Gender[]).map((g) => (
              <button key={g} type="button" onClick={() => setGender(g)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  gender === g ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                }`}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
            <span className="text-xs text-gray-400 ml-1">({sizes.length} tallas)</span>
          </div>

          {/* Selector de colores */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Selecciona colores:</p>
            <div className="flex flex-wrap gap-2">
              {colors.filter((c) => c.isActive !== false).map((c) => {
                const added = selectedColorIds.includes(c.id);
                return (
                  <button key={c.id} type="button" disabled={disabled}
                    onClick={() => {
                      if (added) { const card = colorCards.find(cd => cd.colorId === c.id); if (card) removeColorCard(card.tempId); }
                      else addColorCard(c.id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
                      added ? "border-red-300 bg-red-50 text-red-500 hover:bg-red-100"
                            : "border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50"
                    }`}>
                    <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: c.hex }} />
                    {c.name}
                    {(c as any).colorNumber && <span className="text-gray-400">#{(c as any).colorNumber}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cards */}
          {colorCards.length === 0 ? (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg text-sm">
              Selecciona un color arriba para comenzar
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {colorCards.map((card) => {
                const colorVariantSku = `${colorToSlug(card.colorName)}-${card.colorNumber}`;
                const representative: ProductVariant = {
                  id:        card.tempId,
                  sku:       card.selectedSizes[0] ? buildVariantSkuFromColor(productSku, card.selectedSizes[0], card.colorNumber) : productSku,
                  color:     card.colorName,
                  colorId:   card.colorId,
                  colorHex:  card.colorHex,
                  images:    card.images,
                  stock:     0,
                  updatedAt: new Date().toISOString(),
                };

                return (
                  <Card key={card.tempId} className="p-4 border-l-4" style={{ borderLeftColor: card.colorHex }}>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: card.colorHex }} />
                        <span className="font-medium text-gray-900">{card.colorName}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">#{card.colorNumber}</span>
                        <span className="text-xs text-gray-400">SKU: {getSkuBase(productSku)}-…-{card.colorNumber}</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeColorCard(card.tempId)}
                        disabled={disabled} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Tallas */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Tallas <span className="text-gray-400 font-normal">({card.selectedSizes.length} seleccionadas)</span>
                        </span>
                        <button type="button" onClick={() => selectAllSizes(card.tempId)} className="text-xs text-blue-600 hover:text-blue-700">
                          Seleccionar todas
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sizes.map((size) => {
                          const selected = card.selectedSizes.includes(size);
                          return (
                            <button key={size} type="button" disabled={disabled} onClick={() => toggleSize(card.tempId, size)}
                              className={`w-12 h-8 text-xs rounded border font-medium transition-all ${
                                selected ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-200 hover:border-gray-400"
                              }`}>
                              {size}
                            </button>
                          );
                        })}
                      </div>
                      {card.selectedSizes.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">⚠️ Selecciona al menos una talla</p>
                      )}
                    </div>

                    {/* SKU preview */}
                    {card.selectedSizes.length > 0 && (
                      <div className="mb-4 p-2 bg-gray-50 rounded text-xs text-gray-500 font-mono">
                        {card.selectedSizes.slice(0, 4).map((size) => (
                          <span key={size} className="mr-3">{buildVariantSkuFromColor(productSku, size, card.colorNumber)}</span>
                        ))}
                        {card.selectedSizes.length > 4 && <span className="text-gray-400">+{card.selectedSizes.length - 4} más</span>}
                      </div>
                    )}

                    {/* Stock */}
                    <div className="border-t border-gray-100 pt-3 mb-4">
                      <button type="button" onClick={() => toggleStockSection(card.tempId)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 w-full">
                        Stock
                        {card.showStock ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        <span className="text-xs text-gray-400 font-normal ml-auto">
                          Total: {card.selectedSizes.reduce((s, size) => s + (card.stockMode === "uniform" ? card.uniformStock : (card.stockPerSize[size] ?? 0)), 0)} uds
                        </span>
                      </button>

                      {card.showStock && (
                        <div className="mt-3 space-y-3">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => toggleStockMode(card.tempId, "uniform")}
                              className={`px-3 py-1 text-xs rounded border transition-all ${card.stockMode === "uniform" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300"}`}>
                              Mismo para todas
                            </button>
                            <button type="button" onClick={() => toggleStockMode(card.tempId, "per-size")}
                              className={`px-3 py-1 text-xs rounded border transition-all ${card.stockMode === "per-size" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-300"}`}>
                              Por talla
                            </button>
                            <Button type="button" variant="outline" size="sm" className="text-xs ml-auto" onClick={() => setOneToAll(card.tempId)}>
                              Poner 1 a todas
                            </Button>
                          </div>

                          {card.stockMode === "uniform" && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-gray-600 w-32">Stock por talla:</Label>
                              <Input type="number" min="0" value={card.uniformStock}
                                onChange={(e) => setUniformStock(card.tempId, parseInt(e.target.value) || 0)}
                                className="w-24 h-8 text-sm" disabled={disabled} />
                            </div>
                          )}

                          {card.stockMode === "per-size" && (
                            <div className="grid grid-cols-4 gap-2">
                              {card.selectedSizes.map((size) => (
                                <div key={size} className="flex flex-col gap-1">
                                  <span className="text-xs text-gray-500 text-center">{size}</span>
                                  <Input type="number" min="0" value={card.stockPerSize[size] ?? 0}
                                    onChange={(e) => setStockPerSize(card.tempId, size, parseInt(e.target.value) || 0)}
                                    className="h-8 text-sm text-center" disabled={disabled} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Fotos del color — integradas en la misma card ── */}
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        📷 Fotos del color
                        <span className="text-gray-400 font-normal ml-2">
                          Aplican a todas las tallas · path: <code className="bg-gray-100 px-1 rounded">{getSkuBase(productSku)}/variantes/{colorVariantSku}/</code>
                        </span>
                      </p>
                      <VariantImagePicker
                        variant={representative}
                        productImages={productImages}
                        onChange={handleColorImagesChange}
                        onUploadRef={handleColorUploadRef}
                        productId={productId}
                        categoryId={categoryId ?? undefined}
                        sku={productSku}
                        variantSku={colorVariantSku}
                      />
                    </div>

                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}