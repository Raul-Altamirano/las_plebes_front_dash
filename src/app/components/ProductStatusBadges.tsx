import { type Product, type ProductStatus } from '../types/product';
import { isOutOfStockDerived } from '../utils/stockHelpers';

interface ProductStatusBadgesProps {
  product: Product;
  showOutOfStock?: boolean;
}

const STATUS_CONFIG: Record<ProductStatus, { label: string; className: string }> = {
  DRAFT: {
    label: 'Borrador',
    className: 'bg-gray-100 text-gray-700 border border-gray-300',
  },
  ACTIVE: {
    label: 'Publicado',
    className: 'bg-green-100 text-green-700 border border-green-300',
  },
  PAUSED: {
    label: 'Oculto',
    className: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  },
};

export function ProductStatusBadges({ product, showOutOfStock = true }: ProductStatusBadgesProps) {
  const statusConfig = STATUS_CONFIG[product.status];
  const isOutOfStock = showOutOfStock && isOutOfStockDerived(product);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Badge de status real */}
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${statusConfig.className}`}
      >
        {statusConfig.label}
      </span>

      {/* Badge de agotado (solo si aplica) */}
      {isOutOfStock && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700 border border-red-300">
          Agotado
        </span>
      )}
    </div>
  );
}

/**
 * Badge simple de solo status (sin agotado)
 */
export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
