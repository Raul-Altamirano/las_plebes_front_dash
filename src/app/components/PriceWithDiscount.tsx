import { usePromotions } from '../store/PromotionsContext';
import { getEffectivePrice, getMinEffectivePrice } from '../utils/promotionHelpers';
import type { Product } from '../types/product';

interface PriceWithDiscountProps {
  product: Product;
  showLabel?: boolean;
}

export function PriceWithDiscount({ product, showLabel = false }: PriceWithDiscountProps) {
  const { promotions } = usePromotions();
  
  // Si tiene variantes, calcular precio mínimo
  if (product.hasVariants && product.variants && product.variants.length > 0) {
    const minPrice = getMinEffectivePrice(product, promotions);
    const baseMinPrice = Math.min(
      ...product.variants.map(v => v.price ?? product.price)
    );
    
    const hasDiscount = minPrice < baseMinPrice;
    
    return (
      <div className="flex flex-col">
        {showLabel && <span className="text-xs text-muted-foreground">Precio</span>}
        <div className="flex items-center gap-2">
          {hasDiscount ? (
            <>
              <span className="text-muted-foreground line-through text-sm">
                Desde ${baseMinPrice.toFixed(2)}
              </span>
              <span className="font-medium text-green-600">
                Desde ${minPrice.toFixed(2)}
              </span>
            </>
          ) : (
            <span>Desde ${baseMinPrice.toFixed(2)}</span>
          )}
        </div>
      </div>
    );
  }
  
  // Producto simple
  const priceInfo = getEffectivePrice(product, promotions);
  
  return (
    <div className="flex flex-col">
      {showLabel && <span className="text-xs text-muted-foreground">Precio</span>}
      <div className="flex items-center gap-2">
        {priceInfo.hasDiscount ? (
          <>
            <span className="text-muted-foreground line-through text-sm">
              ${priceInfo.basePrice.toFixed(2)}
            </span>
            <span className="font-medium text-green-600">
              ${priceInfo.effectivePrice.toFixed(2)}
            </span>
          </>
        ) : (
          <span>${priceInfo.basePrice.toFixed(2)}</span>
        )}
      </div>
      {priceInfo.hasDiscount && priceInfo.appliedPromotions.length > 0 && (
        <span className="text-xs text-green-600">
          {priceInfo.appliedPromotions[0].name}
        </span>
      )}
    </div>
  );
}