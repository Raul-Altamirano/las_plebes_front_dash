// Audit utility functions

/**
 * Compares two objects and returns only the fields that changed
 * @param before - Original object
 * @param after - Updated object
 * @param fields - List of fields to compare
 * @param excludeTimestamps - Whether to exclude updatedAt/createdAt (default: true)
 */
export function diffFields<T extends Record<string, any>>(
  before: T,
  after: T,
  fields: (keyof T)[],
  excludeTimestamps: boolean = true
): Array<{ field: string; from: any; to: any }> {
  const changes: Array<{ field: string; from: any; to: any }> = [];

  const fieldsToCompare = excludeTimestamps
    ? fields.filter((f) => f !== 'updatedAt' && f !== 'createdAt')
    : fields;

  for (const field of fieldsToCompare) {
    const oldValue = normalizeValue(before[field]);
    const newValue = normalizeValue(after[field]);

    if (!isEqual(oldValue, newValue)) {
      changes.push({
        field: String(field),
        from: oldValue,
        to: newValue,
      });
    }
  }

  return changes;
}

/**
 * Normalizes values for comparison (treats undefined and null as equivalent)
 */
function normalizeValue(value: any): any {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return value;
}

/**
 * Deep equality check for primitive types and simple objects
 */
function isEqual(a: any, b: any): boolean {
  // Same reference or both null/undefined
  if (a === b) return true;

  // One is null and the other isn't
  if (a == null || b == null) return false;

  // Different types
  if (typeof a !== typeof b) return false;

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => isEqual(val, b[idx]));
  }

  // Objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => isEqual(a[key], b[key]));
  }

  // Primitives
  return a === b;
}

/**
 * Formats a change for display
 */
export function formatChange(change: { field: string; from: any; to: any }): string {
  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return '(vacío)';
    if (typeof val === 'boolean') return val ? 'Sí' : 'No';
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return `[${val.length} items]`;
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return `${change.field}: ${formatValue(change.from)} → ${formatValue(change.to)}`;
}

/**
 * Gets a human-readable label for an entity type
 */
export function getEntityTypeLabel(
  type: string
): string {
  const labels: Record<string, string> = {
    coverageZip: 'CP',
    order: 'Pedido',
    customer: 'Cliente',
    product: 'Producto',
    products: 'Productos',
    category: 'Categoría',
    rma: 'RMA',
    role: 'Rol',
    user: 'Usuario',
    promotion: 'Promoción',
    coupon: 'Cupón',
    image: 'Imagen',
  };
  return labels[type] || type;
}

/**
 * Formats field names to human-readable labels
 */
export function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    zip: 'Código Postal',
    status: 'Estado',
    deliveryFee: 'Costo de envío',
    minOrder: 'Monto mínimo',
    onlyMeetupPoint: 'Solo punto de encuentro',
    meetupPointNote: 'Nota de punto',
    reason: 'Razón',
    notes: 'Notas',
    name: 'Nombre',
    email: 'Email',
    phone: 'Teléfono',
    price: 'Precio',
    stock: 'Stock',
    sku: 'SKU',
    description: 'Descripción',
    total: 'Total',
    channel: 'Canal',
    paymentMethod: 'Método de pago',
  };
  return labels[field] || field;
}
