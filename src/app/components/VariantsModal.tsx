import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './Badge';
import { ProductVariant } from '../types/product';

interface VariantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  variants: ProductVariant[];
  productPrice: number;
}

export function VariantsModal({ 
  isOpen, 
  onClose, 
  productName, 
  variants,
  productPrice 
}: VariantsModalProps) {
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Variantes de {productName}</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Total: {variants.length} variantes · Stock total: {totalStock} unidades
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-2 px-3 font-medium">Talla</th>
                  <th className="text-left py-2 px-3 font-medium">Color</th>
                  <th className="text-left py-2 px-3 font-medium">SKU</th>
                  <th className="text-right py-2 px-3 font-medium">Precio</th>
                  <th className="text-right py-2 px-3 font-medium">Stock</th>
                  <th className="text-left py-2 px-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {variants.map((variant) => {
                  const effectivePrice = variant.price ?? productPrice;
                  const effectiveStatus = variant.status ?? 
                    (variant.stock === 0 ? 'OUT_OF_STOCK' : 'ACTIVE');

                  return (
                    <tr key={variant.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3">
                        {variant.options.size || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-2 px-3">
                        {variant.options.color || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs">
                        {variant.sku}
                      </td>
                      <td className="py-2 px-3 text-right">
                        ${effectivePrice.toFixed(2)}
                        {!variant.price && (
                          <span className="text-xs text-gray-500 ml-1">(heredado)</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={variant.stock === 0 ? 'text-red-600' : ''}>
                          {variant.stock}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <Badge status={effectiveStatus} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}