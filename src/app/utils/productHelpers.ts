import { Product } from '../types/product';
import { DEFAULT_LOW_STOCK_THRESHOLD, RECENT_PRODUCTS_LIMIT, LOW_STOCK_PRODUCTS_LIMIT } from './constants';
import { isOutOfStockDerived, getTotalStock } from './stockHelpers';

export interface ProductQueryState {
  q: string;
  status: string;
  category: string;
  sort: SortOption;
  page: number;
  pageSize: number;
  includeArchived: boolean;
  showOutOfStock?: boolean; // Nuevo filtro para productos agotados
}

export type SortOption = 'UPDATED_DESC' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK_ASC' | 'NAME_ASC';

export const SORT_OPTIONS = [
  { value: 'UPDATED_DESC' as const, label: 'Más recientes' },
  { value: 'PRICE_ASC' as const, label: 'Precio: menor a mayor' },
  { value: 'PRICE_DESC' as const, label: 'Precio: mayor a menor' },
  { value: 'STOCK_ASC' as const, label: 'Stock: menor a mayor' },
  { value: 'NAME_ASC' as const, label: 'Nombre: A-Z' }
];

/**
 * Filter products based on query state
 */
export function filterProducts(products: Product[], queryState: ProductQueryState): Product[] {
  return products.filter((product) => {
    // Search filter (nombre o SKU)
    const searchLower = queryState.q.toLowerCase().trim();
    const matchesSearch = 
      searchLower === '' ||
      product.name.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = 
      queryState.status === 'all' || 
      queryState.status === 'Todos' ||
      product.status === queryState.status;

    // Category filter
    const matchesCategory = 
      queryState.category === 'Todas' || 
      queryState.category === 'all' ||
      product.categoryId === queryState.category;

    // Include archived filter
    const matchesArchived = 
      queryState.includeArchived || 
      !product.isArchived;

    // Show out of stock filter (si está activado, mostrar SOLO agotados)
    const matchesOutOfStock = 
      !queryState.showOutOfStock || 
      isOutOfStockDerived(product);

    return matchesSearch && matchesStatus && matchesCategory && matchesArchived && matchesOutOfStock;
  });
}

/**
 * Sort products based on sort key
 */
export function sortProducts(products: Product[], sortKey: SortOption): Product[] {
  const sorted = [...products];

  switch (sortKey) {
    case 'UPDATED_DESC':
      return sorted.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    case 'PRICE_ASC':
      return sorted.sort((a, b) => a.price - b.price);
    case 'PRICE_DESC':
      return sorted.sort((a, b) => b.price - a.price);
    case 'STOCK_ASC':
      return sorted.sort((a, b) => a.stock - b.stock);
    case 'NAME_ASC':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}

/**
 * Paginate items
 */
export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  return {
    items: items.slice(startIndex, endIndex),
    currentPage,
    totalPages,
    totalItems,
    startIndex: totalItems > 0 ? startIndex + 1 : 0,
    endIndex: totalItems > 0 ? endIndex : 0,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
}

/**
 * Get dashboard metrics
 */
export function getDashboardMetrics(products: Product[], lowStockThreshold: number = DEFAULT_LOW_STOCK_THRESHOLD) {
  const activeProducts = products.filter(p => p.status === 'ACTIVE');
  const drafts = products.filter(p => p.status === 'DRAFT');
  
  // Stock bajo: solo productos ACTIVE o PAUSED con stock <= threshold
  const lowStockProducts = products.filter(
    p => (p.status === 'ACTIVE' || p.status === 'PAUSED') && p.stock <= lowStockThreshold
  );

  // Últimos productos editados (ordenados por updatedAt desc)
  const recentProducts = [...products]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, RECENT_PRODUCTS_LIMIT);

  // Top productos con stock bajo (ordenados por stock ascendente)
  const topLowStock = [...lowStockProducts]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, LOW_STOCK_PRODUCTS_LIMIT);

  return {
    activeProductsCount: activeProducts.length,
    draftsCount: drafts.length,
    lowStockCount: lowStockProducts.length,
    recentProducts,
    topLowStock
  };
}

/**
 * Get relative time string (e.g., "hace 2 días")
 */
export function getRelativeTimeString(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'hace un momento';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  
  // Formato corto para fechas más antiguas
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

/**
 * Get unique categories from products
 * DEPRECATED: Use CategoryStore instead
 */
export function getUniqueCategories(products: Product[]): string[] {
  const categoriesSet = new Set(
    products
      .map(p => p.categoryId)
      .filter((id): id is string => id !== null)
  );
  return Array.from(categoriesSet).sort();
}