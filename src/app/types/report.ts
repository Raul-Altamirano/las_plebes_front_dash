// Report module types

import { OrderStatus, PaymentMethod, SalesChannel } from './order';

export type RevenueMode = 'PAID_FULFILLED' | 'PLACED_PLUS';

export interface ReportQuery {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  channel: 'ALL' | SalesChannel;
  paymentMethod: 'ALL' | PaymentMethod;
  status: 'ALL' | OrderStatus;
  includeCancelled: boolean;
  revenueMode: RevenueMode;
}

export interface KPIMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  uniqueCustomers: number;
  totalProductsSold: number;
}

export interface DailySalesData {
  date: string;
  revenue: number;
  orders: number;
  averageTicket: number;
}

export interface TopProductData {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  options?: { size?: string; color?: string };
  unitsSold: number;
  revenue: number;
  percentage: number;
}

export interface LowStockItem {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  options?: { size?: string; color?: string };
  currentStock: number;
  status: string;
}

export interface TopCustomerData {
  customerId?: string;
  name: string;
  phone?: string;
  email?: string;
  ordersCount: number;
  totalSpent: number;
  averageTicket: number;
  lastPurchase: string;
}

// Default report query
export function getDefaultReportQuery(): ReportQuery {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  return {
    from: formatDate(thirtyDaysAgo),
    to: formatDate(today),
    channel: 'ALL',
    paymentMethod: 'ALL',
    status: 'ALL',
    includeCancelled: false,
    revenueMode: 'PAID_FULFILLED',
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
