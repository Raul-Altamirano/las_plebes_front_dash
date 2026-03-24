import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { InboxConversation, InboxMessageItem, InboxStatus, InboxChannel, UrgencyReason } from '../types/inbox';
import { useAudit } from './AuditContext';
import { useAuth } from './AuthContext';
import * as inboxService from '../services/inboxService';

interface InboxContextValue {
  conversations: InboxConversation[];
  loading: boolean;
  activeConversationId: string | null;
  channelFilter: InboxChannel | 'ALL';
  statusFilter: InboxStatus | 'ALL' | 'URGENT';
  setActiveConversationId: (id: string | null) => void;
  setChannelFilter: (filter: InboxChannel | 'ALL') => void;
  setStatusFilter: (filter: InboxStatus | 'ALL' | 'URGENT') => void;
  getConversation: (id: string) => InboxConversation | undefined;
  sendReply: (conversationId: string, body: string, userId: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  updateStatus: (conversationId: string, status: InboxStatus) => Promise<void>;
  assignTo: (conversationId: string, userId: string) => Promise<void>;
  linkToOrder: (conversationId: string, orderId: string) => Promise<void>;
  linkToCustomer: (conversationId: string, customerId: string) => Promise<void>;
  createOrderFromChat: (conversationId: string, orderData: any) => Promise<void>;
  getTotalUnread: () => number;
  refreshConversations: () => Promise<void>;
  evaluateUrgency: (conversation: InboxConversation) => UrgencyReason[];
}

const InboxContext = createContext<InboxContextValue | undefined>(undefined);
const STORAGE_KEY = 'pochteca_inbox';

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<InboxChannel | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<InboxStatus | 'ALL' | 'URGENT'>('ALL');

  const { auditLog  } = useAudit();
  const { currentUser } = useAuth();

  // ── Cargar desde localStorage o mock ────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setConversations(JSON.parse(stored));
        } else {
          const data = await inboxService.fetchConversations();
          setConversations(data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      } catch (err) {
        console.error('[InboxContext] Error cargando conversaciones:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Persistir en localStorage ────────────────────────────────────────────
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  // ── Helper de auditoría ──────────────────────────────────────────────────
  const audit = useCallback((action: any, convId: string, convName: string, meta?: any) => {
    auditLog ({
      action,
      entityType: 'inbox_conversation' as any,
      entityId: convId,
      entityName: convName,
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'System',
      userRole: currentUser?.role || 'ADMIN',
      metadata: meta,
    });
  }, [auditLog , currentUser]);

  // ── evaluateUrgency ──────────────────────────────────────────────────────
  const evaluateUrgency = useCallback((conversation: InboxConversation): UrgencyReason[] => {
    const reasons: UrgencyReason[] = [];
    const now = new Date();

    if (conversation.messages.length === 1 && conversation.messages[0].direction === 'INBOUND') {
      reasons.push('NEW_CLIENT');
    }

    const lastInbound = [...conversation.messages].reverse().find(m => m.direction === 'INBOUND');
    if (lastInbound) {
      const hours = (now.getTime() - new Date(lastInbound.sentAt).getTime()) / (1000 * 60 * 60);
      const hasResponseAfter = conversation.messages.some(
        m => m.direction === 'OUTBOUND' && new Date(m.sentAt) > new Date(lastInbound.sentAt)
      );
      if (hours >= 2 && !hasResponseAfter) reasons.push('NO_RESPONSE_2H');

      const body = lastInbound.body.toLowerCase();
      if (['cancelar', 'cancel'].some(k => body.includes(k))) reasons.push('KEYWORD_CANCEL');
      if (['devolución', 'devolver', 'no llegó', 'reembolso'].some(k => body.includes(k))) reasons.push('KEYWORD_RETURN');
    }

    return reasons;
  }, []);

  const getConversation = useCallback((id: string) =>
    conversations.find(c => c.id === id), [conversations]);

  // ── sendReply ────────────────────────────────────────────────────────────
  const sendReply = useCallback(async (conversationId: string, body: string, userId: string) => {
    const newMessage = await inboxService.sendMessage(conversationId, body, userId);
    const now = new Date().toISOString();

    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv;
      const updated = { ...conv, messages: [...conv.messages, newMessage], lastMessageAt: now, updatedAt: now };
      const urgencyReasons = evaluateUrgency(updated);
      return { ...updated, isUrgent: urgencyReasons.length > 0, urgencyReasons };
    }));

    audit('INBOX_REPLY_SENT' as any, conversationId, conversationId, { messageLength: body.length, sentBy: userId });
  }, [evaluateUrgency, audit]);

  // ── markAsRead ───────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (conversationId: string) => {
    await inboxService.markAsRead(conversationId);
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, unreadCount: 0, updatedAt: new Date().toISOString() } : c
    ));
  }, []);

  // ── updateStatus ─────────────────────────────────────────────────────────
  const updateStatus = useCallback(async (conversationId: string, status: InboxStatus) => {
    await inboxService.updateConversationStatus(conversationId, status);
    const conv = conversations.find(c => c.id === conversationId);
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, status, updatedAt: new Date().toISOString() } : c
    ));
    audit('INBOX_STATUS_CHANGED' as any, conversationId, conv?.contactName || conversationId, { newStatus: status });
  }, [conversations, audit]);

  // ── assignTo ─────────────────────────────────────────────────────────────
  const assignTo = useCallback(async (conversationId: string, userId: string) => {
    await inboxService.assignConversation(conversationId, userId);
    const conv = conversations.find(c => c.id === conversationId);
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, assignedTo: userId, updatedAt: new Date().toISOString() } : c
    ));
    audit('INBOX_ASSIGNED' as any, conversationId, conv?.contactName || conversationId, { assignedTo: userId });
  }, [conversations, audit]);

  // ── linkToOrder ──────────────────────────────────────────────────────────
  const linkToOrder = useCallback(async (conversationId: string, orderId: string) => {
    await inboxService.linkToOrder(conversationId, orderId);
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, linkedOrderId: orderId, updatedAt: new Date().toISOString() } : c
    ));
  }, []);

  // ── linkToCustomer ───────────────────────────────────────────────────────
  const linkToCustomer = useCallback(async (conversationId: string, customerId: string) => {
    await inboxService.linkToCustomer(conversationId, customerId);
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, linkedCustomerId: customerId, updatedAt: new Date().toISOString() } : c
    ));
  }, []);

  // ── createOrderFromChat ──────────────────────────────────────────────────
  const createOrderFromChat = useCallback(async (conversationId: string, orderData: any) => {
    const newOrderId = await inboxService.createOrderFromChat(conversationId, orderData);
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, linkedOrderId: newOrderId, updatedAt: new Date().toISOString() } : c
    ));
    audit('INBOX_ORDER_CREATED_FROM_CHAT' as any, conversationId, conversationId, { orderId: newOrderId });
  }, [audit]);

  // ── getTotalUnread ───────────────────────────────────────────────────────
  const getTotalUnread = useCallback(() =>
    conversations.reduce((total, conv) => total + conv.unreadCount, 0), [conversations]);

  // ── refreshConversations ─────────────────────────────────────────────────
  const refreshConversations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inboxService.fetchConversations();
      setConversations(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[InboxContext] Error al refrescar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const value: InboxContextValue = {
    conversations, loading, activeConversationId, channelFilter, statusFilter,
    setActiveConversationId, setChannelFilter, setStatusFilter,
    getConversation, sendReply, markAsRead, updateStatus, assignTo,
    linkToOrder, linkToCustomer, createOrderFromChat, getTotalUnread,
    refreshConversations, evaluateUrgency,
  };

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const context = useContext(InboxContext);
  if (!context) throw new Error('useInbox must be used within InboxProvider');
  return context;
}