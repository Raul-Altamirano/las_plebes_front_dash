import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { Link } from 'react-router';

interface FailedProduct {
  id: string;
  name: string;
  sku: string;
  reasons: string[];
}

interface BulkPublishResultModalProps {
  isOpen: boolean;
  successCount: number;
  failedProducts: FailedProduct[];
  onClose: () => void;
}

export function BulkPublishResultModal({ 
  isOpen, 
  successCount, 
  failedProducts, 
  onClose 
}: BulkPublishResultModalProps) {
  if (!isOpen) return null;

  const failedCount = failedProducts.length;
  const hasSuccess = successCount > 0;
  const hasFailures = failedCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-lg font-semibold text-gray-900">
            Resultado de publicación masiva
          </h3>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Success Summary */}
          {hasSuccess && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  {successCount} {successCount === 1 ? 'producto publicado' : 'productos publicados'} exitosamente
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {successCount === 1 ? 'El producto está' : 'Los productos están'} ahora visible{successCount === 1 ? '' : 's'} y disponible{successCount === 1 ? '' : 's'} para la venta.
                </p>
              </div>
            </div>
          )}

          {/* Failures Summary */}
          {hasFailures && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    {failedCount} {failedCount === 1 ? 'producto no pudo' : 'productos no pudieron'} ser {failedCount === 1 ? 'publicado' : 'publicados'}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    {failedCount === 1 ? 'El producto no cumple' : 'Los productos no cumplen'} con los requisitos mínimos para publicación.
                  </p>
                </div>
              </div>

              {/* Failed Products List */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900">
                  Productos con problemas:
                </p>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {failedProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            SKU: {product.sku}
                          </p>
                        </div>
                        <Link
                          to={`/products/${product.id}/edit`}
                          className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-700 font-medium"
                          onClick={onClose}
                        >
                          Editar
                        </Link>
                      </div>
                      <ul className="space-y-1">
                        {product.reasons.map((reason, index) => (
                          <li key={index} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="text-yellow-600 mt-0.5">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}