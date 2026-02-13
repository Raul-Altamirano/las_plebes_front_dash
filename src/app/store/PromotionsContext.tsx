import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Promotion } from '../types/promotion';
import { mockPromotions } from '../data/mockPromotions';

interface PromotionsContextValue {
  promotions: Promotion[];
  addPromotion: (promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>) => Promotion;
  updatePromotion: (id: string, updates: Partial<Promotion>) => void;
  deletePromotion: (id: string) => void;
  togglePromotion: (id: string) => void;
  getPromotion: (id: string) => Promotion | undefined;
  getActivePromotions: () => Promotion[];
}

const PromotionsContext = createContext<PromotionsContextValue | undefined>(undefined);

const STORAGE_KEY = 'ecommerce_promotions';

export function PromotionsProvider({ children }: { children: ReactNode }) {
  const [promotions, setPromotions] = useState<Promotion[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      // Si no hay datos, cargar mock data
      return mockPromotions;
    } catch (error) {
      console.error('Error loading promotions from localStorage:', error);
      return mockPromotions;
    }
  });

  // Persistir en localStorage cuando cambie
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(promotions));
    } catch (error) {
      console.error('Error saving promotions to localStorage:', error);
    }
  }, [promotions]);

  const addPromotion = (promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>): Promotion => {
    const now = new Date().toISOString();
    const newPromotion: Promotion = {
      ...promotion,
      id: `promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    setPromotions(prev => [...prev, newPromotion]);
    return newPromotion;
  };

  const updatePromotion = (id: string, updates: Partial<Promotion>) => {
    setPromotions(prev =>
      prev.map(promo =>
        promo.id === id
          ? { ...promo, ...updates, updatedAt: new Date().toISOString() }
          : promo
      )
    );
  };

  const deletePromotion = (id: string) => {
    setPromotions(prev => prev.filter(promo => promo.id !== id));
  };

  const togglePromotion = (id: string) => {
    setPromotions(prev =>
      prev.map(promo =>
        promo.id === id
          ? { ...promo, isActive: !promo.isActive, updatedAt: new Date().toISOString() }
          : promo
      )
    );
  };

  const getPromotion = (id: string): Promotion | undefined => {
    return promotions.find(promo => promo.id === id);
  };

  const getActivePromotions = (): Promotion[] => {
    return promotions.filter(promo => promo.isActive);
  };

  const value: PromotionsContextValue = {
    promotions,
    addPromotion,
    updatePromotion,
    deletePromotion,
    togglePromotion,
    getPromotion,
    getActivePromotions,
  };

  return (
    <PromotionsContext.Provider value={value}>
      {children}
    </PromotionsContext.Provider>
  );
}

export function usePromotions() {
  const context = useContext(PromotionsContext);
  if (!context) {
    throw new Error('usePromotions must be used within a PromotionsProvider');
  }
  return context;
}