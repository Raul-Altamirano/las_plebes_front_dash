export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CategoryFormData = {
  name: string;
  slug: string;
  description?: string;
};
