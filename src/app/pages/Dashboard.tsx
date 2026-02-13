import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, ShoppingCart, Receipt, TrendingUp } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useOrders } from '../store/OrdersContext';
import { useRMA } from '../store/RMAContext';
import { useProductsStore } from '../store/ProductsContext';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { useSalesData } from '../hooks/useSalesData';
import { MetricCard } from '../components/dashboard/MetricCard';
import { SalesChart } from '../components/dashboard/SalesChart';
import { TopProductsWidget } from '../components/dashboard/TopProductsWidget';
import { AlertsWidget } from '../components/dashboard/AlertsWidget';
import { RecentOrdersWidget } from '../components/dashboard/RecentOrdersWidget';
import { NotAuthorized } from '../components/NotAuthorized';
import { AnalyticsKpis } from '../components/analytics/AnalyticsKpis';
import { TopTables } from '../components/analytics/TopTables';
import { AnalyticsChart } from '../components/analytics/AnalyticsChart';
import { ChartSeriesToggles, ChartSeriesEnabled } from '../components/analytics/ChartSeriesToggles';
import { fetchEvents, AnalyticsEvent } from '../services/analytics.service';
import { 
  countByType, 
  uniqueSessions, 
  seriesDaily,
  topProductsByClicks,
  topVariantsByFavorites,
  topSearchQueries 
} from '../utils/analyticsAgg';

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

type TimeRange = 'today' | '7d' | '30d';

const DEFAULT_CHART_SERIES: ChartSeriesEnabled = {
  clicks: true,
  searches: true,
  favAdds: false,
  favRemoves: false,
  variantSelects: false,
};

const CHART_SERIES_STORAGE_KEY = 'analytics.chartSeriesEnabled';

export function Dashboard() {
  const { hasPermission } = useAuth();
  const { orders } = useOrders();
  const { rmas } = useRMA();
  const { products } = useProductsStore();
  
  const [lowStockThreshold] = useState(DEFAULT_LOW_STOCK_THRESHOLD);
  const [isLoading, setIsLoading] = useState(true);

  // Analytics state
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<TimeRange>('7d');
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [chartSeriesEnabled, setChartSeriesEnabled] = useState<ChartSeriesEnabled>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(CHART_SERIES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading chart series preferences:', error);
    }
    return DEFAULT_CHART_SERIES;
  });

  // Persist chart series preferences
  const handleChartSeriesChange = (newEnabled: ChartSeriesEnabled) => {
    setChartSeriesEnabled(newEnabled);
    try {
      localStorage.setItem(CHART_SERIES_STORAGE_KEY, JSON.stringify(newEnabled));
    } catch (error) {
      console.error('Error saving chart series preferences:', error);
    }
  };

  // Simular loading inicial
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Calcular métricas
  const metrics = useDashboardMetrics(orders, rmas, products, { lowStockThreshold });
  const salesData = useSalesData(orders, 30);

  // Verificar permiso básico de lectura (order:read es suficiente)
  const canViewDashboard = hasPermission('order:read');
  const canViewCosts = hasPermission('cost:read');

  if (!canViewDashboard) {
    return <NotAuthorized />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Fetch analytics events
  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoadingAnalytics(true);
      
      // Calculate date range
      const today = new Date();
      const to = today.toISOString().split('T')[0]; // YYYY-MM-DD
      let from: string;
      
      if (analyticsTimeRange === 'today') {
        from = to;
      } else if (analyticsTimeRange === '7d') {
        const d = new Date(today);
        d.setDate(d.getDate() - 7);
        from = d.toISOString().split('T')[0];
      } else {
        const d = new Date(today);
        d.setDate(d.getDate() - 30);
        from = d.toISOString().split('T')[0];
      }
      
      try {
        const events = await fetchEvents({
          tenantId: 'las-plebes',
          from,
          to,
        });
        setAnalyticsEvents(events);
      } catch (error) {
        console.error('Error loading analytics:', error);
        setAnalyticsEvents([]);
      } finally {
        // Minimum visible time for loading state
        setTimeout(() => setIsLoadingAnalytics(false), 400);
      }
    };

    loadAnalytics();
  }, [analyticsTimeRange]);

  // Analytics aggregations (memoized for performance)
  const analyticsData = useMemo(() => {
    const counts = countByType(analyticsEvents);
    const sessions = uniqueSessions(analyticsEvents);
    
    // Determine days for series based on range
    const days = analyticsTimeRange === 'today' ? 1 : analyticsTimeRange === '7d' ? 7 : 30;
    
    return {
      productClicks: counts['product_card_click'] || 0,
      favoritesAdded: analyticsEvents.filter(e => e.type === 'favorite_toggle' && e.payload.action === 'added').length,
      favoritesRemoved: analyticsEvents.filter(e => e.type === 'favorite_toggle' && e.payload.action === 'removed').length,
      searches: counts['search_query'] || 0,
      variantSelections: counts['variant_select'] || 0,
      uniqueSessions: sessions,
      seriesDaily: seriesDaily(analyticsEvents, days),
      topProducts: topProductsByClicks(analyticsEvents, 10),
      topFavorites: topVariantsByFavorites(analyticsEvents, 10),
      topSearches: topSearchQueries(analyticsEvents, 10),
    };
  }, [analyticsEvents, analyticsTimeRange]);

  const getRangeLabel = () => {
    if (analyticsTimeRange === 'today') return 'Hoy';
    if (analyticsTimeRange === '7d') return 'Últimos 7 días';
    return 'Últimos 30 días';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          Métricas y rendimiento de tu tienda
        </p>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ventas"
          value={formatCurrency(metrics.totalSales)}
          icon={DollarSign}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          change={metrics.salesChange}
          changeLabel="vs mes anterior"
        />

        <MetricCard
          title="Pedidos"
          value={metrics.totalOrders}
          icon={ShoppingCart}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          change={metrics.ordersChange}
          changeLabel="vs mes anterior"
        />

        <MetricCard
          title="Ticket Promedio"
          value={formatCurrency(metrics.averageTicket)}
          icon={Receipt}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          change={metrics.ticketChange}
          changeLabel="vs mes anterior"
        />

        {canViewCosts ? (
          <MetricCard
            title="Margen Promedio"
            value={
              metrics.averageMargin !== null
                ? `${metrics.averageMargin.toFixed(1)}%`
                : '—'
            }
            icon={TrendingUp}
            iconBgColor="bg-orange-100"
            iconColor="text-orange-600"
            change={metrics.marginChange}
            changeLabel="pp vs mes anterior"
            tooltip={
              metrics.averageMargin === null
                ? 'Captura COGS en tus productos para calcular el margen'
                : undefined
            }
          />
        ) : (
          <MetricCard
            title="Margen Promedio"
            value="—"
            icon={TrendingUp}
            iconBgColor="bg-orange-100"
            iconColor="text-orange-600"
            restricted={true}
            tooltip="Requiere permiso cost:read para ver márgenes"
          />
        )}
      </div>

      {/* Sales Chart */}
      <SalesChart data={salesData} loading={isLoading} />

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsWidget orders={orders} />
        <AlertsWidget
          lowStockCount={metrics.lowStockCount}
          pendingOrdersCount={metrics.pendingOrdersCount}
          pendingRMAsCount={metrics.pendingRMAsCount}
          lowStockThreshold={lowStockThreshold}
        />
      </div>

      {/* Recent Orders */}
      <RecentOrdersWidget orders={orders} />

      {/* Analytics Section */}
      <div className="space-y-6 border-t border-gray-200 pt-6 mt-8">
        {/* Header with Time Range Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Analytics (MVP)</h2>
            <p className="text-sm text-gray-600 mt-1">
              Comportamiento de usuarios en el storefront
            </p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                analyticsTimeRange === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setAnalyticsTimeRange('today')}
              disabled={isLoadingAnalytics}
            >
              Hoy
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                analyticsTimeRange === '7d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setAnalyticsTimeRange('7d')}
              disabled={isLoadingAnalytics}
            >
              7 días
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                analyticsTimeRange === '30d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setAnalyticsTimeRange('30d')}
              disabled={isLoadingAnalytics}
            >
              30 días
            </button>
          </div>
        </div>

        {/* Loading state or content */}
        {isLoadingAnalytics ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-sm text-gray-500 mt-4">Cargando analytics...</p>
          </div>
        ) : (
          <>
            {/* Analytics KPIs */}
            <AnalyticsKpis
              productClicks={analyticsData.productClicks}
              favoritesAdded={analyticsData.favoritesAdded}
              favoritesRemoved={analyticsData.favoritesRemoved}
              searches={analyticsData.searches}
              variantSelections={analyticsData.variantSelections}
              uniqueSessions={analyticsData.uniqueSessions}
              rangeLabel={getRangeLabel()}
            />

            {/* Analytics Chart */}
            <div className="space-y-4">
              {/* Chart Series Controls */}
              <div className="flex items-center justify-end">
                <ChartSeriesToggles
                  enabled={chartSeriesEnabled}
                  onChange={handleChartSeriesChange}
                />
              </div>
              
              <AnalyticsChart 
                data={analyticsData.seriesDaily} 
                seriesEnabled={chartSeriesEnabled}
              />
            </div>

            {/* Top Tables */}
            <TopTables
              topProducts={analyticsData.topProducts}
              topFavorites={analyticsData.topFavorites}
              topSearches={analyticsData.topSearches}
            />
          </>
        )}
      </div>
    </div>
  );
}