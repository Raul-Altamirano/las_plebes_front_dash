import { marketingFetch } from "./marketing.client";
import type { Promotion } from "../app/types/promotion";

export type CreatePromotionDto = Omit<Promotion, "id" | "createdAt" | "updatedAt">;

export const promotionsApi = {
  list: () => marketingFetch<Promotion[]>("/promotions", { method: "GET", label: "promotions.list" }),
  get: (id: string) => marketingFetch<Promotion>(`/promotions/${id}`, { method: "GET", label: "promotions.get" }),
  create: (dto: CreatePromotionDto) =>
    marketingFetch<Promotion>("/promotions", { method: "POST", body: JSON.stringify(dto), label: "promotions.create" }),
  update: (id: string, dto: Partial<Promotion>) =>
    marketingFetch<Promotion>(`/promotions/${id}`, { method: "PUT", body: JSON.stringify(dto), label: "promotions.update" }),
  remove: (id: string) =>
    marketingFetch<{ ok: true }>(`/promotions/${id}`, { method: "DELETE", label: "promotions.remove" }),
};