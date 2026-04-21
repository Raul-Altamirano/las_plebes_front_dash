// src/api/colors.ts
import { createApiClient } from "./http";
const apiFetch = createApiClient(
  (import.meta.env.VITE_CATALOG_BASE_URL as string | undefined) ?? "/api/catalog-products"
);

import type { Color, ColorBe, ColorFormData } from "../app/types/color.types";

export type { Color };

const BASE = "/colors";

// ─── Mapper ───────────────────────────────────────────────────────────────────

const fromBe = (raw: ColorBe): Color => ({
  id:        raw.id,
  name:      raw.name,
  slug:      raw.slug,
  hex:       raw.hex,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

// ─── API ──────────────────────────────────────────────────────────────────────

export async function listColors() {
  const res = await apiFetch<ColorBe[] | { data: ColorBe[] } | { items: ColorBe[] }>(BASE, {
    label: "colors.list",
  });

  const list: ColorBe[] =
    Array.isArray(res)  ? res        :
    "items" in res      ? res.items  :
    "data" in res       ? res.data   :
    [];

  return list.map(fromBe);
}

export async function createColor(payload: ColorFormData) {
  const res = await apiFetch<{ data: ColorBe } | ColorBe>(BASE, {
    method: "POST",
    label: "colors.create",
    body: JSON.stringify(payload),
  });
  const raw: ColorBe = "data" in res ? (res as { data: ColorBe }).data : (res as ColorBe);
  return fromBe(raw);
}

export async function updateColor(id: string, payload: Partial<ColorFormData>) {
  const res = await apiFetch<{ data: ColorBe } | ColorBe>(`${BASE}/${id}`, {
    method: "PUT",
    label: "colors.update",
    body: JSON.stringify(payload),
  });
  const raw: ColorBe = "data" in res ? (res as { data: ColorBe }).data : (res as ColorBe);
  return fromBe(raw);
}

export async function deleteColor(id: string) {
  return apiFetch<{ ok: true }>(`${BASE}/${id}`, {
    method: "DELETE",
    label: "colors.delete",
  });
}