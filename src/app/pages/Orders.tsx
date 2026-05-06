// src/app/pages/Orders.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, RefreshCw, FileText,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useOrders } from '../store/OrdersContext';
import { useAuth } from '../store/AuthContext';
import { OrderStatus, OrderChannel, PaymentMethod } from '../services/ordersApi';
import { useDebounce } from '../hooks/useDebounce';

// ─── Helpers de presentación ─────────────────────────────────────────────────

const STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT:              'Borrador',
  HOLD_REVIEW:        'En revisión',
  PLACED:             'Confirmado',
  PAID:               'Pagado',
  READY_FOR_DELIVERY: 'Listo p/envío',
  DELIVERED:          'Entregado',
  FULFILLED:          'Surtido',
  COMPLETED:          'Completado',
  CANCELLED:          'Cancelado',
  REFUNDED:           'Reembolsado',
  PENDING_CONTACT:    'Pendiente',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  DRAFT:              'bg-gray-100 text-gray-700',
  HOLD_REVIEW:        'bg-yellow-100 text-yellow-800',
  PLACED:             'bg-blue-100 text-blue-800',
  PAID:               'bg-indigo-100 text-indigo-800',
  READY_FOR_DELIVERY: 'bg-purple-100 text-purple-800',
  DELIVERED:          'bg-teal-100 text-teal-800',
  FULFILLED:          'bg-teal-100 text-teal-800',
  COMPLETED:          'bg-green-100 text-green-800',
  CANCELLED:          'bg-red-100 text-red-800',
  REFUNDED:           'bg-orange-100 text-orange-800',
  PENDING_CONTACT:    'bg-gray-100 text-gray-700',
};

const CHANNEL_LABEL: Record<OrderChannel, string> = {
  ONLINE: 'Online',
  MANUAL: 'Manual',
};

const PM_LABEL: Record<PaymentMethod, string> = {
  CASH:          'Efectivo',
  TRANSFER:      'Transferencia',
  CARD_LINK:     'Link tarjeta',
  CARD_TERMINAL: 'Terminal',
  OTHER:         'Otro',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

// ─── Componente ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const ALL_STATUSES: OrderStatus[] = [
  'DRAFT', 'HOLD_REVIEW', 'PLACED', 'PAID',
  'READY_FOR_DELIVERY', 'DELIVERED', 'FULFILLED',
  'COMPLETED', 'CANCELLED', 'REFUNDED',
];

export default function Orders() {
  const navigate   = useNavigate();
  const { hasPermission } = useAuth();
  const { orders, total, page, totalPages, loading, error, fetchOrders } = useOrders();

  // Filtros locales
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState<OrderStatus | ''>('');
  const [channelFilter, setChannelFilter] = useState<OrderChannel | ''>('');
  const [pmFilter,      setPmFilter]      = useState<PaymentMethod | ''>('');
  const [fromDate,      setFromDate]      = useState('');
  const [toDate,        setToDate]        = useState('');
  const [currentPage,   setCurrentPage]   = useState(1);
  const [showFilters,   setShowFilters]   = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  // ── Fetch cada vez que cambien los filtros ────────────────────────────────

  const load = useCallback(
    (p = currentPage) => {
      fetchOrders({
        search:        debouncedSearch || undefined,
        status:        statusFilter   || undefined,
        channel:       channelFilter  || undefined,
        paymentMethod: pmFilter       || undefined,
        fromDate:      fromDate       || undefined,
        toDate:        toDate         || undefined,
        page:          p,
        limit:         PAGE_SIZE,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch, statusFilter, channelFilter, pmFilter, fromDate, toDate, currentPage],
  );

  useEffect(() => { load(); }, [load]);

  const handlePageChange = (p: number) => {
    setCurrentPage(p);
    load(p);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setChannelFilter('');
    setPmFilter('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    !!statusFilter || !!channelFilter || !!pmFilter || !!fromDate || !!toDate;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total > 0 ? `${total} pedidos en total` : 'Sin resultados'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => load()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            title="Actualizar"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {hasPermission('order:create') && (
            <button
              onClick={() => navigate('/orders/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus size={16} />
              Nuevo pedido
            </button>
          )}
        </div>
      </div>

      {/* Barra de búsqueda + toggle filtros */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número, cliente, teléfono…"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition
            ${showFilters || hasActiveFilters
              ? 'bg-blue-50 border-blue-400 text-blue-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          <Filter size={16} />
          Filtros
          {hasActiveFilters && (
            <span className="ml-1 w-2 h-2 rounded-full bg-blue-600 inline-block" />
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200
                       rounded-lg transition"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as OrderStatus | ''); setCurrentPage(1); }}
              className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5
                         focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todos</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          {/* Canal */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Canal</label>
            <select
              value={channelFilter}
              onChange={e => { setChannelFilter(e.target.value as OrderChannel | ''); setCurrentPage(1); }}
              className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5
                         focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todos</option>
              <option value="ONLINE">Online</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pago</label>
            <select
              value={pmFilter}
              onChange={e => { setPmFilter(e.target.value as PaymentMethod | ''); setCurrentPage(1); }}
              className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5
                         focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todos</option>
              {(Object.keys(PM_LABEL) as PaymentMethod[]).map(pm => (
                <option key={pm} value={pm}>{PM_LABEL[pm]}</option>
              ))}
            </select>
          </div>

          {/* Rango fechas */}
          <div className="flex gap-2 col-span-2 md:col-span-1">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
              <input type="date" value={fromDate}
                onChange={e => { setFromDate(e.target.value); setCurrentPage(1); }}
                className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
              <input type="date" value={toDate}
                onChange={e => { setToDate(e.target.value); setCurrentPage(1); }}
                className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5
                           focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pedido</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Canal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pago</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                // Skeleton rows
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-medium">Sin pedidos</p>
                    <p className="text-xs mt-1">
                      {hasActiveFilters || search
                        ? 'Intenta con otros filtros'
                        : 'Aún no hay pedidos registrados'}
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                  >
                    {/* Número */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-gray-900 text-xs">
                          {order.orderNumber}
                        </span>
                        {order.pdfUrl && (
                          <a
                            href={order.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title="Ver PDF"
                            className="text-gray-400 hover:text-blue-600 transition"
                          >
                            <FileText size={14} />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[160px]">
                        {order.customer.name}
                      </p>
                      {order.customer.phone && (
                        <p className="text-xs text-gray-500">{order.customer.phone}</p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </td>

                    {/* Canal */}
                    <td className="px-4 py-3 text-gray-600">
                      {CHANNEL_LABEL[order.channel] ?? order.channel}
                    </td>

                    {/* Pago */}
                    <td className="px-4 py-3 text-gray-600">
                      {PM_LABEL[order.paymentMethod] ?? order.paymentMethod}
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {fmt(order.total)}
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {fmtDate(order.createdAt)}
                    </td>

                    {/* Chevron */}
                    <td className="px-4 py-3 text-gray-400">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-500">
              Página {page} de {totalPages} · {total} pedidos
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition"
              >
                <ChevronLeft size={16} />
              </button>
              {/* Números de página (máx 5) */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-7 h-7 text-xs rounded transition
                      ${p === currentPage
                        ? 'bg-blue-600 text-white font-bold'
                        : 'hover:bg-gray-200 text-gray-700'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}