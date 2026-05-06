import { CheckCircle, Circle, XCircle, Clock, Star } from 'lucide-react';
import { type Order, ORDER_STATUS_LABELS } from '../types/order';

interface OrderTimelineProps {
  order: Order;
}

// Statuses that break the normal linear flow
const TERMINAL_STATUSES = ['CANCELLED', 'REFUNDED', 'HOLD_REVIEW'] as const;

export function OrderTimeline({ order }: OrderTimelineProps) {
  const events = [
    {
      status: 'DRAFT',
      label: ORDER_STATUS_LABELS.DRAFT,
      date: order.createdAt,
      isReached: true, // siempre true: si existe el pedido, pasó por DRAFT
      icon: Circle,
      activeColor: 'text-gray-500',
    },
    {
      status: 'PLACED',
      label: ORDER_STATUS_LABELS.PLACED,
      date: order.createdAt,
      isReached: ['PLACED', 'PAID', 'FULFILLED', 'COMPLETED'].includes(order.status),
      icon: CheckCircle,
      activeColor: 'text-blue-600',
    },
    {
      status: 'PAID',
      label: ORDER_STATUS_LABELS.PAID,
      date: order.updatedAt,
      isReached: ['PAID', 'FULFILLED', 'COMPLETED'].includes(order.status),
      icon: CheckCircle,
      activeColor: 'text-green-600',
    },
    {
      status: 'FULFILLED',
      label: ORDER_STATUS_LABELS.FULFILLED,
      date: order.updatedAt,
      isReached: ['FULFILLED', 'COMPLETED'].includes(order.status),
      icon: CheckCircle,
      activeColor: 'text-green-600',
    },
    {
      status: 'COMPLETED',
      label: ORDER_STATUS_LABELS.COMPLETED,
      date: order.updatedAt,
      isReached: order.status === 'COMPLETED',
      icon: Star,
      activeColor: 'text-emerald-600',
    },
  ] as const;

  // Render alternativo para estados de corte (cancelado, reembolsado, en revisión)
  if ((TERMINAL_STATUSES as readonly string[]).includes(order.status)) {
    const terminalColors: Record<string, string> = {
      CANCELLED:   'text-red-600',
      REFUNDED:    'text-yellow-600',
      HOLD_REVIEW: 'text-yellow-600',
    };

    return (
      <div className="space-y-4">
        {/* Creado */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">Pedido creado</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {formatDate(order.createdAt)}
            </div>
          </div>
        </div>

        {/* Separador */}
        <div className="ml-2.5 border-l-2 border-dashed border-gray-200 h-4" />

        {/* Estado terminal */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <XCircle className={`w-5 h-5 ${terminalColors[order.status] ?? 'text-gray-400'}`} />
          </div>
          <div>
            <div className={`text-sm font-medium ${terminalColors[order.status] ?? 'text-gray-600'}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {formatDate(order.updatedAt)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Timeline lineal normal
  return (
    <div className="space-y-1">
      {events.map((event, index) => {
        const Icon = event.icon;
        const isLast = index === events.length - 1;

        return (
          <div key={event.status}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    event.isReached ? event.activeColor : 'text-gray-200'
                  }`}
                />
              </div>
              <div className="flex-1 pb-1">
                <div
                  className={`text-sm font-medium transition-colors ${
                    event.isReached ? 'text-gray-900' : 'text-gray-300'
                  }`}
                >
                  {event.label}
                </div>
                {event.isReached && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatDate(event.date)}
                  </div>
                )}
              </div>
            </div>

            {/* Conector vertical entre pasos */}
            {!isLast && (
              <div
                className={`ml-2.5 border-l-2 h-3 transition-colors ${
                  event.isReached ? 'border-gray-300' : 'border-gray-100'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}