import { Eye, EyeOff } from 'lucide-react';
import type { Product } from '../types/product';
import { 
  getQuickActionLabel, 
  validateProductForPublish,
  getTargetStatusForQuickAction 
} from '../utils/productStateHelpers';

interface QuickPublishButtonProps {
  product: Product;
  onPublish: (productId: string) => void;
  onHide: (productId: string) => void;
  onValidationFailed: (product: Product, reasons: string[]) => void;
  disabled?: boolean;
  variant?: 'icon' | 'button';
}

export function QuickPublishButton({
  product,
  onPublish,
  onHide,
  onValidationFailed,
  disabled = false,
  variant = 'icon'
}: QuickPublishButtonProps) {
  const actionLabel = getQuickActionLabel(product);
  
  if (!actionLabel) return null;

  const isPublishAction = actionLabel === 'Publicar';
  
  // Validar si se puede publicar
  const validation = isPublishAction ? validateProductForPublish(product) : { canPublish: true, reasons: [] };
  const canPerformAction = validation.canPublish;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se propague al row

    if (!canPerformAction) {
      onValidationFailed(product, validation.reasons);
      return;
    }

    if (isPublishAction) {
      onPublish(product.id);
    } else {
      onHide(product.id);
    }
  };

  const isDisabled = disabled || (!canPerformAction && isPublishAction);

  if (variant === 'icon') {
    // Versión icono (para tabla desktop)
    const Icon = isPublishAction ? Eye : EyeOff;
    const colorClass = isPublishAction 
      ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
      : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50';
    
    return (
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`p-1.5 rounded transition-colors ${
          isDisabled 
            ? 'text-gray-400 cursor-not-allowed' 
            : colorClass
        }`}
        title={
          !canPerformAction && isPublishAction
            ? `No se puede publicar: ${validation.reasons.join(', ')}`
            : actionLabel
        }
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  }

  // Versión botón (para mobile o preferencia)
  const bgClass = isPublishAction
    ? 'bg-green-50 text-green-700 hover:bg-green-100'
    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100';
  
  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
        isDisabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : bgClass
      }`}
      title={
        !canPerformAction && isPublishAction
          ? `No se puede publicar: ${validation.reasons.join(', ')}`
          : undefined
      }
    >
      {isPublishAction ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      <span>{actionLabel}</span>
    </button>
  );
}