// src/api/colors.api.ts
import { createApiClient } from "./http";
import type { Color, ColorBe, ColorFormData } from "../app/types/color.types";

const apiFetch = createApiClient(import.meta.env.VITE_API_URL as string);

// ─── Mapper ───────────────────────────────────────────────────────────────────

const fromBe = (raw: ColorBe): Color => ({
  id:          (raw as any).id ?? raw._id,
  name:        raw.name,
  slug:        raw.slug,
  hex:         raw.hex,
  colorNumber: (raw as any).colorNumber,   // ← agregar
  createdAt:   raw.createdAt,
  updatedAt:   raw.updatedAt,
});

// ─── Unwrap — BE puede devolver { items }, { data } o array directo ───────────

function unwrapList(res: any): ColorBe[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data))  return res.data;
  return [];
}

function unwrapOne(res: any): ColorBe {
  return res?.data ?? res?.item ?? res;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export async function listColors(): Promise<Color[]> {
  const res = await apiFetch("/colors");
  return unwrapList(res).map(fromBe);
}

export async function createColor(body: ColorFormData): Promise<Color> {
  const res = await apiFetch("/colors", {
    method: "POST",
    body:   JSON.stringify(body),
  });
  return fromBe(unwrapOne(res));
}

export async function updateColor(id: string, body: Partial<ColorFormData>): Promise<Color> {
  const res = await apiFetch(`/colors/${id}`, {
    method: "PUT",
    body:   JSON.stringify(body),
  });
  return fromBe(unwrapOne(res));
}

export async function deleteColor(id: string): Promise<void> {
  await apiFetch(`/colors/${id}`, { method: "DELETE" });
}