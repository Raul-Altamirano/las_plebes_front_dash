// src/app/types/category.ts

export type CategoryStatus = "ACTIVE" | "INACTIVE";
export type CategoryLevel  = 0 | 1 | 2;

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  path: string;             // "botas/botas-texanas/cuero-mujer"
  parentId?: string | null;
  level: CategoryLevel;     // 0=departamento, 1=categoría, 2=subcategoría
  description?: string;
  status: CategoryStatus;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type CategoryFormData = {
  name: string;
  slug: string;
  description?: string;
  status?: CategoryStatus;
  parentId?: string | null;
};

export const LEVEL_LABELS: Record<CategoryLevel, string> = {
  0: 'Departamento',
  1: 'Categoría',
  2: 'Subcategoría',
};