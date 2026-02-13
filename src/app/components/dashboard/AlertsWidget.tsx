import React from 'react';
import { Link } from 'react-router';
import { AlertCircle, Package, ShoppingCart, RefreshCw } from 'lucide-react';

interface AlertsWidgetProps {
  lowStockCount: number;
  pendingOrdersCount: number;
  pendingRMAsCount: number;
  lowStockThreshold?: number;
}

export function AlertsWidget({
  lowStockCount,
  pendingOrdersCount,
  pendingRMAsCount,
  lowStockThreshold = 5,
}: AlertsWidgetProps) {
  const alerts = [
    {
      icon: Package,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      count: lowStockCount,
      label: 'productos con stock bajo',
      description: `Stock ≤ ${lowStockThreshold} unidades`,
      link: '/products?sort=STOCK_ASC',
      show: lowStockCount > 0,
    },
    {
      icon: ShoppingCart,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      count: pendingOrdersCount,
      label: 'pedidos pendientes',
      description: 'Requieren procesamiento',
      link: '/orders?status=pending',
      show: pendingOrdersCount > 0,
    },
    {
      icon: RefreshCw,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100',
      count: pendingRMAsCount,
      label: 'RMAs pendientes',
      description: 'Esperando aprobación o completado',
      link: '/rma?status=pending',
      show: pendingRMAsCount > 0,
    },
  ];

  const visibleAlerts = alerts.filter(a => a.show);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <h3 className="text-base font-semibold text-gray-900">
            Alertas y Pendientes
          </h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Acciones que requieren tu atención
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {visibleAlerts.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Todo al día</p>
            <p className="text-xs text-gray-500 mt-1">
              No hay alertas pendientes
            </p>
          </div>
        ) : (
          visibleAlerts.map((alert, index) => (
            <Link
              key={index}
              to={alert.link}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-10 h-10 ${alert.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <alert.icon className={`w-5 h-5 ${alert.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-900">
                      {alert.count}
                    </span>
                    <span className="text-sm text-gray-700">
                      {alert.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {alert.description}
                  </p>
                </div>
              </div>
              <div className="text-blue-600 group-hover:text-blue-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))
        )}
      </div>

      {visibleAlerts.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            Click en cada alerta para ver más detalles
          </p>
        </div>
      )}
    </div>
  );
}
