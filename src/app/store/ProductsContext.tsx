import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { type Product } from '../types/product';
import { mockProducts as initialProducts } from '../data/mockProducts';
import { useAudit } from './AuditContext';
import { useAuth } from './AuthContext';
import { isOutOfStockDerived } from '../utils/stockHelpers';

interface ProductsState {
  products: Product[];
}

type ProductsAction =
  | { type: 'CREATE_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'ARCHIVE_PRODUCT'; payload: string }
  | { type: 'RESTORE_PRODUCT'; payload: string }
  | { type: 'BULK_UPDATE_STATUS'; payload: { ids: string[]; status: Product['status'] } }
  | { type: 'PUBLISH_PRODUCT'; payload: string }
  | { type: 'HIDE_PRODUCT'; payload: string }
  | { type: 'ADJUST_STOCK'; payload: { productId: string; adjustment: number; variantId?: string } };

interface ProductsContextValue {
  products: Product[];
  createProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  archiveProduct: (id: string) => void;
  restoreProduct: (id: string) => void;
  bulkUpdateStatus: (ids: string[], status: Product['status']) => void;
  publishProduct: (id: string) => Promise<void>;
  hideProduct: (id: string) => Promise<void>;
  getById: (id: string) => Product | undefined;
  isSkuAvailable: (sku: string, currentId?: string) => boolean;
  adjustStock: (productId: string, adjustment: number, variantId?: string) => void;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

function productsReducer(state: ProductsState, action: ProductsAction): ProductsState {
  switch (action.type) {
    case 'CREATE_PRODUCT':
      return {
        ...state,
        products: [action.payload, ...state.products]
      };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.payload.id ? action.payload : p
        )
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload)
      };
    case 'ARCHIVE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.payload ? { ...p, isArchived: true } : p
        )
      };
    case 'RESTORE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.payload ? { ...p, isArchived: false } : p
        )
      };
    case 'BULK_UPDATE_STATUS':
      return {
        ...state,
        products: state.products.map(p =>
          action.payload.ids.includes(p.id) ? { ...p, status: action.payload.status } : p
        )
      };
    case 'PUBLISH_PRODUCT':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.payload ? { ...p, status: 'ACTIVE' } : p
        )
      };
    case 'HIDE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.payload ? { ...p, status: 'PAUSED' } : p
        )
      };
    case 'ADJUST_STOCK':
      return {
        ...state,
        products: state.products.map(p => {
          if (p.id !== action.payload.productId) return p;
          
          // Si es una variante
          if (action.payload.variantId) {
            return {
              ...p,
              variants: p.variants?.map(v =>
                v.id === action.payload.variantId
                  ? { ...v, stock: v.stock + action.payload.adjustment }
                  : v
              )
            };
          }
          
          // Si es el producto base
          return {
            ...p,
            stock: p.stock + action.payload.adjustment
          };
        })
      };
    default:
      return state;
  }
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const audit = useAudit();
  const auth = useAuth();
  
  const [state, dispatch] = useReducer(productsReducer, {
    products: initialProducts
  });

  const createProduct = (product: Product) => {
    dispatch({ type: 'CREATE_PRODUCT', payload: product });
  };

  const updateProduct = (product: Product) => {
    dispatch({ type: 'UPDATE_PRODUCT', payload: product });
  };

  const deleteProduct = (id: string) => {
    dispatch({ type: 'DELETE_PRODUCT', payload: id });
  };

  const archiveProduct = (id: string) => {
    dispatch({ type: 'ARCHIVE_PRODUCT', payload: id });
  };

  const restoreProduct = (id: string) => {
    dispatch({ type: 'RESTORE_PRODUCT', payload: id });
  };

  const bulkUpdateStatus = (ids: string[], status: Product['status']) => {
    dispatch({ type: 'BULK_UPDATE_STATUS', payload: { ids, status } });
  };

  const publishProduct = async (id: string) => {
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    const wasOutOfStock = isOutOfStockDerived(product);
    
    dispatch({ type: 'PUBLISH_PRODUCT', payload: id });

    // Auditar publicación
    audit.auditLog({
      action: 'PRODUCT_PUBLISHED',
      entity: {
        type: 'product',
        id: product.id,
        label: product.name,
      },
      changes: [{ field: 'status', from: product.status, to: 'ACTIVE' }],
    });

    // Si se publicó mientras está agotado, registrar evento especial
    if (wasOutOfStock) {
      audit.auditLog({
        action: 'PRODUCT_PUBLISHED_WHILE_OUT_OF_STOCK',
        entity: {
          type: 'product',
          id: product.id,
          label: product.name,
        },
        metadata: {
          previousStatus: product.status,
        },
      });
    }
  };

  const hideProduct = async (id: string) => {
    const product = state.products.find(p => p.id === id);
    if (!product) return;
    
    dispatch({ type: 'HIDE_PRODUCT', payload: id });

    // Auditar ocultación
    audit.auditLog({
      action: 'PRODUCT_HIDDEN',
      entity: {
        type: 'product',
        id: product.id,
        label: product.name,
      },
      changes: [{ field: 'status', from: product.status, to: 'PAUSED' }],
    });
  };

  const getById = (id: string): Product | undefined => {
    return state.products.find(p => p.id === id);
  };

  const isSkuAvailable = (sku: string, currentId?: string): boolean => {
    // Verificar SKU en productos
    const usedBySomeProduct = state.products.some(
      p => p.sku.toLowerCase() === sku.toLowerCase() && p.id !== currentId
    );
    
    if (usedBySomeProduct) return false;
    
    // Verificar SKU en variantes
    const usedInVariants = state.products.some(p => 
      p.variants?.some(v => v.sku.toLowerCase() === sku.toLowerCase())
    );
    
    return !usedInVariants;
  };

  const adjustStock = (productId: string, adjustment: number, variantId?: string) => {
    dispatch({ type: 'ADJUST_STOCK', payload: { productId, adjustment, variantId } });
  };

  const value: ProductsContextValue = {
    products: state.products,
    createProduct,
    updateProduct,
    deleteProduct,
    archiveProduct,
    restoreProduct,
    bulkUpdateStatus,
    publishProduct,
    hideProduct,
    getById,
    isSkuAvailable,
    adjustStock
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProductsStore() {
  const context = useContext(ProductsContext);
  if (context === null) {
    throw new Error('useProductsStore must be used within a ProductsProvider');
  }
  return context;
}

// Alias para conveniencia
export const useProducts = useProductsStore;