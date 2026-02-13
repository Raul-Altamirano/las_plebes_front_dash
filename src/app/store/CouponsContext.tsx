import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Coupon } from '../types/promotion';
import { mockCoupons } from '../data/mockPromotions';

interface CouponsContextValue {
  coupons: Coupon[];
  addCoupon: (coupon: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'usedCount'>) => Coupon;
  updateCoupon: (id: string, updates: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  toggleCoupon: (id: string) => void;
  getCoupon: (id: string) => Coupon | undefined;
  getCouponByCode: (code: string) => Coupon | undefined;
  getActiveCoupons: () => Coupon[];
  resetUsageCount: (id: string) => void;
  incrementUsage: (id: string) => void;
}

const CouponsContext = createContext<CouponsContextValue | undefined>(undefined);

const STORAGE_KEY = 'ecommerce_coupons';

export function CouponsProvider({ children }: { children: ReactNode }) {
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      // Si no hay datos, cargar mock data
      return mockCoupons;
    } catch (error) {
      console.error('Error loading coupons from localStorage:', error);
      return mockCoupons;
    }
  });

  // Persistir en localStorage cuando cambie
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
    } catch (error) {
      console.error('Error saving coupons to localStorage:', error);
    }
  }, [coupons]);

  const addCoupon = (coupon: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'usedCount'>): Coupon => {
    const now = new Date().toISOString();
    const newCoupon: Coupon = {
      ...coupon,
      id: `coupon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      usedCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    setCoupons(prev => [...prev, newCoupon]);
    return newCoupon;
  };

  const updateCoupon = (id: string, updates: Partial<Coupon>) => {
    setCoupons(prev =>
      prev.map(coupon =>
        coupon.id === id
          ? { ...coupon, ...updates, updatedAt: new Date().toISOString() }
          : coupon
      )
    );
  };

  const deleteCoupon = (id: string) => {
    setCoupons(prev => prev.filter(coupon => coupon.id !== id));
  };

  const toggleCoupon = (id: string) => {
    setCoupons(prev =>
      prev.map(coupon =>
        coupon.id === id
          ? { ...coupon, isActive: !coupon.isActive, updatedAt: new Date().toISOString() }
          : coupon
      )
    );
  };

  const getCoupon = (id: string): Coupon | undefined => {
    return coupons.find(coupon => coupon.id === id);
  };

  const getCouponByCode = (code: string): Coupon | undefined => {
    return coupons.find(coupon => coupon.code.toUpperCase() === code.toUpperCase());
  };

  const getActiveCoupons = (): Coupon[] => {
    return coupons.filter(coupon => coupon.isActive);
  };

  const resetUsageCount = (id: string) => {
    setCoupons(prev =>
      prev.map(coupon =>
        coupon.id === id
          ? { ...coupon, usedCount: 0, updatedAt: new Date().toISOString() }
          : coupon
      )
    );
  };

  const incrementUsage = (id: string) => {
    setCoupons(prev =>
      prev.map(coupon =>
        coupon.id === id
          ? { ...coupon, usedCount: coupon.usedCount + 1, updatedAt: new Date().toISOString() }
          : coupon
      )
    );
  };

  const value: CouponsContextValue = {
    coupons,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCoupon,
    getCoupon,
    getCouponByCode,
    getActiveCoupons,
    resetUsageCount,
    incrementUsage,
  };

  return (
    <CouponsContext.Provider value={value}>
      {children}
    </CouponsContext.Provider>
  );
}

export function useCoupons() {
  const context = useContext(CouponsContext);
  if (!context) {
    throw new Error('useCoupons must be used within a CouponsProvider');
  }
  return context;
}