import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { useRMA } from '../store/RMAContext';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { RMAType, RMAStatus, RMA_TYPE_LABELS, RMA_STATUS_LABELS } from '../types/rma';
import { RMAStatusBadge } from '../components/RMAStatusBadge';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Search, Eye, ArrowUpDown, Download } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { exportToCSV, formatDateForCSV, formatMoneyForCSV } from '../utils/csvExport';
import { toast } from 'sonner';

export function RMAList() {
  const { list } = useRMA();
  const { hasPermission } = useAuth();
  const { auditLog } = useAudit();
  
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RMAType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<RMAStatus | 'ALL'>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const rmas = useMemo(() => {
    return list({
      search: search || undefined,
      type: typeFilter !== 'ALL' ? typeFilter : undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
    });
  }, [list, search, typeFilter, statusFilter]);

  const canExport = hasPermission('report:export');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simular delay mínimo para UX
    await new Promise(resolve => setTimeout(resolve, 200));

    const exportData = rmas.map(rma => ({
      rmaNumber: rma.rmaNumber,
      orderNumber: rma.orderNumber,
      customerName: rma.customerName || 'Sin cliente',
      type: RMA_TYPE_LABELS[rma.type],
      status: RMA_STATUS_LABELS[rma.status],
      difference: formatMoneyForCSV(rma.money.difference),
      createdAt: formatDateForCSV(rma.createdAt),
    }));

    exportToCSV(exportData, 'cambios-devoluciones');

    // Auditoría
    auditLog({
      action: 'REPORT_EXPORTED',
      metadata: {
        page: 'rma',
        count: rmas.length,
        filtersApplied: { 
          search, 
          type: typeFilter !== 'ALL' ? typeFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined 
        },
      },
    });

    toast.success(`CSV exportado (${rmas.length} registros)`);
    
    await new Promise(resolve => setTimeout(resolve, 400));
    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cambios y Devoluciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona devoluciones y cambios de productos
          </p>
        </div>
        {rmas.length > 0 && (
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
                  : 'Exporta los RMAs filtrados a un archivo CSV'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar RMA, pedido o cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los tipos</SelectItem>
              <SelectItem value="RETURN">Devolución</SelectItem>
              <SelectItem value="EXCHANGE">Cambio</SelectItem>
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="DRAFT">Borrador</SelectItem>
              <SelectItem value="APPROVED">Aprobado</SelectItem>
              <SelectItem value="COMPLETED">Completado</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      {rmas.length === 0 ? (
        <EmptyState
          title="No hay cambios o devoluciones"
          description="Los RMAs creados aparecerán aquí"
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RMA #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pedido #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diferencia
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
                {rmas.map(rma => (
                  <tr key={rma.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/rma/${rma.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {rma.rmaNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/orders/${rma.orderId}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {rma.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rma.customerName || 'Sin cliente'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {RMA_TYPE_LABELS[rma.type]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RMAStatusBadge status={rma.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          rma.money.difference > 0
                            ? 'text-green-600'
                            : rma.money.difference < 0
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {formatCurrency(Math.abs(rma.money.difference))}
                      </span>
                      {rma.money.difference !== 0 && (
                        <span className="text-xs text-gray-500 ml-1">
                          {rma.money.difference > 0 ? '(cobrar)' : '(reemb.)'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(rma.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link to={`/rma/${rma.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Summary */}
      {rmas.length > 0 && (
        <div className="text-sm text-gray-500">
          Mostrando {rmas.length} {rmas.length === 1 ? 'registro' : 'registros'}
        </div>
      )}
    </div>
  );
}