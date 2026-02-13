import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { type Category } from '../types/category';

interface CategoryState {
  categories: Category[];
}

type CategoryAction =
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'CREATE_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'ARCHIVE_CATEGORY'; payload: string }
  | { type: 'RESTORE_CATEGORY'; payload: string };

interface CategoryContextValue {
  categories: Category[];
  createCategory: (data: { name: string; slug: string; description?: string }) => Category;
  updateCategory: (id: string, data: { name: string; slug: string; description?: string }) => void;
  archiveCategory: (id: string) => void;
  restoreCategory: (id: string) => void;
  getById: (id: string) => Category | undefined;
  isNameAvailable: (name: string, currentId?: string) => boolean;
  isSlugAvailable: (slug: string, currentId?: string) => boolean;
  list: (includeArchived?: boolean) => Category[];
}

const CategoryContext = createContext<CategoryContextValue | null>(null);

const STORAGE_KEY = 'ecommerce_admin_categories';

// Categorías iniciales
const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Botas',
    slug: 'botas',
    description: 'Botas vaqueras y tradicionales',
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    name: 'Botines',
    slug: 'botines',
    description: 'Botines y calzado corto',
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-3',
    name: 'Cinturones',
    slug: 'cinturones',
    description: 'Cinturones y hebillas',
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cat-4',
    name: 'Accesorios',
    slug: 'accesorios',
    description: 'Complementos y accesorios varios',
    isArchived: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

function categoryReducer(state: CategoryState, action: CategoryAction): CategoryState {
  switch (action.type) {
    case 'SET_CATEGORIES':
      return { categories: action.payload };
    case 'CREATE_CATEGORY':
      return {
        categories: [action.payload, ...state.categories],
      };
    case 'UPDATE_CATEGORY':
      return {
        categories: state.categories.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'ARCHIVE_CATEGORY':
      return {
        categories: state.categories.map((c) =>
          c.id === action.payload ? { ...c, isArchived: true, updatedAt: new Date().toISOString() } : c
        ),
      };
    case 'RESTORE_CATEGORY':
      return {
        categories: state.categories.map((c) =>
          c.id === action.payload ? { ...c, isArchived: false, updatedAt: new Date().toISOString() } : c
        ),
      };
    default:
      return state;
  }
}

// Helper para generar slug desde nombre
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
    .trim()
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-'); // Múltiples guiones a uno solo
}

export function CategoryProvider({ children }: { children: ReactNode }) {
  // Cargar desde localStorage o usar inicial
  const loadInitialState = (): CategoryState => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { categories: parsed };
      }
    } catch (error) {
      console.error('Error loading categories from localStorage:', error);
    }
    return { categories: INITIAL_CATEGORIES };
  };

  const [state, dispatch] = useReducer(categoryReducer, null, loadInitialState);

  // Persistir en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.categories));
    } catch (error) {
      console.error('Error saving categories to localStorage:', error);
    }
  }, [state.categories]);

  const createCategory = (data: { name: string; slug: string; description?: string }): Category => {
    const newCategory: Category = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name.trim(),
      slug: data.slug.trim(),
      description: data.description?.trim(),
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'CREATE_CATEGORY', payload: newCategory });
    return newCategory;
  };

  const updateCategory = (id: string, data: { name: string; slug: string; description?: string }) => {
    const existing = state.categories.find((c) => c.id === id);
    if (!existing) return;

    const updated: Category = {
      ...existing,
      name: data.name.trim(),
      slug: data.slug.trim(),
      description: data.description?.trim(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'UPDATE_CATEGORY', payload: updated });
  };

  const archiveCategory = (id: string) => {
    dispatch({ type: 'ARCHIVE_CATEGORY', payload: id });
  };

  const restoreCategory = (id: string) => {
    dispatch({ type: 'RESTORE_CATEGORY', payload: id });
  };

  const getById = (id: string) => {
    return state.categories.find((c) => c.id === id);
  };

  const isNameAvailable = (name: string, currentId?: string): boolean => {
    const normalizedName = name.trim().toLowerCase();
    return !state.categories.some(
      (c) => c.name.toLowerCase() === normalizedName && c.id !== currentId
    );
  };

  const isSlugAvailable = (slug: string, currentId?: string): boolean => {
    const normalizedSlug = slug.trim().toLowerCase();
    return !state.categories.some(
      (c) => c.slug.toLowerCase() === normalizedSlug && c.id !== currentId
    );
  };

  const list = (includeArchived: boolean = false): Category[] => {
    if (includeArchived) {
      return state.categories;
    }
    return state.categories.filter((c) => !c.isArchived);
  };

  const value: CategoryContextValue = {
    categories: state.categories,
    createCategory,
    updateCategory,
    archiveCategory,
    restoreCategory,
    getById,
    isNameAvailable,
    isSlugAvailable,
    list,
  };

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoryProvider');
  }
  return context;
}
