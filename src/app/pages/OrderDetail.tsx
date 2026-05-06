// src/app/pages/OrderDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  Package,
  User,
  MapPin,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useOrders, canTransition } from "../store/OrdersContext";
import { useAuth } from "../store/AuthContext";
import { OrderDTO, OrderStatus } from "../services/ordersApi";
import { ordersApi } from "../services/ordersApi";

// ─── Helpers (reutilizados de Orders.tsx) ────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  HOLD_REVIEW: "En revisión",
  PENDING_CONTACT: "Pendiente contacto",
  PLACED: "Confirmado",
  PAID: "Pago recibido",
  READY_FOR_DELIVERY: "Listo para envío",
  OUT_FOR_DELIVERY: "En camino", // ← pendiente en Lambda
  DELIVERED: "Entregado",
  FULFILLED: "Surtido",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  HOLD_REVIEW: "bg-yellow-100 text-yellow-800",
  PENDING_CONTACT: "bg-gray-100 text-gray-600",
  PLACED: "bg-blue-100 text-blue-800",
  PAID: "bg-indigo-100 text-indigo-800",
  READY_FOR_DELIVERY: "bg-purple-100 text-purple-800",
  OUT_FOR_DELIVERY: "bg-sky-100 text-sky-800",
  DELIVERED: "bg-teal-100 text-teal-800",
  FULFILLED: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-orange-100 text-orange-800",
};

const PM_LABEL: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD_LINK: "Link tarjeta",
  CARD_TERMINAL: "Terminal",
  OTHER: "Otro",
};

// Todos los status en orden de flujo para el timeline visual
const TIMELINE_STEPS: OrderStatus[] = [
  "PLACED",
  "PAID",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY", // ← pendiente en Lambda
  "DELIVERED",
  "COMPLETED",
];
const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    n,
  );

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Acciones posibles desde cada estado
const NEXT_ACTIONS: Partial<
  Record<
    OrderStatus,
    { status: OrderStatus; label: string; variant: "primary" | "danger" }[]
  >
> = {
  PENDING_CONTACT: [
    { status: "PLACED", label: "Confirmar pedido", variant: "primary" },
    { status: "CANCELLED", label: "Cancelar", variant: "danger" },
  ],
  DRAFT: [
    { status: "PLACED", label: "Confirmar pedido", variant: "primary" },
    { status: "CANCELLED", label: "Cancelar", variant: "danger" },
  ],
  PLACED: [
    { status: "PAID", label: "Marcar pago recibido", variant: "primary" },
    { status: "CANCELLED", label: "Cancelar", variant: "danger" },
  ],
  PAID: [
    {
      status: "READY_FOR_DELIVERY",
      label: "Listo para envío",
      variant: "primary",
    },
    { status: "CANCELLED", label: "Cancelar", variant: "danger" },
  ],
  READY_FOR_DELIVERY: [
    {
      status: "OUT_FOR_DELIVERY",
      label: "Marcar en camino",
      variant: "primary",
    },
    { status: "CANCELLED", label: "Cancelar", variant: "danger" },
  ],
  OUT_FOR_DELIVERY: [
    { status: "DELIVERED", label: "Marcar entregado", variant: "primary" },
    { status: "CANCELLED", label: "Cancelar", variant: "danger" },
  ],
  DELIVERED: [
    { status: "COMPLETED", label: "Completar pedido", variant: "primary" },
  ],
  FULFILLED: [
    { status: "COMPLETED", label: "Completar pedido", variant: "primary" },
  ],
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { getOrder, refreshOrder, updateStatus, approveReview, rejectReview } =
    useOrders();

  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Carga inicial ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getOrder(id)
      .then((o) => {
        setOrder(o);
        setError(null);
      })
      .catch(() => setError("No se encontró el pedido."))
      .finally(() => setLoading(false));
  }, [id]);

  const refresh = async () => {
    if (!id) return;
    setLoading(true);
    try {
      await refreshOrder(id);
      const updated = await getOrder(id);
      setOrder(updated);
      setActionError(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Cambio de status ──────────────────────────────────────────────────────

  const handleStatusChange = async (status: OrderStatus) => {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await updateStatus(order.id, status);
      // forzar re-fetch directo sin caché
      const updated = await ordersApi.getById(order.id);
      console.log("updated order:", updated); // ← agrega esto
      setOrder(updated);
      setActionError(null);
    } catch (err: any) {
      setActionError(err?.message ?? "Error al actualizar estado");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await approveReview(order.id);
      await refresh();
    } catch (err: any) {
      setActionError(err?.message ?? "Error al aprobar pedido");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await rejectReview(order.id);
      await refresh();
    } catch (err: any) {
      setActionError(err?.message ?? "Error al rechazar pedido");
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (loading && !order) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm"
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error ?? "No se encontró el pedido."}
        </div>
      </div>
    );
  }

  const isTerminal = ["COMPLETED", "CANCELLED", "REFUNDED"].includes(
    order.status,
  );
  const isHoldReview = order.status === "HOLD_REVIEW";
  const nextActions = NEXT_ACTIONS[order.status] ?? [];

  // Timeline: posición actual en el flujo normal
  const timelinePos = TIMELINE_STEPS.indexOf(order.status as OrderStatus);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/orders")}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 font-mono">
                {order.orderNumber}
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium
                ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-700"}`}
              >
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Creado: {fmtDateTime(order.createdAt)}
              {order.updatedAt !== order.createdAt && (
                <> · Actualizado: {fmtDateTime(order.updatedAt)}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {order.pdfUrl && (
            <a
              href={order.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg
                         text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              <FileText size={15} />
              PDF
            </a>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Timeline de estado (solo flujo normal, no cancelados) */}
      {!["CANCELLED", "REFUNDED", "DRAFT"].includes(order.status) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            {TIMELINE_STEPS.map((step, i) => {
              const done = timelinePos > i || order.status === "COMPLETED";
              const current = order.status === step;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      transition-all
                      ${
                        done
                          ? "bg-green-500 text-white"
                          : current
                            ? "bg-blue-600 text-white ring-4 ring-blue-100"
                            : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {done ? <CheckCircle2 size={16} /> : i + 1}
                    </div>
                    <span
                      className={`text-xs mt-1 text-center leading-tight
                      ${
                        current
                          ? "font-semibold text-blue-700"
                          : done
                            ? "text-green-700"
                            : "text-gray-400"
                      }`}
                    >
                      {STATUS_LABEL[step]}
                    </span>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-1 rounded transition-all
                      ${
                        timelinePos > i || order.status === "COMPLETED"
                          ? "bg-green-400"
                          : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Banner HOLD_REVIEW */}
      {isHoldReview && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <AlertTriangle
            size={18}
            className="text-yellow-600 mt-0.5 flex-shrink-0"
          />
          <div className="flex-1">
            <p className="font-medium text-yellow-900 text-sm">
              Pedido en revisión
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">
              El código postal requiere validación manual antes de procesar.
            </p>
          </div>
          {hasPermission("order:update") && (
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white
                           rounded-lg text-xs font-medium hover:bg-green-700 transition disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                Aprobar
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white
                           rounded-lg text-xs font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                <XCircle size={14} />
                Rechazar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error de acción */}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Grid principal: columna izquierda (cliente + envío + acciones) | derecha (items + totales) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Columna izquierda */}
        <div className="space-y-4">
          {/* Cliente */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <User size={13} /> Cliente
            </h2>
            <p className="font-semibold text-gray-900">
              {order.customer?.name ?? "—"}
            </p>
            {order.customer?.phone && (
              <p className="text-sm text-gray-600 mt-0.5">
                {order.customer.phone}
              </p>
            )}
            {order.customer?.email && (
              <p className="text-sm text-gray-500 mt-0.5">
                {order.customer.email}
              </p>
            )}
            {order.customer?.id && (
              <button
                onClick={() => navigate(`/customers/${order.customer.id}`)}
                className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                Ver perfil <ChevronRight size={12} />
              </button>
            )}
          </div>

          {/* Dirección de envío */}
          {order.shippingAddress && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <MapPin size={13} /> Envío
              </h2>
              {order.shippingAddress.line1 && (
                <p className="text-sm text-gray-800">
                  {order.shippingAddress.line1}
                </p>
              )}
              <p className="text-sm text-gray-600 mt-0.5">
                CP {order.shippingAddress.cp}
                {order.shippingAddress.city &&
                  `, ${order.shippingAddress.city}`}
                {order.shippingAddress.state &&
                  `, ${order.shippingAddress.state}`}
              </p>
              {order.shippingAddress.reference && (
                <p className="text-xs text-gray-500 mt-1 italic">
                  Ref: {order.shippingAddress.reference}
                </p>
              )}
            </div>
          )}

          {/* Pago + canal */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <CreditCard size={13} /> Pago y canal
            </h2>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Método</span>
                <span className="font-medium text-gray-800">
                  {PM_LABEL[order.paymentMethod] ?? order.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Canal</span>
                <span className="font-medium text-gray-800">
                  {order.channel === "ONLINE" ? "Online (SF)" : "Manual (Dash)"}
                </span>
              </div>
            </div>
          </div>

          {/* Notas */}
          {order.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Notas
              </h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {order.notes}
              </p>
            </div>
          )}

          {/* Acciones de estado */}
          {!isTerminal &&
            !isHoldReview &&
            nextActions.length > 0 &&
            hasPermission("order:update") && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Clock size={13} /> Cambiar estado
                </h2>
                <div className="space-y-2">
                  {nextActions.map((action) => (
                    <button
                      key={action.status}
                      onClick={() => handleStatusChange(action.status)}
                      disabled={
                        actionLoading ||
                        !canTransition(order.status, action.status)
                      }
                      className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${
                        action.variant === "primary"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                      }`}
                    >
                      {actionLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCw size={14} className="animate-spin" />
                          Guardando…
                        </span>
                      ) : (
                        action.label
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Columna derecha: items + totales */}
        <div className="lg:col-span-2 space-y-4">
          {/* Items */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Package size={15} className="text-gray-500" />
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Productos {order.items?.length ?? 0}
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {(order.items ?? []).map((item, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between p-4 gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {item.nameSnapshot}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {item.skuSnapshot && (
                        <span className="text-xs text-gray-400 font-mono">
                          {item.skuSnapshot}
                        </span>
                      )}
                      {item.size && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          Talla {item.size}
                        </span>
                      )}
                      {item.color && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {item.color}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {fmt(item.unitPrice * item.qty)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.qty} × {fmt(item.unitPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-800">
                  {fmt(Number(order.subtotal))}
                </span>
              </div>
              {(order.discountTotal ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Descuento</span>
                  <span className="text-green-700">
                    − {fmt(Number(order.discountTotal!))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Envío</span>
                <span className="text-gray-800">
                  {!order.shipping || order.shipping === 0
                    ? "Gratis"
                    : fmt(Number(order.shipping))}{" "}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-gray-900">
                  {fmt(Number(order.total))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
