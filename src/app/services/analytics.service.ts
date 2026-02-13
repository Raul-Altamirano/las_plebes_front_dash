import eventsData from '../data/events.json';

export type EventType = 'product_card_click' | 'favorite_toggle' | 'search_query' | 'variant_select';

export type AnalyticsEvent = {
  ts: number; // epoch ms
  date: string; // YYYY-MM-DD
  type: EventType;
  tenantId: string;
  sessionId: string;
  userId: string; // "guest" | user_id
  source: 'PLP' | 'PDP' | 'SEARCH' | 'HEADER' | 'FAVORITES';
  payload: Record<string, any>;
};

export type AnalyticsSource = 'mock';

export interface FetchEventsParams {
  tenantId: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

/**
 * Fetches analytics events from the data source.
 * Currently using mock JSON, but designed to easily swap for API calls.
 */
export async function fetchEvents(params: FetchEventsParams): Promise<AnalyticsEvent[]> {
  const { tenantId, from, to } = params;

  // Simulate minimal network delay
  await new Promise(resolve => setTimeout(resolve, 150));

  // Filter events by tenantId and date range
  const filtered = (eventsData as AnalyticsEvent[]).filter(event => {
    if (event.tenantId !== tenantId) return false;
    if (event.date < from || event.date > to) return false;
    return true;
  });

  return filtered;
}

/**
 * Future: Replace mock with API call
 * 
 * export async function fetchEvents(params: FetchEventsParams): Promise<AnalyticsEvent[]> {
 *   const response = await fetch(
 *     `/api/analytics/events?tenantId=${params.tenantId}&from=${params.from}&to=${params.to}`
 *   );
 *   if (!response.ok) throw new Error('Failed to fetch events');
 *   return response.json();
 * }
 */
