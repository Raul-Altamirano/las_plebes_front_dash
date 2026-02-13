// Coverage module types

export type CoverageStatus = 'ENABLED' | 'REVIEW' | 'DISABLED';

export type DisabledReason = 
  | 'SAFETY_POLICY' 
  | 'NO_COVERAGE' 
  | 'HIGH_RISK' 
  | 'FRAUD_HISTORY' 
  | 'OPERATIONAL_LIMIT';

export interface CoverageZip {
  id: string;
  zip: string; // 5 digits, unique
  status: CoverageStatus;
  deliveryFee?: number; // Optional delivery fee
  minOrder?: number; // Optional minimum order amount
  onlyMeetupPoint: boolean; // Delivery only at meetup points
  meetupPointNote?: string; // e.g., "solo Metro X / Plaza Y"
  reason?: DisabledReason; // Required if status != ENABLED
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Status labels
export const COVERAGE_STATUS_LABELS: Record<CoverageStatus, string> = {
  ENABLED: 'Habilitado',
  REVIEW: 'En revisión',
  DISABLED: 'Bloqueado',
};

// Status colors for badges
export const COVERAGE_STATUS_COLORS: Record<CoverageStatus, 'green' | 'yellow' | 'red'> = {
  ENABLED: 'green',
  REVIEW: 'yellow',
  DISABLED: 'red',
};

// Disabled reason labels
export const DISABLED_REASON_LABELS: Record<DisabledReason, string> = {
  SAFETY_POLICY: 'Política de seguridad',
  NO_COVERAGE: 'Sin cobertura',
  HIGH_RISK: 'Alto riesgo',
  FRAUD_HISTORY: 'Historial de fraude',
  OPERATIONAL_LIMIT: 'Límite operacional',
};

// CSV Export columns
export const CSV_COLUMNS = [
  'zip',
  'status',
  'deliveryFee',
  'minOrder',
  'onlyMeetupPoint',
  'meetupPointNote',
  'reason',
  'notes',
  'updatedAt',
] as const;
