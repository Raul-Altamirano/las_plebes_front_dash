import type { InboxConversation, InboxMessageItem } from '../types/inbox';
import { MOCK_INBOX_CONVERSATIONS } from '../data/mockInbox';

/**
 * Servicio para gestionar conversaciones de Inbox
 * 
 * TODO: Reemplazar con llamadas reales a AWS API Gateway / Lambda
 * cuando los webhooks de WhatsApp/Facebook/Instagram estén configurados
 * 
 * Endpoints esperados:
 * - GET /api/inbox/conversations - Lista todas las conversaciones
 * - GET /api/inbox/conversations/:id - Obtiene una conversación
 * - POST /api/inbox/conversations/:id/messages - Envía un mensaje
 * - PATCH /api/inbox/conversations/:id - Actualiza status/asignación
 * - Webhooks entrantes de canales externos
 */

// Simular delay de red
const simulateNetworkDelay = (ms: number = 300) => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Obtiene todas las conversaciones
 * TODO: Reemplazar con fetch a AWS API
 */
export const fetchConversations = async (): Promise<InboxConversation[]> => {
  await simulateNetworkDelay();
  
  // TODO: Reemplazar con:
  // const response = await fetch(`${API_BASE_URL}/api/inbox/conversations`, {
  //   headers: { Authorization: `Bearer ${token}` }
  // });
  // return response.json();
  
  return MOCK_INBOX_CONVERSATIONS;
};

/**
 * Obtiene una conversación específica
 * TODO: Reemplazar con fetch a AWS API
 */
export const fetchConversationById = async (
  conversationId: string
): Promise<InboxConversation | null> => {
  await simulateNetworkDelay();
  
  // TODO: Reemplazar con:
  // const response = await fetch(
  //   `${API_BASE_URL}/api/inbox/conversations/${conversationId}`,
  //   { headers: { Authorization: `Bearer ${token}` } }
  // );
  // return response.json();
  
  const conversation = MOCK_INBOX_CONVERSATIONS.find(c => c.id === conversationId);
  return conversation || null;
};

/**
 * Envía un mensaje de respuesta
 * TODO: Reemplazar con POST a AWS API que maneje el envío al canal correspondiente
 */
export const sendMessage = async (
  conversationId: string,
  body: string,
  userId: string
): Promise<InboxMessageItem> => {
  await simulateNetworkDelay(500);
  
  // TODO: Reemplazar con:
  // const response = await fetch(
  //   `${API_BASE_URL}/api/inbox/conversations/${conversationId}/messages`,
  //   {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       Authorization: `Bearer ${token}`
  //     },
  //     body: JSON.stringify({ body, userId })
  //   }
  // );
  // return response.json();
  
  const newMessage: InboxMessageItem = {
    id: `msg-${Date.now()}`,
    direction: 'OUTBOUND',
    body,
    sentAt: new Date().toISOString(),
    sentBy: userId,
    isRead: true, // Los mensajes salientes se marcan como leídos
  };
  
  return newMessage;
};

/**
 * Actualiza el status de una conversación
 * TODO: Reemplazar con PATCH a AWS API
 */
export const updateConversationStatus = async (
  conversationId: string,
  status: 'OPEN' | 'RESOLVED' | 'ARCHIVED'
): Promise<void> => {
  await simulateNetworkDelay();
  
  // TODO: Reemplazar con:
  // await fetch(
  //   `${API_BASE_URL}/api/inbox/conversations/${conversationId}`,
  //   {
  //     method: 'PATCH',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       Authorization: `Bearer ${token}`
  //     },
  //     body: JSON.stringify({ status })
  //   }
  // );
};

/**
 * Asigna una conversación a un usuario
 * TODO: Reemplazar con PATCH a AWS API
 */
export const assignConversation = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  await simulateNetworkDelay();
  
  // TODO: Reemplazar con:
  // await fetch(
  //   `${API_BASE_URL}/api/inbox/conversations/${conversationId}`,
  //   {
  //     method: 'PATCH',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       Authorization: `Bearer ${token}`
  //     },
  //     body: JSON.stringify({ assignedTo: userId })
  //   }
  // );
};

/**
 * Marca una conversación como leída
 * TODO: Reemplazar con PATCH a AWS API
 */
export const markAsRead = async (conversationId: string): Promise<void> => {
  await simulateNetworkDelay(100);
  
  // TODO: Reemplazar con:
  // await fetch(
  //   `${API_BASE_URL}/api/inbox/conversations/${conversationId}/read`,
  //   {
  //     method: 'POST',
  //     headers: { Authorization: `Bearer ${token}` }
  //   }
  // );
};

/**
 * Vincula una conversación a un pedido
 * TODO: Reemplazar con PATCH a AWS API
 */
export const linkToOrder = async (
  conversationId: string,
  orderId: string
): Promise<void> => {
  await simulateNetworkDelay();
  
  // TODO: Reemplazar con:
  // await fetch(
  //   `${API_BASE_URL}/api/inbox/conversations/${conversationId}`,
  //   {
  //     method: 'PATCH',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       Authorization: `Bearer ${token}`
  //     },
  //     body: JSON.stringify({ linkedOrderId: orderId })
  //   }
  // );
};

/**
 * Vincula una conversación a un cliente
 * TODO: Reemplazar con PATCH a AWS API
 */
export const linkToCustomer = async (
  conversationId: string,
  customerId: string
): Promise<void> => {
  await simulateNetworkDelay();
  
  // TODO: Reemplazar con:
  // await fetch(
  //   `${API_BASE_URL}/api/inbox/conversations/${conversationId}`,
  //   {
  //     method: 'PATCH',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       Authorization: `Bearer ${token}`
  //     },
  //     body: JSON.stringify({ linkedCustomerId: customerId })
  //   }
  // );
};

/**
 * Crea un pedido desde una conversación de chat
 * TODO: Reemplazar con POST a AWS API
 */
export const createOrderFromChat = async (
  conversationId: string,
  orderData: any
): Promise<string> => {
  await simulateNetworkDelay(500);
  
  // TODO: Reemplazar con:
  // const response = await fetch(
  //   `${API_BASE_URL}/api/inbox/conversations/${conversationId}/create-order`,
  //   {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       Authorization: `Bearer ${token}`
  //     },
  //     body: JSON.stringify(orderData)
  //   }
  // );
  // const data = await response.json();
  // return data.orderId;
  
  // Mock: Generar ID de pedido simulado
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 999) + 1;
  const newOrderId = `ORD-${year}-${seq.toString().padStart(3, '0')}`;
  
  return newOrderId;
};