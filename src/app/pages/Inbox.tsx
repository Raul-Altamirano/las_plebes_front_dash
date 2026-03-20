import { useState, useMemo, useEffect } from 'react';
import { 
  MessageSquare, Search, Send, Package, User, 
  Check, Archive, AlertTriangle, Clock, X,
  MessageCircle, Facebook, Instagram, Phone, FileText,
  ChevronDown, Link as LinkIcon, Plus
} from 'lucide-react';
import { useInbox } from '../store/InboxContext';
import { useAuth } from '../store/AuthContext';
import { useOrders } from '../store/OrdersContext';
import { 
  InboxChannel, 
  InboxStatus, 
  INBOX_CHANNEL_LABELS, 
  INBOX_STATUS_LABELS,
  INBOX_STATUS_COLORS,
  INBOX_CHANNEL_COLORS,
  URGENCY_REASON_LABELS,
  InboxConversation 
} from '../types/inbox';
import { formatRelativeTime } from '../utils/auditHelpers';

// Íconos por canal
const CHANNEL_ICONS: Record<InboxChannel, any> = {
  WHATSAPP: MessageCircle,
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
  STOREFRONT_FORM: FileText,
};

// Emojis por canal para el sidebar
const CHANNEL_EMOJIS: Record<InboxChannel, string> = {
  WHATSAPP: '🟢',
  FACEBOOK: '📘',
  INSTAGRAM: '📷',
  STOREFRONT_FORM: '📝',
};

export function Inbox() {
  const {
    conversations,
    loading,
    activeConversationId,
    channelFilter,
    statusFilter,
    setActiveConversationId,
    setChannelFilter,
    setStatusFilter,
    sendReply,
    markAsRead,
    updateStatus,
    assignTo,
    linkToOrder,
    getTotalUnread,
    evaluateUrgency,
  } = useInbox();

  const { currentUser } = useAuth();
  const { orders } = useOrders();

  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showLinkOrderModal, setShowLinkOrderModal] = useState(false);
  const [linkOrderId, setLinkOrderId] = useState('');

  // Filtrar conversaciones
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Filtro por canal
    if (channelFilter !== 'ALL') {
      filtered = filtered.filter(c => c.channel === channelFilter);
    }

    // Filtro por estado
    if (statusFilter === 'URGENT') {
      filtered = filtered.filter(c => c.isUrgent && c.status === 'OPEN');
    } else if (statusFilter !== 'ALL') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.contactName.toLowerCase().includes(query) ||
        c.messages.some(m => m.body.toLowerCase().includes(query))
      );
    }

    // Ordenar: urgentes primero, luego por último mensaje
    return filtered.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  }, [conversations, channelFilter, statusFilter, searchQuery]);

  // Conversación activa
  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  // Marcar como leído cuando se selecciona una conversación
  useEffect(() => {
    if (activeConversationId && activeConversation && activeConversation.unreadCount > 0) {
      markAsRead(activeConversationId);
    }
  }, [activeConversationId, activeConversation, markAsRead]);

  // Contadores para sidebar
  const sidebarCounts = useMemo(() => {
    return {
      all: conversations.filter(c => c.unreadCount > 0).length,
      whatsapp: conversations.filter(c => c.channel === 'WHATSAPP' && c.unreadCount > 0).length,
      facebook: conversations.filter(c => c.channel === 'FACEBOOK' && c.unreadCount > 0).length,
      instagram: conversations.filter(c => c.channel === 'INSTAGRAM' && c.unreadCount > 0).length,
      form: conversations.filter(c => c.channel === 'STOREFRONT_FORM' && c.unreadCount > 0).length,
      urgent: conversations.filter(c => c.isUrgent && c.status === 'OPEN').length,
      resolved: conversations.filter(c => c.status === 'RESOLVED').length,
      archived: conversations.filter(c => c.status === 'ARCHIVED').length,
    };
  }, [conversations]);

  // Handler para enviar respuesta
  const handleSendReply = async () => {
    if (!replyText.trim() || !activeConversationId || !currentUser) return;

    setSending(true);
    try {
      await sendReply(activeConversationId, replyText.trim(), currentUser.id);
      setReplyText('');
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSending(false);
    }
  };

  // Handler para vincular pedido
  const handleLinkOrder = async () => {
    if (!linkOrderId.trim() || !activeConversationId) return;

    try {
      await linkToOrder(activeConversationId, linkOrderId.trim());
      setShowLinkOrderModal(false);
      setLinkOrderId('');
    } catch (error) {
      console.error('Error linking order:', error);
    }
  };

  // Handler para actualizar estado
  const handleUpdateStatus = async (status: InboxStatus) => {
    if (!activeConversationId) return;

    try {
      await updateStatus(activeConversationId, status);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando conversaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-gray-50">
      {/* Columna 1: Sidebar de canales */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Todos */}
          <button
            onClick={() => {
              setChannelFilter('ALL');
              setStatusFilter('ALL');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              channelFilter === 'ALL' && statusFilter === 'ALL'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>📥</span>
              <span>Todos</span>
            </div>
            {sidebarCounts.all > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs">
                {sidebarCounts.all}
              </span>
            )}
          </button>

          {/* WhatsApp */}
          <button
            onClick={() => {
              setChannelFilter('WHATSAPP');
              setStatusFilter('ALL');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              channelFilter === 'WHATSAPP'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{CHANNEL_EMOJIS.WHATSAPP}</span>
              <span>WhatsApp</span>
            </div>
            {sidebarCounts.whatsapp > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-green-600 text-white text-xs">
                {sidebarCounts.whatsapp}
              </span>
            )}
          </button>

          {/* Facebook */}
          <button
            onClick={() => {
              setChannelFilter('FACEBOOK');
              setStatusFilter('ALL');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              channelFilter === 'FACEBOOK'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{CHANNEL_EMOJIS.FACEBOOK}</span>
              <span>Facebook</span>
            </div>
            {sidebarCounts.facebook > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs">
                {sidebarCounts.facebook}
              </span>
            )}
          </button>

          {/* Instagram */}
          <button
            onClick={() => {
              setChannelFilter('INSTAGRAM');
              setStatusFilter('ALL');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              channelFilter === 'INSTAGRAM'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{CHANNEL_EMOJIS.INSTAGRAM}</span>
              <span>Instagram</span>
            </div>
            {sidebarCounts.instagram > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-pink-600 text-white text-xs">
                {sidebarCounts.instagram}
              </span>
            )}
          </button>

          {/* Formulario */}
          <button
            onClick={() => {
              setChannelFilter('STOREFRONT_FORM');
              setStatusFilter('ALL');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              channelFilter === 'STOREFRONT_FORM'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{CHANNEL_EMOJIS.STOREFRONT_FORM}</span>
              <span>Formulario</span>
            </div>
            {sidebarCounts.form > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-gray-600 text-white text-xs">
                {sidebarCounts.form}
              </span>
            )}
          </button>

          <div className="border-t border-gray-200 my-2"></div>

          {/* Urgentes */}
          <button
            onClick={() => {
              setChannelFilter('ALL');
              setStatusFilter('URGENT');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'URGENT'
                ? 'bg-red-50 text-red-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>🚨</span>
              <span>Urgentes</span>
            </div>
            {sidebarCounts.urgent > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs">
                {sidebarCounts.urgent}
              </span>
            )}
          </button>

          {/* Resueltos */}
          <button
            onClick={() => {
              setChannelFilter('ALL');
              setStatusFilter('RESOLVED');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'RESOLVED'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Resueltos</span>
            </div>
            <span className="text-xs text-gray-500">{sidebarCounts.resolved}</span>
          </button>

          {/* Archivados */}
          <button
            onClick={() => {
              setChannelFilter('ALL');
              setStatusFilter('ARCHIVED');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'ARCHIVED'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4" />
              <span>Archivados</span>
            </div>
            <span className="text-xs text-gray-500">{sidebarCounts.archived}</span>
          </button>
        </nav>
      </div>

      {/* Columna 2: Lista de conversaciones */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header con buscador */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Lista de conversaciones */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No hay conversaciones</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredConversations.map((conv) => {
                const lastMessage = conv.messages[conv.messages.length - 1];
                const ChannelIcon = CHANNEL_ICONS[conv.channel];
                
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors relative ${
                      activeConversationId === conv.id ? 'bg-blue-50' : ''
                    } ${conv.isUrgent ? 'border-l-4 border-red-500' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar con ícono de canal */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                          {conv.contactName.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center ${INBOX_CHANNEL_COLORS[conv.channel]}`}>
                          <ChannelIcon className="w-3 h-3" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-900 truncate">
                            {conv.contactName}
                          </h4>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatRelativeTime(conv.lastMessageAt)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 truncate mb-1">
                          {lastMessage.body}
                        </p>

                        <div className="flex items-center gap-2">
                          {conv.isUrgent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                              🚨 Urgente
                            </span>
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-medium">
                              {conv.unreadCount}
                            </span>
                          )}
                          {conv.linkedOrderId && (
                            <Package className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Columna 3: Conversación activa */}
      {!activeConversation ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-400">
            <MessageSquare className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg">Selecciona una conversación para responder</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white">
          {/* Header de conversación */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                  {activeConversation.contactName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{activeConversation.contactName}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{INBOX_CHANNEL_LABELS[activeConversation.channel]}</span>
                    <span>•</span>
                    <span className={`px-2 py-0.5 rounded-full ${INBOX_STATUS_COLORS[activeConversation.status]}`}>
                      {INBOX_STATUS_LABELS[activeConversation.status]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeConversation.status === 'OPEN' && (
                  <button
                    onClick={() => handleUpdateStatus('RESOLVED')}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Resolver
                  </button>
                )}
                <button
                  onClick={() => handleUpdateStatus('ARCHIVED')}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1"
                >
                  <Archive className="w-4 h-4" />
                  Archivar
                </button>
              </div>
            </div>

            {/* Banner de urgencia */}
            {activeConversation.isUrgent && activeConversation.urgencyReasons.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Conversación urgente</p>
                    <p className="text-xs text-red-700 mt-1">
                      {activeConversation.urgencyReasons.map(reason => URGENCY_REASON_LABELS[reason]).join(' · ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Panel de información (vinculación de pedido) */}
            {activeConversation.linkedOrderId && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-900">
                    Vinculado a pedido:{' '}
                    <button className="font-medium hover:underline">
                      {activeConversation.linkedOrderId}
                    </button>
                  </span>
                </div>
              </div>
            )}

            {!activeConversation.linkedOrderId && (
              <div className="mt-3">
                <button
                  onClick={() => setShowLinkOrderModal(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <LinkIcon className="w-4 h-4" />
                  Vincular pedido
                </button>
              </div>
            )}
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeConversation.messages.map((message, index) => {
              const isInbound = message.direction === 'INBOUND';
              const isFirstInbound = index === 0 && isInbound;
              const ChannelIcon = CHANNEL_ICONS[activeConversation.channel];

              return (
                <div
                  key={message.id}
                  className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[70%] ${isInbound ? 'items-start' : 'items-end'} flex flex-col`}>
                    {isFirstInbound && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <ChannelIcon className={`w-3 h-3 ${INBOX_CHANNEL_COLORS[activeConversation.channel]}`} />
                        <span>Mensaje desde {INBOX_CHANNEL_LABELS[activeConversation.channel]}</span>
                      </div>
                    )}
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isInbound
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                    </div>
                    <span className="text-xs text-gray-500 mt-1">
                      {formatRelativeTime(message.sentAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer de respuesta */}
          <div className="border-t border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-2">
              Responderá vía {INBOX_CHANNEL_LABELS[activeConversation.channel]}
            </div>
            <div className="flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder="Escribe una respuesta..."
                rows={3}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim() || sending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de vincular pedido */}
      {showLinkOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Vincular pedido</h3>
              <button
                onClick={() => {
                  setShowLinkOrderModal(false);
                  setLinkOrderId('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID del pedido
                </label>
                <input
                  type="text"
                  value={linkOrderId}
                  onChange={(e) => setLinkOrderId(e.target.value)}
                  placeholder="ORD-2026-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowLinkOrderModal(false);
                    setLinkOrderId('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLinkOrder}
                  disabled={!linkOrderId.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Vincular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
