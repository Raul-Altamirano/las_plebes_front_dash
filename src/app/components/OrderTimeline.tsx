import { CheckCircle, Circle, XCircle, Clock } from 'lucide-react';
import { type Order, ORDER_STATUS_LABELS } from '../types/order';

interface OrderTimelineProps {
  order: Order;
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const events = [
    {
      status: 'DRAFT',
      label: ORDER_STATUS_LABELS.DRAFT,
      date: order.status === 'DRAFT' ? order.createdAt : null,
      icon: Circle,
      color: 'text-gray-400',
    },
    {
      status: 'PLACED',
      label: ORDER_STATUS_LABELS.PLACED,
      date: ['PLACED', 'PAID', 'FULFILLED'].includes(order.status) ? order.createdAt : null,
      icon: CheckCircle,
      color: 'text-blue-600',
    },
    {
      status: 'PAID',
      label: ORDER_STATUS_LABELS.PAID,
      date: ['PAID', 'FULFILLED'].includes(order.status) ? order.updatedAt : null,
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      status: 'FULFILLED',
      label: ORDER_STATUS_LABELS.FULFILLED,
      date: order.status === 'FULFILLED' ? order.updatedAt : null,
      icon: CheckCircle,
      color: 'text-green-600',
    },
  ];

  // Handle cancelled/refunded separately
  const isCancelled = order.status === 'CANCELLED';
  const isRefunded = order.status === 'REFUNDED';

  if (isCancelled || isRefunded) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">Pedido Creado</div>
            <div className="text-sm text-gray-500">
              {new Date(order.createdAt).toLocaleString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <XCircle className={`w-5 h-5 ${isCancelled ? 'text-red-600' : 'text-yellow-600'}`} />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {isCancelled ? ORDER_STATUS_LABELS.CANCELLED : ORDER_STATUS_LABELS.REFUNDED}
            </div>
            <div className="text-sm text-gray-500">
              {new Date(order.updatedAt).toLocaleString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const Icon = event.icon;
        const isActive = event.date !== null;
        const isPending = !isActive && events.slice(0, index).every(e => e.date !== null);

        return (
          <div key={event.status} className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <Icon
                className={`w-5 h-5 ${
                  isActive ? event.color : isPending ? 'text-gray-300' : 'text-gray-200'
                }`}
              />
            </div>
            <div>
              <div className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                {event.label}
              </div>
              {event.date && (
                <div className="text-sm text-gray-500">
                  {new Date(event.date).toLocaleString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
