import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, Save, Loader2, AlertCircle, ShieldAlert, DollarSign, TrendingUp, Info } from 'lucide-react';
import { useProductsStore } from '../store/ProductsContext';
import { useCategories } from '../store/CategoryContext';
import { useToast } from '../store/ToastContext';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { ImagePickerV2 } from '../components/ImagePickerV2';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { VariantEditor } from '../components/VariantEditor';
import { RequirePermission } from '../components/RequirePermission';
import { validateProductDraft, validateProductActive } from '../utils/validation';
import { getEffectiveCost, calculateUnitProfit, calculateMarginPercent, formatCurrency, formatPercent } from '../utils/costHelpers';
import type { Product, ProductStatus, ProductImage, ProductVariant } from '../types/product';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';

export function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, createProduct, updateProduct, getById } = useProductsStore();
  const { list: listCategories, getById: getCategoryById } = useCategories();
  const { showToast } = useToast();
  const { currentUser, hasPermission } = useAuth();
  const { auditLog } = useAudit();
  
  const isEdit = Boolean(id);
  const [isLoading, setIsLoading] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Verificar permisos
  const canUpdateProduct = hasPermission('product:update');
  const canUpdateInventory = hasPermission('inventory:update');
  const canPublish = hasPermission('product:publish');
  const canUploadMedia = hasPermission('media:upload');

  // Modo "stock-only" para rol OPS
  const isStockOnlyMode = !canUpdateProduct && canUpdateInventory;

  // Get active categories
  const activeCategories = listCategories(false); // No archivadas

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    price: 0,
    stock: 0,
    status: 'DRAFT',
    categoryId: activeCategories.length > 0 ? activeCategories[0].id : null,
    descriptionShort: '',
    images: [],
    hasVariants: false,
    variants: [],
    cost: 0,
    trackCost: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});

  // Producto original (para detectar cambios y audit)
  const [originalProduct, setOriginalProduct] = useState<Product | null>(null);

  // Load product data in edit mode
  useEffect(() => {
    if (isEdit && id) {
      const product = getById(id);
      if (product) {
        setFormData(product);
        setOriginalProduct(product);
      } else {
        showToast('error', 'Producto no encontrado');
        navigate('/products');
      }
    }
  }, [id, isEdit, getById, navigate, showToast]);

  // Track form changes
  useEffect(() => {
    if (isEdit) {
      const original = getById(id!);
      if (original) {
        const hasChanges = JSON.stringify(formData) !== JSON.stringify(original);
        setIsDirty(hasChanges);
      }
    } else {
      const hasData = formData.name || formData.sku || (formData.images && formData.images.length > 0);
      setIsDirty(Boolean(hasData));
    }
  }, [formData, isEdit, id, getById]);

  const handleChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (targetStatus: ProductStatus): boolean => {
    const productToValidate = { ...formData, status: targetStatus };
    
    const validation = targetStatus === 'DRAFT'
      ? validateProductDraft(productToValidate, products, id)
      : validateProductActive(productToValidate, products, id);

    // Convert validation errors to record
    const errorRecord: Record<string, string> = {};
    validation.errors.forEach(err => {
      errorRecord[err.field] = err.message;
    });

    const warningRecord: Record<string, string> = {};
    validation.warnings.forEach(warn => {
      warningRecord[warn.field] = warn.message;
    });

    setErrors(errorRecord);
    setWarnings(warningRecord);

    return validation.isValid;
  };

  const handleSubmit = async (saveAsDraft: boolean = false) => {
    const targetStatus = saveAsDraft ? 'DRAFT' : (formData.status || 'ACTIVE');
    
    // Validación de permisos para publicar
    if (targetStatus === 'ACTIVE' && !canPublish && originalProduct?.status !== 'ACTIVE') {
      showToast('error', 'No tienes permiso para publicar productos');
      return;
    }

    if (!validateForm(targetStatus)) {
      showToast('error', 'Por favor corrige los errores antes de guardar');
      return;
    }

    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const productData: Product = {
        id: id || Math.random().toString(36).substring(7),
        name: formData.name!,
        sku: formData.sku!,
        price: formData.price || 0,
        stock: formData.stock || 0,
        status: targetStatus,
        categoryId: formData.categoryId!,
        descriptionShort: formData.descriptionShort,
        images: formData.images || [],
        updatedAt: new Date().toISOString(),
        isArchived: originalProduct?.isArchived || false,
        hasVariants: formData.hasVariants || false,
        variants: formData.variants || [],
        cost: formData.cost,
        trackCost: formData.trackCost !== undefined ? formData.trackCost : true,
      };

      const actor = {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      };

      if (isEdit) {
        updateProduct(productData);
        
        // Registrar audit log
        if (originalProduct) {
          auditLog({
            action: 'PRODUCT_UPDATED',
            entity: {
              type: 'product',
              id: productData.id,
              label: productData.name,
            },
            changes: [
              { field: 'product', oldValue: originalProduct.name, newValue: productData.name }
            ]
          });
        }
        
        showToast('success', 'Producto actualizado correctamente');
      } else {
        createProduct(productData);
        
        // Registrar audit log
        auditLog({
          action: 'PRODUCT_CREATED',
          entity: {
            type: 'product',
            id: productData.id,
            label: productData.name,
          },
          changes: []
        });
        
        showToast('success', 'Producto creado correctamente');
      }

      setIsDirty(false);
      navigate('/products');
    } catch (error) {
      showToast('error', 'Error al guardar el producto');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit para modo stock-only
  const handleStockOnlySubmit = async () => {
    if (!originalProduct) return;

    // Validar que el stock sea válido
    if (formData.stock === undefined || formData.stock < 0) {
      setErrors({ stock: 'El stock debe ser mayor o igual a 0' });
      showToast('error', 'Por favor ingresa un stock válido');
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const productData: Product = {
        ...originalProduct,
        stock: formData.stock,
        updatedAt: new Date().toISOString()
      };

      updateProduct(productData);
      
      // Registrar audit log específico de ajuste de stock
      auditLog({
        action: 'STOCK_ADJUSTED',
        entity: {
          type: 'product',
          id: productData.id,
          label: productData.name,
        },
        changes: [
          { field: 'stock', oldValue: originalProduct.stock.toString(), newValue: formData.stock.toString() }
        ]
      });
      
      showToast('success', 'Stock actualizado correctamente');
      setIsDirty(false);
      navigate('/products');
    } catch (error) {
      showToast('error', 'Error al actualizar el stock');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      navigate('/products');
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardDialog(false);
    setIsDirty(false);
    navigate('/products');
  };

  // MODO STOCK-ONLY (para usuarios OPS)
  if (isStockOnlyMode && isEdit && originalProduct) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link to="/products" className="hover:text-gray-900">Productos</Link>
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
            <h1 className="text-2xl font-semibold text-gray-900">Ajustar Stock</h1>
            <p className="text-sm text-gray-600 mt-1">{formData.name}</p>
          </div>
        </div>

        {/* Info notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Modo limitado de edición</p>
            <p className="mt-1">Tu rol solo te permite ajustar el stock de productos. Para modificar otros campos, contacta a un administrador.</p>
          </div>
        </div>

        {/* Stock Only Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Read-only fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Nombre</label>
              <p className="text-gray-900">{originalProduct.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">SKU</label>
              <p className="text-gray-900">{originalProduct.sku}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Precio</label>
              <p className="text-gray-900">${originalProduct.price.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Categoría</label>
              <p className="text-gray-900">{originalProduct.categoryId && getCategoryById(originalProduct.categoryId)?.name || 'Sin categoría'}</p>
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
              onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                errors.stock ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
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
        <Link to="/products" className="hover:text-gray-900">Productos</Link>
        <span>/</span>
        <span className="text-gray-900">{isEdit ? 'Editar' : 'Nuevo'}</span>
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
            {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isEdit ? `Editando: ${formData.name || 'Sin nombre'}` : 'Completa la información del producto'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Información básica</h3>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                  errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
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
              <input
                type="text"
                value={formData.sku || ''}
                onChange={(e) => handleChange('sku', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                  errors.sku ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: BV-001-BRN"
              />
              {errors.sku && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.sku}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.categoryId || ''}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                  errors.categoryId ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
              >
                {activeCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                value={formData.status || 'DRAFT'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="DRAFT">Borrador</option>
                <option value="ACTIVE" disabled={!canPublish && originalProduct?.status !== 'ACTIVE'}>
                  Activo {!canPublish && originalProduct?.status !== 'ACTIVE' && '(requiere permiso)'}
                </option>
                <option value="PAUSED">Pausado</option>
                <option value="OUT_OF_STOCK">Agotado</option>
              </select>
              {!canPublish && (
                <p className="mt-1 text-xs text-gray-500">
                  ℹ️ Necesitas permiso de publicación para cambiar el estado a "Activo"
                </p>
              )}
              {canPublish && (
                <p className="mt-1 text-xs text-gray-500">
                  💡 Recomendamos comenzar como "Borrador" hasta completar toda la información
                </p>
              )}
            </div>
          </div>

          {/* Price and Inventory */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Precio e inventario</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio {formData.status === 'ACTIVE' && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price || ''}
                    onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                    className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                      errors.price ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
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
                  onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.stock ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
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
                <h3 className="text-base font-semibold text-gray-900">Costos y márgenes</h3>
              </div>

              {/* Track Cost Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="trackCost" className="text-sm font-medium text-gray-700 cursor-pointer">
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
                  onCheckedChange={(checked) => handleChange('trackCost', checked)}
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
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost || ''}
                        onChange={(e) => handleChange('cost', parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Costo de adquisición o producción por unidad
                    </p>
                  </div>

                  {/* Margin Preview - Only if we have both price and cost */}
                  {(formData.price && formData.cost) && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-900">
                        <TrendingUp className="w-4 h-4" />
                        <span>Preview de ganancia</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Precio</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(formData.price)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Costo</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(formData.cost)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Ganancia</p>
                          <p className="font-semibold text-green-700">
                            {formatCurrency(calculateUnitProfit(formData.price, formData.cost))}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-green-300">
                        <p className="text-xs text-gray-600">Margen</p>
                        <p className="text-lg font-bold text-green-700">
                          {formatPercent(
                            calculateMarginPercent(
                              calculateUnitProfit(formData.price, formData.cost),
                              formData.price
                            )
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
                  <p>El rastreo de costos está desactivado. No se calcularán ganancias ni márgenes para este producto.</p>
                </div>
              )}
            </div>
          </RequirePermission>

          {/* Variants */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Variantes</h3>

            <VariantEditor
              variants={formData.variants || []}
              onChange={(variants) => handleChange('variants', variants)}
              productSku={formData.sku}
              productPrice={formData.price || 0}
              productId={id}
              hasVariants={formData.hasVariants || false}
              onToggleVariants={(enabled) => handleChange('hasVariants', enabled)}
              onStockChange={(totalStock) => handleChange('stock', totalStock)}
              error={errors.variants}
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Descripción</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción corta
              </label>
              <textarea
                value={formData.descriptionShort || ''}
                onChange={(e) => handleChange('descriptionShort', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Descripción breve del producto (opcional)"
              />
              <p className="mt-1 text-xs text-gray-500">
                {(formData.descriptionShort || '').length} caracteres
              </p>
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Imágenes {formData.status === 'ACTIVE' && <span className="text-red-500">*</span>}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Galería de hasta 6 imágenes. La primera imagen marcada como "Principal" será la que se muestre en los listados.
              </p>
            </div>

            <ImagePickerV2
              images={formData.images || []}
              onChange={(images) => handleChange('images', images)}
              error={errors.images}
              maxImages={6}
              productId={id}
            />
          </div>
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
                {isEdit ? 'Guardar cambios' : 'Guardar producto'}
              </>
            )}
          </button>
        </div>
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