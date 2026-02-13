import { X, Pause, CheckCircle, Archive } from 'lucide-react';
import { useAuth } from '../store/AuthContext';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onPause: () => void;
  onActivate: () => void;
  onArchive: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClear,
  onPause,
  onActivate,
  onArchive,
}: BulkActionsBarProps) {
  const { hasPermission } = useAuth();

  const canPublish = hasPermission('product:publish');
  const canDelete = hasPermission('product:delete');

  return (
    <div className="sticky top-0 z-10 bg-blue-50 border-b border-blue-200 px-4 py-3 mb-4 rounded-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-blue-900">
            {selectedCount} {selectedCount === 1 ? 'producto seleccionado' : 'productos seleccionados'}
          </span>
          <button
            onClick={onClear}
            className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded"
            title="Limpiar selección"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPause}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Pause className="w-4 h-4" />
            Pausar
          </button>

          {canPublish ? (
            <button
              onClick={onActivate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Activar
            </button>
          ) : (
            <div className="relative group">
              <button
                disabled
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                Activar
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Sin permiso
              </div>
            </div>
          )}

          {canDelete ? (
            <button
              onClick={onArchive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              <Archive className="w-4 h-4" />
              Archivar
            </button>
          ) : (
            <div className="relative group">
              <button
                disabled
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
              >
                <Archive className="w-4 h-4" />
                Archivar
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Sin permiso
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
