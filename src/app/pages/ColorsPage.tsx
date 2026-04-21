// src/app/pages/ColorsPage.tsx
import { useState, useRef, useCallback } from 'react';
import { useColors } from '../store/ColorsContext';
import type { Color, ColorFormData } from '../types/color.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const contrastText = (hex: string): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1a1a1a' : '#ffffff';
};

const normalizeHex = (val: string): string =>
  val.startsWith('#') ? val : `#${val}`;

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}

const EMPTY_FORM: ColorFormData = { name: '', hex: '#6B4C3B' };

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ColorModalProps {
  open: boolean;
  initial?: Color | null;
  onClose: () => void;
  onSave: (data: ColorFormData, id?: string) => Promise<void>;
  saving: boolean;
}

const ColorModal = ({ open, initial, onClose, onSave, saving }: ColorModalProps) => {
  const [form, setForm] = useState<ColorFormData>(EMPTY_FORM);
  const nameRef = useRef<HTMLInputElement>(null);

  useState(() => {
    if (open) {
      setForm(initial ? { name: initial.name, hex: initial.hex } : EMPTY_FORM);
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.hex) return;
    onSave(
      { name: form.name.trim(), hex: normalizeHex(form.hex) },
      initial?.id
    );
  };

  const swatchStyle: React.CSSProperties = {
    backgroundColor: normalizeHex(form.hex),
    color: contrastText(normalizeHex(form.hex)),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div
          className="h-24 flex items-center justify-center transition-colors duration-200"
          style={swatchStyle}
        >
          <span className="text-2xl font-bold tracking-wide opacity-90">
            {form.name || 'Nombre del color'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-800">
            {initial ? 'Editar color' : 'Nuevo color'}
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="ej. Cognac, Negro, Miel"
              maxLength={40}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <label
                className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer
                           overflow-hidden shadow-sm flex-shrink-0"
                title="Abrir selector de color"
              >
                <input
                  type="color"
                  value={normalizeHex(form.hex)}
                  onChange={(e) => setForm((f) => ({ ...f, hex: e.target.value }))}
                  className="w-full h-full cursor-pointer border-0 p-0 opacity-0 absolute"
                  style={{ width: 40, height: 40 }}
                />
                <div
                  className="w-full h-full"
                  style={{ backgroundColor: normalizeHex(form.hex) }}
                />
              </label>
              <input
                type="text"
                value={form.hex}
                onChange={(e) => setForm((f) => ({ ...f, hex: e.target.value }))}
                placeholder="#6B4C3B"
                maxLength={7}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono
                           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          {form.name && (
            <p className="text-xs text-gray-400">
              slug:{' '}
              <span className="font-mono text-gray-500">
                {form.name
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '')}
              </span>
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium
                         text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex-1 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium
                         hover:bg-amber-700 transition-colors disabled:opacity-50
                         flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Guardando...
                </>
              ) : (
                initial ? 'Actualizar' : 'Crear color'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Skeleton card ────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
    <div className="h-28 bg-gray-200" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
    </div>
  </div>
);

// ─── Color card ───────────────────────────────────────────────────────────────

interface ColorCardProps {
  color: Color;
  onEdit: (c: Color) => void;
  onDelete: (c: Color) => void;
  confirmDeleteId: string | null;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  deleting: boolean;
}

const ColorCard = ({
  color,
  onEdit,
  onDelete,
  confirmDeleteId,
  onConfirmDelete,
  onCancelDelete,
  deleting,
}: ColorCardProps) => {
  const isConfirming = confirmDeleteId === color.id;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm
                    hover:shadow-md transition-shadow group">
      <div className="h-28 relative" style={{ backgroundColor: color.hex }}>
        <span
          className="absolute bottom-2 right-2 text-xs font-mono px-2 py-0.5 rounded-full
                     bg-black/20 backdrop-blur-sm"
          style={{ color: contrastText(color.hex) }}
        >
          {color.hex.toUpperCase()}
        </span>

        {!isConfirming && (
          <div className="absolute inset-0 flex items-center justify-center gap-2
                          opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <button
              onClick={() => onEdit(color)}
              className="bg-white text-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium
                         hover:bg-gray-100 transition-colors shadow"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(color)}
              className="bg-white text-red-600 rounded-lg px-3 py-1.5 text-xs font-medium
                         hover:bg-red-50 transition-colors shadow"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        {isConfirming ? (
          <div className="space-y-2">
            <p className="text-xs text-red-600 font-medium">¿Eliminar este color?</p>
            <p className="text-xs text-gray-400">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button
                onClick={onCancelDelete}
                disabled={deleting}
                className="flex-1 text-xs py-1.5 rounded-md border border-gray-300
                           text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => onConfirmDelete(color.id)}
                disabled={deleting}
                className="flex-1 text-xs py-1.5 rounded-md bg-red-600 text-white
                           hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? '...' : 'Eliminar'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-800 truncate">{color.name}</p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{color.slug}</p>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const ColorsPage = () => {
  const { colors, status, createColor, updateColor, deleteColor } = useColors();

  const [modalOpen, setModalOpen]             = useState(false);
  const [editingColor, setEditingColor]       = useState<Color | null>(null);
  const [saving, setSaving]                   = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting]               = useState(false);
  const [toast, setToast]                     = useState<ToastState>({
    message: '', type: 'success', visible: false,
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastState['type']) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type, visible: true });
    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      3200
    );
  }, []);

  const handleSave = async (formData: ColorFormData, id?: string) => {
    setSaving(true);
    try {
      if (id) {
        await updateColor(id, formData);
        showToast('Color actualizado', 'success');
      } else {
        await createColor(formData);
        showToast('Color creado', 'success');
      }
      setModalOpen(false);
      setEditingColor(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deleteColor(id);
      setConfirmDeleteId(null);
      showToast('Color eliminado', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar';
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => { setEditingColor(null); setModalOpen(true); };
  const openEdit   = (c: Color) => { setEditingColor(c); setModalOpen(true); };

  const loading = status === 'idle' || status === 'loading';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Toast ── */}
      <div
        className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
                    text-sm font-medium transition-all duration-300
                    ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}
                    ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
      >
        {toast.type === 'success' ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {toast.message}
      </div>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Colores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Catálogo de colores disponibles para variantes de productos
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white
                     text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo color
        </button>
      </div>

      {/* ── Body ── */}
      <div className="p-6">
        {!loading && colors.length > 0 && (
          <p className="text-sm text-gray-500 mb-5">
            {colors.length} {colors.length === 1 ? 'color' : 'colores'} en el catálogo
          </p>
        )}

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && colors.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center">
              <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0
                         0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2
                         0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-gray-800 font-semibold text-lg">Sin colores aún</p>
              <p className="text-gray-400 text-sm mt-1">
                Crea tu primer color para usarlo en las variantes de tus productos
              </p>
            </div>
            <button
              onClick={openCreate}
              className="mt-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium
                         px-5 py-2.5 rounded-xl transition-colors"
            >
              Crear primer color
            </button>
          </div>
        )}

        {!loading && colors.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {colors.map((color) => (
              <ColorCard
                key={color.id}
                color={color}
                onEdit={openEdit}
                onDelete={(c) => setConfirmDeleteId(c.id)}
                confirmDeleteId={confirmDeleteId}
                onConfirmDelete={handleConfirmDelete}
                onCancelDelete={() => setConfirmDeleteId(null)}
                deleting={deleting}
              />
            ))}
          </div>
        )}
      </div>

      <ColorModal
        open={modalOpen}
        initial={editingColor}
        onClose={() => { setModalOpen(false); setEditingColor(null); }}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
};

export default ColorsPage;