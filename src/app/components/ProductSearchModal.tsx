import { useState } from 'react';
import { Search, Package, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useProductsStore } from '../store/ProductsContext';
import { type Product, type ProductVariant } from '../types/product';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product, variant?: ProductVariant) => void;
}

export function ProductSearchModal({ isOpen, onClose, onSelectProduct }: ProductSearchModalProps) {
  const { products } = useProductsStore();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Filter active, non-archived products
  const activeProducts = products.filter(p => !p.isArchived && p.status === 'ACTIVE');

  // Search filter
  const filteredProducts = activeProducts.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleProductClick = (product: Product) => {
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
    } else {
      onSelectProduct(product);
      handleClose();
    }
  };

  const handleVariantClick = (product: Product, variant: ProductVariant) => {
    onSelectProduct(product, variant);
    handleClose();
  };

  const handleClose = () => {
    setSearch('');
    setSelectedProduct(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{selectedProduct ? 'Seleccionar Variante' : 'Buscar Producto'}</DialogTitle>
          <DialogDescription>
            {selectedProduct
              ? 'Elige la variante del producto que deseas agregar.'
              : 'Busca por nombre o SKU para agregar al pedido.'}
          </DialogDescription>
        </DialogHeader>

        {!selectedProduct ? (
          <div className="space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {/* Products list */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No se encontraron productos activos</p>
                </div>
              ) : (
                filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                        {product.hasVariants && (
                          <div className="text-xs text-blue-600 mt-1">
                            {product.variants?.length || 0} variante(s) disponibles
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-medium text-gray-900">${product.price.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">Stock: {product.stock}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Back button */}
            <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>
              ← Volver a productos
            </Button>

            {/* Product info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">{selectedProduct.name}</div>
              <div className="text-sm text-gray-500">SKU: {selectedProduct.sku}</div>
            </div>

            {/* Variants list */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {selectedProduct.variants?.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => handleVariantClick(selectedProduct, variant)}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={variant.stock === 0}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {variant.options.size && `Talla: ${variant.options.size}`}
                        {variant.options.size && variant.options.color && ' • '}
                        {variant.options.color && `Color: ${variant.options.color}`}
                      </div>
                      <div className="text-sm text-gray-500">SKU: {variant.sku}</div>
                      {variant.stock === 0 && (
                        <div className="text-xs text-red-600 mt-1">Sin stock</div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-medium text-gray-900">
                        ${(variant.price || selectedProduct.price).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">Stock: {variant.stock}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}