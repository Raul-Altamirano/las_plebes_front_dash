import {  marketingFetch } from "./marketing.client";
import type { Coupon } from "../app/types/promotion";

export type CreateCouponDto = Omit<Coupon, "id" | "createdAt" | "updatedAt" | "usedCount">;

export const couponsApi = {
  list: () => marketingFetch<Coupon[]>("/coupons", { method: "GET", label: "coupons.list" }),
  get: (id: string) => marketingFetch<Coupon>(`/coupons/${id}`, { method: "GET", label: "coupons.get" }),
  create: (dto: CreateCouponDto) =>
    marketingFetch<Coupon>("/coupons", { method: "POST", body: JSON.stringify(dto), label: "coupons.create" }),
  update: (id: string, dto: Partial<Coupon>) =>
    marketingFetch<Coupon>(`/coupons/${id}`, { method: "PUT", body: JSON.stringify(dto), label: "coupons.update" }),
  remove: (id: string) =>
    marketingFetch<{ ok: true }>(`/coupons/${id}`, { method: "DELETE", label: "coupons.remove" }),
  redeem: (dto: { code: string; customerId?: string; orderId?: string; subtotal?: number }) =>
    marketingFetch<any>("/coupons/redeem", {
      method: "POST",
      body: JSON.stringify(dto),
      headers: {
        "Idempotency-Key": (crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      },
      label: "coupons.redeem",
    }),
};