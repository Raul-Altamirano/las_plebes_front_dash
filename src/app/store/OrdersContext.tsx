// src/app/store/OrdersContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";

import {
  ordersApi,
  OrderDTO,
  OrderStatus,
  CreateOrderBody,
  ListOrdersParams,
} from "../services/ordersApi";
import { useAudit } from "./AuditContext";

// ─── Status transitions (guard de UI) ────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
  PENDING_CONTACT:    ['PLACED', 'CANCELLED'],
  DRAFT:              ['PLACED', 'CANCELLED'],
  PLACED:             ['PAID', 'CANCELLED'],
  PAID:               ['READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY:   ['DELIVERED', 'CANCELLED'],
  DELIVERED:          ['COMPLETED'],
  FULFILLED:          ['COMPLETED'],
  HOLD_REVIEW:        ['PLACED', 'CANCELLED'],
  COMPLETED:          [],
  CANCELLED:          [],
  REFUNDED:           [],
} as Record<OrderStatus, OrderStatus[]>;

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

// ─── Context shape ────────────────────────────────────────────────────────────

export interface OrdersContextType {
  // Estado
  orders: OrderDTO[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;

  // CRUD
  fetchOrders: (params?: ListOrdersParams) => Promise<void>;
  getOrder: (id: string) => Promise<OrderDTO>;
  createOrder: (body: CreateOrderBody) => Promise<OrderDTO>;
  updateStatus: (id: string, status: OrderStatus) => Promise<void>;
  approveReview: (id: string) => Promise<void>;
  rejectReview: (id: string) => Promise<void>;

  // Helpers
  getOrderById: (id: string) => OrderDTO | undefined;
  refreshOrder: (id: string) => Promise<void>;
  canTransition: (from: OrderStatus, to: OrderStatus) => boolean;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { auditLog } = useAudit();

  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache local: id → OrderDTO para getOrderById() sin llamada extra
  const cache = useRef<Map<string, OrderDTO>>(new Map());

  const setOrdersAndCache = (list: OrderDTO[]) => {
    list.forEach((o) => cache.current.set(o.id, o));
    setOrders(list);
  };

  // ── fetchOrders ────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async (params: ListOrdersParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await ordersApi.list(params);
      setOrdersAndCache(res.data);
      setTotal(res.pagination.total);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      const msg = err?.message ?? "Error al cargar pedidos";
      setError(msg);
      console.error("[OrdersContext] fetchOrders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── getOrder (con cache) ───────────────────────────────────────────────────

  const getOrder = useCallback(async (id: string): Promise<OrderDTO> => {
    if (cache.current.has(id)) return cache.current.get(id)!;
    const order = await ordersApi.getById(id);
    cache.current.set(order.id, order);
    return order;
  }, []);

  // ── refreshOrder (forzar re-fetch) ────────────────────────────────────────

  const refreshOrder = useCallback(async (id: string) => {
    const order = await ordersApi.getById(id);
    cache.current.set(order.id, order);
    setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
  }, []);

  // ── createOrder ────────────────────────────────────────────────────────────

  const createOrder = useCallback(
    async (body: CreateOrderBody): Promise<OrderDTO> => {
      setLoading(true);
      try {
        const order = await ordersApi.create(body);
        cache.current.set(order.id, order);
        setOrders((prev) => [order, ...prev]);
        setTotal((prev) => prev + 1);
        auditLog({
          action: "ORDER_CREATED",
          entity: { type: "order", id: order.id, label: order.orderNumber },
        });
        return order;
      } catch (err: any) {
        const msg = err?.message ?? "Error al crear pedido";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [auditLog],
  );

  // ── updateStatus ───────────────────────────────────────────────────────────

  const updateStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const prev = cache.current.get(id);
      if (prev && !canTransition(prev.status, status)) {
        throw new Error(`Transición inválida: ${prev.status} → ${status}`);
      }
      const updated = await ordersApi.updateStatus(id, status);
      cache.current.set(updated.id, updated);
      setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
      auditLog({
        action: "ORDER_STATUS_CHANGED",
        entity: { type: "order", id: updated.id, label: updated.orderNumber },
        metadata: { from: prev?.status, to: status },
      });
    },
    [auditLog],
  );

  // ── approveReview ──────────────────────────────────────────────────────────

  const approveReview = useCallback(
    async (id: string) => {
      const updated = await ordersApi.approveReview(id);
      cache.current.set(updated.id, updated);
      setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
      auditLog({
        action: "ORDER_REVIEW_APPROVED",
        entity: { type: "order", id: updated.id, label: updated.orderNumber },
      });
    },
    [auditLog],
  );

  // ── rejectReview ───────────────────────────────────────────────────────────

  const rejectReview = useCallback(
    async (id: string) => {
      const updated = await ordersApi.rejectReview(id);
      cache.current.set(updated.id, updated);
      setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
      auditLog({
        action: "ORDER_REVIEW_REJECTED",
        entity: { type: "order", id: updated.id, label: updated.orderNumber },
      });
    },
    [auditLog],
  );

  // ── getOrderById (sync, desde cache) ─────────────────────────────────────

  const getOrderById = useCallback(
    (id: string) => cache.current.get(id) ?? orders.find((o) => o.id === id),
    [orders],
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <OrdersContext.Provider
      value={{
        orders,
        total,
        page,
        totalPages,
        loading,
        error,
        fetchOrders,
        getOrder,
        createOrder,
        updateStatus,
        approveReview,
        rejectReview,
        getOrderById,
        refreshOrder,
        canTransition,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOrders(): OrdersContextType {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within <OrdersProvider>");
  return ctx;
}
