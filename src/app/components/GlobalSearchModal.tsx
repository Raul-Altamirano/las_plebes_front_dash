import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Package,
  ShoppingCart,
  Users,
  RotateCcw,
  X,
  ArrowRight,
} from 'lucide-react';
import { useGlobalSearch, type SearchItem } from '../hooks/useGlobalSearch';
import { useDebounce } from '../hooks/useDebounce';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeIcons = {
  product: Package,
  order: ShoppingCart,
  customer: Users,
  rma: RotateCcw,
};

const typeLabels = {
  product: 'Productos',
  order: 'Pedidos',
  customer: 'Clientes',
  rma: 'RMA',
};

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 250);
  const { results, totals } = useGlobalSearch(debouncedQuery);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleItemClick = (item: SearchItem) => {
    navigate(item.href);
    onClose();
  };

  const handleViewAll = () => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleViewAll();
    }
  };

  // Agrupar resultados para mostrar
  const groupedResults = useMemo(() => {
    const groups: Array<{ type: keyof typeof typeLabels; items: SearchItem[] }> = [];

    if (results.products.length > 0) {
      groups.push({ type: 'product', items: results.products });
    }
    if (results.orders.length > 0) {
      groups.push({ type: 'order', items: results.orders });
    }
    if (results.customers.length > 0) {
      groups.push({ type: 'customer', items: results.customers });
    }
    if (results.rmas.length > 0) {
      groups.push({ type: 'rma', items: results.rmas });
    }

    return groups;
  }, [results]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar productos, pedidos, clientes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleEnter}
            className="flex-1 bg-transparent border-none outline-none text-base text-gray-900 placeholder-gray-400"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query.trim() && (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Escribe para buscar productos, pedidos, clientes o RMAs</p>
              <p className="text-xs text-gray-400 mt-2">Usa SKU, nombre, teléfono, número de pedido...</p>
            </div>
          )}

          {query.trim() && totals.all === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">No se encontraron resultados para "{query}"</p>
              <p className="text-xs text-gray-400 mt-2">
                Intenta con SKU, nombre del producto, número de pedido, teléfono...
              </p>
            </div>
          )}

          {query.trim() && totals.all > 0 && (
            <div className="py-2">
              {groupedResults.map((group) => {
                const Icon = typeIcons[group.type];
                return (
                  <div key={group.type} className="mb-4">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      {typeLabels[group.type]} ({group.items.length})
                    </div>
                    <div>
                      {group.items.map((item) => {
                        const ItemIcon = typeIcons[item.type];
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <ItemIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">{item.title}</div>
                              <div className="text-sm text-gray-500 truncate">{item.subtitle}</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Ver Todos */}
        {query.trim() && totals.all > 0 && (
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
            <button
              onClick={handleViewAll}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              Ver todos los resultados ({totals.all})
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer Hint - Keyboard Shortcuts */}
        {!query.trim() && (
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs">Enter</kbd>
                  Ver todos
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs">ESC</kbd>
                  Cerrar
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}