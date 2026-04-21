import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  ShieldAlert,
  DollarSign,
  TrendingUp,
  Info,
} from "lucide-react";
import { useProductsStore } from "../store/ProductsContext";
import { useCategories } from "../store/CategoryContext";
import { useColors } from "../store/ColorsContext";
import { useToast } from "../store/ToastContext";
import { useAuth } from "../store/AuthContext";
import { useAudit } from "../store/AuditContext";
import { ImagePickerV2 } from "../components/ImagePickerV2";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { RequirePermission } from "../components/RequirePermission";
import {
  SKU_CONFIG,
  buildSkuRegex,
  buildSkuPlaceholder,
  buildVariantSku,
} from "../config/skuConfig";
import { VariantEditor } from "../components/VariantEditor";
import { VariantImagesSection } from "../components/VariantImagesSection"; // ← agrega aquíimport { RequirePermission } from '../components/RequirePermission';
import {
  validateProductDraft,
  validateProductActive,
} from "../utils/validation";
import {
  getEffectiveCost,
  calculateUnitProfit,
  calculateMarginPercent,
  formatCurrency,
  formatPercent,
} from "../utils/costHelpers";
import type {
  Product,
  ProductStatus,
  ProductImage,
  ProductVariant,
  ColorGroup,
} from "../types/product";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";

const haveVariantsChanged = (
  original: ProductVariant[] | undefined,
  current: ProductVariant[] | undefined,
): boolean => {
  const a = original ?? [];
  const b = current ?? [];

  if (a.length !== b.length) return true;

  return b.some((variant, i) => {
    const orig = a[i];
    if (!orig) return true;
    return (
      variant.id !== orig.id ||
      variant.sku !== orig.sku ||
      variant.size !== orig.size ||
      variant.color !== orig.color ||
      variant.price !== orig.price ||
      variant.stock !== orig.stock ||
      variant.cost !== orig.cost ||
      variant.colorHex !== orig.colorHex ||
      JSON.stringify((variant.images ?? []).map((i) => i.id).sort()) !==
        JSON.stringify((orig.images ?? []).map((i) => i.id).sort())
    );
  });
};

export function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, createProduct, updateProduct, getById } =
    useProductsStore();
  const { categories, getById: getCategoryById } = useCategories();

  // ─── Colores del catálogo ──────────────────────────────────────────────────
  const { colors } = useColors();

  const { showToast } = useToast();
  const { currentUser, hasPermission } = useAuth();
  const { auditLog } = useAudit();

  const isEdit = Boolean(id);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Verificar permisos
  const canUpdateProduct = hasPermission("product:update");
  const canUpdateInventory = hasPermission("inventory:update");
  const canPublish = hasPermission("product:publish");
  const canUploadMedia = hasPermission("media:upload");
  const uploadRef = useRef<(() => Promise<ProductImage[] | null>) | null>(null);
  const variantUploadRefs = useRef<
    Map<string, () => Promise<ProductImage[] | null>>
  >(new Map());

  // Modo "stock-only" para rol OPS
  const isStockOnlyMode = !canUpdateProduct && canUpdateInventory;

  // Get active categories
  const handleVariantUploadRef = (
    variantId: string,
    ref: () => Promise<ProductImage[] | null>,
  ) => {
    variantUploadRefs.current.set(variantId, ref);
  };
  const activeCategories = categories.filter((c) => c.status === "ACTIVE");

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    sku: "",
    price: 0,
    stock: 0,
    status: "DRAFT",
    colorHex: "#000000",
    categoryId: activeCategories.length > 0 ? activeCategories[0].id : null,
    descriptionShort: "",
    images: [],
    hasVariants: false,
    variants: [],
    cost: 0,
    colorGroups: [],
    trackCost: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});

  // Producto original (para detectar cambios y audit)
  const [originalProduct, setOriginalProduct] = useState<Product | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load product data in edit mode
  useEffect(() => {
    if (isEdit && id && !initialized) {
      const product = getById(id);
      if (product) {
        setFormData(product);
        setOriginalProduct(product);
        setInitialized(true);
      } else {
        showToast("error", "Producto no encontrado");
        navigate("/products");
      }
    }
  }, [id, isEdit, initialized, getById, navigate, showToast]);

  // Track form changes
  useEffect(() => {
    if (isEdit) {
      const original = getById(id!);
      if (original) {
        console.log("[useEffect] original.hasVariants:", original.hasVariants); // ← agrega
        console.log("[useEffect] formData.hasVariants:", formData.hasVariants); // ← agrega

        const hasChanges =
          JSON.stringify(formData) !== JSON.stringify(original);
        setIsDirty(hasChanges);
      }
    } else {
      const hasData =
        formData.name ||
        formData.sku ||
        (formData.images && formData.images.length > 0);
      setIsDirty(Boolean(hasData));
    }
  }, [formData, isEdit, id, getById]);

  const handleChange = (field: keyof Product, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleVariantImagesChange = (
    variantId: string,
    images: ProductImage[],
  ) => {
    const updatedVariants = (formData.variants || []).map((variant) =>
      variant.id === variantId ? { ...variant, images } : variant,
    );
    setFormData((prev) => ({ ...prev, variants: updatedVariants }));
    setIsDirty(true);
  };

  const validateForm = (targetStatus: ProductStatus): boolean => {
    const productToValidate = { ...formData, status: targetStatus };

    const validation =
      targetStatus === "DRAFT"
        ? validateProductDraft(productToValidate, products, id)
        : validateProductActive(productToValidate, products, id);

    // Convert validation errors to record
    const errorRecord: Record<string, string> = {};
    validation.errors.forEach((err) => {
      errorRecord[err.field] = err.message;
    });

    const warningRecord: Record<string, string> = {};
    validation.warnings.forEach((warn) => {
      warningRecord[warn.field] = warn.message;
    });

    setErrors(errorRecord);
    setWarnings(warningRecord);

    console.log("[validateForm] formData.hasVariants:", formData.hasVariants); // ← agrega
    console.log("[validateForm] errors:", errorRecord); // ← agrega

    return validation.isValid;
  };

  const handleSubmit = async (saveAsDraft: boolean = false) => {
    const targetStatus = saveAsDraft ? "DRAFT" : formData.status || "ACTIVE";

    if (
      targetStatus === "ACTIVE" &&
      !canPublish &&
      originalProduct?.status !== "ACTIVE"
    ) {
      showToast("error", "No tienes permiso para publicar productos");
      return;
    }

    if (!validateForm(targetStatus)) {
      showToast("error", "Por favor corrige los errores antes de guardar");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Preparando imágenes...");
    console.log(
      "[variantImages] updatedVariants antes del for:",
      (formData.variants || []).map((v) => ({
        id: v.id,
        sku: v.sku,
        images: (v.images || []).map((i) => ({ id: i.id, key: i.key })),
      })),
    );
    // ─── Candado: detectar cambios ────────────────────────────────────────────
    const uploadedImages = uploadRef.current ? await uploadRef.current() : null;
    const hasImageChanges = uploadedImages !== null;

    const updatedVariants = [...(formData.variants || [])];
    console.log(
      "[variantImages] updatedVariants:",
      JSON.stringify(
        updatedVariants.map((v) => ({
          id: v.id,
          sku: v.sku,
          images: v.images,
        })),
        null,
        2,
      ),
    );

    for (let i = 0; i < updatedVariants.length; i++) {
      const variant = updatedVariants[i];
      const variantUpload = variantUploadRefs.current.get(variant.id);
      if (variantUpload) {
        const variantImages = await variantUpload();
        console.log("[variantImages] resultado:", variant.sku, variantImages); // ← agrega
        if (variantImages !== null) {
          updatedVariants[i] = { ...variant, images: variantImages };
        }
      }
    }

    setLoadingMessage(
      isEdit ? "Actualizando producto..." : "Creando producto...",
    );

    console.log(
      "[variantImages] updatedVariants FINAL:", // ← mueve aquí
      updatedVariants.map((v) => ({
        id: v.id,
        sku: v.sku,
        images: (v.images || []).map((i) => ({ id: i.id, key: i.key })),
      })),
    );

    const hasFieldChanges =
      isEdit && originalProduct
        ? formData.name !== originalProduct.name ||
          formData.sku !== originalProduct.sku ||
          formData.price !== originalProduct.price ||
          formData.stock !== originalProduct.stock ||
          formData.categoryId !== originalProduct.categoryId ||
          formData.description !== originalProduct.description ||
          formData.cost !== originalProduct.cost ||
          formData.status !== originalProduct.status ||
          formData.trackCost !== originalProduct.trackCost ||
          formData.hasVariants !== originalProduct.hasVariants ||
          formData.colorHex !== originalProduct.colorHex
        : true; // Si es creación, siempre hay "cambios"
    console.log("[handleSubmit] isEdit:", isEdit);
    console.log("[handleSubmit] hasImageChanges:", hasImageChanges);
    console.log("[handleSubmit] uploadedImages:", uploadedImages);
    console.log("[handleSubmit] hasFieldChanges:", hasFieldChanges);
    console.log("[handleSubmit] formData:", formData);
    console.log("[handleSubmit] originalProduct:", originalProduct);
    console.log("[handleSubmit] diff:", {
      name: formData.name !== originalProduct?.name,
      sku: formData.sku !== originalProduct?.sku,
      price: formData.price !== originalProduct?.price,
      stock: formData.stock !== originalProduct?.stock,
      categoryId: formData.categoryId !== originalProduct?.categoryId,
      description: formData.description !== originalProduct?.description,
      cost: formData.cost !== originalProduct?.cost,
      status: formData.status !== originalProduct?.status,
      trackCost: formData.trackCost !== originalProduct?.trackCost,
      hasVariants: formData.hasVariants !== originalProduct?.hasVariants,
    });
    const hasVariantChanges = haveVariantsChanged(
      originalProduct?.variants,
      formData.variants,
    );

    const hasVariantImageChanges = updatedVariants.some((v, i) => {
      const orig = originalProduct?.variants?.[i];
      return (
        JSON.stringify(v.images ?? []) !== JSON.stringify(orig?.images ?? [])
      );
    });

    if (
      isEdit &&
      !hasFieldChanges &&
      !hasImageChanges &&
      !hasVariantChanges &&
      !hasVariantImageChanges
    ) {
      showToast("info", "No hay cambios que guardar");
      setIsLoading(false);
      return;
    }

    try {
      // ─── parentImages, enrichedColorGroups y enrichedVariants ────────────────
      const parentImages = uploadedImages ?? formData.images ?? [];

      // ─── enrichedColorGroups: asignar imágenes subidas por variante al colorGroup ─
      const enrichedColorGroups: ColorGroup[] = (
        formData.colorGroups || []
      ).map((g) => {
        const variantDeEsteColor = updatedVariants.find(
          (v) => v.colorId === g.colorId && (v.images ?? []).length > 0,
        );

        if (variantDeEsteColor) {
          return { ...g, images: variantDeEsteColor.images! };
        }

        if ((g.images?.length ?? 0) > 0) {
          return g;
        }

        if (
          (formData.colorGroups || []).length === 1 &&
          parentImages.length > 0
        ) {
          return { ...g, images: [...parentImages] };
        }

        return g;
      });
const enrichedVariants = updatedVariants.map((v, index) => {
  const inheritedPrice =
    v.price !== undefined && v.price !== null && v.price > 0
      ? v.price
      : formData.price || 0;

  const inheritedCost = formData.trackCost
    ? (
        v.cost !== undefined && v.cost !== null && v.cost > 0
          ? v.cost
          : formData.cost || 0
      )
    : 0;

  const inheritedStock =
    index === 0
      ? ((v.stock ?? 0) > 0 ? v.stock! : (formData.stock || 0))
      : (v.stock ?? 0);

  return {
    ...v,
    price: inheritedPrice,
    cost: inheritedCost,
    stock: inheritedStock,
    images: v.images ?? [],
  };
});
      console.log(
        "[handleSubmit] basePayload preview — colorGroups:",
        enrichedColorGroups,
      );

      const basePayload = {
        name: formData.name!,
        sku: formData.sku!,
        price: formData.price || 0,
        stock: formData.stock || 0,
        status: targetStatus,
        categoryId: formData.categoryId!,
        description: formData.description,
        images: [], // siempre vacío, fotos viven en colorGroups
        colorGroups: enrichedColorGroups, // ← nuevo
        updatedAt: new Date().toISOString(),
        isArchived: originalProduct?.isArchived || false,
        hasVariants: formData.hasVariants || false,
        variants: enrichedVariants, // ← reemplaza finalVariants
        cost: formData.cost,
        colorHex: formData.colorHex || undefined,
        trackCost: formData.trackCost !== undefined ? formData.trackCost : true,
      };

      if (isEdit) {
        await updateProduct(id!, basePayload);
        showToast("success", "Producto actualizado correctamente");
      } else {
        await createProduct(basePayload);
        showToast("success", "Producto creado correctamente");
      }

      setIsDirty(false);
      navigate("/products");
    } catch (error) {
      console.error("[handleSubmit] Error:", error);
      showToast("error", "Error al guardar el producto");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // Submit para modo stock-only
  const handleStockOnlySubmit = async () => {
    if (!originalProduct) return;

    // Validar que el stock sea válido
    if (formData.stock === undefined || formData.stock < 0) {
      setErrors({ stock: "El stock debe ser mayor o igual a 0" });
      showToast("error", "Por favor ingresa un stock válido");
      return;
    }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const productData: Product = {
        ...originalProduct,
        stock: formData.stock,
        updatedAt: new Date().toISOString(),
      };

      updateProduct(productData);

      // Registrar audit log específico de ajuste de stock
      auditLog({
        action: "STOCK_ADJUSTED",
        entity: {
          type: "product",
          id: productData.id,
          label: productData.name,
        },
        changes: [
          {
            field: "stock",
            oldValue: originalProduct.stock.toString(),
            newValue: formData.stock.toString(),
          },
        ],
      });

      showToast("success", "Stock actualizado correctamente");
      setIsDirty(false);
      navigate("/products");
    } catch (error) {
      showToast("error", "Error al actualizar el stock");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      navigate("/products");
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardDialog(false);
    setIsDirty(false);
    navigate("/products");
  };

  const firstColorGroupWithImages =
    (formData.colorGroups ?? []).find(
      (group) => (group.images?.length ?? 0) > 0,
    ) ?? null;

  const hasColorGroupImages = (formData.colorGroups ?? []).some(
    (group) => (group.images?.length ?? 0) > 0,
  );

  const hasLegacyImages =
    (formData.images ?? []).length > 0 ||
    (formData.variants ?? []).some((v) => (v.images?.length ?? 0) > 0);

  const hasAnyImages = hasColorGroupImages || hasLegacyImages;
  const skuLocked = isEdit && hasAnyImages;

  const displayImages =
    (formData.images?.length ?? 0) > 0
      ? (formData.images ?? [])
      : (firstColorGroupWithImages?.images ?? []);

  // MODO STOCK-ONLY (para usuarios OPS)
  if (isStockOnlyMode && isEdit && originalProduct) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link to="/products" className="hover:text-gray-900">
            Productos
          </Link>
          <span>/</span>
          <span className="text-gray-900">Ajustar stock</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancel}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Ajustar Stock
            </h1>
            <p className="text-sm text-gray-600 mt-1">{formData.name}</p>
          </div>
        </div>

        {/* Info notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Modo limitado de edición</p>
            <p className="mt-1">
              Tu rol solo te permite ajustar el stock de productos. Para
              modificar otros campos, contacta a un administrador.
            </p>
          </div>
        </div>

        {/* Stock Only Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Read-only fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Nombre
              </label>
              <p className="text-gray-900">{originalProduct.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                SKU
              </label>
              <p className="text-gray-900">{originalProduct.sku}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Precio
              </label>
              <p className="text-gray-900">
                ${originalProduct.price.toFixed(2)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Categoría
              </label>
              <p className="text-gray-900">
                {(originalProduct.categoryId &&
                  getCategoryById(originalProduct.categoryId)?.name) ||
                  "Sin categoría"}
              </p>
            </div>
          </div>

          {/* Editable stock field */}
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.stock || 0}
              onChange={(e) =>
                handleChange("stock", parseInt(e.target.value) || 0)
              }
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                errors.stock
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300"
              }`}
              placeholder="0"
            />
            {errors.stock && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.stock}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Stock anterior: {originalProduct.stock}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
          >
            Cancelar
          </button>

          <button
            onClick={handleStockOnlySubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar stock
              </>
            )}
          </button>
        </div>

        {/* Discard Dialog */}
        <ConfirmDialog
          isOpen={showDiscardDialog}
          title="¿Descartar cambios?"
          message="Tienes cambios sin guardar. ¿Estás seguro de que deseas salir? Los cambios se perderán."
          confirmLabel="Descartar"
          cancelLabel="Continuar editando"
          onConfirm={handleConfirmDiscard}
          onCancel={() => setShowDiscardDialog(false)}
        />
      </div>
    );
  }

  // MODO NORMAL (para usuarios con permisos completos)
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link to="/products" className="hover:text-gray-900">
          Productos
        </Link>
        <span>/</span>
        <span className="text-gray-900">{isEdit ? "Editar" : "Nuevo"}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleCancel}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isEdit ? "Editar Producto" : "Nuevo Producto"}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isEdit
              ? `Editando: ${formData.name || "Sin nombre"}`
              : "Completa la información del producto"}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              Información básica
            </h3>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                  errors.name
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300"
                }`}
                placeholder="Ej: Botas Vaqueras Premium"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </p>
              )}
            </div>
            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU <span className="text-red-500">*</span>
              </label>
              {(() => {
                const hasColorGroupImages = (formData.colorGroups ?? []).some(
                  (group) => (group.images?.length ?? 0) > 0,
                );

                // Fallback temporal MVP por si todavía hay imágenes pendientes en variantes
                const hasLegacyImages =
                  (formData.images ?? []).length > 0 ||
                  (formData.variants ?? []).some(
                    (v) => (v.images ?? []).length > 0,
                  );

                const hasAnyImages = hasColorGroupImages || hasLegacyImages;
                const skuLocked = isEdit && hasAnyImages;

                return skuLocked ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.sku || ""}
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      No editable
                    </span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={formData.sku || ""}
                    onChange={(e) => {
                      const val = e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9-]/g, "");
                      handleChange("sku", val);
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                      errors.sku
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder={buildSkuPlaceholder()}
                    maxLength={22}
                  />
                );
              })()}
              {errors.sku && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.sku}
                </p>
              )}
              {isEdit &&
                !(
                  (formData.colorGroups ?? []).some(
                    (group) => (group.images?.length ?? 0) > 0,
                  ) ||
                  (formData.images ?? []).length > 0 ||
                  (formData.variants ?? []).some(
                    (v) => (v.images ?? []).length > 0,
                  )
                ) && (
                  <p className="mt-1 text-xs text-amber-600">
                    Sin imágenes — puedes editar el SKU. Se bloqueará al agregar
                    imágenes.
                  </p>
                )}
              {!isEdit && (
                <p className="mt-1 text-xs text-gray-500">
                  Formato: {buildSkuPlaceholder()} — no podrás cambiarlo una vez
                  tengas imágenes
                </p>
              )}
            </div>
            {/* Talla inicial — auto-genera primera variante */}
            {!isEdit && (
              <div className="space-y-3">
                {/* Talla inicial */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Talla inicial
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 25, 25.5, 28"
                    value={(formData.variants ?? [])[0]?.size || ""}
                    onChange={(e) => {
                      const size = e.target.value.replace(/[^0-9.]/g, "");
                      const currentVariants = [...(formData.variants || [])];
                      const parentSku = formData.sku || "";

                      if (!size) {
                        if (
                          currentVariants.length === 1 &&
                          !currentVariants[0].color &&
                          (currentVariants[0].stock || 0) === 0
                        ) {
                          handleChange("variants", []);
                          handleChange("hasVariants", false);
                        } else if (currentVariants.length > 0) {
                          currentVariants[0] = {
                            ...currentVariants[0],
                            size: undefined,
                            sku: buildVariantSku(parentSku, undefined, 1),
                          };
                          handleChange("variants", currentVariants);
                        }
                        return;
                      }

                      if (currentVariants.length === 0) {
                        const newVariant: ProductVariant = {
                          id: Math.random().toString(36).substring(7),
                          sku: buildVariantSku(parentSku, size, 1),
                          size,
                          colorId: undefined,
                          color: undefined,
                          colorHex: undefined,
                          price: formData.price || 0,
                          cost: formData.cost || 0,
                          stock: formData.stock || 0,
                          updatedAt: new Date().toISOString(),
                        };
                        handleChange("variants", [newVariant]);
                        handleChange("hasVariants", true);
                      } else {
                        currentVariants[0] = {
                          ...currentVariants[0],
                          size,
                          sku: buildVariantSku(parentSku, size, 1),
                        };
                        handleChange("variants", currentVariants);
                        if (!formData.hasVariants)
                          handleChange("hasVariants", true);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Al agregar talla se crea automáticamente la primera variante
                    vendible en la tienda
                  </p>
                </div>

                {/* Color inicial */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color inicial <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={(formData.variants ?? [])[0]?.colorId || ""}
                    onChange={(e) => {
                      console.log(
                        "[color select] e.target.value:",
                        e.target.value,
                      );
                      console.log("[color select] colors[0]:", colors[0]);
                      const colorId = e.target.value;
                      const found = colors.find((c) => c.id === colorId);
                      const currentVariants = [...(formData.variants || [])];
                      if (currentVariants.length === 0) return;

                      // Actualizar variante con colorId, color y colorHex
                      currentVariants[0] = {
                        ...currentVariants[0],
                        colorId: colorId || undefined,
                        color: found?.name ?? undefined,
                        colorHex: found?.hex ?? undefined,
                      };

                      // Construir colorGroup si no existe aún
                      const colorGroups = [...(formData.colorGroups || [])];
                      const existingIdx = colorGroups.findIndex(
                        (g) => g.colorId === colorId,
                      );
                      if (colorId && found && existingIdx === -1) {
                        colorGroups.push({
                          colorId: colorId,
                          colorName: found.name,
                          colorHex: found.hex,
                          images: [], // se llena en handleSubmit con las fotos subidas
                        });
                      }

                      handleChange("variants", currentVariants);
                      handleChange("colorGroups", colorGroups);
                    }}
                    disabled={colors.length === 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">
                      {colors.length === 0
                        ? "Cargando colores..."
                        : "Selecciona un color"}
                    </option>
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {/* Círculo de color seleccionado */}
                  {(formData.variants ?? [])[0]?.colorHex && (
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                        style={{
                          backgroundColor: (formData.variants ?? [])[0]
                            ?.colorHex,
                        }}
                      />
                      <span className="text-xs text-gray-500">
                        {(formData.variants ?? [])[0]?.colorHex}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.categoryId || ""}
                onChange={(e) => handleChange("categoryId", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                  errors.categoryId
                    ? "border-red-300 focus:ring-red-500"
                    : "border-gray-300"
                }`}
              >
                {activeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.categoryId}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={formData.status || "DRAFT"}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="DRAFT">Borrador</option>
                <option
                  value="ACTIVE"
                  disabled={!canPublish && originalProduct?.status !== "ACTIVE"}
                >
                  Activo{" "}
                  {!canPublish &&
                    originalProduct?.status !== "ACTIVE" &&
                    "(requiere permiso)"}
                </option>
                <option value="PAUSED">Pausado</option>
                <option value="OUT_OF_STOCK">Agotado</option>
              </select>
              {!canPublish && (
                <p className="mt-1 text-xs text-gray-500">
                  ℹ️ Necesitas permiso de publicación para cambiar el estado a
                  "Activo"
                </p>
              )}
              {canPublish && (
                <p className="mt-1 text-xs text-gray-500">
                  💡 Recomendamos comenzar como "Borrador" hasta completar toda
                  la información
                </p>
              )}
            </div>
          </div>

          {/* Price and Inventory */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              Precio e inventario
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio{" "}
                  {formData.status === "ACTIVE" && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price || ""}
                    onChange={(e) =>
                      handleChange("price", parseFloat(e.target.value) || 0)
                    }
                    className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                      errors.price
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.price}
                  </p>
                )}
                {warnings.price && !errors.price && (
                  <p className="mt-1 text-sm text-yellow-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {warnings.price}
                  </p>
                )}
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock || 0}
                  onChange={(e) =>
                    handleChange("stock", parseInt(e.target.value) || 0)
                  }
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.stock
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300"
                  }`}
                  placeholder="0"
                />
                {errors.stock && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.stock}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Costs and Margins - Only visible with cost:update permission */}
          <RequirePermission permission="cost:update">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-700" />
                <h3 className="text-base font-semibold text-gray-900">
                  Costos y márgenes
                </h3>
              </div>

              {/* Track Cost Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="trackCost"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Rastrear costo de este producto
                  </Label>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    title="Si está desactivado, no se calcularán ganancias ni márgenes para este producto"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                <Switch
                  id="trackCost"
                  checked={formData.trackCost !== false}
                  onCheckedChange={(checked) =>
                    handleChange("trackCost", checked)
                  }
                />
              </div>

              {/* Cost Input - only if trackCost is enabled */}
              {formData.trackCost !== false && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo unitario (COGS)
                    </label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost || ""}
                        onChange={(e) =>
                          handleChange("cost", parseFloat(e.target.value) || 0)
                        }
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Costo de adquisición o producción por unidad
                    </p>
                  </div>

                  {/* Margin Preview - Only if we have both price and cost */}
                  {formData.price && formData.cost && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-900">
                        <TrendingUp className="w-4 h-4" />
                        <span>Preview de ganancia</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Precio</p>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(formData.price)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Costo</p>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(formData.cost)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Ganancia</p>
                          <p className="font-semibold text-green-700">
                            {formatCurrency(
                              calculateUnitProfit(
                                formData.price,
                                formData.cost,
                              ),
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-green-300">
                        <p className="text-xs text-gray-600">Margen</p>
                        <p className="text-lg font-bold text-green-700">
                          {formatPercent(
                            calculateMarginPercent(
                              calculateUnitProfit(
                                formData.price,
                                formData.cost,
                              ),
                              formData.price,
                            ),
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Info about trackCost=false */}
              {formData.trackCost === false && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  <p>
                    El rastreo de costos está desactivado. No se calcularán
                    ganancias ni márgenes para este producto.
                  </p>
                </div>
              )}
            </div>
          </RequirePermission>

          {/* Variants */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Variantes</h3>

            <VariantEditor
              variants={formData.variants || []}
              onChange={(variants) => {
                handleChange("variants", variants);

                // Sincronizar colorGroups con los colores usados en variantes
                const currentGroups = [...(formData.colorGroups || [])];
                for (const v of variants) {
                  if (!v.colorId) continue;
                  const alreadyExists = currentGroups.some(
                    (g) => g.colorId === v.colorId,
                  );
                  if (!alreadyExists) {
                    const found = colors.find((c) => c.id === v.colorId);
                    if (found) {
                      currentGroups.push({
                        colorId: v.colorId,
                        colorName: found.name,
                        colorHex: found.hex,
                        images: [], // se llena en handleSubmit
                      });
                    }
                  }
                }
                handleChange("colorGroups", currentGroups);
              }}
              productSku={formData.sku}
              productPrice={formData.price || 0}
              productId={id}
              hasVariants={formData.hasVariants || false}
              onToggleVariants={(enabled) =>
                handleChange("hasVariants", enabled)
              }
              error={errors.variants}
              variantErrors={errors} // ← agrega esto
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              Descripción
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción corta
              </label>
              <textarea
                value={formData.descriptionShort || ""}
                onChange={(e) =>
                  handleChange("descriptionShort", e.target.value)
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Descripción breve del producto (opcional)"
              />
              <p className="mt-1 text-xs text-gray-500">
                {(formData.descriptionShort || "").length} caracteres
              </p>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Imágenes{" "}
                {formData.status === "ACTIVE" && (
                  <span className="text-red-500">*</span>
                )}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Galería de hasta 6 imágenes. La primera imagen marcada como
                "Principal" será la que se muestre en los listados.
              </p>
            </div>

            <ImagePickerV2
              images={displayImages}
              onChange={(images) => handleChange("images", images)}
              error={errors.images}
              maxImages={6}
              productId={id}
              categoryId={formData.categoryId}
              sku={formData.sku}
              uploadRef={uploadRef} // ← nuevo
            />
          </div>
        </div>
      </div>
      {/* Imágenes por Variante */}
      {formData.hasVariants && (formData.variants || []).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">
            Imágenes por variante
          </h3>
          <VariantImagesSection
            hasVariants={formData.hasVariants || false}
            variants={formData.variants || []}
            productImages={displayImages}
            colorGroups={formData.colorGroups || []}
            onVariantImagesChange={handleVariantImagesChange}
            onVariantUploadRef={handleVariantUploadRef}
            productId={id}
          />
        </div>
      )}
      {/* Actions */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
        >
          Cancelar
        </button>

        <div className="flex items-center gap-3">
          {!isEdit && (
            <button
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
            >
              Guardar como borrador
            </button>
          )}

          <button
            onClick={() => handleSubmit(false)}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? "Guardar cambios" : "Guardar producto"}
              </>
            )}
          </button>
        </div>
      </div>
      {/* Loading Modal */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[260px]">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-gray-700">
              {loadingMessage || "Guardando..."}
            </p>
          </div>
        </div>
      )}
      {/* Discard Dialog */}
      <ConfirmDialog
        isOpen={showDiscardDialog}
        title="¿Descartar cambios?"
        message="Tienes cambios sin guardar. ¿Estás seguro de que deseas salir? Los cambios se perderán."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onConfirm={handleConfirmDiscard}
        onCancel={() => setShowDiscardDialog(false)}
      />
    </div>
  );
}
