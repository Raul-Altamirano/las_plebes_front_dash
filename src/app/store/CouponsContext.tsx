import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Coupon, CartItem, CouponValidationResult } from '../types/promotion';
import { couponsApi, type CreateCouponDto } from '../../api/coupons.api';

type CouponsContextValue = {
  coupons: Coupon[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createCoupon: (dto: CreateCouponDto) => Promise<Coupon>;
  updateCoupon: (id: string, patch: Partial<CreateCouponDto>) => Promise<Coupon>;
  deleteCoupon: (id: string) => Promise<void>;
  /**
   * validateCoupon — verifica el código y calcula el descuento SIN redimir.
   * Usar en el carrito al escribir el código.
   */
  validateCoupon: (code: string, customerId: string, cartItems: CartItem[]) => Promise<CouponValidationResult>;
  /**
   * redeemCoupon — redime y registra el uso.
   * Usar solo al CONFIRMAR la orden.
   */
  redeemCoupon: (dto: { code: string; customerId: string; cartItems: CartItem[]; orderId?: string }) => Promise<CouponValidationResult>;
};

const CouponsContext = createContext<CouponsContextValue | null>(null);

export function CouponsProvider({ children }: { children: React.ReactNode }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await couponsApi.list();
      setCoupons(data);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar cupones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const createCoupon = async (dto: CreateCouponDto): Promise<Coupon> => {
    setError(null);
    const created = await couponsApi.create(dto);
    await refresh();
    return created;
  };

  const updateCoupon = async (id: string, patch: Partial<CreateCouponDto>): Promise<Coupon> => {
    setError(null);
    const updated = await couponsApi.update(id, patch);
    setCoupons(prev => prev.map(c => c.id === id ? updated : c));
    return updated;
  };

  const deleteCoupon = async (id: string): Promise<void> => {
    setError(null);
    await couponsApi.remove(id);
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  const validateCoupon = async (
    code: string,
    customerId: string,
    cartItems: CartItem[],
  ): Promise<CouponValidationResult> => {
    setError(null);
    return couponsApi.validate(code, customerId, cartItems);
  };

  const redeemCoupon = async (dto: {
    code: string;
    customerId: string;
    cartItems: CartItem[];
    orderId?: string;
  }): Promise<CouponValidationResult> => {
    setError(null);
    const res = await couponsApi.redeem(dto);
    await refresh(); // actualiza usedCount en la lista
    return res;
  };

  const value = useMemo(
    () => ({ coupons, loading, error, refresh, createCoupon, updateCoupon, deleteCoupon, validateCoupon, redeemCoupon }),
    [coupons, loading, error],
  );

  return <CouponsContext.Provider value={value}>{children}</CouponsContext.Provider>;
}

export function useCoupons() {
  const ctx = useContext(CouponsContext);
  if (!ctx) throw new Error('useCoupons must be used within CouponsProvider');
  return ctx;
}
