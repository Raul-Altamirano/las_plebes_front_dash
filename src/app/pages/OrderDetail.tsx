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
import {
  PAYMENT_METHOD_LABELS,
  SALES_CHANNEL_LABELS,
  PaymentMethod,
  SalesChannel,
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

  const canUpdate = hasPermission('order:update');
  const canFulfill = hasPermission('order:fulfill');
  const canCancel = hasPermission('order:cancel');

  const handleMarkPaid = () => {
    const result = changeOrderStatus(order.id, 'PAID');
    if (result.success) {
      toast.success('Pedido marcado como pagado');
    } else {
      toast.error(result.error || 'Error al actualizar el pedido');
    }
  };

  const handleMarkFulfilled = () => {
    const result = changeOrderStatus(order.id, 'FULFILLED');
    if (result.success) {
      toast.success('Pedido marcado como entregado');
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
                day: '2-digit',
                month: 'long',
                year: 'numeric',
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
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Items del Pedido
            </h3>
            <div className="space-y-3">
              {order.items.map(item => (
                <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.nameSnapshot}</div>
                    <div className="text-sm text-gray-500">
                      SKU: {item.skuSnapshot}
                      {item.optionsSnapshot && (
                        <span className="ml-2">
                          {item.optionsSnapshot.size && `Talla: ${item.optionsSnapshot.size}`}
                          {item.optionsSnapshot.size && item.optionsSnapshot.color && ' • '}
                          {item.optionsSnapshot.color && `Color: ${item.optionsSnapshot.color}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-medium text-gray-900">
                      {item.qty} × ${item.unitPrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">${item.lineTotal.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Descuento:</span>
                <span className="font-medium text-gray-900">${order.discountTotal.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-medium text-gray-900">Total:</span>
                <span className="text-xl font-semibold text-gray-900">${order.total.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Customer info */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Cliente
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Nombre:</span>
                <div className="font-medium text-gray-900">{order.customer.name}</div>
              </div>
              {order.customer.phone && (
                <div>
                  <span className="text-sm text-gray-600">Teléfono:</span>
                  <div className="font-medium text-gray-900">{order.customer.phone}</div>
                </div>
              )}
              {order.customer.email && (
                <div>
                  <span className="text-sm text-gray-600">Email:</span>
                  <div className="font-medium text-gray-900">{order.customer.email}</div>
                </div>
              )}
            </div>
          </Card>

          {/* Payment info */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Información de Pago
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Método de pago:</span>
                <div className="font-medium text-gray-900">
                  {PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod]}
                </div>
              </div>
              {order.paymentRef && (
                <div>
                  <span className="text-sm text-gray-600">Referencia:</span>
                  <div className="font-medium text-gray-900">{order.paymentRef}</div>
                </div>
              )}
            </div>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notas Internas</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones</h3>
            <div className="space-y-2">
              {order.status === 'PLACED' && canUpdate && (
                <Button onClick={handleMarkPaid} className="w-full">
                  Marcar como Pagado
                </Button>
              )}
              {order.status === 'PAID' && canFulfill && (
                <Button onClick={handleMarkFulfilled} className="w-full">
                  Marcar como Entregado
                </Button>
              )}
              {['DRAFT', 'PLACED', 'PAID'].includes(order.status) && canCancel && (
                <Button
                  onClick={() => setShowCancelDialog(true)}
                  variant="destructive"
                  className="w-full"
                >
                  Cancelar Pedido
                </Button>
              )}
              {order.status === 'FULFILLED' && (
                <div className="text-center text-sm text-gray-500 py-2">
                  Pedido completado
                </div>
              )}
              {order.status === 'CANCELLED' && (
                <div className="text-center text-sm text-red-600 py-2">
                  Pedido cancelado
                </div>
              )}
            </div>
          </Card>

          {/* RMA section */}
          {hasPermission('rma:read') && (order.status === 'PAID' || order.status === 'FULFILLED') && (
            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Cambios y Devoluciones
              </h3>
              <div className="space-y-3">
                {hasPermission('rma:create') && (
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
                    <div className="text-sm text-gray-600">
                      RMAs relacionados ({relatedRMAs.length})
                    </div>
                    {relatedRMAs.map(rma => (
                      <div
                        key={rma.id}
                        className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/rma/${rma.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">
                              {rma.rmaNumber}
                            </div>
                            <div className="text-xs text-gray-500">
                              {RMA_TYPE_LABELS[rma.type]}
                            </div>
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
              Esta acción cancelará el pedido {order.orderNumber}. Si ya se había descontado inventario, se
              restaurará automáticamente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
              Sí, cancelar pedido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}