import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router';
import { 
  Calendar, 
  Download, 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  Users,
  Package,
  AlertTriangle,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useOrdersStore } from '../store/OrdersContext';
import { useProductsStore } from '../store/ProductsContext';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { EmptyState } from '../components/EmptyState';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { 
  getDefaultReportQuery, 
  ReportQuery, 
  KPIMetrics,
  DailySalesData,
  TopProductData,
  LowStockItem,
  TopCustomerData
} from '../types/report';
import { 
  SALES_CHANNEL_LABELS, 
  PAYMENT_METHOD_LABELS,
  ORDER_STATUS_LABELS,
  SalesChannel,
  PaymentMethod,
  OrderStatus
} from '../types/order';
import {
  filterOrders,
  calculateKPIs,
  calculateDailySales,
  calculateTopProducts,
  calculateLowStock,
  calculateTopCustomers,
  formatCurrency,
  formatDisplayDate,
} from '../utils/reportHelpers';
import {
  exportDailySalesToCSV,
  exportTopProductsToCSV,
  exportTopCustomersToCSV,
  exportLowStockToCSV,
} from '../utils/csvExport';

export function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { orders } = useOrdersStore();
  const { products } = useProductsStore();
  const { hasPermission } = useAuth();
  const audit = useAudit();

  // Estado local
  const [query, setQuery] = useState<ReportQuery>(() => {
    // Intentar cargar desde URL params
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const channelParam = searchParams.get('channel') as ReportQuery['channel'] | null;
    const paymentParam = searchParams.get('payment') as ReportQuery['paymentMethod'] | null;
    const statusParam = searchParams.get('status') as ReportQuery['status'] | null;
    const includeCancelledParam = searchParams.get('includeCancelled') === 'true';
    const revenueModeParam = searchParams.get('revenueMode') as ReportQuery['revenueMode'] | null;

    const defaultQuery = getDefaultReportQuery();

    return {
      from: fromParam || defaultQuery.from,
      to: toParam || defaultQuery.to,
      channel: channelParam || defaultQuery.channel,
      paymentMethod: paymentParam || defaultQuery.paymentMethod,
      status: statusParam || defaultQuery.status,
      includeCancelled: includeCancelledParam,
      revenueMode: revenueModeParam || defaultQuery.revenueMode,
    };
  });

  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Sincronizar query con URL params
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('from', query.from);
    params.set('to', query.to);
    if (query.channel !== 'ALL') params.set('channel', query.channel);
    if (query.paymentMethod !== 'ALL') params.set('payment', query.paymentMethod);
    if (query.status !== 'ALL') params.set('status', query.status);
    if (query.includeCancelled) params.set('includeCancelled', 'true');
    params.set('revenueMode', query.revenueMode);
    setSearchParams(params, { replace: true });
  }, [query, setSearchParams]);

  // Calcular datos (con loading simulado)
  const {
    filteredOrders,
    kpis,
    dailySales,
    topProducts,
    lowStockItems,
    topCustomers,
  } = useMemo(() => {
    const filtered = filterOrders(orders, query);
    const kpisData = calculateKPIs(filtered, query);
    const dailySalesData = calculateDailySales(filtered, query);
    const topProductsData = calculateTopProducts(filtered, query);
    const lowStockData = calculateLowStock(products, lowStockThreshold);
    const topCustomersData = calculateTopCustomers(filtered, query);

    return {
      filteredOrders: filtered,
      kpis: kpisData,
      dailySales: dailySalesData,
      topProducts: topProductsData,
      lowStockItems: lowStockData,
      topCustomers: topCustomersData,
    };
  }, [orders, products, query, lowStockThreshold]);

  // Simular loading al cambiar filtros
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Registrar visualización en auditoría (solo la primera vez)
  useEffect(() => {
    audit.log({
      action: 'REPORT_VIEWED',
      entity: {
        type: 'report',
        id: 'general',
        name: 'Reportes Generales',
      },
      metadata: {
        from: query.from,
        to: query.to,
        channel: query.channel,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers
  const handleExportDailySales = () => {
    exportDailySalesToCSV(dailySales, query);
    audit.log({
      action: 'REPORT_EXPORTED',
      entity: {
        type: 'report',
        id: 'daily-sales',
        name: 'Ventas por Día',
      },
      metadata: { filters: query, recordCount: dailySales.length },
    });
  };

  const handleExportTopProducts = () => {
    exportTopProductsToCSV(topProducts, query);
    audit.log({
      action: 'REPORT_EXPORTED',
      entity: {
        type: 'report',
        id: 'top-products',
        name: 'Top Productos',
      },
      metadata: { filters: query, recordCount: topProducts.length },
    });
  };

  const handleExportTopCustomers = () => {
    exportTopCustomersToCSV(topCustomers, query);
    audit.log({
      action: 'REPORT_EXPORTED',
      entity: {
        type: 'report',
        id: 'top-customers',
        name: 'Top Clientes',
      },
      metadata: { filters: query, recordCount: topCustomers.length },
    });
  };

  const handleExportLowStock = () => {
    exportLowStockToCSV(lowStockItems, lowStockThreshold);
    audit.log({
      action: 'REPORT_EXPORTED',
      entity: {
        type: 'report',
        id: 'low-stock',
        name: 'Stock Bajo',
      },
      metadata: { threshold: lowStockThreshold, recordCount: lowStockItems.length },
    });
  };

  const canExport = hasPermission('report:export');

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Reportes y Métricas</h2>
            <p className="text-sm text-gray-500 mt-1">
              Análisis de ventas y performance del negocio
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>
        </div>

        {/* Filtros globales */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            {/* Fecha desde */}
            <div>
              <Label htmlFor="from">Desde</Label>
              <Input
                id="from"
                type="date"
                value={query.from}
                onChange={(e) => setQuery({ ...query, from: e.target.value })}
              />
            </div>

            {/* Fecha hasta */}
            <div>
              <Label htmlFor="to">Hasta</Label>
              <Input
                id="to"
                type="date"
                value={query.to}
                onChange={(e) => setQuery({ ...query, to: e.target.value })}
              />
            </div>

            {/* Canal */}
            <div>
              <Label htmlFor="channel">Canal</Label>
              <Select
                value={query.channel}
                onValueChange={(val) => setQuery({ ...query, channel: val as ReportQuery['channel'] })}
              >
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {Object.entries(SALES_CHANNEL_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Método de pago */}
            <div>
              <Label htmlFor="payment">Método de Pago</Label>
              <Select
                value={query.paymentMethod}
                onValueChange={(val) => setQuery({ ...query, paymentMethod: val as ReportQuery['paymentMethod'] })}
              >
                <SelectTrigger id="payment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select
                value={query.status}
                onValueChange={(val) => setQuery({ ...query, status: val as ReportQuery['status'] })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modo de ingresos */}
            <div>
              <Label htmlFor="revenueMode">Modo de Ingresos</Label>
              <Select
                value={query.revenueMode}
                onValueChange={(val) => setQuery({ ...query, revenueMode: val as ReportQuery['revenueMode'] })}
              >
                <SelectTrigger id="revenueMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID_FULFILLED">Pagado + Entregado</SelectItem>
                  <SelectItem value="PLACED_PLUS">Confirmado +</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Incluir cancelados */}
            <div className="flex items-center space-x-2 pt-6">
              <input
                id="includeCancelled"
                type="checkbox"
                checked={query.includeCancelled}
                onChange={(e) => setQuery({ ...query, includeCancelled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <Label htmlFor="includeCancelled" className="cursor-pointer">
                Incluir cancelados
              </Label>
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      {isLoading ? (
        <SkeletonLoader count={1} height={120} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title="Ventas Totales"
            value={formatCurrency(kpis.totalRevenue)}
            icon={DollarSign}
            color="green"
          />
          <KPICard
            title="Órdenes"
            value={kpis.totalOrders.toString()}
            icon={ShoppingCart}
            color="blue"
          />
          <KPICard
            title="Ticket Promedio"
            value={formatCurrency(kpis.averageTicket)}
            icon={TrendingUp}
            color="purple"
          />
          <KPICard
            title="Clientes Únicos"
            value={kpis.uniqueCustomers.toString()}
            icon={Users}
            color="indigo"
          />
          <KPICard
            title="Productos Vendidos"
            value={kpis.totalProductsSold.toString()}
            icon={Package}
            color="orange"
          />
        </div>
      )}

      {/* Tabs de reportes */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="daily">Ventas por Día</TabsTrigger>
          <TabsTrigger value="products">Top Productos</TabsTrigger>
          <TabsTrigger value="stock">Stock Bajo</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="summary">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Resumen del Período</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Período analizado</p>
                  <p className="text-base font-medium">
                    {formatDisplayDate(query.from)} - {formatDisplayDate(query.to)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Canal de ventas</p>
                  <p className="text-base font-medium">
                    {query.channel === 'ALL' ? 'Todos los canales' : SALES_CHANNEL_LABELS[query.channel as SalesChannel]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Método de pago</p>
                  <p className="text-base font-medium">
                    {query.paymentMethod === 'ALL' ? 'Todos los métodos' : PAYMENT_METHOD_LABELS[query.paymentMethod as PaymentMethod]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Modo de ingresos</p>
                  <p className="text-base font-medium">
                    {query.revenueMode === 'PAID_FULFILLED' ? 'Pagado + Entregado' : 'Confirmado +'}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Este reporte incluye {filteredOrders.length} órdenes que cumplen los criterios seleccionados.
                  {!query.includeCancelled && ' Las órdenes canceladas no están incluidas.'}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Ventas por Día */}
        <TabsContent value="daily">
          <DailySalesSection
            data={dailySales}
            isLoading={isLoading}
            canExport={canExport}
            onExport={handleExportDailySales}
          />
        </TabsContent>

        {/* Tab: Top Productos */}
        <TabsContent value="products">
          <TopProductsSection
            data={topProducts}
            isLoading={isLoading}
            canExport={canExport}
            onExport={handleExportTopProducts}
          />
        </TabsContent>

        {/* Tab: Stock Bajo */}
        <TabsContent value="stock">
          <LowStockSection
            data={lowStockItems}
            threshold={lowStockThreshold}
            onThresholdChange={setLowStockThreshold}
            isLoading={isLoading}
            canExport={canExport}
            onExport={handleExportLowStock}
          />
        </TabsContent>

        {/* Tab: Clientes */}
        <TabsContent value="customers">
          <TopCustomersSection
            data={topCustomers}
            isLoading={isLoading}
            canExport={canExport}
            onExport={handleExportTopCustomers}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente KPI Card
interface KPICardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'blue' | 'purple' | 'indigo' | 'orange';
}

function KPICard({ title, value, icon: Icon, color }: KPICardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

// Sección: Ventas por Día
interface DailySalesSectionProps {
  data: DailySalesData[];
  isLoading: boolean;
  canExport: boolean;
  onExport: () => void;
}

function DailySalesSection({ data, isLoading, canExport, onExport }: DailySalesSectionProps) {
  if (isLoading) {
    return <SkeletonLoader count={1} height={300} />;
  }

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <EmptyState
          title="Sin datos de ventas"
          description="No hay ventas en el período seleccionado."
          icon={Calendar}
        />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Ventas por Día</h3>
        {canExport && (
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Fecha</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Ventas</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Órdenes</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Ticket Promedio</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.date} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm">{formatDisplayDate(row.date)}</td>
                <td className="py-3 px-4 text-sm text-right font-medium">{formatCurrency(row.revenue)}</td>
                <td className="py-3 px-4 text-sm text-right">{row.orders}</td>
                <td className="py-3 px-4 text-sm text-right">{formatCurrency(row.averageTicket)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Sección: Top Productos
interface TopProductsSectionProps {
  data: TopProductData[];
  isLoading: boolean;
  canExport: boolean;
  onExport: () => void;
}

function TopProductsSection({ data, isLoading, canExport, onExport }: TopProductsSectionProps) {
  if (isLoading) {
    return <SkeletonLoader count={1} height={300} />;
  }

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <EmptyState
          title="Sin datos de productos"
          description="No se vendieron productos en el período seleccionado."
          icon={Package}
        />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Top Productos/Variantes</h3>
        {canExport && (
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Producto</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">SKU</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Variante</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Unidades</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Ingresos</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">% Part.</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 20).map((product, idx) => (
              <tr key={`${product.sku}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm">{product.name}</td>
                <td className="py-3 px-4 text-sm font-mono text-gray-600">{product.sku}</td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {product.options ? (
                    <span>
                      {product.options.size && <span className="mr-2">{product.options.size}</span>}
                      {product.options.color && <span>{product.options.color}</span>}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-sm text-right">{product.unitsSold}</td>
                <td className="py-3 px-4 text-sm text-right font-medium">{formatCurrency(product.revenue)}</td>
                <td className="py-3 px-4 text-sm text-right">{product.percentage.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 20 && (
        <p className="text-sm text-gray-500 mt-4 text-center">
          Mostrando los primeros 20 productos. Exporta el CSV para ver el listado completo.
        </p>
      )}
    </Card>
  );
}

// Sección: Stock Bajo
interface LowStockSectionProps {
  data: LowStockItem[];
  threshold: number;
  onThresholdChange: (value: number) => void;
  isLoading: boolean;
  canExport: boolean;
  onExport: () => void;
}

function LowStockSection({ 
  data, 
  threshold, 
  onThresholdChange, 
  isLoading, 
  canExport, 
  onExport 
}: LowStockSectionProps) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('product:update') || hasPermission('inventory:update');

  if (isLoading) {
    return <SkeletonLoader count={1} height={300} />;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Stock Bajo</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="threshold" className="text-sm">Umbral:</Label>
            <Input
              id="threshold"
              type="number"
              min={1}
              max={100}
              value={threshold}
              onChange={(e) => onThresholdChange(Number(e.target.value))}
              className="w-20"
            />
          </div>
        </div>
        {canExport && data.length > 0 && (
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="No hay productos con stock bajo"
          description={`Todos los productos tienen más de ${threshold} unidades en stock.`}
          icon={Package}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Producto</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">SKU</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Variante</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Stock</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={`${item.sku}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">{item.name}</td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-600">{item.sku}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {item.options ? (
                      <span>
                        {item.options.size && <span className="mr-2">{item.options.size}</span>}
                        {item.options.color && <span>{item.options.color}</span>}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    <span className={`inline-flex items-center ${item.currentStock === 0 ? 'text-red-600 font-semibold' : 'text-orange-600'}`}>
                      {item.currentStock === 0 && <AlertTriangle className="w-4 h-4 mr-1" />}
                      {item.currentStock}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    {canEdit && (
                      <Link
                        to={`/products/${item.productId}/edit`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Editar
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// Sección: Top Clientes
interface TopCustomersSectionProps {
  data: TopCustomerData[];
  isLoading: boolean;
  canExport: boolean;
  onExport: () => void;
}

function TopCustomersSection({ data, isLoading, canExport, onExport }: TopCustomersSectionProps) {
  if (isLoading) {
    return <SkeletonLoader count={1} height={300} />;
  }

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <EmptyState
          title="Sin datos de clientes"
          description="No hay clientes en el período seleccionado."
          icon={Users}
        />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Top Clientes</h3>
        {canExport && (
          <Button size="sm" variant="outline" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cliente</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Contacto</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Compras</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Gastado</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Ticket Prom.</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Última Compra</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 20).map((customer, idx) => (
              <tr key={`${customer.customerId || customer.phone || customer.email}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm">
                  {customer.customerId ? (
                    <Link to={`/customers/${customer.customerId}`} className="text-blue-600 hover:underline">
                      {customer.name}
                    </Link>
                  ) : (
                    customer.name
                  )}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {customer.phone || customer.email || '—'}
                </td>
                <td className="py-3 px-4 text-sm text-right">{customer.ordersCount}</td>
                <td className="py-3 px-4 text-sm text-right font-medium">{formatCurrency(customer.totalSpent)}</td>
                <td className="py-3 px-4 text-sm text-right">{formatCurrency(customer.averageTicket)}</td>
                <td className="py-3 px-4 text-sm text-right text-gray-600">
                  {formatDisplayDate(customer.lastPurchase.split('T')[0])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 20 && (
        <p className="text-sm text-gray-500 mt-4 text-center">
          Mostrando los primeros 20 clientes. Exporta el CSV para ver el listado completo.
        </p>
      )}
    </Card>
  );
}