import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useRMA } from '../store/RMAContext';
import { useOrders } from '../store/OrdersContext';
import { useProductsStore } from '../store/ProductsContext';
import { useAuth } from '../store/AuthContext';
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import { useRMADraft } from '../hooks/useRMADraft';
import { RMAType, RMAReturnReason, RMAItem, RMAReplacementItem, RMA_REASON_LABELS, RMA_SETTLEMENT_LABELS } from '../types/rma';
import { OrderItem } from '../types/order';
import { Product, ProductVariant } from '../types/product';
import { computeRmaMoney, getOrderItemsReturnInfo } from '../utils/rmaHelpers';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ProductSearchModal } from '../components/ProductSearchModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ArrowLeft, Plus, Trash2, Save, CheckCircle, Minus, XCircle, Loader2, Cloud, CloudOff } from 'lucide-react';
import { toast } from 'sonner';

export function RMANew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  
  const { createRMA } = useRMA();
  const { getById: getOrderById } = useOrders();
  const { getById: getProductById } = useProductsStore();
  const { currentUser } = useAuth();
  
  const completeOperation = useAsyncOperation();

  const [step, setStep] = useState(1);
  const [rmaType, setRmaType] = useState<RMAType>('RETURN');
  const [reason, setReason] = useState<RMAReturnReason>('SIZE');
  const [notes, setNotes] = useState('');
  const [returnItems, setReturnItems] = useState<RMAItem[]>([]);
  const [replacementItems, setReplacementItems] = useState<RMAReplacementItem[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const order = orderId ? getOrderById(orderId) : null;
  const { saveDraft, clearDraft, draftData, saveStatus, isSaving } = useRMADraft(orderId || '');

  // Flag para trackear si ya se restauró el draft
  const hasRestoredDraft = useRef(false);

  // Restaurar draft al montar (SOLO UNA VEZ)
  useEffect(() => {
    if (draftData && !hasRestoredDraft.current) {
      setRmaType(draftData.rmaType);
      setReason(draftData.reason);
      setNotes(draftData.notes);
      setReturnItems(draftData.returnItems);
      setReplacementItems(draftData.replacementItems);
      setStep(draftData.step || 1);
      toast.info('Borrador restaurado');
      hasRestoredDraft.current = true; // Marcar como restaurado
    }
  }, [draftData]);

  // Auto-save con debounce
  useEffect(() => {
    if (!orderId) return;

    const timeoutId = setTimeout(() => {
      saveDraft({
        orderId,
        rmaType,
        reason,
        notes,
        returnItems,
        replacementItems,
        step, // Guardar el paso actual también
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [orderId, rmaType, reason, notes, returnItems, replacementItems, step, saveDraft]);

  useEffect(() => {
    if (!orderId || !order) {
      toast.error('Pedido no encontrado');
      navigate('/rma');
    }
  }, [orderId, order, navigate]);

  if (!order) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  // Agregar/actualizar item a devolver desde el pedido
  const handleToggleReturnItem = (orderItem: OrderItem, checked: boolean, maxQty: number) => {
    if (checked) {
      // Agregar con cantidad = 1 por defecto
      const newReturnItem: RMAItem = {
        id: `return_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        originalOrderItemId: orderItem.id,
        skuSnapshot: orderItem.skuSnapshot,
        nameSnapshot: orderItem.nameSnapshot,
        optionsSnapshot: orderItem.optionsSnapshot,
        qty: 1,
        unitPriceAtSale: orderItem.unitPrice,
        unitCostAtSale: orderItem.unitCost,
        productId: orderItem.productId,
        variantId: orderItem.variantId,
      };
      setReturnItems([...returnItems, newReturnItem]);
    } else {
      // Remover
      setReturnItems(returnItems.filter(item => item.originalOrderItemId !== orderItem.id));
    }
  };

  const handleUpdateReturnQty = (orderItemId: string, qty: number, maxQty: number) => {
    setReturnItems(
      returnItems.map(item =>
        item.originalOrderItemId === orderItemId 
          ? { ...item, qty: Math.max(1, Math.min(qty, maxQty)) } 
          : item
      )
    );
  };

  const handleRemoveReturnItem = (id: string) => {
    setReturnItems(returnItems.filter(item => item.id !== id));
  };

  const handleSelectReplacementProduct = (product: Product, variant?: ProductVariant) => {
    let sku = product.sku;
    let name = product.name;
    let price = product.price;
    let cost = product.cost;
    let options: { size?: string; color?: string } | undefined;
    let variantId: string | undefined;

    if (variant) {
      sku = variant.sku;
      options = variant.options;
      price = variant.price || product.price;
      cost = variant.cost || product.cost;
      variantId = variant.id;
    }

    const newReplacementItem: RMAReplacementItem = {
      id: `replacement_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      productId: product.id,
      variantId,
      skuSnapshot: sku,
      nameSnapshot: name,
      optionsSnapshot: options,
      qty: 1,
      unitPrice: price,
      unitCost: cost,
    };

    setReplacementItems([...replacementItems, newReplacementItem]);
    setShowProductSearch(false);
  };

  const handleRemoveReplacementItem = (id: string) => {
    setReplacementItems(replacementItems.filter(item => item.id !== id));
  };

  const handleUpdateReplacementQty = (id: string, qty: number) => {
    // Calcular el máximo permitido basado en los items a devolver
    const totalReturnQty = returnItems.reduce((sum, item) => sum + item.qty, 0);
    const totalReplacementQtyExcludingCurrent = replacementItems
      .filter(item => item.id !== id)
      .reduce((sum, item) => sum + item.qty, 0);
    const maxAllowed = totalReturnQty - totalReplacementQtyExcludingCurrent;
    
    setReplacementItems(
      replacementItems.map(item =>
        item.id === id ? { ...item, qty: Math.max(1, Math.min(qty, maxAllowed)) } : item
      )
    );
  };

  const handleUpdateReplacementPrice = (id: string, price: number) => {
    setReplacementItems(
      replacementItems.map(item =>
        item.id === id ? { ...item, unitPrice: Math.max(0, price) } : item
      )
    );
  };

  const canProceedToStep2 = returnItems.length > 0;
  const canProceedToStep3 = rmaType === 'RETURN' || replacementItems.length > 0;

  const handleGoToStep2 = () => {
    setStep(2);
    toast.success('Paso 1 guardado', {
      duration: 2000,
      position: 'bottom-right',
    });
  };

  const handleGoToStep3 = () => {
    setStep(3);
    toast.success('Paso 2 guardado', {
      duration: 2000,
      position: 'bottom-right',
    });
  };

  const handleComplete = async () => {
    await completeOperation.execute(async () => {
      // Validaciones
      if (returnItems.length === 0) {
        toast.error('Debes agregar al menos un producto a devolver');
        return;
      }

      if (rmaType === 'EXCHANGE' && replacementItems.length === 0) {
        toast.error('Debes agregar al menos un producto de reemplazo');
        return;
      }

      const money = computeRmaMoney(returnItems, replacementItems);

      // ESTE ES EL ÚNICO LUGAR donde se crea el RMA oficial
      const rma = createRMA({
        type: rmaType,
        status: 'APPROVED',
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customer.name,
        reason,
        notes: notes || undefined,
        returnItems,
        replacementItems,
        money,
      });

      if (rma) {
        clearDraft(); // Limpiar el borrador al completar
        toast.success('RMA completado exitosamente');
        navigate(`/rma/${rma.id}`);
      }
    });
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    clearDraft(); // Limpiar el borrador al cancelar
    setShowCancelConfirm(false);
    navigate(`/orders/${order.id}`);
  };

  const money = computeRmaMoney(returnItems, replacementItems);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/orders/${order.id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver al pedido
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Nueva Devolución/Cambio
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Pedido: {order.orderNumber} - {order.customer.name}
            </p>
          </div>
        </div>
        
        {/* Save status indicator */}
        {returnItems.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-gray-600">Guardando...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Cloud className="h-4 w-4 text-green-600" />
                <span className="text-green-600">Guardado</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <CloudOff className="h-4 w-4 text-red-600" />
                <span className="text-red-600">Error al guardar</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-4">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s}
            </div>
            <span className="text-sm text-gray-600">
              {s === 1 && 'Items a devolver'}
              {s === 2 && 'Reemplazos (opcional)'}
              {s === 3 && 'Liquidación'}
            </span>
            {s < 3 && <div className="w-12 h-0.5 bg-gray-300 ml-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Return items */}
      {step === 1 && (
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Paso 1: Items a devolver</h2>
            <p className="text-sm text-gray-500 mt-1">
              Selecciona los productos que el cliente desea devolver
            </p>
          </div>

          {/* Tipo de RMA */}
          <div className="space-y-2">
            <Label>Tipo de operación</Label>
            <Select value={rmaType} onValueChange={(value: RMAType) => setRmaType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RETURN">Devolución (sin cambio)</SelectItem>
                <SelectItem value="EXCHANGE">Cambio por otro producto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Razón */}
          <div className="space-y-2">
            <Label>Razón</Label>
            <Select value={reason} onValueChange={(value: RMAReturnReason) => setReason(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RMA_REASON_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Items del pedido disponibles para devolución */}
          <div className="space-y-4">
            <Label>Productos del pedido</Label>
            <div className="border rounded-lg divide-y">
              {order.items.map(orderItem => {
                // Buscar si este item ya está incluido en returnItems
                const returnItem = returnItems.find(
                  ri => ri.originalOrderItemId === orderItem.id
                );
                const isIncluded = !!returnItem;
                const currentQty = returnItem?.qty || 1;
                
                // Calcular cantidad disponible
                const alreadyReturned = returnItems.filter(
                  ri => ri.originalOrderItemId === orderItem.id
                ).reduce((sum, ri) => sum + ri.qty, 0);
                const maxQty = orderItem.qty - alreadyReturned + (isIncluded ? currentQty : 0);

                return (
                  <div key={orderItem.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        disabled={maxQty === 0 && !isIncluded}
                        onChange={(e) => handleToggleReturnItem(orderItem, e.target.checked, maxQty)}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                      />
                      
                      {/* Info del producto */}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{orderItem.nameSnapshot}</div>
                        <div className="text-sm text-gray-500">
                          SKU: {orderItem.skuSnapshot}
                          {orderItem.optionsSnapshot && (
                            <span className="ml-2">
                              {orderItem.optionsSnapshot.size && `Talla: ${orderItem.optionsSnapshot.size}`}
                              {orderItem.optionsSnapshot.color && ` - Color: ${orderItem.optionsSnapshot.color}`}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatCurrency(orderItem.unitPrice)} c/u
                        </div>
                        
                        {/* Cantidades info */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                          <span>Comprada: <strong>{orderItem.qty}</strong></span>
                          {alreadyReturned > 0 && !isIncluded && (
                            <span className="text-orange-600">Ya devuelta: <strong>{alreadyReturned}</strong></span>
                          )}
                          <span className={maxQty === 0 ? 'text-red-600' : 'text-green-600'}>
                            Disponible: <strong>{maxQty}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stepper de cantidad - Solo si está incluido */}
                    {isIncluded && (
                      <div className="ml-7 pl-4 border-l-2 border-blue-200">
                        <div className="flex items-center gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs">Cantidad a devolver</Label>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateReturnQty(orderItem.id, currentQty - 1, maxQty)}
                                disabled={currentQty <= 1}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min={1}
                                max={maxQty}
                                value={currentQty}
                                onChange={(e) => {
                                  const newQty = parseInt(e.target.value) || 1;
                                  handleUpdateReturnQty(orderItem.id, newQty, maxQty);
                                }}
                                className="h-8 w-16 text-center"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateReturnQty(orderItem.id, currentQty + 1, maxQty)}
                                disabled={currentQty >= maxQty}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm text-gray-500 ml-2">
                                de {maxQty}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 text-right">
                            <div className="text-xs text-gray-500">Subtotal</div>
                            <div className="text-base font-semibold text-gray-900">
                              {formatCurrency(currentQty * orderItem.unitPrice)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Return items agregados */}
          {returnItems.length > 0 && (
            <div className="space-y-2">
              <Label>Items a devolver ({returnItems.length})</Label>
              <div className="border rounded-lg divide-y">
                {returnItems.map(item => (
                  <div key={item.id} className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.nameSnapshot}</div>
                      <div className="text-sm text-gray-500">
                        SKU: {item.skuSnapshot} - Cantidad: {item.qty} - {formatCurrency(item.unitPriceAtSale)} c/u
                      </div>
                      <div className="text-sm font-medium text-gray-900 mt-1">
                        Subtotal: {formatCurrency(item.qty * item.unitPriceAtSale)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveReturnItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas adicionales sobre la devolución..."
              rows={3}
            />
          </div>

          {/* Resumen de devolución */}
          {returnItems.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">
                    {returnItems.length} {returnItems.length === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Total a devolver: {formatCurrency(money.subtotalReturn)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              onClick={handleGoToStep2}
              disabled={!canProceedToStep2}
            >
              Continuar
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Replacement items */}
      {step === 2 && (() => {
        // Calcular totales
        const totalReturnQty = returnItems.reduce((sum, item) => sum + item.qty, 0);
        const totalReplacementQty = replacementItems.reduce((sum, item) => sum + item.qty, 0);
        const canAddMore = totalReplacementQty < totalReturnQty;
        const remainingSlots = totalReturnQty - totalReplacementQty;

        return (
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Paso 2: Productos de reemplazo
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {rmaType === 'EXCHANGE'
                  ? 'Selecciona los productos que se entregarán como cambio'
                  : 'Puedes omitir este paso si es solo una devolución'}
              </p>
            </div>

            {/* Botón para agregar productos - siempre visible pero con mensaje contextual */}
            <div>
              {rmaType === 'EXCHANGE' ? (
                <div className="space-y-3">
                  <Button 
                    onClick={() => setShowProductSearch(true)}
                    disabled={!canAddMore}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar producto de reemplazo
                  </Button>
                  <div className="text-sm text-gray-600">
                    {canAddMore ? (
                      <span>
                        Puedes agregar {remainingSlots} {remainingSlots === 1 ? 'producto' : 'productos'} más
                        {' '}(Total a devolver: {totalReturnQty})
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">
                        ✓ Ya agregaste {totalReplacementQty} {totalReplacementQty === 1 ? 'producto' : 'productos'} de reemplazo
                        {' '}(coincide con la cantidad a devolver)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">
                    Este es un RMA de tipo <strong>RETURN</strong> (devolución simple).
                    Si necesitas agregar productos de reemplazo, regresa al paso 1 y cambia el tipo a <strong>EXCHANGE</strong>.
                  </p>
                </div>
              )}
            </div>

            {replacementItems.length > 0 && (
              <div className="space-y-2">
                <Label>Productos de reemplazo ({replacementItems.length})</Label>
                <div className="border rounded-lg divide-y">
                  {replacementItems.map(item => {
                    const product = getProductById(item.productId);
                    let availableStock = 0;
                    if (product) {
                      if (item.variantId && product.hasVariants && product.variants) {
                        const variant = product.variants.find(v => v.id === item.variantId);
                        availableStock = variant?.stock || 0;
                      } else {
                        availableStock = product.stock;
                      }
                    }

                    return (
                      <div key={item.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.nameSnapshot}</div>
                            <div className="text-sm text-gray-500">
                              SKU: {item.skuSnapshot}
                              {item.optionsSnapshot && (
                                <span className="ml-2">
                                  {item.optionsSnapshot.size && `Talla: ${item.optionsSnapshot.size}`}
                                  {item.optionsSnapshot.color && ` - Color: ${item.optionsSnapshot.color}`}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              Stock disponible: {availableStock}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveReplacementItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Cantidad</Label>
                            <Input
                              type="number"
                              min={1}
                              max={availableStock}
                              value={item.qty}
                              onChange={e => handleUpdateReplacementQty(item.id, parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Precio unitario</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.unitPrice}
                              onChange={e => handleUpdateReplacementPrice(item.id, parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          Subtotal: {formatCurrency(item.qty * item.unitPrice)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Anterior
              </Button>
              <Button
                onClick={handleGoToStep3}
                disabled={!canProceedToStep3}
              >
                Continuar
              </Button>
            </div>
          </Card>
        );
      })()}

      {/* Step 3: Settlement */}
      {step === 3 && (
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Paso 3: Liquidación</h2>
            <p className="text-sm text-gray-500 mt-1">
              Resumen de la operación
            </p>
          </div>

          {/* Resumen */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal devolución:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(money.subtotalReturn)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal reemplazo:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(money.subtotalReplacement)}
              </span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span className="text-base font-medium text-gray-900">Diferencia:</span>
                <span className={`text-base font-bold ${
                  money.difference > 0 ? 'text-green-600' : money.difference < 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {formatCurrency(Math.abs(money.difference))}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {RMA_SETTLEMENT_LABELS[money.settlement]}
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-between gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancel}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar RMA
            </Button>
            <Button
              onClick={() => navigate(`/rma/preview?orderId=${orderId}&draft=true`)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Resumen RMA
            </Button>
          </div>
        </Card>
      )}

      {/* Product search modal */}
      <ProductSearchModal
        isOpen={showProductSearch}
        onSelectProduct={handleSelectReplacementProduct}
        onClose={() => setShowProductSearch(false)}
      />

      {/* Cancel confirmation dialog */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Cancelar RMA"
        message={`¿Seguro que deseas cancelar ${rmaType === 'RETURN' ? 'la devolución' : 'el cambio'}? Se perderán todos los datos ingresados.`}
        confirmLabel="Sí, cancelar"
        cancelLabel="No, continuar"
        onConfirm={confirmCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}