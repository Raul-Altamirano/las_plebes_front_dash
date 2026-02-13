import { Badge } from './ui/badge';
import { type OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../types/order';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const label = ORDER_STATUS_LABELS[status];
  const color = ORDER_STATUS_COLORS[status];

  const variants: Record<typeof color, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    gray: 'secondary',
    blue: 'default',
    green: 'default',
    yellow: 'outline',
    red: 'destructive',
  };

  const classNames: Record<typeof color, string> = {
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    red: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <Badge variant={variants[color]} className={classNames[color]}>
      {label}
    </Badge>
  );
}
