import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { Plus, Download, Archive, ChevronDown } from 'lucide-react';
import { useProductsStore } from '../store/ProductsContext';
import { useCategories } from '../store/CategoryContext';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { useProductsQueryParams } from '../hooks/useProductsQueryParams';
import { useDebounce } from '../hooks/useDebounce';
import { FilterBar } from '../components/FilterBar';
import { DataTable } from '../components/DataTable';
import { PaginationControls } from '../components/PaginationControls';
import { SkeletonTable } from '../components/SkeletonLoader';
import { BulkActionsBar } from '../components/BulkActionsBar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { VariantsModal } from '../components/VariantsModal';
import { 
  filterProducts, 
  sortProducts, 
  paginate
} from '../utils/productHelpers';
import { isOutOfStockDerived } from '../utils/stockHelpers';
import { exportToCSV, formatDateForCSV, formatMoneyForCSV } from '../utils/csvExport';

export function Products() {
  const { products, bulkUpdateStatus, archiveProduct } = useProductsStore();
  const { list: listCategories } = useCategories();
  const { hasPermission, user } = useAuth();
  const { auditLog } = useAudit();
  const {
    queryState,
    setSearch,
    setStatus,
    setCategory,
    setSort,
    setPage,
    setPageSize,
    setIncludeArchived,
    setShowOutOfStock,
    resetFilters
  } = useProductsQueryParams();

  // Loading state (simulated)
  const [isLoading, setIsLoading] = useState(false);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Variantes modal state
  const [variantsModal, setVariantsModal] = useState<{
    isOpen: boolean;
    product: any | null;
  }>({
    isOpen: false,
    product: null
  });
  
  // Export menu state
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Bulk action confirm dialog
  const [bulkConfirmDialog, setBulkConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  // Debounce search query (300ms)
  const debouncedQuery = useDebounce(queryState.q, 300);
  
  // Check if user is typing in search
  const isSearching = queryState.q !== debouncedQuery;

  // Simulate loading when filters or pagination change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [debouncedQuery, queryState.status, queryState.category, queryState.sort, queryState.page, queryState.pageSize, queryState.includeArchived]);

  // Get available categories (only active ones for filters)
  const availableCategories = useMemo(() => {
    const activeCategories = listCategories(false); // No archivadas
    return [
      { value: 'Todas', label: 'Todas' },
      ...activeCategories.map(cat => ({
        value: cat.id,
        label: cat.name
      }))
    ];
  }, [listCategories]);

  // Apply filters, sort, and pagination
  const processedData = useMemo(() => {
    // Use debounced query for filtering
    const queryWithDebouncedSearch = { ...queryState, q: debouncedQuery };
    
    // Filter products
    const filtered = filterProducts(products, queryWithDebouncedSearch);
    
    // Sort products
    const sorted = sortProducts(filtered, queryState.sort);
    
    // Paginate results
    const paginated = paginate(sorted, queryState.page, queryState.pageSize);
    
    return { ...paginated, allFiltered: sorted };
  }, [products, debouncedQuery, queryState.status, queryState.category, queryState.sort, queryState.page, queryState.pageSize, queryState.includeArchived, queryState.showOutOfStock]);

  // Calcular total de productos agotados (sin filtros)
  const outOfStockCount = useMemo(() => {
    return products.filter(p => !p.isArchived && isOutOfStockDerived(p)).length;
  }, [products]);

  // Check if user can create products
  const canCreateProducts = hasPermission('product:create');
  const canPublish = hasPermission('product:publish');
  const canDelete = hasPermission('product:delete');

  // Clear selection when changing filters
  useEffect(() => {
    setSelectedIds([]);
  }, [queryState.status, queryState.category, queryState.page, debouncedQuery, queryState.includeArchived]);

  // Bulk actions handlers
  const handleBulkPause = () => {
    const count = selectedIds.length;
    bulkUpdateStatus(selectedIds, 'PAUSED');
    auditLog({
      action: 'BULK_STATUS_CHANGED',
      entity: {
        type: 'products',
        id: 'bulk',
        label: `${count} productos`
      },
      metadata: {
        productIds: selectedIds,
        newStatus: 'PAUSED',
        count
      }
    });
    setSelectedIds([]);
  };

  const handleBulkActivate = () => {
    // Validar que todos los productos tengan imágenes y precio válido
    const productsToActivate = products.filter(p => selectedIds.includes(p.id));
    const invalidProducts = productsToActivate.filter(p => p.images.length === 0 || p.price <= 0);

    if (invalidProducts.length > 0) {
      const invalidNames = invalidProducts.map(p => p.name).join(', ');
      setBulkConfirmDialog({
        isOpen: true,
        title: 'No se pueden activar algunos productos',
        message: `Los siguientes productos no tienen imágenes o precio válido: ${invalidNames}`,
        onConfirm: () => {
          setBulkConfirmDialog({ ...bulkConfirmDialog, isOpen: false });
        },
      });
      return;
    }

    const count = selectedIds.length;
    bulkUpdateStatus(selectedIds, 'ACTIVE');
    auditLog({
      action: 'BULK_STATUS_CHANGED',
      entity: {
        type: 'products',
        id: 'bulk',
        label: `${count} productos`
      },
      metadata: {
        productIds: selectedIds,
        newStatus: 'ACTIVE',
        count
      }
    });
    setSelectedIds([]);
  };

  const handleBulkArchive = () => {
    const count = selectedIds.length;
    setBulkConfirmDialog({
      isOpen: true,
      title: 'Archivar productos',
      message: `¿Estás seguro de que deseas archivar ${count} ${count === 1 ? 'producto' : 'productos'}? Se ocultarán del listado pero podrás restaurarlos después.`,
      onConfirm: () => {
        selectedIds.forEach(id => archiveProduct(id));
        auditLog({
          action: 'BULK_ARCHIVED',
          entity: {
            type: 'products',
            id: 'bulk',
            label: `${count} productos`
          },
          metadata: {
            productIds: selectedIds,
            count
          }
        });
        setSelectedIds([]);
        setBulkConfirmDialog({ ...bulkConfirmDialog, isOpen: false });
      },
    });
  };

  // Export CSV handler
  const handleExportCSV = () => {
    const canViewCosts = hasPermission('cost:read');
    const categories = listCategories(true); // Incluir todas para lookup
    
    // Preparar datos para exportación
    const exportData = processedData.allFiltered.map(product => {
      const category = categories.find(c => c.id === product.categoryId);
      
      const row: any = {
        sku: product.sku,
        name: product.name,
        price: formatMoneyForCSV(product.price),
        stock: product.stock.toString(),
        status: product.status,
        category: category ? category.name : '',
        hasVariants: product.hasVariants ? 'Sí' : 'No',
        updatedAt: formatDateForCSV(product.updatedAt),
        isArchived: product.isArchived ? 'Sí' : 'No',
      };
      
      if (canViewCosts && product.cost !== undefined) {
        row.cost = formatMoneyForCSV(product.cost);
      }
      
      return row;
    });
    
    exportToCSV(exportData, 'productos');
    
    auditLog({
      action: 'CSV_EXPORTED',
      entity: {
        type: 'products',
        id: 'export',
        label: `${processedData.allFiltered.length} productos`
      },
      metadata: {
        filters: {
          q: queryState.q,
          status: queryState.status,
          category: queryState.category,
          includeArchived: queryState.includeArchived,
        },
        count: processedData.allFiltered.length
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona tu catálogo de productos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          {canCreateProducts && (
            <Link
              to="/products/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo producto
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        searchQuery={queryState.q}
        onSearchChange={setSearch}
        selectedStatus={queryState.status}
        onStatusChange={setStatus}
        selectedCategory={queryState.category}
        onCategoryChange={setCategory}
        categories={availableCategories}
        sortBy={queryState.sort}
        onSortChange={setSort}
        onClearFilters={resetFilters}
        isSearching={isSearching}
      />

      {/* Toggles: Archived & Out of Stock */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="includeArchived"
            checked={queryState.includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="includeArchived" className="text-sm text-gray-700 cursor-pointer">
            Incluir archivados
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showOutOfStock"
            checked={queryState.showOutOfStock}
            onChange={(e) => setShowOutOfStock(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showOutOfStock" className="text-sm text-gray-700 cursor-pointer">
            Solo agotados
            {outOfStockCount > 0 && (
              <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700">
                {outOfStockCount}
              </span>
            )}
          </label>
        </div>
      </div>

      {/* Results Info & Page Size */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {processedData.totalItems === 0 ? (
            'No hay productos'
          ) : (
            <>
              {processedData.totalItems} {processedData.totalItems === 1 ? 'producto' : 'productos'}
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Mostrar:</span>
          <select
            value={queryState.pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-2 py-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
          onPause={handleBulkPause}
          onActivate={handleBulkActivate}
          onArchive={handleBulkArchive}
        />
      )}

      {/* Table or Skeleton */}
      {isLoading ? (
        <SkeletonTable rows={queryState.pageSize} />
      ) : (
        <DataTable 
          products={processedData.items} 
          onClearFilters={resetFilters}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}

      {/* Pagination */}
      {!isLoading && processedData.totalItems > 0 && (
        <PaginationControls
          currentPage={processedData.currentPage}
          totalPages={processedData.totalPages}
          onPageChange={setPage}
          startIndex={processedData.startIndex}
          endIndex={processedData.endIndex}
          totalItems={processedData.totalItems}
        />
      )}

      {/* Bulk Confirm Dialog */}
      <ConfirmDialog
        isOpen={bulkConfirmDialog.isOpen}
        title={bulkConfirmDialog.title}
        message={bulkConfirmDialog.message}
        confirmLabel="Confirmar"
        onConfirm={bulkConfirmDialog.onConfirm}
        onCancel={() => setBulkConfirmDialog({ ...bulkConfirmDialog, isOpen: false })}
      />
    </div>
  );
}