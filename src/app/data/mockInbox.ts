import type { InboxConversation } from '../types/inbox';

/**
 * Mock data para el módulo Inbox
 * Simula conversaciones desde múltiples canales
 * 
 * TODO: Reemplazar con llamada real a AWS/API cuando esté disponible
 */

// Función helper para calcular tiempo hace 2 horas
const twoHoursAgo = () => {
  const date = new Date();
  date.setHours(date.getHours() - 3); // 3 horas para simular urgencia
  return date.toISOString();
};

export const MOCK_INBOX_CONVERSATIONS: InboxConversation[] = [
  // CONV-0001 - WhatsApp - URGENTE por NO_RESPONSE_2H
  {
    id: 'CONV-0001',
    tenantId: 'pochteca-main',
    channel: 'WHATSAPP',
    contactName: 'María Hernández',
    contactPhone: '+52 1 55 1234 5678',
    contactEmail: 'maria.h@gmail.com',
    externalConversationId: 'wa-52155123456',
    messages: [
      {
        id: 'msg-001-1',
        direction: 'INBOUND',
        body: 'Hola, buen día. Quisiera saber si tienen disponible el vestido azul en talla M?',
        sentAt: twoHoursAgo(),
        isRead: false,
      },
    ],
    status: 'OPEN',
    isUrgent: true,
    urgencyReasons: ['NO_RESPONSE_2H'],
    unreadCount: 1,
    lastMessageAt: twoHoursAgo(),
    createdAt: twoHoursAgo(),
    updatedAt: twoHoursAgo(),
  },

  // CONV-0002 - Facebook - URGENTE por KEYWORD_RETURN
  {
    id: 'CONV-0002',
    tenantId: 'pochteca-main',
    channel: 'FACEBOOK',
    contactName: 'Carlos Mendoza',
    contactEmail: 'carlos.mendoza@outlook.com',
    externalConversationId: 'fb-100012345678',
    messages: [
      {
        id: 'msg-002-1',
        direction: 'INBOUND',
        body: '¿Hacen envíos a Querétaro? ¿Cuánto tarda?',
        sentAt: '2026-03-14T10:30:00.000Z',
        isRead: true,
      },
      {
        id: 'msg-002-2',
        direction: 'OUTBOUND',
        body: 'Hola Carlos! Sí, hacemos envíos a Querétaro. El tiempo de entrega es de 3-5 días hábiles.',
        sentAt: '2026-03-14T10:35:20.000Z',
        sentBy: 'usr-002',
        isRead: true,
      },
      {
        id: 'msg-002-3',
        direction: 'INBOUND',
        body: 'Mi pedido no llegó y quiero una devolución. Ya pasó una semana.',
        sentAt: '2026-03-16T10:40:00.000Z',
        isRead: false,
      },
    ],
    status: 'OPEN',
    isUrgent: true,
    urgencyReasons: ['KEYWORD_RETURN'],
    assignedTo: 'usr-002',
    linkedOrderId: 'ORD-2026-123',
    unreadCount: 1,
    lastMessageAt: '2026-03-16T10:40:00.000Z',
    createdAt: '2026-03-14T10:30:00.000Z',
    updatedAt: '2026-03-16T10:40:00.000Z',
  },

  // CONV-0003 - WhatsApp - Normal
  {
    id: 'CONV-0003',
    tenantId: 'pochteca-main',
    channel: 'WHATSAPP',
    contactName: 'Laura Ramírez',
    contactPhone: '+52 1 81 5555 1234',
    contactEmail: 'laura.ramirez@hotmail.com',
    externalConversationId: 'wa-52181555512',
    messages: [
      {
        id: 'msg-003-1',
        direction: 'INBOUND',
        body: 'Hice un pedido hace 5 días y aún no llega. Mi número de orden es ORD-1695. ¿Pueden ayudarme?',
        sentAt: '2026-03-14T11:00:00.000Z',
        isRead: true,
      },
      {
        id: 'msg-003-2',
        direction: 'OUTBOUND',
        body: 'Hola Laura, disculpa la demora. Déjame revisar el estatus de tu pedido ORD-1695...',
        sentAt: '2026-03-14T11:05:00.000Z',
        sentBy: 'usr-003',
        isRead: true,
      },
      {
        id: 'msg-003-3',
        direction: 'OUTBOUND',
        body: 'Laura, tu pedido salió ayer de nuestro almacén. El número de rastreo es 1Z999AA10123456784. Debería llegar mañana.',
        sentAt: '2026-03-14T11:10:00.000Z',
        sentBy: 'usr-003',
        isRead: true,
      },
      {
        id: 'msg-003-4',
        direction: 'INBOUND',
        body: 'Perfecto, muchas gracias por la información!',
        sentAt: '2026-03-14T11:12:00.000Z',
        isRead: true,
      },
    ],
    status: 'OPEN',
    isUrgent: false,
    urgencyReasons: [],
    assignedTo: 'usr-003',
    linkedOrderId: 'ORD-1695',
    linkedCustomerId: 'cust-023',
    unreadCount: 0,
    lastMessageAt: '2026-03-14T11:12:00.000Z',
    createdAt: '2026-03-14T11:00:00.000Z',
    updatedAt: '2026-03-14T11:12:00.000Z',
  },

  // CONV-0004 - Instagram - Normal
  {
    id: 'CONV-0004',
    tenantId: 'pochteca-main',
    channel: 'INSTAGRAM',
    contactName: 'Ana Sofía López',
    externalConversationId: 'ig-17841405822304914',
    messages: [
      {
        id: 'msg-004-1',
        direction: 'INBOUND',
        body: '¡Me encantó el outfit de tu última publicación! 😍 ¿Viene en color rosa?',
        sentAt: '2026-03-13T16:20:00.000Z',
        isRead: true,
      },
      {
        id: 'msg-004-2',
        direction: 'OUTBOUND',
        body: 'Hola Ana Sofía! Gracias por escribir ❤️ Sí tenemos ese outfit en rosa, tallas S, M y L disponibles.',
        sentAt: '2026-03-13T16:25:00.000Z',
        sentBy: 'usr-001',
        isRead: true,
      },
      {
        id: 'msg-004-3',
        direction: 'INBOUND',
        body: 'Perfecto! Quiero uno en talla S. ¿Cómo le hago para comprarlo?',
        sentAt: '2026-03-13T16:30:00.000Z',
        isRead: true,
      },
      {
        id: 'msg-004-4',
        direction: 'OUTBOUND',
        body: 'Te mando el link de nuestra tienda por DM. Ahí puedes hacer tu pedido directo 🛍️',
        sentAt: '2026-03-13T16:32:00.000Z',
        sentBy: 'usr-001',
        isRead: true,
      },
    ],
    status: 'RESOLVED',
    isUrgent: false,
    urgencyReasons: [],
    assignedTo: 'usr-001',
    linkedOrderId: 'ORD-1709',
    linkedCustomerId: 'cust-045',
    unreadCount: 0,
    lastMessageAt: '2026-03-13T16:32:00.000Z',
    createdAt: '2026-03-13T16:20:00.000Z',
    updatedAt: '2026-03-13T16:32:00.000Z',
  },

  // CONV-0005 - Formulario - URGENTE por NEW_CLIENT
  {
    id: 'CONV-0005',
    tenantId: 'pochteca-main',
    channel: 'STOREFRONT_FORM',
    contactName: 'Roberto García',
    contactPhone: '+52 1 33 9876 5432',
    contactEmail: 'roberto.garcia@empresa.com',
    messages: [
      {
        id: 'msg-005-1',
        direction: 'INBOUND',
        body: 'Hola, estoy interesado en hacer un pedido mayoreo de 50 piezas. ¿Manejan descuentos por volumen?',
        sentAt: '2026-03-16T08:00:00.000Z',
        isRead: false,
      },
    ],
    status: 'OPEN',
    isUrgent: true,
    urgencyReasons: ['NEW_CLIENT'],
    unreadCount: 1,
    lastMessageAt: '2026-03-16T08:00:00.000Z',
    createdAt: '2026-03-16T08:00:00.000Z',
    updatedAt: '2026-03-16T08:00:00.000Z',
  },

  // CONV-0006 - Instagram - Normal con mensajes no leídos
  {
    id: 'CONV-0006',
    tenantId: 'pochteca-main',
    channel: 'INSTAGRAM',
    contactName: 'Diego Vargas',
    externalConversationId: 'ig-17841405822999888',
    messages: [
      {
        id: 'msg-006-1',
        direction: 'INBOUND',
        body: 'Vi en sus historias que tienen promoción 2x1 en jeans. ¿Todavía está activa?',
        sentAt: '2026-03-14T12:00:00.000Z',
        isRead: true,
      },
      {
        id: 'msg-006-2',
        direction: 'OUTBOUND',
        body: 'Hola Diego! Sí, la promo está activa hasta el domingo. Aplica en todos los jeans de la colección primavera 🔥',
        sentAt: '2026-03-14T12:05:00.000Z',
        sentBy: 'usr-001',
        isRead: true,
      },
      {
        id: 'msg-006-3',
        direction: 'INBOUND',
        body: 'Genial! ¿Puedo combinar diferentes modelos o tienen que ser iguales?',
        sentAt: '2026-03-14T12:08:00.000Z',
        isRead: false,
      },
    ],
    status: 'OPEN',
    isUrgent: false,
    urgencyReasons: [],
    assignedTo: 'usr-001',
    unreadCount: 1,
    lastMessageAt: '2026-03-14T12:08:00.000Z',
    createdAt: '2026-03-14T12:00:00.000Z',
    updatedAt: '2026-03-14T12:08:00.000Z',
  },

  // CONV-0007 - WhatsApp - Normal
  {
    id: 'CONV-0007',
    tenantId: 'pochteca-main',
    channel: 'WHATSAPP',
    contactName: 'Fernanda Torres',
    contactPhone: '+52 1 55 8888 9999',
    externalConversationId: 'wa-52155888899',
    messages: [
      {
        id: 'msg-007-1',
        direction: 'INBOUND',
        body: 'Buenos días, quisiera saber si tienen gift cards disponibles',
        sentAt: '2026-03-14T07:30:00.000Z',
        isRead: true,
      },
      {
        id: 'msg-007-2',
        direction: 'OUTBOUND',
        body: 'Buenos días Fernanda! Sí manejamos gift cards desde $500 hasta $5,000 pesos. ¿De qué monto te interesa?',
        sentAt: '2026-03-14T07:45:00.000Z',
        sentBy: 'usr-002',
        isRead: true,
      },
      {
        id: 'msg-007-3',
        direction: 'INBOUND',
        body: 'Me gustaría una de $1,000. ¿Cómo la puedo comprar?',
        sentAt: '2026-03-14T07:50:00.000Z',
        isRead: false,
      },
    ],
    status: 'OPEN',
    isUrgent: false,
    urgencyReasons: [],
    assignedTo: 'usr-002',
    unreadCount: 1,
    lastMessageAt: '2026-03-14T07:50:00.000Z',
    createdAt: '2026-03-14T07:30:00.000Z',
    updatedAt: '2026-03-14T07:50:00.000Z',
  },

  // CONV-0008 - Facebook - URGENTE por KEYWORD_CANCEL
  {
    id: 'CONV-0008',
    tenantId: 'pochteca-main',
    channel: 'FACEBOOK',
    contactName: 'Patricia Sánchez',
    externalConversationId: 'fb-100098765432',
    messages: [
      {
        id: 'msg-008-1',
        direction: 'INBOUND',
        body: 'Hola, hice un pedido pero quiero cancelar, ¿es posible?',
        sentAt: '2026-03-16T14:00:00.000Z',
        isRead: false,
      },
    ],
    status: 'OPEN',
    isUrgent: true,
    urgencyReasons: ['KEYWORD_CANCEL', 'NEW_CLIENT'],
    linkedOrderId: 'ORD-1688',
    unreadCount: 1,
    lastMessageAt: '2026-03-16T14:00:00.000Z',
    createdAt: '2026-03-16T14:00:00.000Z',
    updatedAt: '2026-03-16T14:00:00.000Z',
  },

  // CONV-0009 - WhatsApp - Normal
  {
    id: 'CONV-0009',
    tenantId: 'pochteca-main',
    channel: 'WHATSAPP',
    contactName: 'Sofía Martínez',
    contactPhone: '+52 1 55 7777 8888',
    externalConversationId: 'wa-52155777788',
    messages: [
      {
        id: 'msg-009-1',
        direction: 'INBOUND',
        body: '¿Tienen playeras básicas en color blanco?',
        sentAt: '2026-03-15T10:00:00.000Z',
        isRead: true,
      },
      {
        id: 'msg-009-2',
        direction: 'OUTBOUND',
        body: 'Hola Sofía! Sí tenemos playeras básicas blancas en todas las tallas.',
        sentAt: '2026-03-15T10:05:00.000Z',
        sentBy: 'usr-001',
        isRead: true,
      },
      {
        id: 'msg-009-3',
        direction: 'INBOUND',
        body: 'Perfecto, quiero 3 en talla M.',
        sentAt: '2026-03-15T10:08:00.000Z',
        isRead: true,
      },
    ],
    status: 'OPEN',
    isUrgent: false,
    urgencyReasons: [],
    assignedTo: 'usr-001',
    unreadCount: 0,
    lastMessageAt: '2026-03-15T10:08:00.000Z',
    createdAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-03-15T10:08:00.000Z',
  },

  // CONV-0010 - Instagram - RESOLVED
  {
    id: 'CONV-0010',
    tenantId: 'pochteca-main',
    channel: 'INSTAGRAM',
    contactName: 'Alejandro Cruz',
    externalConversationId: 'ig-17841405822777666',
    messages: [
      {
        id: 'msg-010-1',
        direction: 'INBOUND',
        body: '¿Cuánto cuesta el envío a Monterrey?',
        sentAt: '2026-03-13T09:00:00.000Z',
        isRead: true,
      },
      {
        id: 'msg-010-2',
        direction: 'OUTBOUND',
        body: 'Hola Alejandro! El envío a Monterrey cuesta $150 pesos.',
        sentAt: '2026-03-13T09:05:00.000Z',
        sentBy: 'usr-002',
        isRead: true,
      },
      {
        id: 'msg-010-3',
        direction: 'INBOUND',
        body: 'Ok gracias!',
        sentAt: '2026-03-13T09:06:00.000Z',
        isRead: true,
      },
    ],
    status: 'RESOLVED',
    isUrgent: false,
    urgencyReasons: [],
    assignedTo: 'usr-002',
    unreadCount: 0,
    lastMessageAt: '2026-03-13T09:06:00.000Z',
    createdAt: '2026-03-13T09:00:00.000Z',
    updatedAt: '2026-03-13T09:06:00.000Z',
  },
];
