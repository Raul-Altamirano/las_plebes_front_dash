import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Note, NotePriority, NoteStatus, NOTE_PRIORITY_LABELS, NOTE_STATUS_LABELS } from '../types/note';
import { useNotes } from '../store/NotesContext';
import { useAuth } from '../store/AuthContext';
import { useOrders } from '../store/OrdersContext';
import { useRMA } from '../store/RMAContext';

interface NoteFormProps {
  note?: Note; // Si se pasa, es modo edición
  prelinkedOrderId?: string;
  prelinkedRmaId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NoteForm({ note, prelinkedOrderId, prelinkedRmaId, onClose, onSuccess }: NoteFormProps) {
  const { createNote, updateNote } = useNotes();
const { currentUser } = useAuth();
  const { orders } = useOrders();
  const { rmas } = useRMA();

  const [title, setTitle] = useState(note?.title || '');
  const [body, setBody] = useState(note?.body || '');
  const [priority, setPriority] = useState<NotePriority>(note?.priority || 'MEDIUM');
  const [status, setStatus] = useState<NoteStatus>(note?.status || 'OPEN');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [linkedOrderIds, setLinkedOrderIds] = useState<string[]>(
    note?.linkedOrderIds || (prelinkedOrderId ? [prelinkedOrderId] : [])
  );
  const [linkedRmaIds, setLinkedRmaIds] = useState<string[]>(
    note?.linkedRmaIds || (prelinkedRmaId ? [prelinkedRmaId] : [])
  );
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [rmaSearchTerm, setRmaSearchTerm] = useState('');

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('El título es requerido');
      return;
    }

    if (note) {
      // Modo edición
      updateNote(note.id, {
        title,
        body,
        priority,
        status,
        tags,
        linkedOrderIds,
        linkedRmaIds,
      });
    } else {
      // Modo creación
      createNote({
        title,
        body,
        priority,
        status,
        tags,
        linkedOrderIds,
        linkedRmaIds,
        createdBy: currentUser?.id || 'unknown',
      });
    }

    onSuccess?.();
    onClose();
  };

  // Filtrar pedidos para búsqueda
  const filteredOrders = orders.filter(order => 
    order.orderNumber.toLowerCase().includes(orderSearchTerm.toLowerCase())
  ).slice(0, 5);

  // Filtrar RMAs para búsqueda
  const filteredRmas = rmas.filter(rma => 
    rma.rmaNumber.toLowerCase().includes(rmaSearchTerm.toLowerCase())
  ).slice(0, 5);

  const toggleOrderLink = (orderId: string) => {
    if (linkedOrderIds.includes(orderId)) {
      setLinkedOrderIds(linkedOrderIds.filter(id => id !== orderId));
    } else {
      setLinkedOrderIds([...linkedOrderIds, orderId]);
    }
  };

  const toggleRmaLink = (rmaId: string) => {
    if (linkedRmaIds.includes(rmaId)) {
      setLinkedRmaIds(linkedRmaIds.filter(id => id !== rmaId));
    } else {
      setLinkedRmaIds([...linkedRmaIds, rmaId]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {note ? 'Editar Nota' : 'Nueva Nota'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Seguimiento pedido cliente VIP"
              required
            />
          </div>

          {/* Prioridad y Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as NotePriority)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(NOTE_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as NoteStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(NOTE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cuerpo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Detalles de la nota..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Etiquetas
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Escribe una etiqueta y presiona Enter"
            />
            <p className="text-xs text-gray-500 mt-1">Presiona Enter para agregar</p>
          </div>

          {/* Pedidos vinculados */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pedidos vinculados
            </label>
            {linkedOrderIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {linkedOrderIds.map(orderId => {
                  const order = orders.find(o => o.id === orderId);
                  return order ? (
                    <span
                      key={orderId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-sm rounded"
                    >
                      {order.orderNumber}
                      <button
                        type="button"
                        onClick={() => toggleOrderLink(orderId)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <input
              type="text"
              value={orderSearchTerm}
              onChange={(e) => setOrderSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Buscar pedido por número..."
            />
            {orderSearchTerm && filteredOrders.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                {filteredOrders.map(order => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => {
                      toggleOrderLink(order.id);
                      setOrderSearchTerm('');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="text-sm">{order.orderNumber}</span>
                    {linkedOrderIds.includes(order.id) && (
                      <span className="text-xs text-green-600">✓ Vinculado</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RMAs vinculados */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RMAs vinculados
            </label>
            {linkedRmaIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {linkedRmaIds.map(rmaId => {
                  const rma = rmas.find(r => r.id === rmaId);
                  return rma ? (
                    <span
                      key={rmaId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded"
                    >
                      {rma.rmaNumber}
                      <button
                        type="button"
                        onClick={() => toggleRmaLink(rmaId)}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <input
              type="text"
              value={rmaSearchTerm}
              onChange={(e) => setRmaSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Buscar RMA por número..."
            />
            {rmaSearchTerm && filteredRmas.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                {filteredRmas.map(rma => (
                  <button
                    key={rma.id}
                    type="button"
                    onClick={() => {
                      toggleRmaLink(rma.id);
                      setRmaSearchTerm('');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="text-sm">{rma.rmaNumber}</span>
                    {linkedRmaIds.includes(rma.id) && (
                      <span className="text-xs text-purple-600">✓ Vinculado</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {note ? 'Guardar cambios' : 'Crear nota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
