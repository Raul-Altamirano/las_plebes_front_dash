// Customer module types

export type CustomerTag = "VIP" | "MAYOREO" | "FRECUENTE" | "RIESGO" | "NUEVO";

export interface Customer {
  id: string;
  name: string;            // requerido
  phone?: string;          // opcional (normalizado: solo dígitos)
  email?: string;          // opcional
  tags: CustomerTag[];     // opcional
  notes?: string;          // notas internas
  createdAt: string;
  updatedAt: string;
}

// Tag labels
export const CUSTOMER_TAG_LABELS: Record<CustomerTag, string> = {
  VIP: "VIP",
  MAYOREO: "Mayoreo",
  FRECUENTE: "Frecuente",
  RIESGO: "Riesgo",
  NUEVO: "Nuevo",
};

// Tag colors for badges
export const CUSTOMER_TAG_COLORS: Record<CustomerTag, 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'> = {
  VIP: 'purple',
  MAYOREO: 'blue',
  FRECUENTE: 'green',
  RIESGO: 'red',
  NUEVO: 'yellow',
};

// Helper to normalize phone numbers (remove all non-digits)
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Basic email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
