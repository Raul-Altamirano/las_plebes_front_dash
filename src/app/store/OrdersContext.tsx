import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { type Order, type OrderStatus, type OrderItem, INVENTORY_DECREMENT_ON } from '../types/order';
import { mockOrders } from '../data/mockOrders';
import { useProductsStore } from './ProductsContext';
import { useAudit } from './AuditContext';
import { useAuth } from './AuthContext';

// Orders context and provider
interface OrdersState {
  orders: Order[];
  nextOrderNumberCounter: number;
}

type OrdersAction =
  | { type: 'CREATE_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'SET_COUNTER'; payload: number };

interface OrdersContextValue {
  orders: Order[];
  createOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => Order | null;
  updateOrder: (id: string, patch: Partial<Order>) => boolean;
  getById: (id: string) => Order | undefined;
  list: (query?: OrderQueryParams) => Order[];
  changeOrderStatus: (orderId: string, newStatus: OrderStatus) => { success: boolean; error?: string };
}

export interface OrderQueryParams {
  search?: string;
  status?: OrderStatus;
  channel?: string;
  paymentMethod?: string;
  fromDate?: string;
  toDate?: string;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

const STORAGE_KEY = 'ecommerce_admin_orders';
const COUNTER_KEY = 'ecommerce_admin_order_counter';

// Helpers
export function formatOrderNumber(n: number): string {
  return `ORD-${String(n).padStart(6, '0')}`;
}

export function computeOrderTotals(items: OrderItem[]): { subtotal: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return {
    subtotal,
    total: subtotal, // V1: sin descuentos aplicados aún
  };
}

function ordersReducer(state: OrdersState, action: OrdersAction): OrdersState {
  switch (action.type) {
    case 'CREATE_ORDER':
      return {
        ...state,
        orders: [action.payload, ...state.orders],
        nextOrderNumberCounter: state.nextOrderNumberCounter + 1,
      };
    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(o => (o.id === action.payload.id ? action.payload : o)),
      };
    case 'SET_ORDERS':
      return {
        ...state,
        orders: action.payload,
      };
    case 'SET_COUNTER':
      return {
        ...state,
        nextOrderNumberCounter: action.payload,
      };
    default:
      return state;
  }
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  // Get productsStore hook - this must be called at the component level
  const productsStore = useProductsStore();
  const audit = useAudit();
  const auth = useAuth();

  // Load initial state from localStorage
  const [state, dispatch] = useReducer(ordersReducer, { orders: [], nextOrderNumberCounter: 1 }, () => {
    try {
      const storedOrders = localStorage.getItem(STORAGE_KEY);
      const storedCounter = localStorage.getItem(COUNTER_KEY);
      
      // If no stored data, initialize with mock orders
      if (!storedOrders) {
        const maxOrderNumber = mockOrders.reduce((max, order) => {
          const num = parseInt(order.orderNumber.replace('ORD-', ''), 10);
          return num > max ? num : max;
        }, 0);
        
        return {
          orders: mockOrders,
          nextOrderNumberCounter: maxOrderNumber + 1,
        };
      }
      
      return {
        orders: storedOrders ? JSON.parse(storedOrders) : [],
        nextOrderNumberCounter: storedCounter ? parseInt(storedCounter, 10) : 1,
      };
    } catch (error) {
      console.error('Error loading orders from localStorage:', error);
      return { orders: mockOrders, nextOrderNumberCounter: 11 };
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.orders));
    localStorage.setItem(COUNTER_KEY, String(state.nextOrderNumberCounter));
  }, [state.orders, state.nextOrderNumberCounter]);

  const createOrder = (orderDraft: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Order | null => {
    const now = new Date().toISOString();
    const newOrder: Order = {
      ...orderDraft,
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderNumber: formatOrderNumber(state.nextOrderNumberCounter),
      createdAt: now,
      updatedAt: now,
    };

    dispatch({ type: 'CREATE_ORDER', payload: newOrder });

    // Log audit
    audit.logEvent({
      action: 'ORDER_CREATED',
      entityType: 'order',
      entityId: newOrder.id,
      entityName: newOrder.orderNumber,
      userId: auth.currentUser?.id || 'system',
      userName: auth.currentUser?.name || 'System',
      userRole: auth.currentUser?.role || 'ADMIN',
      metadata: {
        status: newOrder.status,
        channel: newOrder.channel,
        total: newOrder.total,
        itemsCount: newOrder.items.length,
      },
    });

    // If status requires inventory decrement, do it
    if (newOrder.status === INVENTORY_DECREMENT_ON) {
      decrementInventory(newOrder);
    }

    return newOrder;
  };

  const updateOrder = (id: string, patch: Partial<Order>): boolean => {
    const existing = state.orders.find(o => o.id === id);
    if (!existing) return false;

    const updated: Order = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: 'UPDATE_ORDER', payload: updated });
    return true;
  };

  const changeOrderStatus = (orderId: string, newStatus: OrderStatus): { success: boolean; error?: string } => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
      return { success: false, error: 'Pedido no encontrado' };
    }

    const oldStatus = order.status;

    // Validations
    if (oldStatus === newStatus) {
      return { success: false, error: 'El pedido ya tiene ese estado' };
    }

    // Check if we need to decrement inventory
    const shouldDecrement = newStatus === INVENTORY_DECREMENT_ON && oldStatus !== INVENTORY_DECREMENT_ON;
    const shouldRestock = newStatus === 'CANCELLED' && oldStatus === INVENTORY_DECREMENT_ON;

    // If decrementing, validate stock first
    if (shouldDecrement) {
      const validation = validateInventory(order);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Stock insuficiente: ${validation.problems.map(p => `${p.name} (necesitas ${p.needed}, disponible ${p.available})`).join(', ')}`,
        };
      }
    }

    // Update status
    const updated: Order = {
      ...order,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: 'UPDATE_ORDER', payload: updated });

    // Log audit
    audit.logEvent({
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'order',
      entityId: order.id,
      entityName: order.orderNumber,
      userId: auth.currentUser?.id || 'system',
      userName: auth.currentUser?.name || 'System',
      userRole: auth.currentUser?.role || 'ADMIN',
      changes: [{ field: 'status', from: oldStatus, to: newStatus }],
    });

    // Handle inventory changes
    if (shouldDecrement) {
      decrementInventory(order);
    }
    if (shouldRestock) {
      restockInventory(order);
    }

    return { success: true };
  };

  // Validate inventory before decrementing
  const validateInventory = (
    order: Order
  ): { isValid: boolean; problems: Array<{ name: string; needed: number; available: number }> } => {
    const problems: Array<{ name: string; needed: number; available: number }> = [];

    for (const item of order.items) {
      const product = productsStore.getById(item.productId);
      if (!product) continue;

      if (item.variantId) {
        const variant = product.variants?.find(v => v.id === item.variantId);
        if (!variant) continue;
        if (variant.stock < item.qty) {
          problems.push({
            name: `${item.nameSnapshot} (${item.optionsSnapshot?.size || ''} ${item.optionsSnapshot?.color || ''})`,
            needed: item.qty,
            available: variant.stock,
          });
        }
      } else {
        if (product.stock < item.qty) {
          problems.push({
            name: item.nameSnapshot,
            needed: item.qty,
            available: product.stock,
          });
        }
      }
    }

    return {
      isValid: problems.length === 0,
      problems,
    };
  };

  // Decrement inventory for order
  const decrementInventory = (order: Order) => {
    for (const item of order.items) {
      const product = productsStore.getById(item.productId);
      if (!product) continue;

      if (item.variantId) {
        // Decrement variant stock
        const variant = product.variants?.find(v => v.id === item.variantId);
        if (!variant) continue;

        const newVariantStock = Math.max(0, variant.stock - item.qty);
        const updatedVariants = product.variants?.map(v =>
          v.id === item.variantId ? { ...v, stock: newVariantStock, updatedAt: new Date().toISOString() } : v
        );

        // Recalculate product stock
        const newProductStock = updatedVariants?.reduce((sum, v) => sum + v.stock, 0) || 0;

        productsStore.updateProduct({
          ...product,
          variants: updatedVariants,
          stock: newProductStock,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Decrement product stock
        const newStock = Math.max(0, product.stock - item.qty);
        productsStore.updateProduct({
          ...product,
          stock: newStock,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Log audit
    audit.logEvent({
      action: 'INVENTORY_DECREMENTED',
      entityType: 'order',
      entityId: order.id,
      entityName: order.orderNumber,
      userId: auth.currentUser?.id || 'system',
      userName: auth.currentUser?.name || 'System',
      userRole: auth.currentUser?.role || 'ADMIN',
      metadata: {
        items: order.items.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          qty: i.qty,
          name: i.nameSnapshot,
        })),
      },
    });
  };

  // Restock inventory when order is cancelled
  const restockInventory = (order: Order) => {
    for (const item of order.items) {
      const product = productsStore.getById(item.productId);
      if (!product) continue;

      if (item.variantId) {
        // Restock variant
        const variant = product.variants?.find(v => v.id === item.variantId);
        if (!variant) continue;

        const newVariantStock = variant.stock + item.qty;
        const updatedVariants = product.variants?.map(v =>
          v.id === item.variantId ? { ...v, stock: newVariantStock, updatedAt: new Date().toISOString() } : v
        );

        // Recalculate product stock
        const newProductStock = updatedVariants?.reduce((sum, v) => sum + v.stock, 0) || 0;

        productsStore.updateProduct({
          ...product,
          variants: updatedVariants,
          stock: newProductStock,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Restock product
        const newStock = product.stock + item.qty;
        productsStore.updateProduct({
          ...product,
          stock: newStock,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Log audit
    audit.logEvent({
      action: 'INVENTORY_RESTOCKED',
      entityType: 'order',
      entityId: order.id,
      entityName: order.orderNumber,
      userId: auth.currentUser?.id || 'system',
      userName: auth.currentUser?.name || 'System',
      userRole: auth.currentUser?.role || 'ADMIN',
      metadata: {
        items: order.items.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          qty: i.qty,
          name: i.nameSnapshot,
        })),
      },
    });
  };

  const getById = (id: string): Order | undefined => {
    return state.orders.find(o => o.id === id);
  };

  const list = (query?: OrderQueryParams): Order[] => {
    let filtered = [...state.orders];

    if (query?.search) {
      const search = query.search.toLowerCase();
      filtered = filtered.filter(
        o =>
          o.orderNumber.toLowerCase().includes(search) ||
          o.customer.name.toLowerCase().includes(search) ||
          o.customer.phone?.toLowerCase().includes(search) ||
          o.customer.email?.toLowerCase().includes(search)
      );
    }

    if (query?.status) {
      filtered = filtered.filter(o => o.status === query.status);
    }

    if (query?.channel) {
      filtered = filtered.filter(o => o.channel === query.channel);
    }

    if (query?.paymentMethod) {
      filtered = filtered.filter(o => o.paymentMethod === query.paymentMethod);
    }

    if (query?.fromDate) {
      filtered = filtered.filter(o => o.createdAt >= query.fromDate!);
    }

    if (query?.toDate) {
      filtered = filtered.filter(o => o.createdAt <= query.toDate!);
    }

    // Sort by createdAt desc
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return filtered;
  };

  const value: OrdersContextValue = {
    orders: state.orders,
    createOrder,
    updateOrder,
    getById,
    list,
    changeOrderStatus,
  };

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (context === null) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
}