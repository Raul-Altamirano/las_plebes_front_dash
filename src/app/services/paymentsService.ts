/**
 * src/app/services/paymentsService.ts
 * Servicio de pagos — conectado a FUNL-SAAS-DASH-PAYMENTS via API Gateway.
 * API Gateway Dashboard: https://8q4cr0oale.execute-api.us-east-1.amazonaws.com
 */

import { createApiClient } from '../../api/http';
import type {
  PaymentGateway,
  TenantGateway,
  CreateGatewayPayload,
  PaymentIntent,
  IntentFilters,
  Pagination,
  PaymentStats,
  StatsOptions,
} from '../types/payments';

export interface PaymentConfig {
  flags: {
    showOnboarding:  boolean;
    trustLevel:      1 | 2 | 3;
    showTrustMeter:  boolean;
    showOwnGateways: boolean;
    showStats:       boolean;
    canExportCsv:    boolean;
    canExportPdf:    boolean;
    nextDeposit: { date: string; amount: number; currency: string } | null;
  };
  planId:    string;
  updatedAt: string | null;
  updatedBy: string | null;
}

const DASH_BASE =
  (import.meta.env.VITE_DASH_API_URL as string | undefined) ??
  'https://8q4cr0oale.execute-api.us-east-1.amazonaws.com';

const api = createApiClient(DASH_BASE);

// ── Catálogo de providers ─────────────────────────────────────────────────────
export async function getGateways(): Promise<PaymentGateway[]> {
  const res = await api<{ data: PaymentGateway[] }>('/api/v1/payments/gateways', {
    label: 'getGateways',
  });
  return res.data ?? [];
}

// ── Gateways configurados por el tenant ──────────────────────────────────────
export async function getTenantGateways(): Promise<TenantGateway[]> {
  const res = await api<{ data: TenantGateway[] }>('/api/v1/payments/tenant-gateways', {
    label: 'getTenantGateways',
  });
  return res.data ?? [];
}

export async function connectTenantGateway(
  payload: CreateGatewayPayload,
): Promise<TenantGateway> {
  const res = await api<{ data: TenantGateway }>('/api/v1/payments/tenant-gateways', {
    method: 'POST',
    body: JSON.stringify(payload),
    label: 'connectTenantGateway',
  });
  return res.data;
}

export async function updateTenantGateway(
  id: string,
  payload: Partial<Pick<TenantGateway, 'status' | 'config' | 'urls' | 'mode'>>,
): Promise<TenantGateway> {
  const res = await api<{ data: TenantGateway }>(
    `/api/v1/payments/tenant-gateways/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
      label: 'updateTenantGateway',
    },
  );
  return res.data;
}

// ── Historial de intents ──────────────────────────────────────────────────────
export async function getIntents(filters?: IntentFilters): Promise<{
  data: PaymentIntent[];
  pagination: Pagination;
  meta: { historyDays: number; exportFormat: string | null };
}> {
  const params = new URLSearchParams();
  if (filters?.status)          params.set('status',          String(filters.status));
  if (filters?.paymentMethodId) params.set('paymentMethodId', String(filters.paymentMethodId));
  if (filters?.fromDate)        params.set('fromDate',        filters.fromDate);
  if (filters?.toDate)          params.set('toDate',          filters.toDate);
  if (filters?.page)            params.set('page',            String(filters.page));
  if (filters?.limit)           params.set('limit',           String(filters.limit));

  const qs = params.toString();
  const res = await api<{
    data: PaymentIntent[];
    pagination: Pagination;
    meta: { historyDays: number; exportFormat: string | null };
  }>(`/api/v1/payments/intents${qs ? `?${qs}` : ''}`, { label: 'getIntents' });

  return res;
}

// ── Stats GMV + comisiones + ganancia real ────────────────────────────────────
export async function getPaymentStats(options?: StatsOptions): Promise<PaymentStats> {
  const params = new URLSearchParams();
  if (options?.period)   params.set('period',   options.period);
  if (options?.fromDate) params.set('fromDate', options.fromDate);
  if (options?.toDate)   params.set('toDate',   options.toDate);

  const qs  = params.toString();
  const res = await api<{ data: PaymentStats }>(
    `/api/v1/payments/stats${qs ? `?${qs}` : ''}`,
    { label: 'getPaymentStats' },
  );
  return res.data;
}

// ── Exportar reporte CSV (client-side, datos ya en memoria) ──────────────────
export function exportIntentsCSV(intents: PaymentIntent[]): void {
  const headers = ['Intent ID', 'Estado', 'Total', 'Provider', 'Orden', 'Fecha'];
  const rows = intents.map(i => [
    i.intentId,
    i.status,
    i.total != null ? `$${i.total.toFixed(2)}` : '-',
    i.provider ?? '-',
    i.orderNumber ?? '-',
    i.createdAt ? new Date(i.createdAt).toLocaleString('es-MX') : '-',
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `pagos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}


export async function getPaymentConfig(): Promise<PaymentConfig> {
  const res = await api<{ data: PaymentConfig }>('/api/v1/payments/config', {
    label: 'getPaymentConfig',
  });
  return res.data;
}

export async function updatePaymentConfig(
  flags: Partial<PaymentConfig['flags']>,
): Promise<PaymentConfig> {
  const res = await api<{ data: PaymentConfig }>('/api/v1/payments/config', {
    method: 'PATCH',
    body:   JSON.stringify(flags),
    label:  'updatePaymentConfig',
  });
  return res.data;
}



export interface DepositAccountResponse {
  status:       'active' | 'pending_48h' | 'not_configured';
  clabe:        string | null;
  bank:         string | null;
  holder:       string | null;
  pending?:     string | null;
  holdsUntil?:  string | null;
  currentClabe?: string | null;
  storeActive:  boolean;
  isNew?:       boolean;
  message?:     string;
  mpOwner?:     { email: string; verifiedAt: string } | null;
}

export async function getDepositAccount(): Promise<DepositAccountResponse> {
  const res = await api<{ data: DepositAccountResponse }>(
    '/api/v1/payments/deposit-account',
    { label: 'getDepositAccount' },
  );
  return res.data;
}

export async function saveDepositAccount(
  clabe: string,
  holder: string,
): Promise<DepositAccountResponse> {
  const res = await api<{ data: DepositAccountResponse }>(
    '/api/v1/payments/deposit-account',
    {
      method: 'POST',
      body:   JSON.stringify({ clabe, holder }),
      label:  'saveDepositAccount',
    },
  );
  return res.data;
}