/**
 * Types for Payment Methods / OpenPay & Fintoc Integration
 * 
 * Este módulo maneja la configuración de OpenPay y Fintoc para procesar pagos
 * en el storefront del ecommerce.
 */

export type OpenPayMode = 'SANDBOX' | 'PRODUCTION';

export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export type PaymentMethodKey = 'CARD' | 'SPEI' | 'OXXO' | 'FINTOC_SPEI';

export type PaymentProcessor = 'OPENPAY' | 'FINTOC';

// --- OpenPay Types ---

export interface OpenPayConfig {
  merchantId: string;
  publicKey: string;
  privateKey: string; // guardado enmascarado, mostrar solo últimos 4 chars
  mode: OpenPayMode;
  connectionStatus: ConnectionStatus;
  lastVerifiedAt?: string;
  errorMessage?: string;
}

// --- Fintoc Types ---

export type FintocMode = 'sandbox' | 'live';
export type FintocConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface FintocConfig {
  mode: FintocMode;
  secretKey: string; // en mock se guarda en claro
  publicKey: string;
  connectionStatus: FintocConnectionStatus;
  lastVerifiedAt?: string;
  errorMessage?: string;
}

// --- Payment Methods ---

export interface PaymentMethodConfig {
  key: PaymentMethodKey;
  label: string;
  description: string;
  commission: string; // ej: "3.6% + $3 MXN"
  isEnabled: boolean;
  processor?: PaymentProcessor; // Procesador que maneja este método
}

// --- Transactions ---

export interface PaymentTransaction {
  id: string;
  tenantId: string;
  processor: PaymentProcessor; // Procesador que procesó la transacción
  processorTransactionId: string; // ID de la transacción en el procesador
  orderId?: string;
  orderNumber?: string;
  amount: number;
  currency: 'MXN';
  method: PaymentMethodKey;
  status: 'COMPLETED' | 'FAILED' | 'PENDING' | 'REFUNDED';
  description?: string;
  createdAt: string;
  processorUrl: string; // URL al dashboard del procesador
}

// Labels y metadata para UI
export const OPENPAY_MODE_LABELS: Record<OpenPayMode, string> = {
  SANDBOX: 'Sandbox (Pruebas)',
  PRODUCTION: 'Producción',
};

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  CONNECTED: 'Conectado',
  DISCONNECTED: 'Desconectado',
  ERROR: 'Error',
};

export const CONNECTION_STATUS_COLORS: Record<ConnectionStatus, string> = {
  CONNECTED: 'bg-green-100 text-green-800',
  DISCONNECTED: 'bg-gray-100 text-gray-800',
  ERROR: 'bg-red-100 text-red-800',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  CARD: 'Tarjeta crédito/débito',
  SPEI: 'Transferencia SPEI (OpenPay)',
  OXXO: 'OXXO Pay',
  FINTOC_SPEI: 'Pago con SPEI',
};

export const PROCESSOR_LABELS: Record<PaymentProcessor, string> = {
  OPENPAY: 'OpenPay',
  FINTOC: 'Fintoc',
};

export const PROCESSOR_COLORS: Record<PaymentProcessor, string> = {
  OPENPAY: 'bg-gray-100 text-gray-800',
  FINTOC: 'bg-indigo-100 text-indigo-800',
};

export const FINTOC_MODE_LABELS: Record<FintocMode, string> = {
  sandbox: 'Sandbox (Pruebas)',
  live: 'Producción',
};

export const TRANSACTION_STATUS_LABELS: Record<PaymentTransaction['status'], string> = {
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
  PENDING: 'Pendiente',
  REFUNDED: 'Reembolsado',
};

export const TRANSACTION_STATUS_COLORS: Record<PaymentTransaction['status'], string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  REFUNDED: 'bg-blue-100 text-blue-800',
};

// Default payment methods configuration
export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    key: 'CARD',
    label: 'Tarjeta crédito/débito',
    description: 'Acepta pagos con tarjetas Visa, Mastercard y American Express',
    commission: '3.6% + $3 MXN',
    isEnabled: true,
    processor: 'OPENPAY',
  },
  {
    key: 'SPEI',
    label: 'Transferencia SPEI (OpenPay)',
    description: 'Transferencias bancarias electrónicas',
    commission: '$8 MXN fijo',
    isEnabled: true,
    processor: 'OPENPAY',
  },
  {
    key: 'OXXO',
    label: 'OXXO Pay',
    description: 'Pago en efectivo en tiendas OXXO',
    commission: '3.9% + $10 MXN',
    isEnabled: true,
    processor: 'OPENPAY',
  },
  {
    key: 'FINTOC_SPEI',
    label: 'Pago con SPEI',
    description: 'El comprador paga directo desde su banco vía SPEI — procesado por Fintoc',
    commission: 'Ver en dashboard Fintoc',
    isEnabled: false,
    processor: 'FINTOC',
  },
];