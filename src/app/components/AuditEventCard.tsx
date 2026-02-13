import { useState } from 'react';
import { Link } from 'react-router';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { type AuditEvent } from '../types/audit';
import { getEntityTypeLabel, getFieldLabel } from '../utils/auditHelpers';
import { ACTION_LABELS } from '../types/audit';

interface AuditEventCardProps {
  event: AuditEvent;
}

export function AuditEventCard({ event }: AuditEventCardProps) {
  const [showChanges, setShowChanges] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return ts; // Return raw string if invalid
      }
      return new Intl.DateTimeFormat('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date);
    } catch (error) {
      return ts; // Return raw string on error
    }
  };

  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return '(vacío)';
    if (typeof val === 'boolean') return val ? 'Sí' : 'No';
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return `[${val.length} items]`;
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };

  const getEntityLink = (): string | null => {
    if (!event.entity) return null;

    switch (event.entity.type) {
      case 'order':
        return `/orders/${event.entity.id}`;
      case 'customer':
        return `/customers/${event.entity.id}`;
      case 'product':
        return `/products/${event.entity.id}/edit`;
      case 'category':
        return `/categories`;
      case 'rma':
        return `/rma/${event.entity.id}`;
      case 'user':
        return `/users`;
      case 'role':
        return `/users`;
      case 'coverageZip':
        // Extract ZIP code from label (e.g., "CP 03100") and filter by it
        const zipMatch = event.entity.label.match(/CP (\d{5})/);
        if (zipMatch) {
          return `/coverage?zip=${zipMatch[1]}`;
        }
        return `/coverage`;
      default:
        return null;
    }
  };

  const entityLink = getEntityLink();

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">
                {ACTION_LABELS[event.action] || event.action}
              </span>
              {event.entity && (
                <>
                  <span className="text-gray-400">·</span>
                  <Badge variant="blue" className="text-xs">
                    {getEntityTypeLabel(event.entity.type)}
                  </Badge>
                  {entityLink ? (
                    <Link
                      to={entityLink}
                      className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 text-sm"
                    >
                      {event.entity.label}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-sm font-mono text-gray-600">{event.entity.label}</span>
                  )}
                </>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <span>{event.actor.name}</span>
              {event.actor.roleName && (
                <>
                  <span>·</span>
                  <span className="text-xs">{event.actor.roleName}</span>
                </>
              )}
              <span>·</span>
              <time>{formatTimestamp(event.ts)}</time>
            </div>
          </div>
        </div>

        {/* Changes */}
        {event.changes && event.changes.length > 0 && (
          <div className="border-t pt-3">
            <button
              onClick={() => setShowChanges(!showChanges)}
              className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {showChanges ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Cambios ({event.changes.length})
            </button>
            {showChanges && (
              <div className="mt-2 space-y-2 pl-5">
                {event.changes.map((change, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium text-gray-700">{getFieldLabel(change.field)}:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs">
                        {formatValue(change.from)}
                      </code>
                      <span className="text-gray-400">→</span>
                      <code className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                        {formatValue(change.to)}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="border-t pt-3">
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {showMetadata ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Detalles adicionales
            </button>
            {showMetadata && (
              <div className="mt-2 pl-5">
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}