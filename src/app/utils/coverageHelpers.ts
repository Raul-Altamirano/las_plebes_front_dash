// Coverage utility functions

import { CoverageZip, DisabledReason, CoverageStatus, CSV_COLUMNS } from '../types/coverage';

/**
 * Validates a Mexican postal code (5 digits)
 */
export function validateZip(zip: string): { valid: boolean; error?: string } {
  if (!zip || zip.trim() === '') {
    return { valid: false, error: 'El código postal es requerido' };
  }

  const cleaned = zip.trim();

  if (!/^\d{5}$/.test(cleaned)) {
    return { valid: false, error: 'El código postal debe tener exactamente 5 dígitos' };
  }

  return { valid: true };
}

/**
 * Validates a CoverageZip object
 */
export function validateCoverageZip(
  zip: Partial<CoverageZip>,
  existingZips: CoverageZip[],
  isEdit: boolean = false
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Validate zip
  const zipValidation = validateZip(zip.zip || '');
  if (!zipValidation.valid) {
    errors.zip = zipValidation.error || 'Código postal inválido';
  } else {
    // Check uniqueness
    const duplicate = existingZips.find(
      (z) => z.zip === zip.zip && (!isEdit || z.id !== zip.id)
    );
    if (duplicate) {
      errors.zip = 'Este código postal ya existe';
    }
  }

  // Validate status
  if (!zip.status) {
    errors.status = 'El estado es requerido';
  }

  // Validate deliveryFee
  if (zip.deliveryFee !== undefined && zip.deliveryFee !== null) {
    if (zip.deliveryFee < 0) {
      errors.deliveryFee = 'El costo de envío no puede ser negativo';
    }
  }

  // Validate minOrder
  if (zip.minOrder !== undefined && zip.minOrder !== null) {
    if (zip.minOrder < 0) {
      errors.minOrder = 'El monto mínimo no puede ser negativo';
    }
  }

  // Validate reason (required if disabled)
  if (zip.status === 'DISABLED' && !zip.reason) {
    errors.reason = 'La razón es requerida para CPs bloqueados';
  }

  // Validate meetupPointNote (recommended if onlyMeetupPoint)
  if (zip.onlyMeetupPoint && !zip.meetupPointNote?.trim()) {
    // This is a warning, not a blocking error
    // We'll handle this in the UI
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Parses a CSV row into a CoverageZip object
 */
export function parseCoverageRow(
  row: Record<string, string>,
  index: number
): { data?: Partial<CoverageZip>; errors: string[] } {
  const errors: string[] = [];

  const zip = row.zip?.trim();
  if (!zip) {
    errors.push(`Fila ${index + 1}: Código postal faltante`);
    return { errors };
  }

  const zipValidation = validateZip(zip);
  if (!zipValidation.valid) {
    errors.push(`Fila ${index + 1}: ${zipValidation.error}`);
    return { errors };
  }

  const status = row.status?.trim().toUpperCase() as CoverageStatus;
  if (!['ENABLED', 'REVIEW', 'DISABLED'].includes(status)) {
    errors.push(`Fila ${index + 1}: Estado inválido (debe ser ENABLED, REVIEW o DISABLED)`);
    return { errors };
  }

  const deliveryFee = row.deliveryFee ? parseFloat(row.deliveryFee) : undefined;
  if (deliveryFee !== undefined && (isNaN(deliveryFee) || deliveryFee < 0)) {
    errors.push(`Fila ${index + 1}: Costo de envío inválido`);
  }

  const minOrder = row.minOrder ? parseFloat(row.minOrder) : undefined;
  if (minOrder !== undefined && (isNaN(minOrder) || minOrder < 0)) {
    errors.push(`Fila ${index + 1}: Monto mínimo inválido`);
  }

  const onlyMeetupPoint = row.onlyMeetupPoint?.toLowerCase() === 'true';

  const reason = row.reason?.trim().toUpperCase() as DisabledReason | undefined;
  if (reason && !['SAFETY_POLICY', 'NO_COVERAGE', 'HIGH_RISK', 'FRAUD_HISTORY', 'OPERATIONAL_LIMIT'].includes(reason)) {
    errors.push(`Fila ${index + 1}: Razón inválida`);
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    data: {
      zip,
      status,
      deliveryFee,
      minOrder,
      onlyMeetupPoint,
      meetupPointNote: row.meetupPointNote?.trim(),
      reason,
      notes: row.notes?.trim(),
    },
    errors: [],
  };
}

/**
 * Exports coverage data to CSV format
 */
export function exportCoverageToCSV(coverageZips: CoverageZip[]): string {
  const headers = CSV_COLUMNS.join(',');
  
  const rows = coverageZips.map((cz) => {
    return CSV_COLUMNS.map((col) => {
      const value = cz[col];
      if (value === undefined || value === null) return '';
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Downloads CSV content as a file
 */
export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Checks if a zip code is allowed for delivery
 */
export function checkZipCoverage(
  zip: string,
  coverageZips: CoverageZip[]
): {
  allowed: boolean;
  requiresReview: boolean;
  coverage?: CoverageZip;
  message?: string;
} {
  const coverage = coverageZips.find((c) => c.zip === zip);

  if (!coverage) {
    return {
      allowed: false,
      requiresReview: false,
      message: 'Código postal no encontrado en cobertura',
    };
  }

  if (coverage.status === 'DISABLED') {
    return {
      allowed: false,
      requiresReview: false,
      coverage,
      message: `CP bloqueado: ${coverage.reason || 'Sin razón especificada'}`,
    };
  }

  if (coverage.status === 'REVIEW') {
    return {
      allowed: true,
      requiresReview: true,
      coverage,
      message: 'Este pedido requerirá aprobación manual por estar en zona de revisión',
    };
  }

  return {
    allowed: true,
    requiresReview: false,
    coverage,
  };
}
