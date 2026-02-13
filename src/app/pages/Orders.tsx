import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Plus, Search, Eye, Download } from 'lucide-react';
import { useOrders, OrderQueryParams } from '../store/OrdersContext';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card } from '../components/ui/card';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import {
  OrderStatus,
  SalesChannel,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
  SALES_CHANNEL_LABELS,
  ORDER_STATUS_LABELS,
} from '../types/order';
import { exportToCSV, formatDateForCSV, formatMoneyForCSV } from '../utils/csvExport';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

export function Orders() {
  const { list } = useOrders();
  const { hasPermission } = useAuth();
  const { auditLog } = useAudit();
  const navigate = useNavigate();

  const [query, setQuery] = useState<OrderQueryParams>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const itemsPerPage = 10;

  const filteredOrders = list(query);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const handleSearchChange = (value: string) => {
    setQuery(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setQuery(prev => ({ ...prev, status: value === 'all' ? undefined : (value as OrderStatus) }));
    setCurrentPage(1);
  };

  const handleChannelFilter = (value: string) => {
    setQuery(prev => ({ ...prev, channel: value === 'all' ? undefined : value }));
    setCurrentPage(1);
  };

  const handlePaymentFilter = (value: string) => {
    setQuery(prev => ({ ...prev, paymentMethod: value === 'all' ? undefined : value }));
    setCurrentPage(1);
  };

  const canCreateOrder = hasPermission('order:create');
  const canExport = hasPermission('report:export');

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simular delay mínimo para UX
    await new Promise(resolve => setTimeout(resolve, 200));

    const canViewCosts = hasPermission('cost:read');

    const exportData = filteredOrders.map(order => {
      const itemsCount = order.items.reduce((sum, item) => sum + item.qty, 0);
      const totalCost = canViewCosts 
        ? order.items.reduce((sum, item) => sum + (item.lineCostTotal || 0), 0) 
        : null;
      const profit = canViewCosts && totalCost !== null 
        ? order.total - totalCost 
        : null;
      const marginPct = canViewCosts && profit !== null && order.total > 0
        ? (profit / order.total) * 100
        : null;

      const row: any = {
        orderNumber: order.orderNumber,
        createdAt: formatDateForCSV(order.createdAt),
        status: ORDER_STATUS_LABELS[order.status],
        channel: SALES_CHANNEL_LABELS[order.channel as SalesChannel],
        paymentMethod: PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod],
        customerName: order.customer.name,
        customerEmail: order.customer.email || '',
        customerPhone: order.customer.phone || '',
        itemsCount: itemsCount.toString(),
        subtotal: formatMoneyForCSV(order.subtotal),
        shipping: formatMoneyForCSV(0), // V1: no hay shipping todavía
        total: formatMoneyForCSV(order.total),
      };

      if (canViewCosts) {
        row.totalCost = totalCost !== null ? formatMoneyForCSV(totalCost) : '';
        row.profit = profit !== null ? formatMoneyForCSV(profit) : '';
        row.marginPct = marginPct !== null ? marginPct.toFixed(2) : '';
      }

      return row;
    });

    exportToCSV(exportData, 'pedidos');

    // Auditoría
    auditLog({
      action: 'REPORT_EXPORTED',
      metadata: {
        page: 'orders',
        count: filteredOrders.length,
        filtersApplied: query,
      },
    });

    toast.success(`CSV exportado (${filteredOrders.length} registros)`);
    
    await new Promise(resolve => setTimeout(resolve, 400));
    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona pedidos y ventas offline/online</p>
        </div>
        <div className="flex gap-2">
          {filteredOrders.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={isExporting || !canExport}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? 'Exportando...' : 'Exportar CSV'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {!canExport 
                    ? 'No tienes permiso para exportar reportes' 
                    : 'Exporta los pedidos filtrados a un archivo CSV'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {canCreateOrder && (
            <Button onClick={() => navigate('/orders/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Pedido
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por orden, cliente, teléfono..."
              value={query.search || ''}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status filter */}
          <Select value={query.status || 'all'} onValueChange={handleStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="DRAFT">Borrador</SelectItem>
              <SelectItem value="PLACED">Confirmado</SelectItem>
              <SelectItem value="PAID">Pagado</SelectItem>
              <SelectItem value="FULFILLED">Entregado</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
              <SelectItem value="REFUNDED">Reembolsado</SelectItem>
            </SelectContent>
          </Select>

          {/* Channel filter */}
          <Select value={query.channel || 'all'} onValueChange={handleChannelFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los canales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los canales</SelectItem>
              <SelectItem value="OFFLINE">Tienda física</SelectItem>
              <SelectItem value="ONLINE">Tienda online</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              <SelectItem value="INSTAGRAM">Instagram</SelectItem>
            </SelectContent>
          </Select>

          {/* Payment filter */}
          <Select value={query.paymentMethod || 'all'} onValueChange={handlePaymentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los métodos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los métodos</SelectItem>
              <SelectItem value="CASH">Efectivo</SelectItem>
              <SelectItem value="TRANSFER">Transferencia</SelectItem>
              <SelectItem value="CARD_LINK">Link de Pago</SelectItem>
              <SelectItem value="OTHER">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      {paginatedOrders.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pedidos</h3>
            <p className="text-gray-500 mb-6">
              {query.search || query.status || query.channel
                ? 'No se encontraron pedidos con los filtros seleccionados.'
                : 'Comienza creando tu primer pedido manual.'}
            </p>
            {canCreateOrder && !query.search && !query.status && (
              <Button onClick={() => navigate('/orders/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Pedido
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orden
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Canal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método de Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{order.customer.name}</div>
                        {order.customer.phone && <div className="text-gray-500">{order.customer.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {SALES_CHANNEL_LABELS[order.channel as SalesChannel]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/${order.id}`)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredOrders.length)} de{' '}
                {filteredOrders.length} pedidos
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}