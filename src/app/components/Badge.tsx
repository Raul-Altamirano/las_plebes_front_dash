import type { ProductStatus } from '../types/product';

interface BadgeProps {
  status: ProductStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<ProductStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: 'Publicado',
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  DRAFT: {
    label: 'Borrador',
    className: 'bg-gray-100 text-gray-700 border-gray-200'
  },
  PAUSED: {
    label: 'Oculto',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  OUT_OF_STOCK: {
    label: 'Agotado',
    className: 'bg-red-100 text-red-800 border-red-200'
  }
};

export function Badge({ status, size = 'sm' }: BadgeProps) {
  const config = statusConfig[status];
  
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  
  // Fallback if status is invalid or undefined
  if (!config) {
    return (
      <span className={`inline-flex items-center rounded-full border bg-gray-100 text-gray-700 border-gray-200 ${sizeClasses}`}>
        Desconocido
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center rounded-full border ${config.className} ${sizeClasses}`}>
      {config.label}
    </span>
  );
}