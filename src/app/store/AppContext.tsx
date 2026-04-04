import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProcessorConfig {
  enabled: boolean;
  mode: 'sandbox' | 'live';
  isConfigured: boolean;
  connectedAt: string | null;
  publicKey?: string | null;
}

interface AppContextValue {
  appId: string;
  tenantId: string;
  plan: string;
  payments: {
    openpay: ProcessorConfig;
    fintoc: ProcessorConfig;
  };
  toggleFintocEnabled: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const APP_CTX_KEY = 'pochteca_app_ctx';

// Mock inicial del app context
const DEFAULT_APP_CTX = {
  appId: 'app_lasplebes_a3f9c2',
  tenantId: 'lasplebes',
  plan: 'vip',
  payments: {
    openpay: {
      enabled: true,
      mode: 'sandbox' as const,
      isConfigured: true,
      connectedAt: '2026-03-13T23:07:00.000Z',
    },
    fintoc: {
      enabled: false, // apagado por default (kill switch del SaaS owner)
      mode: 'sandbox' as const,
      publicKey: null,
      isConfigured: false,
      connectedAt: null,
    },
  },
};

export function AppProvider({ children }: { children: ReactNode }) {
  // Cargar desde localStorage o usar default
  const [appCtx, setAppCtx] = useState(() => {
    try {
      const stored = localStorage.getItem(APP_CTX_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading app context:', error);
    }
    return DEFAULT_APP_CTX;
  });

  // Persistir en localStorage cuando cambie
  const updateAppCtx = (updates: Partial<typeof appCtx>) => {
    const newCtx = { ...appCtx, ...updates };
    setAppCtx(newCtx);
    try {
      localStorage.setItem(APP_CTX_KEY, JSON.stringify(newCtx));
    } catch (error) {
      console.error('Error saving app context:', error);
    }
  };

  // Toggle Fintoc enabled (solo para desarrollo)
  const toggleFintocEnabled = () => {
    updateAppCtx({
      payments: {
        ...appCtx.payments,
        fintoc: {
          ...appCtx.payments.fintoc,
          enabled: !appCtx.payments.fintoc.enabled,
        },
      },
    });
  };

  // Método para marcar Fintoc como configurado
  const setFintocConfigured = (configured: boolean) => {
    updateAppCtx({
      payments: {
        ...appCtx.payments,
        fintoc: {
          ...appCtx.payments.fintoc,
          isConfigured: configured,
          connectedAt: configured ? new Date().toISOString() : null,
        },
      },
    });
  };

  const value: AppContextValue = {
    ...appCtx,
    toggleFintocEnabled,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

// Hook para actualizar el estado de configuración de Fintoc
export function useAppInternal() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppInternal must be used within AppProvider');
  }

  const setFintocConfigured = (configured: boolean) => {
    const stored = localStorage.getItem(APP_CTX_KEY);
    if (stored) {
      const appCtx = JSON.parse(stored);
      appCtx.payments.fintoc.isConfigured = configured;
      appCtx.payments.fintoc.connectedAt = configured ? new Date().toISOString() : null;
      localStorage.setItem(APP_CTX_KEY, JSON.stringify(appCtx));
      window.location.reload(); // Recargar para aplicar cambios
    }
  };

  return { setFintocConfigured };
}
