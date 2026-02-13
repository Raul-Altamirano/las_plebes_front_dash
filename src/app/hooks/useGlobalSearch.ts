import { useMemo } from 'react';
import { useProducts } from '../store/ProductsContext';
import { useOrders } from '../store/OrdersContext';
import { useCustomers } from '../store/CustomersContext';
import { useRMA } from '../store/RMAContext';

export interface SearchItem {
  type: 'product' | 'order' | 'customer' | 'rma';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchResults {
  products: SearchItem[];
  orders: SearchItem[];
  customers: SearchItem[];
  rmas: SearchItem[];
}

export interface SearchTotals {
  products: number;
  orders: number;
  customers: number;
  rmas: number;
  all: number;
}

export function useGlobalSearch(query: string) {
  const { products } = useProducts();
  const { orders } = useOrders();
  const { customers } = useCustomers();
  const { rmas } = useRMA();

  const results = useMemo<SearchResults>(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return {
        products: [],
        orders: [],
        customers: [],
        rmas: [],
      };
    }

    // Buscar en Productos
    const productResults: SearchItem[] = products
      .filter((product) => {
        const searchableText = [
          product.name,
          product.sku,
          product.id,
          ...(product.variants?.map((v) => v.variantSku) || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .map((product) => ({
        type: 'product' as const,
        id: product.id,
        title: product.name,
        subtitle: `SKU: ${product.sku} • ${product.variants?.length || 0} variantes`,
        href: `/products/${product.id}/edit`,
      }))
      .slice(0, 10); // Limitar resultados

    // Buscar en Pedidos
    const orderResults: SearchItem[] = orders
      .filter((order) => {
        const searchableText = [
          order.orderNumber,
          order.id,
          order.customerName,
          order.customerPhone,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .map((order) => ({
        type: 'order' as const,
        id: order.id,
        title: `Pedido ${order.orderNumber}`,
        subtitle: `${order.customerName} • ${order.status}`,
        href: `/orders/${order.id}`,
      }))
      .slice(0, 10);

    // Buscar en Clientes
    const customerResults: SearchItem[] = customers
      .filter((customer) => {
        const searchableText = [customer.name, customer.email, customer.phone]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .map((customer) => ({
        type: 'customer' as const,
        id: customer.id,
        title: customer.name,
        subtitle: `${customer.email || ''} ${customer.phone ? `• ${customer.phone}` : ''}`.trim(),
        href: `/customers/${customer.id}`,
      }))
      .slice(0, 10);

    // Buscar en RMAs
    const rmaResults: SearchItem[] = rmas
      .filter((rma) => {
        const searchableText = [
          rma.rmaNumber,
          rma.id,
          rma.orderNumber,
          rma.customerName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .map((rma) => ({
        type: 'rma' as const,
        id: rma.id,
        title: `RMA ${rma.rmaNumber}`,
        subtitle: `${rma.customerName} • ${rma.status}`,
        href: `/rma/${rma.id}`,
      }))
      .slice(0, 10);

    return {
      products: productResults,
      orders: orderResults,
      customers: customerResults,
      rmas: rmaResults,
    };
  }, [query, products, orders, customers, rmas]);

  const totals = useMemo<SearchTotals>(() => {
    return {
      products: results.products.length,
      orders: results.orders.length,
      customers: results.customers.length,
      rmas: results.rmas.length,
      all:
        results.products.length +
        results.orders.length +
        results.customers.length +
        results.rmas.length,
    };
  }, [results]);

  return {
    results,
    totals,
  };
}
