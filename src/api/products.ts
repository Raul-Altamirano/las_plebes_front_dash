// src/api/products.ts
import { apiFetch } from "./http";
import type { Product, ProductStatus, ProductVariant } from "../app/types/product";

export type { Product, ProductVariant };

export type ListProductsParams = {
  q?: string;
  status?: ProductStatus;
  categoryId?: string;
  stockLow?: boolean;
  page?: number;
  limit?: number;
};

export type CreateProductPayload = Omit<Product, "id" | "tenantId" | "createdAt" | "updatedAt">;
export type UpdateProductPayload = Partial<CreateProductPayload>;

export type InventoryAdjustPayload = {
  productId: string;
  variantId?: string;
  delta: number;
  reason: "MANUAL" | "DAMAGE" | "COUNT" | "OTHER";
  note?: string;
};

const BASE = "/products";

export async function listProducts(params?: ListProductsParams) {
  const qs = params
    ? "?" + new URLSearchParams(Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as string[][]).toString()
    : "";
  return apiFetch<{ items: Product[]; total?: number }>(`${BASE}${qs}`, {
    label: "products.list",
  });
}

export async function getProduct(id: string) {
  return apiFetch<Product>(`${BASE}/${id}`, {
    label: "products.get",
  });
}

export async function createProduct(payload: CreateProductPayload) {
  return apiFetch<{ id: string }>(BASE, {
    method: "POST",
    label: "products.create",
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(id: string, payload: UpdateProductPayload) {
  return apiFetch<{ ok: true }>(`${BASE}/${id}`, {
    method: "PUT",
    label: "products.update",
    body: JSON.stringify(payload),
  });
}

export async function deleteProduct(id: string) {
  return apiFetch<{ ok: true }>(`${BASE}/${id}`, {
    method: "DELETE",
    label: "products.delete",
  });
}

export async function updateProductStatus(id: string, status: ProductStatus) {
  return apiFetch<{ ok: true }>(`${BASE}/${id}/status`, {
    method: "PATCH",
    label: "products.status",
    body: JSON.stringify({ status }),
  });
}

export async function adjustInventory(payload: InventoryAdjustPayload) {
  return apiFetch<{ ok: true }>("/inventory/adjust", {
    method: "POST",
    label: "inventory.adjust",
    body: JSON.stringify(payload),
  });
}