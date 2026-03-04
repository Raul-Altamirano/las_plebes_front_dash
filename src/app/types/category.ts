// src/app/types/category.ts

export type CategoryStatus = "ACTIVE" | "INACTIVE";

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
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
};