// @refresh reset
/**
 * src/app/store/PaymentsContext.tsx
 * Context de Pagos — incluye paymentConfig (feature flags desde DB).
 */

import React, {
  createContext, useContext, useState, useEffect,
  useCallback, ReactNode,
} from 'react';
import type {
  PaymentGateway, TenantGateway, CreateGatewayPayload,
  PaymentIntent, IntentFilters, Pagination,
  PaymentStats, StatsOptions,
} from '../types/payments';
import type { PaymentConfig } from '../services/paymentsService';
import {
  getGateways, getTenantGateways, connectTenantGateway,
  updateTenantGateway, getIntents, getPaymentStats,
  getPaymentConfig, updatePaymentConfig,
} from '../services/paymentsService';
import { useAudit } from './AuditContext';

// ── State ─────────────────────────────────────────────────────────────────────
interface PaymentsState {
  gateways:       PaymentGateway[];
  tenantGateways: TenantGateway[];
  paymentConfig:  PaymentConfig | null;
  intents:        PaymentIntent[];
  pagination:     Pagination | null;
  stats:          PaymentStats | null;
  intentsMeta:    { historyDays: number; exportFormat: string | null } | null;

  loading:        boolean;   // carga inicial
  loadingIntents: boolean;
  loadingStats:   boolean;
  statsError:     string | null;
}

// ── Context value ─────────────────────────────────────────────────────────────
interface PaymentsContextValue extends PaymentsState {
  refreshGateways:    () => Promise<void>;
  refreshIntents:     (filters?: IntentFilters) => Promise<void>;
  refreshStats:       (opts?: StatsOptions) => Promise<void>;
  connectGateway:     (payload: CreateGatewayPayload) => Promise<void>;
  patchGateway:       (id: string, payload: Partial<TenantGateway>) => Promise<void>;
  patchConfig:        (flags: Partial<PaymentConfig['flags']>) => Promise<void>;
  activeFilters:      IntentFilters;
  setActiveFilters:   (f: IntentFilters) => void;
  statsPeriod:        StatsOptions['period'];
  setStatsPeriod:     (p: StatsOptions['period']) => void;
}

const PaymentsContext = createContext<PaymentsContextValue | null>(null);

const INIT_FILTERS: IntentFilters = { page: 1, limit: 20 };

// ── Provider ──────────────────────────────────────────────────────────────────
export function PaymentsProvider({ children }: { children: ReactNode }) {
  const { auditLog } = useAudit();

  const [state, setState] = useState<PaymentsState>({
    gateways:       [],
    tenantGateways: [],
    paymentConfig:  null,
    intents:        [],
    pagination:     null,
    stats:          null,
    intentsMeta:    null,
    loading:        true,
    loadingIntents: false,
    loadingStats:   false,
    statsError:     null,
  });

  const [activeFilters, setActiveFilters] = useState<IntentFilters>(INIT_FILTERS);
  const [statsPeriod, setStatsPeriod]     = useState<StatsOptions['period']>('month');

  // ── Carga inicial: gateways + tenantGateways + paymentConfig ──────────────
  useEffect(() => {
    (async () => {
      try {
        const [gateways, tenantGateways, paymentConfig] = await Promise.all([
          getGateways(),
          getTenantGateways(),
          getPaymentConfig(),
        ]);
        setState(prev => ({
          ...prev,
          gateways,
          tenantGateways,
          paymentConfig,
          loading: false,
        }));
      } catch (err) {
        console.error('[PaymentsContext] Error en carga inicial:', err);
        setState(prev => ({ ...prev, loading: false }));
      }
    })();
  }, []);

  // ── Refresh gateways ───────────────────────────────────────────────────────
  const refreshGateways = useCallback(async () => {
    try {
      const [gateways, tenantGateways] = await Promise.all([
        getGateways(),
        getTenantGateways(),
      ]);
      setState(prev => ({ ...prev, gateways, tenantGateways }));
    } catch (err) {
      console.error('[PaymentsContext] refreshGateways error:', err);
    }
  }, []);

  // ── Refresh intents ────────────────────────────────────────────────────────
  const refreshIntents = useCallback(async (filters?: IntentFilters) => {
    setState(prev => ({ ...prev, loadingIntents: true }));
    try {
      const result = await getIntents(filters ?? activeFilters);
      setState(prev => ({
        ...prev,
        intents:        result.data,
        pagination:     result.pagination,
        intentsMeta:    result.meta,
        loadingIntents: false,
      }));
    } catch (err) {
      console.error('[PaymentsContext] refreshIntents error:', err);
      setState(prev => ({ ...prev, loadingIntents: false }));
    }
  }, [activeFilters]);

  // ── Refresh stats ──────────────────────────────────────────────────────────
  const refreshStats = useCallback(async (opts?: StatsOptions) => {
    setState(prev => ({ ...prev, loadingStats: true, statsError: null }));
    try {
      const stats = await getPaymentStats(opts ?? { period: statsPeriod });
      setState(prev => ({ ...prev, stats, loadingStats: false }));
    } catch (err: any) {
      const msg = err?.message ?? 'Error al cargar estadísticas';
      setState(prev => ({ ...prev, stats: null, loadingStats: false, statsError: msg }));
    }
  }, [statsPeriod]);

  // ── Connect gateway ────────────────────────────────────────────────────────
  const connectGateway = useCallback(async (payload: CreateGatewayPayload) => {
    const gw = await connectTenantGateway(payload);
    setState(prev => ({
      ...prev,
      tenantGateways: [...prev.tenantGateways, gw],
    }));
    auditLog({
      action: 'PAYMENTS_GATEWAY_CONNECTED',
      entity: { type: 'payment_gateway', id: gw.id, label: gw.provider },
      metadata: { mode: payload.mode, paymentMethodId: payload.paymentMethodId },
    });
  }, [auditLog]);

  // ── Patch gateway ──────────────────────────────────────────────────────────
  const patchGateway = useCallback(async (id: string, payload: Partial<TenantGateway>) => {
    const updated = await updateTenantGateway(id, payload);
    setState(prev => ({
      ...prev,
      tenantGateways: prev.tenantGateways.map(g => g.id === id ? updated : g),
    }));
    auditLog({
      action: 'PAYMENTS_GATEWAY_UPDATED',
      entity: { type: 'payment_gateway', id, label: updated.provider },
      metadata: { fields: Object.keys(payload) },
    });
  }, [auditLog]);

  // ── Patch config (flags) ───────────────────────────────────────────────────
  const patchConfig = useCallback(async (flags: Partial<PaymentConfig['flags']>) => {
    const updated = await updatePaymentConfig(flags);
    setState(prev => ({ ...prev, paymentConfig: updated }));
    auditLog({
      action: 'PAYMENTS_CONFIG_FLAGS_UPDATED',
      entity: { type: 'payment_config', id: 'flags', label: 'Payment Flags' },
      metadata: { updatedFlags: Object.keys(flags) },
    });
  }, [auditLog]);

  const value: PaymentsContextValue = {
    ...state,
    refreshGateways,
    refreshIntents,
    refreshStats,
    connectGateway,
    patchGateway,
    patchConfig,
    activeFilters,
    setActiveFilters,
    statsPeriod,
    setStatsPeriod,
  };

  return (
    <PaymentsContext.Provider value={value}>
      {children}
    </PaymentsContext.Provider>
  );
}

export function usePayments() {
  const ctx = useContext(PaymentsContext);
  if (!ctx) throw new Error('usePayments must be used within PaymentsProvider');
  return ctx;
}
