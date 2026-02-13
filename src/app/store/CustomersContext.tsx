import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { type Customer, type CustomerTag, normalizePhone, isValidEmail } from '../types/customer';
import { mockCustomers } from '../data/mockCustomers';
import { useAudit } from './AuditContext';
import { useAuth } from './AuthContext';

interface CustomersState {
  customers: Customer[];
}

type CustomersAction =
  | { type: 'CREATE_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'SET_CUSTOMERS'; payload: Customer[] };

interface CustomersContextValue {
  customers: Customer[];
  createCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Customer | null;
  updateCustomer: (id: string, data: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>) => boolean;
  getById: (id: string) => Customer | undefined;
  findByPhone: (phone: string) => Customer | undefined;
  search: (term: string) => Customer[];
  list: (query?: CustomerQueryParams) => Customer[];
}

export interface CustomerQueryParams {
  search?: string;
  tag?: CustomerTag;
  hasOrders?: boolean; // filtrar por clientes con/sin pedidos (calculado en UI)
}

const CustomersContext = createContext<CustomersContextValue | null>(null);

const STORAGE_KEY = 'ecommerce_admin_customers';

function customersReducer(state: CustomersState, action: CustomersAction): CustomersState {
  switch (action.type) {
    case 'CREATE_CUSTOMER':
      return {
        ...state,
        customers: [action.payload, ...state.customers],
      };
    case 'UPDATE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.map(c => (c.id === action.payload.id ? action.payload : c)),
      };
    case 'SET_CUSTOMERS':
      return {
        ...state,
        customers: action.payload,
      };
    default:
      return state;
  }
}

export function CustomersProvider({ children }: { children: ReactNode }) {
  const audit = useAudit();
  const auth = useAuth();

  // Load initial state from localStorage
  const [state, dispatch] = useReducer(customersReducer, { customers: [] }, () => {
    try {
      const storedCustomers = localStorage.getItem(STORAGE_KEY);
      
      // If no stored data, initialize with mock customers
      if (!storedCustomers) {
        return { customers: mockCustomers };
      }
      
      return {
        customers: storedCustomers ? JSON.parse(storedCustomers) : [],
      };
    } catch (error) {
      console.error('Error loading customers from localStorage:', error);
      return { customers: mockCustomers };
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.customers));
  }, [state.customers]);

  const createCustomer = (
    data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
  ): Customer | null => {
    // Validation
    if (!data.name || data.name.trim() === '') {
      console.error('Customer name is required');
      return null;
    }

    // Normalize phone if provided
    const normalizedPhone = data.phone ? normalizePhone(data.phone) : undefined;

    // Validate email if provided
    if (data.email && data.email.trim() !== '' && !isValidEmail(data.email)) {
      console.error('Invalid email format');
      return null;
    }

    // Check for duplicate phone (V1 warning only, not blocking)
    if (normalizedPhone) {
      const existingCustomer = state.customers.find(c => c.phone === normalizedPhone);
      if (existingCustomer) {
        console.warn(`Customer with phone ${normalizedPhone} already exists: ${existingCustomer.name}`);
        // No bloqueamos, solo advertimos
      }
    }

    const now = new Date().toISOString();
    const newCustomer: Customer = {
      ...data,
      id: `customer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      phone: normalizedPhone,
      email: data.email?.trim() || undefined,
      tags: data.tags || [],
      notes: data.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    dispatch({ type: 'CREATE_CUSTOMER', payload: newCustomer });

    // Log audit
    audit.auditLog({
      action: 'CUSTOMER_CREATED',
      entity: {
        type: 'customer',
        id: newCustomer.id,
        label: newCustomer.name,
      },
      metadata: {
        phone: newCustomer.phone,
        email: newCustomer.email,
        tags: newCustomer.tags,
      },
    });

    return newCustomer;
  };

  const updateCustomer = (
    id: string,
    data: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>
  ): boolean => {
    const existing = state.customers.find(c => c.id === id);
    if (!existing) return false;

    // Normalize phone if provided
    const normalizedPhone = data.phone !== undefined 
      ? (data.phone ? normalizePhone(data.phone) : undefined)
      : existing.phone;

    // Validate email if provided
    if (data.email !== undefined && data.email && data.email.trim() !== '' && !isValidEmail(data.email)) {
      console.error('Invalid email format');
      return false;
    }

    const updated: Customer = {
      ...existing,
      ...data,
      phone: normalizedPhone,
      email: data.email !== undefined ? (data.email?.trim() || undefined) : existing.email,
      notes: data.notes !== undefined ? (data.notes?.trim() || undefined) : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: 'UPDATE_CUSTOMER', payload: updated });

    // Track changes for audit
    const changes: Array<{ field: string; from: any; to: any }> = [];
    
    if (data.name && data.name !== existing.name) {
      changes.push({ field: 'name', from: existing.name, to: data.name });
    }
    if (normalizedPhone !== existing.phone) {
      changes.push({ field: 'phone', from: existing.phone, to: normalizedPhone });
    }
    if (data.email !== undefined && data.email !== existing.email) {
      changes.push({ field: 'email', from: existing.email, to: data.email });
    }
    if (data.tags && JSON.stringify(data.tags) !== JSON.stringify(existing.tags)) {
      changes.push({ field: 'tags', from: existing.tags, to: data.tags });
      
      // Additional event for tags change
      audit.auditLog({
        action: 'CUSTOMER_TAGS_CHANGED',
        entity: {
          type: 'customer',
          id: id,
          label: updated.name,
        },
        changes: [{ field: 'tags', from: existing.tags, to: data.tags }],
      });
    }
    if (data.notes !== undefined && data.notes !== existing.notes) {
      changes.push({ field: 'notes', from: existing.notes, to: data.notes });
      
      // Additional event for notes change
      audit.auditLog({
        action: 'CUSTOMER_NOTES_UPDATED',
        entity: {
          type: 'customer',
          id: id,
          label: updated.name,
        },
        metadata: { previousNotes: existing.notes, newNotes: data.notes },
      });
    }

    // Log general update audit
    if (changes.length > 0) {
      audit.auditLog({
        action: 'CUSTOMER_UPDATED',
        entity: {
          type: 'customer',
          id: id,
          label: updated.name,
        },
        changes,
      });
    }

    return true;
  };

  const getById = (id: string): Customer | undefined => {
    return state.customers.find(c => c.id === id);
  };

  const findByPhone = (phone: string): Customer | undefined => {
    const normalized = normalizePhone(phone);
    return state.customers.find(c => c.phone === normalized);
  };

  const search = (term: string): Customer[] => {
    if (!term || term.trim() === '') return state.customers;

    const searchTerm = term.toLowerCase();
    return state.customers.filter(
      c =>
        c.name.toLowerCase().includes(searchTerm) ||
        c.phone?.includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm)
    );
  };

  const list = (query?: CustomerQueryParams): Customer[] => {
    let filtered = [...state.customers];

    if (query?.search) {
      const searchTerm = query.search.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(searchTerm) ||
          c.phone?.includes(searchTerm) ||
          c.email?.toLowerCase().includes(searchTerm)
      );
    }

    if (query?.tag) {
      filtered = filtered.filter(c => c.tags.includes(query.tag!));
    }

    // Sort by updatedAt desc (most recent first)
    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return filtered;
  };

  const value: CustomersContextValue = {
    customers: state.customers,
    createCustomer,
    updateCustomer,
    getById,
    findByPhone,
    search,
    list,
  };

  return <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>;
}

export function useCustomers() {
  const context = useContext(CustomersContext);
  if (context === null) {
    throw new Error('useCustomers must be used within a CustomersProvider');
  }
  return context;
}