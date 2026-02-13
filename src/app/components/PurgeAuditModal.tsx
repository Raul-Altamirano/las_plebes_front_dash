import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface PurgeAuditModalProps {
  isOpen: boolean;
  totalEvents: number;
  onConfirm: (days: number) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const PURGE_OPTIONS = [
  { value: 30, label: '30 días', description: 'Borrar eventos anteriores a 30 días' },
  { value: 60, label: '60 días (recomendado)', description: 'Borrar eventos anteriores a 60 días' },
  { value: 90, label: '90 días', description: 'Borrar eventos anteriores a 90 días' },
  { value: 7, label: 'Todo excepto últimos 7 días', description: 'Mantener solo la última semana' },
];

export function PurgeAuditModal({
  isOpen,
  totalEvents,
  onConfirm,
  onCancel,
  isLoading = false,
}: PurgeAuditModalProps) {
  const [selectedDays, setSelectedDays] = useState(60);
  const [confirmText, setConfirmText] = useState('');
  const [estimatedCount, setEstimatedCount] = useState(0);

  // Calculate estimated count based on selected days (simulation)
  useEffect(() => {
    if (!isOpen) return;
    
    // Simulate calculation - in real app this would query the actual data
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - selectedDays);
    
    // For demo purposes, estimate that older events are ~40% of total
    const estimated = Math.floor(totalEvents * 0.4);
    setEstimatedCount(Math.max(0, estimated));
  }, [selectedDays, totalEvents, isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDays(60);
      setConfirmText('');
      setEstimatedCount(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmValid = confirmText.toUpperCase() === 'PURGAR';
  const remainingEvents = totalEvents - estimatedCount;

  const handleConfirm = () => {
    if (isConfirmValid && !isLoading) {
      onConfirm(selectedDays);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b p-6 bg-red-50">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 rounded-full p-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Purgar eventos antiguos</h2>
              <p className="text-sm text-red-600 mt-0.5">Esta acción no se puede deshacer</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <strong>Advertencia:</strong> Esta operación eliminará permanentemente los eventos
              de auditoría que cumplan con el criterio seleccionado. Los eventos eliminados no
              podrán ser recuperados.
            </p>
          </div>

          {/* Selector de días */}
          <div className="space-y-2">
            <Label>Borrar eventos anteriores a:</Label>
            <Select value={selectedDays.toString()} onValueChange={(v) => setSelectedDays(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURGE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              {PURGE_OPTIONS.find(o => o.value === selectedDays)?.description}
            </p>
          </div>

          {/* Estimated counts */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total de eventos actuales:</span>
              <span className="font-semibold text-gray-900">{totalEvents}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Se borrarán aproximadamente:</span>
              <span className="font-semibold text-red-600">~{estimatedCount}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-gray-600">Quedarán:</span>
              <span className="font-semibold text-green-600">~{remainingEvents}</span>
            </div>
          </div>

          {/* Confirmation input */}
          <div className="space-y-2">
            <Label>
              Para confirmar, escribe <span className="font-mono font-bold text-red-600">PURGAR</span>
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Escribe PURGAR"
              className="font-mono"
              disabled={isLoading}
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Purgando...
              </>
            ) : (
              'Borrar definitivamente'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
