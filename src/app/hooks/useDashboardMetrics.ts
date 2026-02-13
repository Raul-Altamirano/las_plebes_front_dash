import { useMemo } from 'react';
import {  type Order } from '../types/order';
import { type RMA } from '../types/rma';
import { type Product } from '../types/product';
import { subDays } from 'date-fns';

export interface DashboardMetrics {
  // KPIs principales
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  averageMargin: number | null; // null si no hay datos de costos
  
  // Comparativos vs período anterior
  salesChange: number; // % change
  ordersChange: number;
  ticketChange: number;
  marginChange: number | null;
  
  // Alertas
  lowStockCount: number;
  pendingOrdersCount: number;
  pendingRMAsCount: number;
}

interface MetricsOptions {
  lowStockThreshold?: number;
}

export function useDashboardMetrics(
  orders: Order[],
  rmas: RMA[],
  products: Product[],
  options?: MetricsOptions
): DashboardMetrics {
  const lowStockThreshold = options?.lowStockThreshold ?? 5;

  return useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);

    // Filtrar órdenes válidas (excluir CANCELLED)
    const validOrders = orders.filter(o => o.status !== 'CANCELLED');

    // Período A: últimos 30 días
    const periodAOrders = validOrders.filter(o => {
      const date = new Date(o.createdAt);
      return date >= thirtyDaysAgo && date <= now;
    });

    // Período B: 30-60 días atrás
    const periodBOrders = validOrders.filter(o => {
      const date = new Date(o.createdAt);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    });

    // Calcular métricas para período A
    const salesA = periodAOrders.reduce((sum, o) => sum + o.total, 0);
    const ordersA = periodAOrders.length;
    const ticketA = ordersA > 0 ? salesA / ordersA : 0;

    // Calcular margen solo si hay datos de costos
    let marginA: number | null = null;
    let hasAnyCosts = false;
    
    const totalRevenue = periodAOrders.reduce((sum, o) => {
      const orderRevenue = o.items.reduce((itemSum, item) => itemSum + item.lineTotal, 0);
      return sum + orderRevenue;
    }, 0);

    const totalProfit = periodAOrders.reduce((sum, o) => {
      const orderProfit = o.items.reduce((itemSum, item) => {
        if (item.lineProfit !== undefined && item.lineProfit !== null) {
          hasAnyCosts = true;
          return itemSum + item.lineProfit;
        }
        return itemSum;
      }, 0);
      return sum + orderProfit;
    }, 0);

    if (hasAnyCosts && totalRevenue > 0) {
      marginA = (totalProfit / totalRevenue) * 100;
    }

    // Calcular métricas para período B
    const salesB = periodBOrders.reduce((sum, o) => sum + o.total, 0);
    const ordersB = periodBOrders.length;
    const ticketB = ordersB > 0 ? salesB / ordersB : 0;

    const totalRevenueB = periodBOrders.reduce((sum, o) => {
      const orderRevenue = o.items.reduce((itemSum, item) => itemSum + item.lineTotal, 0);
      return sum + orderRevenue;
    }, 0);

    const totalProfitB = periodBOrders.reduce((sum, o) => {
      const orderProfit = o.items.reduce((itemSum, item) => {
        if (item.lineProfit !== undefined && item.lineProfit !== null) {
          return itemSum + item.lineProfit;
        }
        return itemSum;
      }, 0);
      return sum + orderProfit;
    }, 0);

    let marginB: number | null = null;
    if (hasAnyCosts && totalRevenueB > 0) {
      marginB = (totalProfitB / totalRevenueB) * 100;
    }

    // Calcular cambios porcentuales
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const salesChange = calculateChange(salesA, salesB);
    const ordersChange = calculateChange(ordersA, ordersB);
    const ticketChange = calculateChange(ticketA, ticketB);
    const marginChange = marginA !== null && marginB !== null 
      ? marginA - marginB // Para margen, mostramos diferencia en puntos porcentuales
      : null;

    // Alertas
    const lowStockCount = products.filter(p => 
      p.status === 'ACTIVE' && p.stock <= lowStockThreshold
    ).length;

    const pendingOrdersCount = orders.filter(o => 
      o.status === 'PLACED' || o.status === 'PAID' || o.status === 'HOLD_REVIEW'
    ).length;

    const pendingRMAsCount = rmas.filter(r => 
      r.status === 'DRAFT' || r.status === 'APPROVED'
    ).length;

    return {
      totalSales: salesA,
      totalOrders: ordersA,
      averageTicket: ticketA,
      averageMargin: marginA,
      salesChange,
      ordersChange,
      ticketChange,
      marginChange,
      lowStockCount,
      pendingOrdersCount,
      pendingRMAsCount,
    };
  }, [orders, rmas, products, lowStockThreshold]);
}