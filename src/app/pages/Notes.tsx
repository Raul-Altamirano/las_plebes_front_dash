import React, { useState, useMemo } from "react";
import {
  StickyNote,
  Plus,
  Edit2,
  Archive,
  Trash2,
  ShoppingCart,
  RefreshCw,
  Tag,
  Filter,
  X,
  Download,
} from "lucide-react";
import { RequirePermission } from "../components/RequirePermission";
import { NoteForm } from "../components/NoteForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useNotes } from "../store/NotesContext";
import { useOrders } from "../store/OrdersContext";
import { useRMA } from "../store/RMAContext";
import {
  Note,
  NotePriority,
  NoteStatus,
  NOTE_PRIORITY_LABELS,
  NOTE_STATUS_LABELS,
  NOTE_PRIORITY_COLORS,
  NOTE_STATUS_COLORS,
} from "../types/note";
import { exportToCSV } from "../utils/csvExport";

export function Notes() {
  const { notes, deleteNote, updateNote } = useNotes();
  const { orders } = useOrders();
  const { rmas } = useRMA();

  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>();
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [statusFilter, setStatusFilter] = useState<NoteStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<NotePriority | "ALL">(
    "ALL",
  );
  const [tagFilter, setTagFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    notes.forEach((note) => note.tags.forEach((tag) => tagsSet.add(tag)));
    return Array.from(tagsSet).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (statusFilter !== "ALL" && note.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && note.priority !== priorityFilter)
        return false;
      if (tagFilter && !note.tags.includes(tagFilter)) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          note.title.toLowerCase().includes(term) ||
          note.body.toLowerCase().includes(term) ||
          note.tags.some((tag) => tag.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [notes, statusFilter, priorityFilter, tagFilter, searchTerm]);

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setShowForm(true);
  };
  const handleArchive = (note: Note) => {
    updateNote(note.id, { status: "ARCHIVED" });
  };
  const handleDelete = () => {
    if (noteToDelete) {
      deleteNote(noteToDelete.id);
      setNoteToDelete(null);
    }
  };
  const handleCreateNew = () => {
    setEditingNote(undefined);
    setShowForm(true);
  };
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingNote(undefined);
  };

  const handleExportCSV = () => {
    exportToCSV(
      filteredNotes.map((note) => ({
        ID: note.id,
        Título: note.title,
        Descripción: note.body,
        Prioridad: NOTE_PRIORITY_LABELS[note.priority],
        Estado: NOTE_STATUS_LABELS[note.status],
        Etiquetas: note.tags.join(", "),
        "Pedidos vinculados": note.linkedOrderIds.length,
        "RMAs vinculados": note.linkedRmaIds.length,
        "Creado por": note.createdBy,
        "Fecha creación": new Date(note.createdAt).toLocaleString("es-MX"),
        "Última actualización": new Date(note.updatedAt).toLocaleString(
          "es-MX",
        ),
      })),
      "notas",
    );
  };

  const clearFilters = () => {
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setTagFilter("");
    setSearchTerm("");
  };
  const hasActiveFilters =
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    !!tagFilter ||
    !!searchTerm;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          Notas / Tickets Operativos
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <RequirePermission permission="notes:create">
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva nota</span>
            </button>
          </RequirePermission>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Filtros</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Título, descripción o etiquetas..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as NoteStatus | "ALL")
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Todos</option>
              {Object.entries(NOTE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prioridad
            </label>
            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as NotePriority | "ALL")
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">Todas</option>
              {Object.entries(NOTE_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Etiqueta
            </label>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contador */}
      <p className="text-sm text-gray-600">
        Mostrando {filteredNotes.length}{" "}
        {filteredNotes.length === 1 ? "nota" : "notas"}
        {hasActiveFilters && ` de ${notes.length} total`}
      </p>

      {/* Listado */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <StickyNote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasActiveFilters
              ? "No hay notas que coincidan"
              : "No hay notas aún"}
          </h3>
          <p className="text-gray-500 mb-4">
            {hasActiveFilters
              ? "Intenta ajustar los filtros"
              : "Crea tu primera nota para comenzar"}
          </p>
          {!hasActiveFilters && (
            <RequirePermission permission="notes:create">
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Nueva nota
              </button>
            </RequirePermission>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const linkedOrders = note.linkedOrderIds
              .map((id) => orders.find((o) => o.id === id))
              .filter(Boolean);
            const linkedRmas = note.linkedRmaIds
              .map((id) => rmas.find((r) => r.id === id))
              .filter(Boolean);

            return (
              <div
                key={note.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate mb-2">
                      {note.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${NOTE_PRIORITY_COLORS[note.priority]}`}
                      >
                        {NOTE_PRIORITY_LABELS[note.priority]}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${NOTE_STATUS_COLORS[note.status]}`}
                      >
                        {NOTE_STATUS_LABELS[note.status]}
                      </span>
                    </div>
                  </div>
                </div>

                {note.body && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                    {note.body}
                  </p>
                )}

                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {(linkedOrders.length > 0 || linkedRmas.length > 0) && (
                  <div className="flex gap-3 mb-3 text-xs text-gray-600">
                    {linkedOrders.length > 0 && (
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3" />
                        <span>
                          {linkedOrders.length} pedido
                          {linkedOrders.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    {linkedRmas.length > 0 && (
                      <div className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        <span>
                          {linkedRmas.length} RMA
                          {linkedRmas.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500 mb-3">
                  {new Date(note.updatedAt).toLocaleDateString("es-MX")}
                </p>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <RequirePermission permission="notes:update">
                    <button
                      onClick={() => handleEdit(note)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                      Editar
                    </button>
                  </RequirePermission>

                  {note.status !== "ARCHIVED" && (
                    <RequirePermission permission="notes:update">
                      <button
                        onClick={() => handleArchive(note)}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                      >
                        <Archive className="w-3 h-3" />
                        Archivar
                      </button>
                    </RequirePermission>
                  )}

                  <RequirePermission permission="notes:delete">
                    <button
                      onClick={() => setNoteToDelete(note)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />
                      Eliminar
                    </button>
                  </RequirePermission>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      {showForm && (
        <NoteForm
          note={editingNote}
          onClose={handleCloseForm}
          onSuccess={() => {}}
        />
      )}

      {noteToDelete && (
        <ConfirmDialog
          isOpen={!!noteToDelete}
          title="Eliminar nota"
          message={`¿Estás seguro de que deseas eliminar la nota "${noteToDelete.title}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setNoteToDelete(null)}
        />
      )}
    </div>
  );
}
