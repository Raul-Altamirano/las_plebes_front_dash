import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import type { Promotion } from '../types/promotion';
import { promotionsApi, type CreatePromotionDto } from '../../api/promotions.api';
import type { FetchStatus } from './ProductsContext';

interface PromotionsContextValue {
  promotions: Promotion[];
  loading: boolean;
  error: string | null;
  status: FetchStatus;
  lastFetch: number | null;
  refresh: () => Promise<void>;
  createPromotion: (dto: CreatePromotionDto) => Promise<Promotion>;
  updatePromotion: (id: string, dto: Partial<CreatePromotionDto>) => Promise<Promotion>;
  deletePromotion: (id: string) => Promise<void>;
  togglePromotion: (id: string, isActive: boolean) => Promise<Promotion>;
}

const PromotionsContext = createContext<PromotionsContextValue | undefined>(undefined);

export function PromotionsProvider({ children }: { children: ReactNode }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  const refresh = async () => {
    setStatus('loading');
    setLoading(true);
    setError(null);
    try {
      const data = await promotionsApi.list();
      setPromotions(data);
      setStatus('success');
      setLastFetch(Date.now());
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar promociones');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const createPromotion = async (dto: CreatePromotionDto): Promise<Promotion> => {
    setError(null);
    const created = await promotionsApi.create(dto);
    await refresh();
    return created;
  };

  const updatePromotion = async (id: string, dto: Partial<CreatePromotionDto>): Promise<Promotion> => {
    setError(null);
    const updated = await promotionsApi.update(id, dto);
    await refresh();
    return updated;
  };

  const deletePromotion = async (id: string): Promise<void> => {
    setError(null);
    await promotionsApi.remove(id);
    setPromotions(prev => prev.filter(p => p.id !== id));
  };

  const togglePromotion = async (id: string, isActive: boolean): Promise<Promotion> => {
    setError(null);
    const updated = await promotionsApi.toggle(id, isActive);
    setPromotions(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  };

  const value = useMemo(() => ({
    promotions, loading, error, status, lastFetch,
    refresh, createPromotion, updatePromotion, deletePromotion, togglePromotion,
  }), [promotions, loading, error, status, lastFetch]);

  return (
    <PromotionsContext.Provider value={value}>
      {children}
    </PromotionsContext.Provider>
  );
}

export function usePromotions() {
  const context = useContext(PromotionsContext);
  if (!context) throw new Error('usePromotions must be used within a PromotionsProvider');
  return context;
}
