import { RMAStatus, RMA_STATUS_LABELS, RMA_STATUS_COLORS } from '../types/rma';
import { Badge } from './Badge';

interface RMAStatusBadgeProps {
  status: RMAStatus;
}

export function RMAStatusBadge({ status }: RMAStatusBadgeProps) {
  const label = RMA_STATUS_LABELS[status];
  const color = RMA_STATUS_COLORS[status];

  return <Badge color={color}>{label}</Badge>;
}
