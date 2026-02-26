// src/api/categories.ts
import { apiFetch } from "./http";
import type { Category, CategoryFormData } from "../app/types/category";

export type { Category };

const BASE = "/categories";

export async function listCategories() {
  return apiFetch<{ items: Category[] }>(BASE, {
    label: "categories.list",
  });
}

export async function getCategory(id: string) {
  return apiFetch<Category>(`${BASE}/${id}`, {
    label: "categories.get",
  });
}

export async function createCategory(payload: CategoryFormData) {
  return apiFetch<{ id: string }>(BASE, {
    method: "POST",
    label: "categories.create",
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(id: string, payload: Partial<CategoryFormData>) {
  return apiFetch<{ ok: true }>(`${BASE}/${id}`, {
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