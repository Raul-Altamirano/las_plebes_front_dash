import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { type RMA, type RMAStatus, type  RMAQueryParams, type RMAItem, type RMAReplacementItem } from '../types/rma';
import { useProductsStore } from './ProductsContext';
import { useAudit } from './AuditContext';
import { useAuth } from './AuthContext';
import { computeRmaMoney, formatRmaNumber } from '../utils/rmaHelpers';

interface RMAState {
  rmas: RMA[];
  nextRmaNumberCounter: number;
}

type RMAAction =
  | { type: 'CREATE_RMA'; payload: RMA }
  | { type: 'UPDATE_RMA'; payload: RMA }
  | { type: 'SET_RMAS'; payload: RMA[] }
  | { type: 'SET_COUNTER'; payload: number };

interface RMAContextValue {
  rmas: RMA[];
  createRMA: (draft: Omit<RMA, 'id' | 'rmaNumber' | 'createdAt' | 'updatedAt'>) => RMA | null;
  updateRMA: (id: string, patch: Partial<RMA>) => boolean;
  getById: (id: string) => RMA | undefined;
  list: (query?: RMAQueryParams) => RMA[];
  changeRMAStatus: (rmaId: string, newStatus: RMAStatus) => { success: boolean; error?: string };
  completeRMA: (rmaId: string) => { success: boolean; error?: string };
  cancelRMA: (rmaId: string, revertInventory?: boolean) => { success: boolean; error?: string };
  getRMAsByOrder: (orderId: string) => RMA[];
}

const RMAContext = createContext<RMAContextValue | null>(null);

const STORAGE_KEY = 'ecommerce_admin_rmas';
const COUNTER_KEY = 'ecommerce_admin_rma_counter';

function rmaReducer(state: RMAState, action: RMAAction): RMAState {
  switch (action.type) {
    case 'CREATE_RMA':
      return {
        ...state,
        rmas: [action.payload, ...state.rmas],
        nextRmaNumberCounter: state.nextRmaNumberCounter + 1,
      };
    case 'UPDATE_RMA':
      return {
        ...state,
        rmas: state.rmas.map(r => (r.id === action.payload.id ? action.payload : r)),
      };
    case 'SET_RMAS':
      return {
        ...state,
        rmas: action.payload,
      };
    case 'SET_COUNTER':
      return {
        ...state,
        nextRmaNumberCounter: action.payload,
      };
    default:
      return state;
  }
}

export function RMAProvider({ children }: { children: ReactNode }) {
  const productsStore = useProductsStore();
  const audit = useAudit();
  const auth = useAuth();

  const [state, dispatch] = useReducer(rmaReducer, { rmas: [], nextRmaNumberCounter: 1 }, () => {
    try {
      const storedRMAs = localStorage.getItem(STORAGE_KEY);
      const storedCounter = localStorage.getItem(COUNTER_KEY);

      if (!storedRMAs) {
        return { rmas: [], nextRmaNumberCounter: 1 };
      }

      const rmas = JSON.parse(storedRMAs) as RMA[];
      const counter = storedCounter ? parseInt(storedCounter, 10) : 1;

      return {
        rmas,
        nextRmaNumberCounter: counter,
      };
    } catch (err) {
      console.error('Error loading RMAs from localStorage:', err);
      return { rmas: [], nextRmaNumberCounter: 1 };
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.rmas));
    localStorage.setItem(COUNTER_KEY, state.nextRmaNumberCounter.toString());
  }, [state]);

  // Aplicar inventario cuando se completa un RMA
  const applyInventoryForRma = (rma: RMA, mode: 'APPLY' | 'REVERT') => {
    if (mode === 'APPLY') {
      // Restock de items devueltos
      for (const item of rma.returnItems) {
        if (item.productId) {
          const currentProduct = productsStore.getById(item.productId);
          if (currentProduct) {
            productsStore.adjustStock(item.productId, item.qty, item.variantId);
            
            audit.auditLog({
              action: 'INVENTORY_RESTOCKED_FROM_RETURN',
              entity: {
                type: 'rma',
                id: rma.id,
                label: rma.rmaNumber,
              },
              metadata: {
                productId: item.productId,
                variantId: item.variantId,
                qty: item.qty,
                sku: item.skuSnapshot,
              },
            });
          }
        }
      }

      // Decrement de items de reemplazo
      for (const item of rma.replacementItems) {
        const currentProduct = productsStore.getById(item.productId);
        if (currentProduct) {
          productsStore.adjustStock(item.productId, -item.qty, item.variantId);
          
          audit.auditLog({
            action: 'INVENTORY_DECREMENTED_FOR_EXCHANGE',
            entity: {
              type: 'rma',
              id: rma.id,
              label: rma.rmaNumber,
            },
            metadata: {
              productId: item.productId,
              variantId: item.variantId,
              qty: item.qty,
              sku: item.skuSnapshot,
            },
          });
        }
      }
    } else {
      // REVERT: revertir los cambios
      // Restar lo que se devolvió (volver a decrementar)
      for (const item of rma.returnItems) {
        if (item.productId) {
          productsStore.adjustStock(item.productId, -item.qty, item.variantId);
        }
      }

      // Sumar lo que se dio como reemplazo (volver a reponer)
      for (const item of rma.replacementItems) {
        productsStore.adjustStock(item.productId, item.qty, item.variantId);
      }

      audit.auditLog({
        action: 'RMA_REVERTED',
        entity: {
          type: 'rma',
          id: rma.id,
          label: rma.rmaNumber,
        },
      });
    }
  };

  const createRMA = (draft: Omit<RMA, 'id' | 'rmaNumber' | 'createdAt' | 'updatedAt'>): RMA | null => {
    const id = `rma_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const rmaNumber = formatRmaNumber(state.nextRmaNumberCounter);
    const now = new Date().toISOString();

    const newRMA: RMA = {
      ...draft,
      id,
      rmaNumber,
      createdAt: now,
      updatedAt: now,
    };

    dispatch({ type: 'CREATE_RMA', payload: newRMA });

    // Audit log
    audit.auditLog({
      action: 'RMA_CREATED',
      entity: {
        type: 'rma',
        id: newRMA.id,
        label: newRMA.rmaNumber,
      },
      metadata: {
        type: newRMA.type,
        orderId: newRMA.orderId,
        orderNumber: newRMA.orderNumber,
      },
    });

    return newRMA;
  };

  const updateRMA = (id: string, patch: Partial<RMA>): boolean => {
    const existingRMA = state.rmas.find(r => r.id === id);
    if (!existingRMA) return false;

    const updatedRMA: RMA = {
      ...existingRMA,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: 'UPDATE_RMA', payload: updatedRMA });

    // Audit log
    audit.auditLog({
      action: 'RMA_UPDATED',
      entity: {
        type: 'rma',
        id: updatedRMA.id,
        label: updatedRMA.rmaNumber,
      },
    });

    return true;
  };

  const getById = (id: string): RMA | undefined => {
    return state.rmas.find(r => r.id === id);
  };

  const list = (query?: RMAQueryParams): RMA[] => {
    let filtered = [...state.rmas];

    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.rmaNumber.toLowerCase().includes(searchLower) ||
          r.orderNumber.toLowerCase().includes(searchLower) ||
          r.customerName?.toLowerCase().includes(searchLower)
      );
    }

    if (query?.type) {
      filtered = filtered.filter(r => r.type === query.type);
    }

    if (query?.status) {
      filtered = filtered.filter(r => r.status === query.status);
    }

    if (query?.fromDate) {
      filtered = filtered.filter(r => r.createdAt >= query.fromDate!);
    }

    if (query?.toDate) {
      filtered = filtered.filter(r => r.createdAt <= query.toDate!);
    }

    // Ordenar por fecha de creación (más reciente primero)
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const changeRMAStatus = (rmaId: string, newStatus: RMAStatus): { success: boolean; error?: string } => {
    const rma = getById(rmaId);
    if (!rma) {
      return { success: false, error: 'RMA no encontrado' };
    }

    const oldStatus = rma.status;
    updateRMA(rmaId, { status: newStatus });

    audit.auditLog({
      action: 'RMA_STATUS_CHANGED',
      entity: {
        type: 'rma',
        id: rma.id,
        label: rma.rmaNumber,
      },
      changes: [{ field: 'status', from: oldStatus, to: newStatus }],
    });

    return { success: true };
  };

  const completeRMA = (rmaId: string): { success: boolean; error?: string } => {
    const rma = getById(rmaId);
    if (!rma) {
      return { success: false, error: 'RMA no encontrado' };
    }

    if (rma.status === 'COMPLETED') {
      return { success: false, error: 'El RMA ya está completado' };
    }

    if (rma.status === 'CANCELLED') {
      return { success: false, error: 'No se puede completar un RMA cancelado' };
    }

    // Validar stock para items de reemplazo
    for (const item of rma.replacementItems) {
      const product = productsStore.getById(item.productId);
      if (!product) {
        return { success: false, error: `Producto ${item.nameSnapshot} no encontrado` };
      }

      let availableStock = 0;
      if (item.variantId && product.hasVariants && product.variants) {
        const variant = product.variants.find(v => v.id === item.variantId);
        availableStock = variant?.stock || 0;
      } else {
        availableStock = product.stock;
      }

      if (availableStock < item.qty) {
        return {
          success: false,
          error: `Stock insuficiente para ${item.nameSnapshot} (disponible: ${availableStock}, requerido: ${item.qty})`,
        };
      }
    }

    // Aplicar inventario
    applyInventoryForRma(rma, 'APPLY');

    // Actualizar estado
    updateRMA(rmaId, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
    });

    audit.auditLog({
      action: 'RMA_COMPLETED',
      entity: {
        type: 'rma',
        id: rma.id,
        label: rma.rmaNumber,
      },
    });

    return { success: true };
  };

  const cancelRMA = (rmaId: string, revertInventory: boolean = false): { success: boolean; error?: string } => {
    const rma = getById(rmaId);
    if (!rma) {
      return { success: false, error: 'RMA no encontrado' };
    }

    if (rma.status === 'CANCELLED') {
      return { success: false, error: 'El RMA ya está cancelado' };
    }

    // Si estaba completado y se solicita revertir inventario
    if (rma.status === 'COMPLETED' && revertInventory) {
      applyInventoryForRma(rma, 'REVERT');
    }

    updateRMA(rmaId, {
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
    });

    audit.auditLog({
      action: 'RMA_CANCELLED',
      entity: {
        type: 'rma',
        id: rma.id,
        label: rma.rmaNumber,
      },
      metadata: { revertedInventory: revertInventory },
    });

    return { success: true };
  };

  const getRMAsByOrder = (orderId: string): RMA[] => {
    return state.rmas.filter(r => r.orderId === orderId);
  };

  const value: RMAContextValue = {
    rmas: state.rmas,
    createRMA,
    updateRMA,
    getById,
    list,
    changeRMAStatus,
    completeRMA,
    cancelRMA,
    getRMAsByOrder,
  };

  return <RMAContext.Provider value={value}>{children}</RMAContext.Provider>;
}

export function useRMA() {
  const context = useContext(RMAContext);
  if (!context) {
    throw new Error('useRMA must be used within RMAProvider');
  }
  return context;
}