import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Plus, Eye, Edit, Search, Download } from 'lucide-react';
import { useCustomers } from '../store/CustomersContext';
import { useOrders } from '../store/OrdersContext';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { CustomerTag, CUSTOMER_TAG_LABELS, CUSTOMER_TAG_COLORS } from '../types/customer';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { exportToCSV, formatDateForCSV, formatMoneyForCSV } from '../utils/csvExport';
import { toast } from 'sonner';

export function Customers() {
  const { list: listCustomers, customers } = useCustomers();
  const { orders } = useOrders();
  const { hasPermission } = useAuth();
  const { auditLog } = useAudit();

  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState<CustomerTag | 'ALL'>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Compute customer stats
  const customerStats = useMemo(() => {
    const stats = new Map<string, { orderCount: number; totalSpent: number; lastOrderDate: string | null }>();

    customers.forEach(customer => {
      stats.set(customer.id, { orderCount: 0, totalSpent: 0, lastOrderDate: null });
    });

    orders.forEach(order => {
      if (order.customerId && stats.has(order.customerId)) {
        const stat = stats.get(order.customerId)!;
        
        // Only count non-cancelled/non-draft orders
        if (order.status !== 'CANCELLED' && order.status !== 'DRAFT') {
          stat.orderCount += 1;
          stat.totalSpent += order.total;
          
          if (!stat.lastOrderDate || order.createdAt > stat.lastOrderDate) {
            stat.lastOrderDate = order.createdAt;
          }
        }
      }
    });

    return stats;
  }, [customers, orders]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    let filtered = listCustomers({
      search: searchTerm,
      tag: tagFilter !== 'ALL' ? tagFilter : undefined,
    });

    return filtered;
  }, [listCustomers, searchTerm, tagFilter]);

  const canCreate = hasPermission('customer:create');
  const canUpdate = hasPermission('customer:update');
  const canExport = hasPermission('report:export');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '—';
    
    // Format as (XXX) XXX-XXXX or similar
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simular delay mínimo para UX
    await new Promise(resolve => setTimeout(resolve, 200));

    const exportData = filteredCustomers.map(customer => {
      const stats = customerStats.get(customer.id) || { orderCount: 0, totalSpent: 0, lastOrderDate: null };
      return {
        id: customer.id,
        nombre: customer.name,
        telefono: customer.phone || '',
        email: customer.email || '',
        etiquetas: customer.tags.map(tag => CUSTOMER_TAG_LABELS[tag]).join(', '),
        pedidos: stats.orderCount.toString(),
        totalGastado: formatMoneyForCSV(stats.totalSpent),
        ultimaCompra: formatDateForCSV(stats.lastOrderDate),
      };
    });

    exportToCSV(exportData, 'clientes');

    // Auditoría
    auditLog({
      action: 'REPORT_EXPORTED',
      metadata: {
        page: 'customers',
        count: filteredCustomers.length,
        filtersApplied: { search: searchTerm, tag: tagFilter !== 'ALL' ? tagFilter : undefined },
      },
    });

    toast.success(`CSV exportado (${filteredCustomers.length} registros)`);
    
    await new Promise(resolve => setTimeout(resolve, 400));
    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Clientes</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''} encontrado{filteredCustomers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {filteredCustomers.length > 0 && (
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
                    : 'Exporta los clientes filtrados a un archivo CSV'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {canCreate && (
            <Link to="/customers/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Cliente
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar por nombre, teléfono o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tagFilter} onValueChange={(value) => setTagFilter(value as CustomerTag | 'ALL')}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por etiqueta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las etiquetas</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="MAYOREO">Mayoreo</SelectItem>
                <SelectItem value="FRECUENTE">Frecuente</SelectItem>
                <SelectItem value="RIESGO">Riesgo</SelectItem>
                <SelectItem value="NUEVO">Nuevo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Etiquetas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedidos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Gastado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Compra
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No se encontraron clientes
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const stats = customerStats.get(customer.id) || { orderCount: 0, totalSpent: 0, lastOrderDate: null };
                    
                    return (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{customer.name}</span>
                            <span className="text-xs text-gray-500">ID: {customer.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col text-sm">
                            <span className="text-gray-900">{formatPhone(customer.phone)}</span>
                            <span className="text-gray-500">{customer.email || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {customer.tags.length === 0 ? (
                              <span className="text-sm text-gray-400">Sin etiquetas</span>
                            ) : (
                              customer.tags.map((tag) => (
                                <Badge key={tag} variant={CUSTOMER_TAG_COLORS[tag]}>
                                  {CUSTOMER_TAG_LABELS[tag]}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {stats.orderCount}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {formatCurrency(stats.totalSpent)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(stats.lastOrderDate)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Link to={`/customers/${customer.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            {canUpdate && (
                              <Link to={`/customers/${customer.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}