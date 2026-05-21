/**
 * src/app/types/payments.ts
 * Tipos del módulo de Pagos — alineados con FUNL-SAAS-DASH-PAYMENTS y la DB real.
 */

// ── Catálogo global de providers ─────────────────────────────────────────────
export interface GatewayRequiredField {
  key: string;
  label: string;
  type: 'text' | 'secret' | 'select';
  required: boolean;
}

export interface GatewayFees {
  percent: number;
  fixed: number;
  currency: string;
}

export interface GatewayPlanMeta {
  canOwnAccount: boolean;
  canConnect: boolean;
  trustRequired: 1 | 2 | 3;
}

export interface PaymentGateway {
  id: string;
  paymentMethodId: number;
  provider: string;
  displayName: string | null;
  description: string | null;
  flow: string[];
  requiredFields: GatewayRequiredField[];
  enabled: boolean;
  fees: GatewayFees | null;
  regions: string[];
  planMeta: GatewayPlanMeta;
}

// ── Configuración de gateway por tenant ──────────────────────────────────────
export type TenantGatewayMode   = 'xokly_managed' | 'tenant_managed';
export type TenantGatewayStatus = 'connected' | 'disconnected' | 'error';

export interface TenantGateway {
  id: string;
  tenantId: string;
  paymentMethodId: number;
  provider: string;
  mode: TenantGatewayMode;
  status: TenantGatewayStatus;
  urls: Record<string, string>;
  config: Record<string, unknown>;
  hasCredentials: boolean;
  connectedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
}

export interface CreateGatewayPayload {
  paymentMethodId: number;
  mode: TenantGatewayMode;
  credentials?: Record<string, string>;
  urls?: Record<string, string>;
  config?: Record<string, unknown>;
}

// ── Payment Intents ───────────────────────────────────────────────────────────
export type IntentStatus =
  | 'pending'
  | 'processing'
  | 'paid_pending_order'
  | 'completed'
  | 'failed'
  | 'expired';

export interface IntentItem {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface PaymentIntent {
  id: string;
  intentId: string;
  status: IntentStatus;
  source: string | null;
  paymentMethodId: number | null;
  provider: string | null;
  installments: number | null;
  total: number | null;
  totalizers: { id: string; label: string; value: number }[];
  items: IntentItem[];
  logisticType: string | null;
  orderId: string | null;
  orderNumber: string | null;
  providerRef: string | null;
  failReason: string | null;
  retryCount: number;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface IntentFilters {
  status?: IntentStatus | '';
  paymentMethodId?: number | '';
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export type StatsLevel   = 'none' | 'basic' | 'full';
export type ExportFormat = 'csv' | 'pdf' | 'pdf_wa' | null;

export interface PaymentStats {
  period: { start: string; end: string; label: string };
  gmv: number;
  totalOrders: number;
  commissions: {
    mp: number;
    xokly: number;
    total: number;
    rates: { mp: string; xokly: string };
  };
  costs: { products: number; shipping: number };
  realProfit: number;
  byMethod: { method: string; gmv: number; count: number; commission: number; profit: number }[];
  bySku?: { sku: string; name: string; revenue: number; cost: number; qty: number; profit: number }[];
  meta: {
    planId: string;
    statsLevel: StatsLevel;
    exportFormat: ExportFormat;
    historyDays: number;
  };
}

export interface StatsOptions {
  period?: 'week' | 'month' | 'year';
  fromDate?: string;
  toDate?: string;
}

// ── Plan helpers ──────────────────────────────────────────────────────────────
export const PLAN_TRUST_LEVEL: Record<string, 1 | 2 | 3> = {
  free: 1, basic: 1, bazar: 2, neni: 2, pro: 3, enterprise: 3, f_and_f: 3,
};

export const PLAN_LABEL: Record<string, string> = {
  free: 'Gratis', basic: 'Básico', bazar: 'Bazar',
  neni: 'Neni', pro: 'Pro', enterprise: 'Enterprise', f_and_f: 'Friends & Family',
};

// ── Intent UI helpers ─────────────────────────────────────────────────────────
export type IntentStatusKey = IntentStatus;

export const INTENT_STATUS_LABEL: Record<IntentStatus, string> = {
  pending:            'Pendiente',
  processing:         'En proceso',
  paid_pending_order: 'Pagado / sin orden',
  completed:          'Completado',
  failed:             'Fallido',
  expired:            'Expirado',
};

export const INTENT_STATUS_COLOR: Record<IntentStatus, string> = {
  pending:            'bg-amber-100 text-amber-800',
  processing:         'bg-blue-100 text-blue-800',
  paid_pending_order: 'bg-orange-100 text-orange-800',
  completed:          'bg-emerald-100 text-emerald-800',
  failed:             'bg-red-100 text-red-800',
  expired:            'bg-gray-100 text-gray-500',
};

// ── CLABE banks lookup ────────────────────────────────────────────────────────
export const CLABE_BANKS: Record<string, string> = {
  '002': 'BBVA',         '006': 'Bancomext',    '009': 'Banobras',
  '014': 'Santander',    '021': 'HSBC',         '030': 'Banco del Bajío',
  '036': 'Inbursa',      '037': 'Multiva',      '044': 'Scotiabank',
  '058': 'Banregio',     '059': 'Invex',        '060': 'Bansi',
  '062': 'Afirme',       '072': 'Banorte',      '127': 'Banco Azteca',
  '137': 'BanCoppel',    '148': 'PagaTodo',     '646': 'STP',
  '706': 'Arcus',        '722': 'Mercado Pago', '723': 'Cuenca',
  '728': 'SPIN by OXXO', '730': 'nvio',
};

// ── Backward-compat (legacy) ──────────────────────────────────────────────────
export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
export type PaymentMethodKey = 'CARD' | 'SPEI' | 'OXXO' | 'FINTOC_SPEI';
export type PaymentProcessor = 'OPENPAY' | 'FINTOC';
export type OpenPayMode      = 'SANDBOX' | 'PRODUCTION';
export type FintocMode       = 'sandbox' | 'live';

export interface OpenPayConfig {
  merchantId: string; publicKey: string; privateKey: string;
  mode: OpenPayMode; connectionStatus: ConnectionStatus;
  lastVerifiedAt?: string; errorMessage?: string;
}
export interface FintocConfig {
  mode: FintocMode; secretKey: string; publicKey: string;
  connectionStatus: ConnectionStatus;
  lastVerifiedAt?: string; errorMessage?: string;
}
export interface PaymentMethodConfig {
  key: PaymentMethodKey; label: string; description: string;
  commission: string; isEnabled: boolean; processor?: PaymentProcessor;
}
export interface PaymentTransaction {
  id: string; tenantId: string; processor: PaymentProcessor;
  processorTransactionId: string; orderId?: string; orderNumber?: string;
  amount: number; currency: 'MXN'; method: PaymentMethodKey;
  status: 'COMPLETED' | 'FAILED' | 'PENDING' | 'REFUNDED';
  description?: string; createdAt: string; processorUrl: string;
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = { CARD: 'Tarjeta', SPEI: 'SPEI', OXXO: 'OXXO', FINTOC_SPEI: 'SPEI Fintoc' };
export const TRANSACTION_STATUS_LABELS: Record<PaymentTransaction['status'], string> = { COMPLETED: 'Completado', FAILED: 'Fallido', PENDING: 'Pendiente', REFUNDED: 'Reembolso' };
export const TRANSACTION_STATUS_COLORS: Record<PaymentTransaction['status'], string> = { COMPLETED: 'bg-emerald-100 text-emerald-800', FAILED: 'bg-red-100 text-red-800', PENDING: 'bg-amber-100 text-amber-800', REFUNDED: 'bg-blue-100 text-blue-800' };
export const OPENPAY_MODE_LABELS: Record<OpenPayMode, string> = { SANDBOX: 'Sandbox', PRODUCTION: 'Producción' };
export const FINTOC_MODE_LABELS: Record<FintocMode, string> = { sandbox: 'Sandbox', live: 'Producción' };
export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = { CONNECTED: 'Conectado', DISCONNECTED: 'Desconectado', ERROR: 'Error' };
export const CONNECTION_STATUS_COLORS: Record<ConnectionStatus, string> = { CONNECTED: 'bg-emerald-100 text-emerald-800', DISCONNECTED: 'bg-gray-100 text-gray-800', ERROR: 'bg-red-100 text-red-800' };
export const PROCESSOR_LABELS: Record<PaymentProcessor, string> = { OPENPAY: 'OpenPay', FINTOC: 'Fintoc' };
export const PROCESSOR_COLORS: Record<PaymentProcessor, string> = { OPENPAY: 'bg-gray-100 text-gray-800', FINTOC: 'bg-indigo-100 text-indigo-800' };
