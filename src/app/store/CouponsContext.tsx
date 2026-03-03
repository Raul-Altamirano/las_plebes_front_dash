import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Coupon } from "../types/promotion";
import { couponsApi, type CreateCouponDto } from "../../api/coupons.api";

type CouponsContextValue = {
  coupons: Coupon[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createCoupon: (dto: CreateCouponDto) => Promise<Coupon>;
  updateCoupon: (id: string, patch: Partial<Coupon>) => Promise<Coupon>;
  deleteCoupon: (id: string) => Promise<void>;
  redeemCoupon: (code: string, extra?: { customerId?: string; orderId?: string; subtotal?: number }) => Promise<any>;
};

const CouponsContext = createContext<CouponsContextValue | null>(null);

export function CouponsProvider({ children }: { children: React.ReactNode }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await couponsApi.list();
      setCoupons(data);
    } catch (e: any) {
      setError(e?.message ?? "No se pudieron cargar cupones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const createCoupon = async (dto: CreateCouponDto) => {
    setError(null);
    const created = await couponsApi.create(dto);
    await refresh();
    return created;
  };

  const updateCoupon = async (id: string, patch: Partial<Coupon>) => {
    setError(null);
    const updated = await couponsApi.update(id, patch);
    setCoupons((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const deleteCoupon = async (id: string) => {
    setError(null);
    await couponsApi.remove(id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  const redeemCoupon = async (
    code: string,
    extra?: { customerId?: string; orderId?: string; subtotal?: number }
  ) => {
    setError(null);
    const res = await couponsApi.redeem({ code, ...extra });
    await refresh();
    return res;
  };

  const value = useMemo(
    () => ({ coupons, loading, error, refresh, createCoupon, updateCoupon, deleteCoupon, redeemCoupon }),
    [coupons, loading, error]
  );

  return <CouponsContext.Provider value={value}>{children}</CouponsContext.Provider>;
}

export function useCoupons() {
  const ctx = useContext(CouponsContext);
  if (!ctx) throw new Error("useCoupons must be used within CouponsProvider");
  return ctx;
}