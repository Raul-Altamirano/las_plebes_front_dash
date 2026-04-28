// src/api/categories.ts
import { createApiClient } from "./http";
const apiFetch = createApiClient(
  (import.meta.env.VITE_CATALOG_BASE_URL as string | undefined) ?? "/api/catalog-products"
);
import type { Category, CategoryFormData } from "../app/types/category";

export type { Category };

const BASE = "/categories";

export async function listCategories(includeDeleted = false) {
  const qs = includeDeleted ? '?includeDeleted=true' : '';
  return apiFetch<{ items: Category[] }>(`${BASE}${qs}`, {
    label: "categories.list",
  });
}

export async function getCategoryTree() {
  return apiFetch<{ tree: Category[] }>(`${BASE}/tree`, {
    label: "categories.tree",
  });
}

export async function getCategory(id: string) {
  return apiFetch<Category>(`${BASE}/${id}`, {
    label: "categories.get",
  });
}

export async function createCategory(payload: CategoryFormData) {
  return apiFetch<{ status: string; data: Category }>(BASE, {
    method: "POST",
    label: "categories.create",
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(id: string, payload: Partial<CategoryFormData>) {
  return apiFetch<{ status: string; data: Category }>(`${BASE}/${id}`, {
    method: "PUT",
    label: "categories.update",
    body: JSON.stringify(payload),
  });
}

export async function deleteCategory(id: string) {
  return apiFetch<{ ok: true }>(`${BASE}/${id}`, {
    method: "DELETE",
    label: "categories.delete",
  });
}

export async function restoreCategory(id: string) {
  return apiFetch<{ status: string; data: Category }>(`${BASE}/${id}/restore`, {
    method: "PATCH",
    label: "categories.restore",
  });
}