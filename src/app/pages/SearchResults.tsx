import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Search,
  Package,
  ShoppingCart,
  Users,
  RotateCcw,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useGlobalSearch, SearchItem } from '../hooks/useGlobalSearch';

type FilterType = 'all' | 'product' | 'order' | 'customer' | 'rma';

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

const filterLabels: Record<FilterType, string> = {
  all: 'Todos',
  product: 'Productos',
  order: 'Pedidos',
  customer: 'Clientes',
  rma: 'RMA',
};

export function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { results, totals } = useGlobalSearch(query);
  const navigate = useNavigate();

  // Filtrar resultados según el filtro activo
  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') {
      return [
        ...results.products,
        ...results.orders,
        ...results.customers,
        ...results.rmas,
      ];
    }
    
    // Mapear el tipo de filtro al resultado correcto
    const filterMap: Record<Exclude<FilterType, 'all'>, keyof typeof results> = {
      product: 'products',
      order: 'orders',
      customer: 'customers',
      rma: 'rmas',
    };
    
    return results[filterMap[activeFilter as Exclude<FilterType, 'all'>]] || [];
  }, [activeFilter, results]);

  const handleItemClick = (item: SearchItem) => {
    navigate(item.href);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Search className="w-6 h-6 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900">
            Resultados para "{query}"
          </h1>
        </div>
        <p className="text-sm text-gray-500">
          {totals.all === 0 && 'No se encontraron resultados'}
          {totals.all === 1 && '1 resultado encontrado'}
          {totals.all > 1 && `${totals.all} resultados encontrados`}
        </p>
      </div>

      {/* Filtros por Tipo */}
      {totals.all > 0 && (
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 mr-1" />
          {(Object.keys(filterLabels) as FilterType[]).map((filter) => {
            let count = 0;
            
            if (filter === 'all') {
              count = totals.all;
            } else if (filter === 'product') {
              count = totals.products;
            } else if (filter === 'order') {
              count = totals.orders;
            } else if (filter === 'customer') {
              count = totals.customers;
            } else if (filter === 'rma') {
              count = totals.rmas;
            }

            if (filter !== 'all' && count === 0) return null;

            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {filterLabels[filter]} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Resultados */}
      {totals.all === 0 && query && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se encontraron resultados
          </h3>
          <p className="text-gray-500 mb-4">
            No hay coincidencias para "{query}"
          </p>
          <div className="text-sm text-gray-400">
            <p className="mb-2">Intenta buscar por:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Nombre del producto o SKU</li>
              <li>Número de pedido</li>
              <li>Nombre del cliente o teléfono</li>
              <li>Número de RMA</li>
            </ul>
          </div>
        </div>
      )}

      {filteredResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {filteredResults.map((item) => {
            const Icon = typeIcons[item.type];
            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => handleItemClick(item)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {typeLabels[item.type]}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900 mb-1 truncate">
                    {item.title}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {item.subtitle}
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Info adicional si hay muchos resultados */}
      {filteredResults.length >= 10 && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> Se muestran los primeros 10 resultados de cada categoría.
            Refina tu búsqueda para ver resultados más específicos.
          </p>
        </div>
      )}
    </div>
  );
}