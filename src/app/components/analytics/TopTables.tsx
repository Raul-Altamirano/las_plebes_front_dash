import { Card } from '../ui/card';
import { TopProduct, TopFavoriteVariant, TopSearchQuery } from '../../utils/analyticsAgg';

interface TopTablesProps {
  topProducts: TopProduct[];
  topFavorites: TopFavoriteVariant[];
  topSearches: TopSearchQuery[];
}

export function TopTables({ topProducts, topFavorites, topSearches }: TopTablesProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Top Products by Clicks */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Productos (Clicks)</h3>
        {topProducts.length === 0 ? (
          <p className="text-sm text-gray-500">No hay datos disponibles</p>
        ) : (
          <div className="space-y-3">
            {topProducts.map((product, idx) => (
              <div key={product.productId} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 w-5">#{idx + 1}</span>
                    <p className="text-sm font-medium text-gray-900 truncate">{product.productName}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-blue-600 ml-2">{product.clicks}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Top Favorites (Net) */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Favoritos (Neto)</h3>
        {topFavorites.length === 0 ? (
          <p className="text-sm text-gray-500">No hay datos disponibles</p>
        ) : (
          <div className="space-y-3">
            {topFavorites.map((fav, idx) => (
              <div key={fav.variantId} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-5">#{idx + 1}</span>
                      <p className="text-sm font-medium text-gray-900 truncate">{fav.productName}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ml-2 ${fav.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fav.net >= 0 ? '+' : ''}{fav.net}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-7 text-xs text-gray-500">
                  <span>{fav.color} / {fav.size}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-green-600">+{fav.adds}</span>
                  <span className="text-red-600">-{fav.removes}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Top Searches */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Búsquedas</h3>
        {topSearches.length === 0 ? (
          <p className="text-sm text-gray-500">No hay datos disponibles</p>
        ) : (
          <div className="space-y-3">
            {topSearches.map((search, idx) => (
              <div key={search.query} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-5">#{idx + 1}</span>
                      <p className="text-sm font-medium text-gray-900 truncate">"{search.query}"</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-purple-600 ml-2">{search.count}</span>
                </div>
                {search.avgResultsCount !== undefined && (
                  <p className="text-xs text-gray-500 ml-7">
                    ~{search.avgResultsCount} resultados promedio
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
