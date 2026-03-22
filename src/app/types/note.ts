export type NotePriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type NoteStatus = 'OPEN' | 'RESOLVED' | 'ARCHIVED';

export interface Note {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  priority: NotePriority;
  tags: string[];
  status: NoteStatus;
  linkedOrderIds: string[];   // puede estar vacío
  linkedRmaIds: string[];     // puede estar vacío
  createdBy: string;          // userId
  createdAt: string;
  updatedAt: string;
}

// Labels para prioridad
export const NOTE_PRIORITY_LABELS: Record<NotePriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

// Labels para status
export const NOTE_STATUS_LABELS: Record<NoteStatus, string> = {
  OPEN: 'Abierta',
  RESOLVED: 'Resuelta',
  ARCHIVED: 'Archivada',
};

// Colores para badges de prioridad
export const NOTE_PRIORITY_COLORS: Record<NotePriority, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-red-100 text-red-700',
};

// Colores para badges de status
export const NOTE_STATUS_COLORS: Record<NoteStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-700',
};
