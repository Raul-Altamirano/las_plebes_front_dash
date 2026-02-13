import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Archive, 
  ArchiveRestore, 
  Eye,
  Edit, 
  Copy,
  Trash2,
  MoreVertical,
  ChevronDown,
  ImageIcon,
  Package,
  Settings,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useProductsStore } from '../store/ProductsContext';
import { useCategories } from '../store/CategoryContext';
import { useAudit } from '../store/AuditContext';
import { useToast } from '../store/ToastContext';
import { calculateTotalStock } from '../utils/productStateHelpers';
import type { Product } from '../types/product';
import { Badge } from './Badge';
import { PriceWithDiscount } from './PriceWithDiscount';
import { EmptyState } from './EmptyState';
import { ConfirmDialog } from './ConfirmDialog';

interface DataTableProps {
  products: Product[];
  onClearFilters?: () => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function DataTable({ products, onClearFilters, selectedIds, onSelectionChange }: DataTableProps) {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { archiveProduct, restoreProduct, createProduct, getById } = useProductsStore();
  const { getById: getCategoryById } = useCategories();
  const { auditLog } = useAudit();
  const { showToast } = useToast();
  
  const [confirmDialog, setConfirmDialog] = useState<{
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
  
  // Determinar si el usuario solo puede ajustar stock (rol OPS)
  const canOnlyAdjustStock = hasPermission('inventory:update') && !hasPermission('product:update');
  const canEdit = hasPermission('product:update') || hasPermission('inventory:update');
  const canDelete = hasPermission('product:delete');
  const canCreate = hasPermission('product:create');
  
  // Texto para el botón de editar
  const editButtonText = canOnlyAdjustStock ? 'Ajustar stock' : 'Editar';
  const editButtonTitle = canOnlyAdjustStock ? 'Ajustar stock' : 'Editar producto';
  const EditIcon = canOnlyAdjustStock ? Settings : Edit;

  // Manejo de selección
  const isAllSelected = products.length > 0 && products.every(p => selectedIds.includes(p.id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(products.map(p => p.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  // Archivar producto
  const handleArchive = (product: Product) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Archivar producto',
      message: `¿Estás seguro de que deseas archivar "${product.name}"? El producto se ocultará del listado pero podrás restaurarlo después.`,
      onConfirm: () => {
        archiveProduct(product.id);
        auditLog({
          action: 'PRODUCT_ARCHIVED',
          entity: {
            type: 'product',
            id: product.id,
            label: product.name,
          },
        });
        showToast('success', 'Producto archivado correctamente');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Restaurar producto
  const handleRestore = (product: Product) => {
    restoreProduct(product.id);
    auditLog({
      action: 'PRODUCT_RESTORED',
      entity: {
        type: 'product',
        id: product.id,
        label: product.name,
      },
    });
    showToast('success', 'Producto restaurado correctamente');
  };

  // Duplicar producto
  const handleDuplicate = (product: Product) => {
    const newProduct: Product = {
      ...product,
      id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${product.name} (Copia)`,
      sku: `${product.sku}-COPY-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      status: 'DRAFT',
      stock: 0,
      isArchived: false,
      updatedAt: new Date().toISOString(),
    };
    
    createProduct(newProduct);
    auditLog({
      action: 'PRODUCT_CLONED',
      entity: {
        type: 'product',
        id: newProduct.id,
        label: newProduct.name,
      },
      metadata: {
        sourceProductId: product.id,
        sourceProductName: product.name,
      },
    });
    
    showToast('success', 'Producto duplicado correctamente');
    
    // Redirigir al edit del duplicado
    navigate(`/products/${newProduct.id}/edit`);
  };

  // Helper para obtener nombre de categoría
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Sin categoría';
    const category = getCategoryById(categoryId);
    return category?.name || 'Sin categoría';
  };

  if (products.length === 0) {
    return (
      <EmptyState
        title="No se encontraron productos"
        description="No hay productos que coincidan con los filtros seleccionados."
        showClearFilters={!!onClearFilters}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = isSomeSelected;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => {
                const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
                const isSelected = selectedIds.includes(product.id);
                
                return (
                  <tr 
                    key={product.id} 
                    className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(product.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {primaryImage ? (
                          <img
                            src={primaryImage.url}
                            alt={primaryImage.alt || product.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{product.name}</span>
                          {product.isArchived && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              Archivado
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <PriceWithDiscount product={product} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge status={product.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getCategoryName(product.categoryId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <Link
                            to={`/products/${product.id}/edit`}
                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                            title={editButtonTitle}
                          >
                            <EditIcon className="w-4 h-4" />
                          </Link>
                        )}
                        
                        {canCreate && (
                          <button
                            onClick={() => handleDuplicate(product)}
                            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                            title="Duplicar producto"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        
                        {canDelete && (
                          product.isArchived ? (
                            <button
                              onClick={() => handleRestore(product)}
                              className="p-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded"
                              title="Restaurar producto"
                            >
                              <ArchiveRestore className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchive(product)}
                              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                              title="Archivar producto"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {products.map((product) => {
            const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
            const isSelected = selectedIds.includes(product.id);
            
            return (
              <div 
                key={product.id} 
                className={`p-4 ${isSelected ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectOne(product.id)}
                    className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  
                  {primaryImage ? (
                    <img
                      src={primaryImage.url}
                      alt={primaryImage.alt || product.name}
                      className="w-16 h-16 rounded object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
                      {product.isArchived && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          Archivado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{product.sku}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge status={product.status} />
                      <span className="text-xs text-gray-500">{getCategoryName(product.categoryId)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <PriceWithDiscount product={product} />
                      <span className="text-xs text-gray-600">Stock: {product.stock}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  {canEdit && (
                    <Link
                      to={`/products/${product.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      <EditIcon className="w-4 h-4" />
                      {editButtonText}
                    </Link>
                  )}
                  
                  {canCreate && (
                    <button
                      onClick={() => handleDuplicate(product)}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  
                  {canDelete && (
                    product.isArchived ? (
                      <button
                        onClick={() => handleRestore(product)}
                        className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100"
                        title="Restaurar"
                      >
                        <ArchiveRestore className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchive(product)}
                        className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
                        title="Archivar"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Archivar"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}