import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useRMA } from '../store/RMAContext';
import { useAuth } from '../store/AuthContext';
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import { RMAStatusBadge } from '../components/RMAStatusBadge';
import { RMA_TYPE_LABELS, RMA_REASON_LABELS, RMA_SETTLEMENT_LABELS, RMA_PAYMENT_METHOD_LABELS } from '../types/rma';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function RMADetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getById, completeRMA, cancelRMA } = useRMA();
  const { hasPermission } = useAuth();

  const completeOperation = useAsyncOperation();
  const cancelOperation = useAsyncOperation();

  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [revertInventory, setRevertInventory] = useState(false);

  const rma = id ? getById(id) : undefined;

  if (!rma) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">RMA no encontrado</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/rma')}
          >
            Volver al listado
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleComplete = async () => {
    const result = await completeOperation.execute(async () => completeRMA(rma.id));
    if (result.success) {
      toast.success('RMA completado exitosamente');
      setShowCompleteConfirm(false);
    } else {
      toast.error(result.error || 'Error al completar RMA');
    }
  };

  const handleCancel = async () => {
    const result = await cancelOperation.execute(async () => cancelRMA(rma.id, revertInventory));
    if (result.success) {
      toast.success('RMA cancelado exitosamente');
      setShowCancelConfirm(false);
      setRevertInventory(false);
    } else {
      toast.error(result.error || 'Error al cancelar RMA');
    }
  };

  const canComplete = hasPermission('rma:complete') && (rma.status === 'DRAFT' || rma.status === 'APPROVED');
  const canCancel = hasPermission('rma:cancel') && rma.status !== 'CANCELLED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/rma')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver al listado
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{rma.rmaNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {RMA_TYPE_LABELS[rma.type]} - Creado el {formatDate(rma.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <RMAStatusBadge status={rma.status} />
        </div>
      </div>

      {/* Actions */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          {canComplete && (
            <Button
              onClick={() => setShowCompleteConfirm(true)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Completar RMA
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              onClick={() => setShowCancelConfirm(true)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancelar RMA
            </Button>
          )}
        </div>
      </Card>

      {/* Info básica */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Información general</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Pedido</div>
            <Link
              to={`/orders/${rma.orderId}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {rma.orderNumber}
            </Link>
          </div>
          <div>
            <div className="text-sm text-gray-500">Cliente</div>
            <div className="font-medium text-gray-900">{rma.customerName || 'Sin cliente'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Tipo</div>
            <div className="font-medium text-gray-900">{RMA_TYPE_LABELS[rma.type]}</div>
          </div>
          {rma.reason && (
            <div>
              <div className="text-sm text-gray-500">Razón</div>
              <div className="font-medium text-gray-900">{RMA_REASON_LABELS[rma.reason]}</div>
            </div>
          )}
        </div>
        {rma.notes && (
          <div>
            <div className="text-sm text-gray-500">Notas</div>
            <div className="text-gray-900 mt-1">{rma.notes}</div>
          </div>
        )}
      </Card>

      {/* Items devueltos */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">
          Productos devueltos ({rma.returnItems.length})
        </h2>
        <div className="border rounded-lg divide-y">
          {rma.returnItems.map(item => (
            <div key={item.id} className="p-4">
              <div className="flex justify-between">
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
                  <div className="text-sm text-gray-600 mt-1">
                    Cantidad: {item.qty} × {formatCurrency(item.unitPriceAtSale)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    {formatCurrency(item.qty * item.unitPriceAtSale)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t pt-4">
          <span className="font-medium text-gray-900">Subtotal devolución:</span>
          <span className="font-bold text-gray-900">
            {formatCurrency(rma.money.subtotalReturn)}
          </span>
        </div>
      </Card>

      {/* Items de reemplazo */}
      {rma.replacementItems.length > 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">
            Productos de reemplazo ({rma.replacementItems.length})
          </h2>
          <div className="border rounded-lg divide-y">
            {rma.replacementItems.map(item => (
              <div key={item.id} className="p-4">
                <div className="flex justify-between">
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
                    <div className="text-sm text-gray-600 mt-1">
                      Cantidad: {item.qty} × {formatCurrency(item.unitPrice)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(item.qty * item.unitPrice)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t pt-4">
            <span className="font-medium text-gray-900">Subtotal reemplazo:</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(rma.money.subtotalReplacement)}
            </span>
          </div>
        </Card>
      )}

      {/* Liquidación */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Liquidación</h2>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal devolución:</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(rma.money.subtotalReturn)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal reemplazo:</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(rma.money.subtotalReplacement)}
            </span>
          </div>
          <div className="border-t pt-3">
            <div className="flex justify-between items-center">
              <span className="text-base font-medium text-gray-900">Diferencia:</span>
              <span className={`text-lg font-bold ${
                rma.money.difference > 0 ? 'text-green-600' : rma.money.difference < 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatCurrency(Math.abs(rma.money.difference))}
              </span>
            </div>
            <div className="mt-2 text-sm">
              <span className="text-gray-600">Liquidación: </span>
              <span className="font-medium text-gray-900">
                {RMA_SETTLEMENT_LABELS[rma.money.settlement]}
              </span>
            </div>
            {rma.money.method && (
              <div className="text-sm mt-1">
                <span className="text-gray-600">Método: </span>
                <span className="font-medium text-gray-900">
                  {RMA_PAYMENT_METHOD_LABELS[rma.money.method]}
                </span>
              </div>
            )}
            {rma.money.ref && (
              <div className="text-sm mt-1">
                <span className="text-gray-600">Referencia: </span>
                <span className="font-medium text-gray-900">{rma.money.ref}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Historial</h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <div className="w-0.5 h-full bg-gray-200" />
            </div>
            <div className="flex-1 pb-4">
              <div className="text-sm font-medium text-gray-900">RMA creado</div>
              <div className="text-xs text-gray-500">{formatDate(rma.createdAt)}</div>
            </div>
          </div>
          {rma.completedAt && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-green-600" />
                <div className="w-0.5 h-full bg-gray-200" />
              </div>
              <div className="flex-1 pb-4">
                <div className="text-sm font-medium text-gray-900">RMA completado</div>
                <div className="text-xs text-gray-500">{formatDate(rma.completedAt)}</div>
              </div>
            </div>
          )}
          {rma.cancelledAt && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-red-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">RMA cancelado</div>
                <div className="text-xs text-gray-500">{formatDate(rma.cancelledAt)}</div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Complete confirm dialog */}
      <ConfirmDialog
        isOpen={showCompleteConfirm}
        title="Completar RMA"
        message="¿Estás seguro de completar este RMA? Se ajustará el inventario automáticamente."
        confirmLabel="Sí, completar"
        cancelLabel="Cancelar"
        onConfirm={handleComplete}
        onCancel={() => setShowCompleteConfirm(false)}
        isLoading={completeOperation.isLoading}
      />

      {/* Cancel confirm dialog */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Cancelar RMA"
        message={
          rma.status === 'COMPLETED'
            ? '¿Deseas revertir los cambios de inventario al cancelar este RMA?'
            : '¿Estás seguro de cancelar este RMA?'
        }
        confirmLabel="Sí, cancelar"
        cancelLabel="No"
        onConfirm={handleCancel}
        onCancel={() => setShowCancelConfirm(false)}
        isLoading={cancelOperation.isLoading}
      >
        {rma.status === 'COMPLETED' && (
          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={revertInventory}
                onChange={e => setRevertInventory(e.target.checked)}
                className="rounded border-gray-300"
                disabled={cancelOperation.isLoading}
              />
              <span className="text-sm text-gray-700">
                Revertir inventario (deshacer ajustes)
              </span>
            </label>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}