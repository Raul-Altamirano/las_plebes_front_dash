import { FileQuestion, X } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  showClearFilters?: boolean;
  onClearFilters?: () => void;
}

export function EmptyState({
  title = 'No se encontraron resultados',
  description = 'No hay productos que coincidan con los filtros seleccionados.',
  showClearFilters = true,
  onClearFilters
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-12">
      <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FileQuestion className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{description}</p>
        {showClearFilters && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
