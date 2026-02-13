import { Badge } from './ui/badge';
import { type CoverageStatus, COVERAGE_STATUS_LABELS, COVERAGE_STATUS_COLORS } from '../types/coverage';

interface CoverageStatusBadgeProps {
  status: CoverageStatus;
  className?: string;
}

export function CoverageStatusBadge({ status, className }: CoverageStatusBadgeProps) {
  const variant = COVERAGE_STATUS_COLORS[status];
  const label = COVERAGE_STATUS_LABELS[status];

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
