import React from 'react';
import { Link } from 'react-router';
import { Package, TrendingUp } from 'lucide-react';
import { type Order } from '../../types/order';

interface ProductSales {
  productId: string;
  name: string;
  sku: string;
  units: number;
  revenue: number;
}

interface TopProductsWidgetProps {
  orders: Order[];
}

export function TopProductsWidget({ orders }: TopProductsWidgetProps) {
  // Calcular top productos por unidades vendidas
  const topProducts = React.useMemo(() => {
    const productMap = new Map<string, ProductSales>();

    // Filtrar órdenes válidas
    const validOrders = orders.filter(o => o.status !== 'CANCELLED');

    validOrders.forEach(order => {
      order.items.forEach(item => {
        const key = item.productId || item.skuSnapshot;
        const existing = productMap.get(key);

        if (existing) {
          existing.units += item.qty;
          existing.revenue += item.lineTotal;
        } else {
          productMap.set(key, {
            productId: item.productId || '',
            name: item.nameSnapshot,
            sku: item.skuSnapshot,
            units: item.qty,
            revenue: item.lineTotal,
          });
        }
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.units - a.units)
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

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">
            Top 5 Productos
          </h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Por unidades vendidas (últimos 30 días)
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {topProducts.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-900">Sin ventas</p>
            <p className="text-xs text-gray-500 mt-1">
              No hay productos vendidos en este período
            </p>
          </div>
        ) : (
          topProducts.map((product, index) => (
            <div key={product.sku} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      SKU: {product.sku}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div>
                        <p className="text-xs text-gray-500">Unidades</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {product.units}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-gray-200"></div>
                      <div>
                        <p className="text-xs text-gray-500">Revenue</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(product.revenue)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {product.productId && (
                  <Link
                    to={`/products/${product.productId}/edit`}
                    className="text-sm text-blue-600 hover:text-blue-700 flex-shrink-0"
                  >
                    Ver
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {topProducts.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <Link
            to="/products"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Ver todos los productos →
          </Link>
        </div>
      )}
    </div>
  );
}
