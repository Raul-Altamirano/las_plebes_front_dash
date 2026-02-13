import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useAudit } from '../store/AuditContext';
import { useAuth } from '../store/AuthContext';
import { AuditAction, ACTION_LABELS } from '../types/audit';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { AuditEventCard } from '../components/AuditEventCard';
import { PurgeAuditModal } from '../components/PurgeAuditModal';
import { Search, Filter, Clock, Trash2, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV, formatDateForCSV } from '../utils/csvExport';

type TimeRange = '7' | '30' | '60' | '90' | 'all';

const TIME_RANGES: { value: TimeRange; label: string; days: number | 'all' }[] = [
  { value: '7', label: '7 días', days: 7 },
  { value: '30', label: '30 días', days: 30 },
  { value: '60', label: '60 días', days: 60 },
  { value: '90', label: '90 días', days: 90 },
  { value: 'all', label: 'Todo', days: 'all' },
];

export function Audit() {
  const { events, filterByRange, purgeOlderThan, auditLog } = useAudit();
  const { hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'ALL'>('ALL');
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const range = searchParams.get('range') as TimeRange;
    return TIME_RANGES.find(r => r.value === range) ? range : '60';
  });
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const canPurge = hasPermission('audit:purge');
  const canExport = hasPermission('report:export');

  // Update URL when time range changes
  useEffect(() => {
    setSearchParams({ range: timeRange });
  }, [timeRange, setSearchParams]);

  // Get events filtered by time range
  const timeFilteredEvents = useMemo(() => {
    const range = TIME_RANGES.find(r => r.value === timeRange);
    return range ? filterByRange(range.days) : events;
  }, [events, timeRange, filterByRange]);

  // Get list of unique actions present in the log
  const availableActions = useMemo(() => {
    const actions = new Set(timeFilteredEvents.map((e) => e.action));
    return Array.from(actions).sort();
  }, [timeFilteredEvents]);

  // Apply search and action filters
  const filteredEvents = useMemo(() => {
    return timeFilteredEvents.filter((event) => {
      // Action filter
      if (actionFilter !== 'ALL' && event.action !== actionFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesEntity = event.entity?.label.toLowerCase().includes(query);
        const matchesActor = event.actor.name.toLowerCase().includes(query);
        const matchesAction = ACTION_LABELS[event.action].toLowerCase().includes(query);
        return matchesEntity || matchesActor || matchesAction;
      }

      return true;
    });
  }, [timeFilteredEvents, searchQuery, actionFilter]);

  // Group events by day
  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: typeof filteredEvents } = {};
    
    filteredEvents.forEach(event => {
      const date = new Date(event.ts);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = 'Hoy';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = 'Ayer';
      } else {
        key = date.toLocaleDateString('es-MX', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(event);
    });
    
    return groups;
  }, [filteredEvents]);

  const handlePurge = async (days: number) => {
    setIsPurging(true);
    
    try {
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result = purgeOlderThan(days);
      
      // Log the purge action
      auditLog({
        action: 'AUDIT_PURGED',
        metadata: {
          days,
          deletedCount: result.deletedCount,
          remainingCount: result.remainingCount,
        },
      });
      
      toast.success(
        `Purga completada. ${result.deletedCount} eventos eliminados, ${result.remainingCount} eventos restantes.`
      );
      
      setShowPurgeModal(false);
    } catch (error) {
      toast.error('Error al purgar eventos');
    } finally {
      setIsPurging(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simular delay mínimo para UX
    await new Promise(resolve => setTimeout(resolve, 200));

    const exportData = filteredEvents.map(event => ({
      timestamp: formatDateForCSV(event.ts),
      action: ACTION_LABELS[event.action],
      actor: event.actor.name,
      entity: event.entity?.label || 'N/A',
      details: typeof event.metadata === 'string' ? event.metadata : JSON.stringify(event.metadata || {}),
    }));

    exportToCSV(exportData, 'auditoria');

    // Auditoría
    auditLog({
      action: 'REPORT_EXPORTED',
      metadata: {
        page: 'audit',
        count: filteredEvents.length,
        filtersApplied: { timeRange, searchQuery, actionFilter },
      },
    });

    toast.success(`CSV exportado (${filteredEvents.length} registros)`);
    
    await new Promise(resolve => setTimeout(resolve, 400));
    setIsExporting(false);
  };

  const selectedRange = TIME_RANGES.find(r => r.value === timeRange);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Registro de Auditoría</h1>
          <p className="text-gray-600">Historial de acciones realizadas en el sistema</p>
        </div>
        
        <div className="flex gap-2">
          {filteredEvents.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={isExporting || !canExport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Exportando...' : 'Exportar CSV'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {!canExport 
                    ? 'No tienes permiso para exportar reportes' 
                    : 'Exporta los eventos de auditoría filtrados a un archivo CSV'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {canPurge && (
            <Button
              variant="outline"
              onClick={() => setShowPurgeModal(true)}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Purgar eventos antiguos
            </Button>
          )}
        </div>
      </div>

      {/* Time range filters - Desktop: Chips, Mobile: Dropdown */}
      <div className="space-y-3">
        {/* Mobile: Dropdown */}
        <div className="sm:hidden">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{selectedRange?.label}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Chips */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 font-medium">Período:</span>
          {TIME_RANGES.map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                timeRange === range.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Range badge */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-sm">
            <Clock className="h-4 w-4" />
            <span>
              {timeRange === 'all' 
                ? `Mostrando todos los eventos (${timeFilteredEvents.length})` 
                : `Mostrando últimos ${selectedRange?.label} (${timeFilteredEvents.length} eventos)`}
            </span>
          </div>
          {timeRange === 'all' && timeFilteredEvents.length > 100 && (
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Puede ser lento con muchos eventos</span>
            </div>
          )}
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por entidad, usuario o acción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="sm:w-64">
          <Select
            value={actionFilter}
            onValueChange={(v) => setActionFilter(v as AuditAction | 'ALL')}
          >
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="Filtrar por acción" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las acciones</SelectItem>
              {availableActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {ACTION_LABELS[action]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Event counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredEvents.length === timeFilteredEvents.length
            ? `${timeFilteredEvents.length} evento${timeFilteredEvents.length !== 1 ? 's' : ''}`
            : `Mostrando ${filteredEvents.length} de ${timeFilteredEvents.length} eventos`}
        </p>
      </div>

      {/* Events list */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">
            {searchQuery || actionFilter !== 'ALL'
              ? 'No se encontraron eventos con los filtros aplicados'
              : timeRange === 'all'
              ? 'No hay eventos registrados aún'
              : `No hay eventos en los últimos ${selectedRange?.label}`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dateLabel, events]) => (
            <div key={dateLabel} className="space-y-3">
              <div className="sticky top-0 bg-gray-50 border-b border-gray-200 py-2 px-4 rounded-t-lg">
                <h3 className="text-sm font-semibold text-gray-700">{dateLabel}</h3>
              </div>
              <div className="space-y-3">
                {events.map((event) => (
                  <AuditEventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purge Modal */}
      <PurgeAuditModal
        isOpen={showPurgeModal}
        totalEvents={events.length}
        onConfirm={handlePurge}
        onCancel={() => setShowPurgeModal(false)}
        isLoading={isPurging}
      />
    </div>
  );
}