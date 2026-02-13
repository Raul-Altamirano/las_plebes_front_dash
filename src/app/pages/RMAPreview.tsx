import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useRMA } from '../store/RMAContext';
import { useOrders } from '../store/OrdersContext';
import { useRMADraft } from '../hooks/useRMADraft';
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import { computeRmaMoney } from '../utils/rmaHelpers';
import { RMA_REASON_LABELS, RMA_SETTLEMENT_LABELS } from '../types/rma';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function RMAPreview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  
  const { createRMA } = useRMA();
  const { getById: getOrderById } = useOrders();
  const { draftData, clearDraft } = useRMADraft(orderId || '');
  const completeOperation = useAsyncOperation();
  
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const order = orderId ? getOrderById(orderId) : null;

  if (!order || !draftData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No se encontró información del RMA</p>
        <Button
          variant="outline"
          onClick={() => navigate('/rma')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a Cambios/Devoluciones
        </Button>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const money = computeRmaMoney(draftData.returnItems, draftData.replacementItems);

  const handleComplete = async () => {
    await completeOperation.execute(async () => {
      const rma = createRMA({
        type: draftData.rmaType,
        status: 'APPROVED',
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customer.name,
        reason: draftData.reason,
        notes: draftData.notes || undefined,
        returnItems: draftData.returnItems,
        replacementItems: draftData.replacementItems,
        money,
      });

      if (rma) {
        clearDraft();
        toast.success('RMA completado exitosamente');
        navigate(`/rma/${rma.id}`);
      }
    });
  };

  const confirmComplete = async () => {
    setShowCompleteConfirm(false);
    await handleComplete();
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    navigate(`/rma/new?orderId=${orderId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/rma/new?orderId=${orderId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver al pedido
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Detalle RMA
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {draftData.rmaType === 'RETURN' ? 'Devolución' : 'Cambio'} - Creado el {new Date().toLocaleDateString('es-MX', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => setShowCompleteConfirm(true)}
          disabled={completeOperation.isLoading}
        >
          {completeOperation.isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-1" />
              Completar RMA
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={completeOperation.isLoading}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Cancelar RMA
        </Button>
      </div>

      {/* Información General */}
      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-medium text-gray-900">Información general</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Pedido</p>
            <p className="text-base font-medium text-blue-600 cursor-pointer hover:underline"
               onClick={() => navigate(`/orders/${order.id}`)}>
              {order.orderNumber}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Cliente</p>
            <p className="text-base font-medium text-gray-900">{order.customer.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tipo</p>
            <p className="text-base font-medium text-gray-900">
              {draftData.rmaType === 'RETURN' ? 'Devolución' : 'Cambio'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Razón</p>
            <p className="text-base font-medium text-gray-900">
              {RMA_REASON_LABELS[draftData.reason]}
            </p>
          </div>
        </div>

        {draftData.notes && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Notas</p>
            <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-lg">{draftData.notes}</p>
          </div>
        )}
      </Card>

      {/* Productos devueltos */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">
          Productos devueltos ({draftData.returnItems.length})
        </h2>
        
        <div className="space-y-3">
          {draftData.returnItems.map(item => (
            <div key={item.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.nameSnapshot}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    SKU: {item.skuSnapshot}
                    {item.optionsSnapshot && (
                      <span className="ml-2">
                        {item.optionsSnapshot.size && `Talla: ${item.optionsSnapshot.size}`}
                        {item.optionsSnapshot.color && ` - Color: ${item.optionsSnapshot.color}`}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Cantidad: {item.qty} × {formatCurrency(item.unitPriceAtSale)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold text-gray-900">
                    {formatCurrency(item.qty * item.unitPriceAtSale)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 flex justify-between items-center">
          <span className="text-base font-medium text-gray-900">Subtotal devolución:</span>
          <span className="text-lg font-semibold text-gray-900">
            {formatCurrency(money.subtotalReturn)}
          </span>
        </div>
      </Card>

      {/* Productos de reemplazo */}
      {draftData.replacementItems.length > 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">
            Productos de reemplazo ({draftData.replacementItems.length})
          </h2>
          
          <div className="space-y-3">
            {draftData.replacementItems.map(item => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.nameSnapshot}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      SKU: {item.skuSnapshot}
                      {item.optionsSnapshot && (
                        <span className="ml-2">
                          {item.optionsSnapshot.size && `Talla: ${item.optionsSnapshot.size}`}
                          {item.optionsSnapshot.color && ` - Color: ${item.optionsSnapshot.color}`}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Cantidad: {item.qty} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-gray-900">
                      {formatCurrency(item.qty * item.unitPrice)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 flex justify-between items-center">
            <span className="text-base font-medium text-gray-900">Subtotal reemplazo:</span>
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(money.subtotalReplacement)}
            </span>
          </div>
        </Card>
      )}

      {/* Resumen financiero */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Resumen financiero</h2>
        
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
            <div className="flex justify-between items-center">
              <span className="text-base font-medium text-gray-900">Diferencia:</span>
              <span className={`text-lg font-bold ${
                money.difference > 0 ? 'text-green-600' : money.difference < 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatCurrency(Math.abs(money.difference))}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-600">Liquidación:</span>
              <span className="text-sm font-medium text-gray-900">
                {RMA_SETTLEMENT_LABELS[money.settlement]}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Confirm Complete Dialog */}
      <ConfirmDialog
        isOpen={showCompleteConfirm}
        title="Completar RMA"
        message={`¿Confirmas que deseas completar ${draftData.rmaType === 'RETURN' ? 'la devolución' : 'el cambio'}? Esta acción guardará el RMA en el sistema.`}
        confirmLabel="Sí, completar"
        cancelLabel="Cancelar"
        onConfirm={confirmComplete}
        onCancel={() => setShowCompleteConfirm(false)}
      />

      {/* Cancel Dialog */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Volver a edición"
        message="¿Deseas regresar a editar el RMA?"
        confirmLabel="Sí, regresar"
        cancelLabel="No"
        onConfirm={confirmCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}
