// src/app/services/paymentsService.ts
import type { OpenPayConfig, FintocConfig, PaymentMethodConfig, PaymentTransaction, PaymentMethodKey } from '../types/payments';
import { MOCK_OPENPAY_CONFIG, MOCK_PAYMENT_METHODS, MOCK_TRANSACTIONS } from '../data/mockPayments';

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export async function getOpenPayConfig(): Promise<OpenPayConfig> {
  await delay();
  return MOCK_OPENPAY_CONFIG;
}

export async function saveOpenPayConfig(config: OpenPayConfig): Promise<OpenPayConfig> {
  await delay(500);
  return { ...config, lastVerifiedAt: undefined };
}

export async function verifyOpenPayConnection(config: OpenPayConfig): Promise<{ success: boolean; errorMessage?: string }> {
  await delay(1500);
  if (!config.merchantId || !config.privateKey) {
    return { success: false, errorMessage: 'Credenciales incompletas' };
  }
  return { success: true };
}

export async function getFintocConfig(): Promise<FintocConfig | null> {
  await delay();
  return null;
}

export async function saveFintocConfig(config: FintocConfig): Promise<FintocConfig> {
  await delay(500);
  return { ...config };
}

export async function verifyFintocConnection(config: FintocConfig): Promise<{ success: boolean; errorMessage?: string }> {
  await delay(1500);
  if (!config.secretKey || !config.publicKey) {
    return { success: false, errorMessage: 'Credenciales incompletas' };
  }
  return { success: true };
}

export async function getPaymentMethods(): Promise<PaymentMethodConfig[]> {
  await delay();
  return MOCK_PAYMENT_METHODS;
}

export async function updatePaymentMethod(key: PaymentMethodKey, updates: Partial<PaymentMethodConfig>): Promise<void> {
  await delay(300);
}

export async function getTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  method?: string;
  status?: string;
}): Promise<PaymentTransaction[]> {
  await delay(400);
  let txns = [...MOCK_TRANSACTIONS];
  if (filters?.method) txns = txns.filter(t => t.method === filters.method);
  if (filters?.status) txns = txns.filter(t => t.status === filters.status);
  return txns;
}