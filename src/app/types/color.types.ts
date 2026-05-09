// src/app/types/color.types.ts

export interface Color {
  id: string;
  name: string;
  slug: string;
  hex: string;
  colorNumber?: string;  // ← "01", "02"... asignado en catalog_colors
  createdAt: string;
  updatedAt: string;
}

export interface ColorFormData {
  name: string;
  hex: string;
  slug?: string;
}

// BE raw shape — MongoDB usa _id
export interface ColorBe {
  _id: string;         // ← MongoDB siempre devuelve _id
  id?: string;         // por si el serializer del BE lo mapea a id
  tenantId: string;
  name: string;
  slug: string;
  hex: string;
  createdAt: string;
  updatedAt: string;
}