import { useMemo } from 'react';
import { type Order } from '../types/order';
import { subDays, format, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export interface DailySalesData {
  date: string; // formato: YYYY-MM-DD para consistencia
  dateLabel: string; // formato: "15 Ene" para display
  sales: number;
  orders: number;
}

export function useSalesData(orders: Order[], days: number = 30): DailySalesData[] {
  return useMemo(() => {
    const now = new Date();
    const startDate = subDays(now, days - 1); // -1 porque incluimos hoy

    // Crear array de todos los días en el rango
    const allDays = eachDayOfInterval({ start: startDate, end: now });

    // Inicializar mapa con todos los días en 0
    const salesByDay = new Map<string, { sales: number; orders: number }>();
    allDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      salesByDay.set(dateKey, { sales: 0, orders: 0 });
    });

    // Filtrar órdenes válidas (excluir CANCELLED)
    const validOrders = orders.filter(o => o.status !== 'CANCELLED');

    // Agrupar ventas por día
    validOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const dateKey = format(orderDate, 'yyyy-MM-dd');
      
      // Solo contar si está dentro del rango
      if (salesByDay.has(dateKey)) {
        const current = salesByDay.get(dateKey)!;
        salesByDay.set(dateKey, {
          sales: current.sales + order.total,
          orders: current.orders + 1,
        });
      }
    });

    // Convertir a array ordenado
    return Array.from(salesByDay.entries())
      .map(([date, data]) => ({
        date,
        dateLabel: format(new Date(date), 'd MMM', { locale: es }),
        sales: data.sales,
        orders: data.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [orders, days]);
}
