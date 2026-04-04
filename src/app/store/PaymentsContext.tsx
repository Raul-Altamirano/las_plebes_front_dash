import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { OpenPayConfig, FintocConfig, PaymentMethodConfig, PaymentTransaction, PaymentMethodKey } from '../types/payments';
import { DEFAULT_PAYMENT_METHODS } from '../types/payments';
import {
  getOpenPayConfig,
  saveOpenPayConfig,
  verifyOpenPayConnection,
  getFintocConfig,
  saveFintocConfig as saveFintocConfigService,
  verifyFintocConnection as verifyFintocConnectionService,
  getPaymentMethods,
  updatePaymentMethod,
  getTransactions,
} from '../services/paymentsService';
import { useAudit } from './AuditContext';
import { useAuth } from './AuthContext';

interface PaymentsState {
  config: OpenPayConfig | null;
  fintocConfig: FintocConfig | null;
  paymentMethods: PaymentMethodConfig[];
  transactions: PaymentTransaction[];
  loading: boolean;
  verifying: boolean;
  verifyingFintoc: boolean;
}

interface PaymentsContextValue extends PaymentsState {
  saveConfig: (config: OpenPayConfig) => Promise<void>;
  saveFintocConfig: (config: FintocConfig) => Promise<void>;
  verifyConnection: () => Promise<boolean>;
  verifyFintocConnection: () => Promise<boolean>;
  togglePaymentMethod: (key: PaymentMethodKey, enabled: boolean) => Promise<void>;
  refreshTransactions: (filters?: { startDate?: string; endDate?: string; method?: string; status?: string }) => Promise<void>;
  isConnected: boolean;
  isFintocConnected: boolean;
}

const PaymentsContext = createContext<PaymentsContextValue | null>(null);
const STORAGE_KEY = 'pochteca_payments';
const FINTOC_STORAGE_KEY = 'pochteca_fintoc_config';

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const { auditLog } = useAudit();
  const { currentUser } = useAuth();

  const [state, setState] = useState<PaymentsState>({
    config: null,
    fintocConfig: null,
    paymentMethods: [...DEFAULT_PAYMENT_METHODS],
    transactions: [],
    loading: true,
    verifying: false,
    verifyingFintoc: false,
  });

  useEffect(() => { loadFromStorage(); }, []);

  useEffect(() => {
    if (!state.loading) saveToStorage();
  }, [state.config, state.fintocConfig, state.paymentMethods]);

  const loadFromStorage = async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedFintoc = localStorage.getItem(FINTOC_STORAGE_KEY);
      const transactions = await getTransactions();

      if (stored) {
        const data = JSON.parse(stored);
        const fintocData = storedFintoc ? JSON.parse(storedFintoc) : null;
        setState(prev => ({
          ...prev,
          config: data.config || null,
          fintocConfig: fintocData,
          paymentMethods: data.paymentMethods || [...DEFAULT_PAYMENT_METHODS],
          transactions,
          loading: false,
        }));
      } else {
        const [config, methods] = await Promise.all([getOpenPayConfig(), getPaymentMethods()]);
        setState({ config, fintocConfig: null, paymentMethods: methods, transactions, loading: false, verifying: false, verifyingFintoc: false });
      }
    } catch (error) {
      console.error('[PaymentsContext] Error cargando datos:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const saveToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ config: state.config, paymentMethods: state.paymentMethods }));
      if (state.fintocConfig) localStorage.setItem(FINTOC_STORAGE_KEY, JSON.stringify(state.fintocConfig));
    } catch (error) {
      console.error('[PaymentsContext] Error guardando datos:', error);
    }
  };

  const saveConfig = async (config: OpenPayConfig) => {
    const savedConfig = await saveOpenPayConfig(config);
    setState(prev => ({ ...prev, config: savedConfig }));
    auditLog({ action: 'PAYMENTS_CONFIG_SAVED', entity: { type: 'payments', id: 'config', label: 'OpenPay Config' }, metadata: { mode: config.mode } });
  };

  const saveFintocConfig = async (config: FintocConfig) => {
    const savedConfig = await saveFintocConfigService(config);
    setState(prev => ({ ...prev, fintocConfig: savedConfig }));
    auditLog({ action: 'FINTOC_CONFIG_SAVED', entity: { type: 'payments', id: 'fintoc', label: 'Fintoc Config' }, metadata: { mode: config.mode } });
  };

  const verifyConnection = async (): Promise<boolean> => {
    if (!state.config) return false;
    setState(prev => ({ ...prev, verifying: true }));
    try {
      const result = await verifyOpenPayConnection(state.config);
      setState(prev => ({
        ...prev,
        config: prev.config ? { ...prev.config, connectionStatus: result.success ? 'CONNECTED' : 'ERROR', errorMessage: result.errorMessage, lastVerifiedAt: new Date().toISOString() } : null,
        verifying: false,
      }));
      auditLog({ action: 'PAYMENTS_CONNECTION_VERIFIED', entity: { type: 'payments', id: 'config', label: 'OpenPay' }, metadata: { success: result.success } });
      return result.success;
    } catch {
      setState(prev => ({ ...prev, verifying: false }));
      return false;
    }
  };

  const verifyFintocConnection = async (): Promise<boolean> => {
    if (!state.fintocConfig) return false;
    setState(prev => ({ ...prev, verifyingFintoc: true }));
    try {
      const result = await verifyFintocConnectionService(state.fintocConfig);
      setState(prev => ({
        ...prev,
        fintocConfig: prev.fintocConfig ? { ...prev.fintocConfig, connectionStatus: result.success ? 'CONNECTED' : 'ERROR', errorMessage: result.errorMessage, lastVerifiedAt: new Date().toISOString() } : null,
        verifyingFintoc: false,
      }));
      auditLog({ action: 'FINTOC_CONNECTION_VERIFIED', entity: { type: 'payments', id: 'fintoc', label: 'Fintoc' }, metadata: { success: result.success } });
      return result.success;
    } catch {
      setState(prev => ({ ...prev, verifyingFintoc: false }));
      return false;
    }
  };

  const togglePaymentMethod = async (key: PaymentMethodKey, enabled: boolean) => {
    await updatePaymentMethod(key, { isEnabled: enabled });
    setState(prev => ({ ...prev, paymentMethods: prev.paymentMethods.map(m => m.key === key ? { ...m, isEnabled: enabled } : m) }));
    auditLog({ action: enabled ? 'PAYMENTS_METHOD_ENABLED' : 'PAYMENTS_METHOD_DISABLED', entity: { type: 'payments', id: key, label: key } });
  };

  const refreshTransactions = async (filters?: { startDate?: string; endDate?: string; method?: string; status?: string }) => {
    const transactions = await getTransactions(filters);
    setState(prev => ({ ...prev, transactions }));
  };

  const value: PaymentsContextValue = {
    ...state,
    saveConfig,
    saveFintocConfig,
    verifyConnection,
    verifyFintocConnection,
    togglePaymentMethod,
    refreshTransactions,
    isConnected: state.config?.connectionStatus === 'CONNECTED',
    isFintocConnected: state.fintocConfig?.connectionStatus === 'CONNECTED',
  };

  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>;
}

export function usePayments() {
  const context = useContext(PaymentsContext);
  if (!context) throw new Error('usePayments must be used within PaymentsProvider');
  return context;
}