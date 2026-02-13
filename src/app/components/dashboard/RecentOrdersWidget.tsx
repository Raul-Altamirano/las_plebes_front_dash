import React from 'react';
import { Link } from 'react-router';
import { ShoppingCart, ExternalLink } from 'lucide-react';
import { Order } from '../../types/order';
import { OrderStatusBadge } from '../OrderStatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface RecentOrdersWidgetProps {
  orders: Order[];
}

export function RecentOrdersWidget({ orders }: RecentOrdersWidgetProps) {
  const recentOrders = React.useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [orders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatRelativeTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: es,
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-green-600" />
          <h3 className="text-base font-semibold text-gray-900">
            Pedidos Recientes
          </h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Últimos 5 pedidos creados
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {recentOrders.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-900">Sin pedidos</p>
            <p className="text-xs text-gray-500 mt-1">
              No hay pedidos registrados
            </p>
          </div>
        ) : (
          recentOrders.map((order) => (
            <div key={order.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/orders/${order.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-gray-700 mt-1 truncate">
                    {order.customer.name}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                    <div className="h-8 w-px bg-gray-200"></div>
                    <div>
                      <p className="text-xs text-gray-500">Items</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {order.items.reduce((sum, item) => sum + item.qty, 0)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatRelativeTime(order.createdAt)}
                  </p>
                </div>
                <Link
                  to={`/orders/${order.id}`}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                  title="Ver detalle"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {recentOrders.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <Link
            to="/orders"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Ver todos los pedidos →
          </Link>
        </div>
      )}
    </div>
  );
}
