/**
 * Tipos para el módulo Inbox / Mensajes
 * Centraliza conversaciones de múltiples canales
 */

// Canales de origen de mensajes
export type InboxChannel = 
  | 'WHATSAPP' 
  | 'FACEBOOK' 
  | 'INSTAGRAM' 
  | 'STOREFRONT_FORM';

// Estado de la conversación
export type InboxStatus = 'OPEN' | 'RESOLVED' | 'ARCHIVED';

// Razones de urgencia
export type UrgencyReason = 
  | 'NO_RESPONSE_2H'      // sin respuesta +2 horas
  | 'KEYWORD_CANCEL'      // contiene "cancelar"
  | 'KEYWORD_RETURN'      // contiene "devolución" o "no llegó"
  | 'NEW_CLIENT';         // primer mensaje de cliente nuevo

// Mensaje individual dentro de una conversación
export type InboxMessageItem = {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  body: string;
  sentAt: string;
  sentBy?: string; // userId si es OUTBOUND
  isRead: boolean;
};

// Conversación completa
export type InboxConversation = {
  id: string;
  tenantId: string;
  channel: InboxChannel;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  externalConversationId?: string; // ID del canal externo (WhatsApp, FB, etc.)
  messages: InboxMessageItem[];
  status: InboxStatus;
  isUrgent: boolean;
  urgencyReasons: UrgencyReason[];
  assignedTo?: string;       // userId del agente asignado
  linkedOrderId?: string;    // ID de pedido vinculado
  linkedCustomerId?: string; // ID de cliente vinculado
  unreadCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

// Labels para UI
export const INBOX_CHANNEL_LABELS: Record<InboxChannel, string> = {
  WHATSAPP: 'WhatsApp',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  STOREFRONT_FORM: 'Formulario Web',
};

export const INBOX_STATUS_LABELS: Record<InboxStatus, string> = {
  OPEN: 'Abierto',
  RESOLVED: 'Resuelto',
  ARCHIVED: 'Archivado',
};

// Colores para badges de status
export const INBOX_STATUS_COLORS: Record<InboxStatus, string> = {
  OPEN: 'bg-green-100 text-green-800',
  RESOLVED: 'bg-blue-100 text-blue-800',
  ARCHIVED: 'bg-gray-100 text-gray-800',
};

// Colores de ícono por canal
export const INBOX_CHANNEL_COLORS: Record<InboxChannel, string> = {
  WHATSAPP: 'text-green-600',
  FACEBOOK: 'text-blue-600',
  INSTAGRAM: 'text-pink-600',
  STOREFRONT_FORM: 'text-gray-600',
};

// Labels para razones de urgencia
export const URGENCY_REASON_LABELS: Record<UrgencyReason, string> = {
  NO_RESPONSE_2H: 'Sin respuesta +2 horas',
  KEYWORD_CANCEL: 'Menciona cancelación',
  KEYWORD_RETURN: 'Menciona devolución',
  NEW_CLIENT: 'Cliente nuevo',
};