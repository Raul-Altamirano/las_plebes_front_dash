import { AlertCircle, X } from 'lucide-react';
import { Link } from 'react-router';

interface PublishValidationModalProps {
  isOpen: boolean;
  productName: string;
  productId: string;
  reasons: string[];
  onClose: () => void;
}

export function PublishValidationModal({ 
  isOpen, 
  productName, 
  productId, 
  reasons, 
  onClose 
}: PublishValidationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
          <AlertCircle className="w-6 h-6 text-yellow-600" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          No se puede publicar
        </h3>
        
        {/* Product name */}
        <p className="text-sm text-gray-600 text-center mb-4">
          <strong>{productName}</strong> no cumple con los requisitos mínimos
        </p>

        {/* Reasons list */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-gray-900 mb-2">
            Problemas encontrados:
          </p>
          <ul className="space-y-1.5">
            {reasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-yellow-600 mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Cerrar
          </button>
          <Link
            to={`/products/${productId}/edit`}
            className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
          >
            Ir a editar
          </Link>
        </div>
      </div>
    </div>
  );
}