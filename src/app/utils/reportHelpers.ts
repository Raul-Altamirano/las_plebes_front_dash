import { Order, OrderStatus, OrderItem } from '../types/order';
import { Product, ProductVariant } from '../types/product';
import {
  ReportQuery,
  RevenueMode,
  KPIMetrics,
  DailySalesData,
  TopProductData,
  LowStockItem,
  TopCustomerData,
} from '../types/report';

// Determina si una orden cuenta como venta según el modo
export function isRevenueOrder(order: Order, mode: RevenueMode): boolean {
  if (mode === 'PAID_FULFILLED') {
    return order.status === 'PAID' || order.status === 'FULFILLED';
  }
  // PLACED_PLUS mode
  return order.status === 'PLACED' || order.status === 'PAID' || order.status === 'FULFILLED';
}

// Filtra órdenes según los criterios del reporte
export function filterOrders(orders: Order[], query: ReportQuery): Order[] {
  return orders.filter(order => {
    // Rango de fechas
    const orderDate = order.createdAt.split('T')[0];
    if (orderDate < query.from || orderDate > query.to) return false;

    // Canal
    if (query.channel !== 'ALL' && order.channel !== query.channel) return false;

    // Método de pago
    if (query.paymentMethod !== 'ALL' && order.paymentMethod !== query.paymentMethod) return false;

    // Estado específico
    if (query.status !== 'ALL' && order.status !== query.status) return false;

    // Excluir cancelados si está configurado
    if (!query.includeCancelled && order.status === 'CANCELLED') return false;

    // Para métricas de ingresos, aplicar el modo
    // (Esta función filtra para listado general, no para revenue específicamente)
    return true;
  });
}

// Calcula KPIs basados en órdenes filtradas
export function calculateKPIs(orders: Order[], query: ReportQuery): KPIMetrics {
  // Solo contar órdenes que generen ingresos según el modo
  const revenueOrders = orders.filter(o => {
    if (o.status === 'CANCELLED') return false;
    if (o.status === 'REFUNDED') return false; // V1: no contar refunded
    return isRevenueOrder(o, query.revenueMode);
  });

  const totalRevenue = revenueOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = revenueOrders.length;
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Clientes únicos (customerId o fallback a phone/email)
  const uniqueCustomerIds = new Set<string>();
  revenueOrders.forEach(order => {
    if (order.customerId) {
      uniqueCustomerIds.add(order.customerId);
    } else {
      // Fallback: usar phone o email como identificador
      const fallbackId = order.customer.phone || order.customer.email || order.customer.name;
      if (fallbackId) uniqueCustomerIds.add(fallbackId);
    }
  });

  // Total de productos vendidos (suma qty)
  const totalProductsSold = revenueOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.qty, 0),
    0
  );

  return {
    totalRevenue,
    totalOrders,
    averageTicket,
    uniqueCustomers: uniqueCustomerIds.size,
    totalProductsSold,
  };
}

// Ventas por día
export function calculateDailySales(orders: Order[], query: ReportQuery): DailySalesData[] {
  const revenueOrders = orders.filter(o => {
    if (o.status === 'CANCELLED' || o.status === 'REFUNDED') return false;
    return isRevenueOrder(o, query.revenueMode);
  });

  // Agrupar por fecha
  const salesByDate = new Map<string, { revenue: number; count: number }>();

  revenueOrders.forEach(order => {
    const date = order.createdAt.split('T')[0];
    const current = salesByDate.get(date) || { revenue: 0, count: 0 };
    salesByDate.set(date, {
      revenue: current.revenue + order.total,
      count: current.count + 1,
    });
  });

  // Convertir a array y ordenar por fecha
  const dailySales: DailySalesData[] = [];
  salesByDate.forEach((data, date) => {
    dailySales.push({
      date,
      revenue: data.revenue,
      orders: data.count,
      averageTicket: data.revenue / data.count,
    });
  });

  // Ordenar por fecha descendente (más reciente primero)
  dailySales.sort((a, b) => b.date.localeCompare(a.date));

  return dailySales;
}

// Top productos/variantes
export function calculateTopProducts(orders: Order[], query: ReportQuery): TopProductData[] {
  const revenueOrders = orders.filter(o => {
    if (o.status === 'CANCELLED' || o.status === 'REFUNDED') return false;
    return isRevenueOrder(o, query.revenueMode);
  });

  // Agrupar por SKU + opciones (usa snapshots)
  const productStats = new Map<string, {
    productId: string;
    variantId?: string;
    name: string;
    sku: string;
    options?: { size?: string; color?: string };
    unitsSold: number;
    revenue: number;
  }>();

  revenueOrders.forEach(order => {
    order.items.forEach(item => {
      // Crear clave única basada en SKU y opciones
      const key = item.variantId
        ? `${item.skuSnapshot}-${JSON.stringify(item.optionsSnapshot || {})}`
        : item.skuSnapshot;

      const current = productStats.get(key) || {
        productId: item.productId,
        variantId: item.variantId,
        name: item.nameSnapshot,
        sku: item.skuSnapshot,
        options: item.optionsSnapshot,
        unitsSold: 0,
        revenue: 0,
      };

      productStats.set(key, {
        ...current,
        unitsSold: current.unitsSold + item.qty,
        revenue: current.revenue + item.lineTotal,
      });
    });
  });

  // Convertir a array
  const topProducts: TopProductData[] = Array.from(productStats.values()).map(p => ({
    ...p,
    percentage: 0, // Calcularemos después
  }));

  // Calcular total de ingresos para porcentajes
  const totalRevenue = topProducts.reduce((sum, p) => sum + p.revenue, 0);

  // Calcular porcentajes
  topProducts.forEach(p => {
    p.percentage = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
  });

  // Ordenar por ingresos (descendente)
  topProducts.sort((a, b) => b.revenue - a.revenue);

  return topProducts;
}

// Stock bajo
export function calculateLowStock(
  products: Product[],
  threshold: number = 5
): LowStockItem[] {
  const lowStockItems: LowStockItem[] = [];

  products.forEach(product => {
    // Si es producto simple (sin variantes)
    if (!product.hasVariants) {
      if (product.stock <= threshold && !product.isArchived) {
        lowStockItems.push({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          currentStock: product.stock,
          status: product.status,
        });
      }
    } else {
      // Si tiene variantes, revisar cada una
      product.variants?.forEach(variant => {
        if (variant.stock <= threshold && !product.isArchived) {
          lowStockItems.push({
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            sku: variant.sku,
            options: variant.options,
            currentStock: variant.stock,
            status: variant.status || (variant.stock === 0 ? 'OUT_OF_STOCK' : 'ACTIVE'),
          });
        }
      });
    }
  });

  // Ordenar por stock (menor primero)
  lowStockItems.sort((a, b) => a.currentStock - b.currentStock);

  return lowStockItems;
}

// Top clientes
export function calculateTopCustomers(orders: Order[], query: ReportQuery): TopCustomerData[] {
  const revenueOrders = orders.filter(o => {
    if (o.status === 'CANCELLED' || o.status === 'REFUNDED') return false;
    return isRevenueOrder(o, query.revenueMode);
  });

  // Agrupar por customerId o fallback
  const customerStats = new Map<string, {
    customerId?: string;
    name: string;
    phone?: string;
    email?: string;
    ordersCount: number;
    totalSpent: number;
    lastPurchase: string;
  }>();

  revenueOrders.forEach(order => {
    // Determinar clave de cliente
    const key = order.customerId || order.customer.phone || order.customer.email || order.customer.name;
    if (!key) return;

    const current = customerStats.get(key) || {
      customerId: order.customerId,
      name: order.customer.name,
      phone: order.customer.phone,
      email: order.customer.email,
      ordersCount: 0,
      totalSpent: 0,
      lastPurchase: order.createdAt,
    };

    customerStats.set(key, {
      ...current,
      ordersCount: current.ordersCount + 1,
      totalSpent: current.totalSpent + order.total,
      lastPurchase: order.createdAt > current.lastPurchase ? order.createdAt : current.lastPurchase,
    });
  });

  // Convertir a array
  const topCustomers: TopCustomerData[] = Array.from(customerStats.values()).map(c => ({
    ...c,
    averageTicket: c.totalSpent / c.ordersCount,
  }));

  // Ordenar por total gastado (descendente)
  topCustomers.sort((a, b) => b.totalSpent - a.totalSpent);

  return topCustomers;
}

// Formatear moneda
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Formatear fecha para display
export function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}