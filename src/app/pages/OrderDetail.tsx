import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, CreditCard, Package, User, AlertCircle, RefreshCw } from 'lucide-react';
import { useOrders } from '../store/OrdersContext';
import { useRMA } from '../store/RMAContext';
import { useAuth } from '../store/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { RMAStatusBadge } from '../components/RMAStatusBadge';
import { OrderTimeline } from '../components/OrderTimeline';
import { OrderItemsTable } from '../components/OrderItemsTable';
import {
  PAYMENT_METHOD_LABELS,
  SALES_CHANNEL_LABELS,
  TERMINAL_STATUSES,
  type PaymentMethod,
  type SalesChannel,
} from '../types/order';
import { RMA_TYPE_LABELS } from '../types/rma';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { useState } from 'react';

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getById, changeOrderStatus } = useOrders();
  const { getRMAsByOrder } = useRMA();
  const { hasPermission } = useAuth();

  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const order = id ? getById(id) : undefined;
  const relatedRMAs = id ? getRMAsByOrder(id) : [];

  if (!order) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Pedidos
        </Button>
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Pedido no encontrado</h3>
          <p className="text-gray-500">El pedido que buscas no existe o fue eliminado.</p>
        </Card>
      </div>
    );
  }

  const canUpdate  = hasPermission('order:update');
  const canFulfill = hasPermission('order:fulfill');
  const canCancel  = hasPermission('order:cancel');
  const isTerminal = TERMINAL_STATUSES.includes(order.status);

  // ── Status transition handlers ───────────────────────────────────────────

  const handleStatusChange = (
    newStatus: Parameters<typeof changeOrderStatus>[1],
    successMsg: string,
  ) => {
    const result = changeOrderStatus(order.id, newStatus);
    if (result.success) {
      toast.success(successMsg);
    } else {
      toast.error(result.error || 'Error al actualizar el pedido');
    }
  };

  const handleCancel = () => {
    const result = changeOrderStatus(order.id, 'CANCELLED');
    if (result.success) {
      toast.success('Pedido cancelado');
      setShowCancelDialog(false);
    } else {
      toast.error(result.error || 'Error al cancelar el pedido');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{order.orderNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Creado el{' '}
              {new Date(order.createdAt).toLocaleDateString('es-MX', {
                day:   '2-digit',
                month: 'long',
                year:  'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <div className="text-sm text-gray-500">
            {SALES_CHANNEL_LABELS[order.channel as SalesChannel]}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main content ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Items del Pedido
            </h3>
            <OrderItemsTable
              items={order.items}
              subtotal={order.subtotal}
              discountTotal={order.discountTotal}
              total={order.total}
              showCosts
            />
          </Card>

          {/* Customer info */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Cliente
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Nombre</p>
                <p className="font-medium text-gray-900">{order.customer.name}</p>
              </div>
              {order.customer.phone && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Teléfono</p>
                  <p className="font-medium text-gray-900">{order.customer.phone}</p>
                </div>
              )}
              {order.customer.email && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
                  <p className="font-medium text-gray-900">{order.customer.email}</p>
                </div>
              )}
              {!order.customerId && (
                <p className="text-xs text-gray-400 italic">Cliente sin cuenta registrada</p>
              )}
            </div>
          </Card>

          {/* Payment info */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Información de Pago
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Método</p>
                <p className="font-medium text-gray-900">
                  {PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod]}
                </p>
              </div>
              {order.paymentRef && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Referencia</p>
                  <p className="font-medium text-gray-900 font-mono text-sm">{order.paymentRef}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notas Internas</h3>
              <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                {order.notes}
              </p>
            </Card>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          {/* Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones</h3>
            <div className="space-y-2">
              {/* PLACED → PAID */}
              {order.status === 'PLACED' && canUpdate && (
                <Button
                  onClick={() => handleStatusChange('PAID', 'Pedido marcado como pagado')}
                  className="w-full"
                >
                  Marcar como Pagado
                </Button>
              )}

              {/* PAID → FULFILLED */}
              {order.status === 'PAID' && canFulfill && (
                <Button
                  onClick={() => handleStatusChange('FULFILLED', 'Pedido marcado como entregado')}
                  className="w-full"
                >
                  Marcar como Entregado
                </Button>
              )}

              {/* FULFILLED → COMPLETED */}
              {order.status === 'FULFILLED' && canFulfill && (
                <Button
                  onClick={() => handleStatusChange('COMPLETED', 'Pedido marcado como completado ✓')}
                  variant="outline"
                  className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  Cerrar Pedido
                </Button>
              )}

              {/* Cancel (solo si no es terminal) */}
              {!isTerminal && canCancel && (
                <Button
                  onClick={() => setShowCancelDialog(true)}
                  variant="destructive"
                  className="w-full"
                >
                  Cancelar Pedido
                </Button>
              )}

              {/* Terminal state messages */}
              {order.status === 'COMPLETED' && (
                <p className="text-center text-sm text-emerald-600 py-2 font-medium">
                  ✓ Pedido cerrado correctamente
                </p>
              )}
              {order.status === 'CANCELLED' && (
                <p className="text-center text-sm text-red-600 py-2">
                  Pedido cancelado
                </p>
              )}
              {order.status === 'REFUNDED' && (
                <p className="text-center text-sm text-yellow-600 py-2">
                  Pedido reembolsado
                </p>
              )}
            </div>
          </Card>

          {/* RMA section */}
          {hasPermission('rma:read') &&
            ['PAID', 'FULFILLED', 'COMPLETED'].includes(order.status) && (
              <Card className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Cambios y Devoluciones
                </h3>
                <div className="space-y-3">
                  {hasPermission('rma:create') && order.status !== 'COMPLETED' && (
                    <Button
                      onClick={() => navigate(`/rma/new?orderId=${order.id}`)}
                      variant="outline"
                      className="w-full"
                    >
                      Registrar cambio/devolución
                    </Button>
                  )}
                  {relatedRMAs.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <p className="text-sm text-gray-600">
                        RMAs relacionados ({relatedRMAs.length})
                      </p>
                      {relatedRMAs.map(rma => (
                        <div
                          key={rma.id}
                          className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/rma/${rma.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-gray-900">
                                {rma.rmaNumber}
                              </p>
                              <p className="text-xs text-gray-500">
                                {RMA_TYPE_LABELS[rma.type]}
                              </p>
                            </div>
                            <RMAStatusBadge status={rma.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

          {/* Timeline */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Historial</h3>
            <OrderTimeline order={order} />
          </Card>
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará el pedido {order.orderNumber}. Si ya se había descontado
              inventario, se restaurará automáticamente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, cancelar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}