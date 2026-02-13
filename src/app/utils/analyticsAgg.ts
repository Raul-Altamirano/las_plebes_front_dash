import { AnalyticsEvent } from '../services/analytics.service';

/**
 * Filter events by date range
 */
export function filterByRange(events: AnalyticsEvent[], from: string, to: string): AnalyticsEvent[] {
  return events.filter(e => e.date >= from && e.date <= to);
}

/**
 * Count events by type
 */
export function countByType(events: AnalyticsEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  events.forEach(e => {
    counts[e.type] = (counts[e.type] || 0) + 1;
  });
  return counts;
}

/**
 * Get unique session count
 */
export function uniqueSessions(events: AnalyticsEvent[]): number {
  const sessions = new Set(events.map(e => e.sessionId));
  return sessions.size;
}

/**
 * Group events by date
 */
export function groupByDate(events: AnalyticsEvent[]): Map<string, AnalyticsEvent[]> {
  const grouped = new Map<string, AnalyticsEvent[]>();
  events.forEach(e => {
    const existing = grouped.get(e.date) || [];
    existing.push(e);
    grouped.set(e.date, existing);
  });
  return grouped;
}

/**
 * Generate daily series data for charts
 * Returns array of {date, clicks, searches, favAdded, favRemoved, variantSelects} ordered by date
 */
export function seriesDaily(events: AnalyticsEvent[], days: number): Array<{ 
  date: string; 
  clicks: number; 
  searches: number;
  favAdded: number;
  favRemoved: number;
  variantSelects: number;
}> {
  // Get date range
  const today = new Date();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  // Group by date
  const grouped = groupByDate(events);

  // Build series
  return dates.map(date => {
    const dayEvents = grouped.get(date) || [];
    const clicks = dayEvents.filter(e => e.type === 'product_card_click').length;
    const searches = dayEvents.filter(e => e.type === 'search_query').length;
    const favAdded = dayEvents.filter(e => e.type === 'favorite_toggle' && e.payload.action === 'added').length;
    const favRemoved = dayEvents.filter(e => e.type === 'favorite_toggle' && e.payload.action === 'removed').length;
    const variantSelects = dayEvents.filter(e => e.type === 'variant_select').length;
    return { date, clicks, searches, favAdded, favRemoved, variantSelects };
  });
}

/**
 * Top products by clicks
 */
export interface TopProduct {
  productId: string;
  productName: string;
  clicks: number;
}

export function topProductsByClicks(events: AnalyticsEvent[], limit = 10): TopProduct[] {
  const clicks = events.filter(e => e.type === 'product_card_click');
  
  const grouped = new Map<string, { productName: string; count: number }>();
  
  clicks.forEach(e => {
    const productId = e.payload.productId || 'unknown';
    const productName = e.payload.productName || productId;
    
    const existing = grouped.get(productId);
    if (existing) {
      existing.count++;
    } else {
      grouped.set(productId, { productName, count: 1 });
    }
  });

  const results: TopProduct[] = Array.from(grouped.entries()).map(([productId, data]) => ({
    productId,
    productName: data.productName,
    clicks: data.count,
  }));

  results.sort((a, b) => b.clicks - a.clicks);
  return results.slice(0, limit);
}

/**
 * Top variants by favorites (net adds - removes)
 */
export interface TopFavoriteVariant {
  productId: string;
  variantId: string;
  productName: string;
  color: string;
  size: string;
  adds: number;
  removes: number;
  net: number;
}

export function topVariantsByFavorites(events: AnalyticsEvent[], limit = 10): TopFavoriteVariant[] {
  const favorites = events.filter(e => e.type === 'favorite_toggle');
  
  const grouped = new Map<string, {
    productId: string;
    productName: string;
    color: string;
    size: string;
    adds: number;
    removes: number;
  }>();

  favorites.forEach(e => {
    const variantId = e.payload.variantId || `${e.payload.productId}_${e.payload.color}_${e.payload.size}`;
    const action = e.payload.action || 'added';
    
    const existing = grouped.get(variantId);
    if (existing) {
      if (action === 'added') existing.adds++;
      if (action === 'removed') existing.removes++;
    } else {
      grouped.set(variantId, {
        productId: e.payload.productId || 'unknown',
        productName: e.payload.productName || 'Unknown Product',
        color: e.payload.color || '-',
        size: e.payload.size || '-',
        adds: action === 'added' ? 1 : 0,
        removes: action === 'removed' ? 1 : 0,
      });
    }
  });

  const results: TopFavoriteVariant[] = Array.from(grouped.entries()).map(([variantId, data]) => ({
    variantId,
    productId: data.productId,
    productName: data.productName,
    color: data.color,
    size: data.size,
    adds: data.adds,
    removes: data.removes,
    net: data.adds - data.removes,
  }));

  results.sort((a, b) => b.net - a.net);
  return results.slice(0, limit);
}

/**
 * Top search queries
 */
export interface TopSearchQuery {
  query: string;
  count: number;
  avgResultsCount?: number;
}

export function topSearchQueries(events: AnalyticsEvent[], limit = 10): TopSearchQuery[] {
  const searches = events.filter(e => e.type === 'search_query');
  
  const grouped = new Map<string, { count: number; totalResults: number; hasResults: number }>();

  searches.forEach(e => {
    const query = (e.payload.query || '').toLowerCase().trim();
    if (!query) return;

    const existing = grouped.get(query);
    const resultsCount = e.payload.resultsCount;
    
    if (existing) {
      existing.count++;
      if (typeof resultsCount === 'number') {
        existing.totalResults += resultsCount;
        existing.hasResults++;
      }
    } else {
      grouped.set(query, {
        count: 1,
        totalResults: typeof resultsCount === 'number' ? resultsCount : 0,
        hasResults: typeof resultsCount === 'number' ? 1 : 0,
      });
    }
  });

  const results: TopSearchQuery[] = Array.from(grouped.entries()).map(([query, data]) => ({
    query,
    count: data.count,
    avgResultsCount: data.hasResults > 0 ? Math.round(data.totalResults / data.hasResults) : undefined,
  }));

  results.sort((a, b) => b.count - a.count);
  return results.slice(0, limit);
}