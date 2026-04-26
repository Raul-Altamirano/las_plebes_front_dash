import { type OrderItem } from '../types/order';
import { useAuth } from '../store/AuthContext';

interface OrderItemsTableProps {
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  /** Mostrar columna de costo (requiere permiso cost:read) */
  showCosts?: boolean;
}

export function OrderItemsTable({
  items,
  subtotal,
  discountTotal,
  total,
  showCosts,
}: OrderItemsTableProps) {
  const { hasPermission } = useAuth();
  const canViewCosts = showCosts && hasPermission('cost:read');

  const totalUnits = items.reduce((sum, item) => sum + item.qty, 0);
  const totalCost = canViewCosts
    ? items.reduce((sum, item) => sum + (item.lineCostTotal ?? 0), 0)
    : null;
  const grossProfit = totalCost !== null ? total - totalCost : null;
  const margin =
    grossProfit !== null && total > 0 ? (grossProfit / total) * 100 : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 text-left font-medium text-gray-500 pr-4">Producto</th>
            <th className="py-2 text-left font-medium text-gray-500 pr-4 whitespace-nowrap">SKU</th>
            <th className="py-2 text-center font-medium text-gray-500 pr-4">Cant.</th>
            <th className="py-2 text-right font-medium text-gray-500 pr-4 whitespace-nowrap">
              P. Unitario
            </th>
            {canViewCosts && (
              <th className="py-2 text-right font-medium text-gray-500 pr-4 whitespace-nowrap">
                Costo
              </th>
            )}
            <th className="py-2 text-right font-medium text-gray-500">Subtotal</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
              {/* Producto */}
              <td className="py-3 pr-4">
                <div className="font-medium text-gray-900 leading-snug">
                  {item.nameSnapshot}
                </div>
                {item.optionsSnapshot && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {item.optionsSnapshot.size && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        T: {item.optionsSnapshot.size}
                      </span>
                    )}
                    {item.optionsSnapshot.color && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        C: {item.optionsSnapshot.color}
                      </span>
                    )}
                  </div>
                )}
              </td>

              {/* SKU */}
              <td className="py-3 pr-4">
                <code className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                  {item.skuSnapshot}
                </code>
              </td>

              {/* Cantidad */}
              <td className="py-3 pr-4 text-center">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-medium text-xs">
                  {item.qty}
                </span>
              </td>

              {/* Precio unitario */}
              <td className="py-3 pr-4 text-right tabular-nums text-gray-700 whitespace-nowrap">
                ${item.unitPrice.toFixed(2)}
              </td>

              {/* Costo por línea (solo con permiso) */}
              {canViewCosts && (
                <td className="py-3 pr-4 text-right tabular-nums text-gray-500 whitespace-nowrap">
                  {item.lineCostTotal != null ? (
                    `$${item.lineCostTotal.toFixed(2)}`
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              )}

              {/* Subtotal línea */}
              <td className="py-3 text-right tabular-nums font-medium text-gray-900 whitespace-nowrap">
                ${item.lineTotal.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div className="border-t border-gray-200 mt-1 pt-3 space-y-1.5">
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            Subtotal{' '}
            <span className="text-gray-400 font-normal">
              ({totalUnits} {totalUnits === 1 ? 'pieza' : 'piezas'})
            </span>
          </span>
          <span className="tabular-nums">${subtotal.toFixed(2)}</span>
        </div>

        {discountTotal > 0 && (
          <div className="flex justify-between text-sm text-emerald-600">
            <span>Descuento</span>
            <span className="tabular-nums">−${discountTotal.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-gray-200">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="text-lg font-semibold text-gray-900 tabular-nums">
            ${total.toFixed(2)}
          </span>
        </div>

        {/* Métricas de margen (solo admin con permiso) */}
        {canViewCosts && totalCost !== null && grossProfit !== null && margin !== null && (
          <div className="pt-2 border-t border-dashed border-gray-200 space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Costo total</span>
              <span className="tabular-nums">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Utilidad bruta</span>
              <span
                className={`tabular-nums font-medium ${
                  grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                ${grossProfit.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Margen</span>
              <span
                className={`tabular-nums font-medium ${
                  margin >= 30
                    ? 'text-emerald-600'
                    : margin >= 15
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {margin.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
