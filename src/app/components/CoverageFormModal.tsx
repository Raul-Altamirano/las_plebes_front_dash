import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle } from 'lucide-react';
import {
  type CoverageZip,
  type CoverageStatus,
  type DisabledReason,
  COVERAGE_STATUS_LABELS,
  DISABLED_REASON_LABELS,
} from '../types/coverage';
import { validateCoverageZip } from '../utils/coverageHelpers';

interface CoverageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<CoverageZip>) => void;
  existingZips: CoverageZip[];
  editingZip?: CoverageZip;
}

export function CoverageFormModal({
  isOpen,
  onClose,
  onSubmit,
  existingZips,
  editingZip,
}: CoverageFormModalProps) {
  const [formData, setFormData] = useState<Partial<CoverageZip>>({
    zip: '',
    status: 'ENABLED',
    onlyMeetupPoint: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingZip) {
      setFormData(editingZip);
    } else {
      setFormData({
        zip: '',
        status: 'ENABLED',
        onlyMeetupPoint: false,
      });
    }
    setErrors({});
  }, [editingZip, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateCoverageZip(formData, existingZips, !!editingZip);
    
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // Warning if onlyMeetupPoint but no note
    if (formData.onlyMeetupPoint && !formData.meetupPointNote?.trim()) {
      if (!confirm('No has especificado un punto de encuentro. ¿Deseas continuar?')) {
        return;
      }
    }

    onSubmit(formData);
    onClose();
  };

  const handleChange = (field: keyof CoverageZip, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingZip ? 'Editar Código Postal' : 'Agregar Código Postal'}
          </DialogTitle>
          <DialogDescription>
            {editingZip
              ? 'Modifica los detalles del código postal de cobertura'
              : 'Agrega un nuevo código postal a la lista de cobertura'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* CP */}
          <div>
            <Label htmlFor="zip">
              Código Postal <span className="text-red-500">*</span>
            </Label>
            <Input
              id="zip"
              type="text"
              maxLength={5}
              placeholder="01000"
              value={formData.zip || ''}
              onChange={(e) => handleChange('zip', e.target.value)}
              disabled={!!editingZip} // Don't allow changing zip on edit
              className={errors.zip ? 'border-red-500' : ''}
            />
            {errors.zip && <p className="text-sm text-red-500 mt-1">{errors.zip}</p>}
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">
              Estado <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange('status', value as CoverageStatus)}
            >
              <SelectTrigger id="status" className={errors.status ? 'border-red-500' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COVERAGE_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && <p className="text-sm text-red-500 mt-1">{errors.status}</p>}
            {formData.status === 'REVIEW' && (
              <p className="text-sm text-yellow-600 mt-1">
                ℹ️ Los pedidos en zonas de revisión requerirán aprobación manual
              </p>
            )}
          </div>

          {/* Delivery Fee */}
          <div>
            <Label htmlFor="deliveryFee">Costo de Envío (opcional)</Label>
            <Input
              id="deliveryFee"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.deliveryFee ?? ''}
              onChange={(e) =>
                handleChange('deliveryFee', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              className={errors.deliveryFee ? 'border-red-500' : ''}
            />
            {errors.deliveryFee && (
              <p className="text-sm text-red-500 mt-1">{errors.deliveryFee}</p>
            )}
          </div>

          {/* Min Order */}
          <div>
            <Label htmlFor="minOrder">Monto Mínimo de Compra (opcional)</Label>
            <Input
              id="minOrder"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.minOrder ?? ''}
              onChange={(e) =>
                handleChange('minOrder', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              className={errors.minOrder ? 'border-red-500' : ''}
            />
            {errors.minOrder && <p className="text-sm text-red-500 mt-1">{errors.minOrder}</p>}
          </div>

          {/* Only Meetup Point */}
          <div className="flex items-center space-x-2">
            <Switch
              id="onlyMeetupPoint"
              checked={formData.onlyMeetupPoint || false}
              onCheckedChange={(checked) => handleChange('onlyMeetupPoint', checked)}
            />
            <Label htmlFor="onlyMeetupPoint" className="cursor-pointer">
              Solo punto de encuentro (no envío a domicilio)
            </Label>
          </div>

          {/* Meetup Point Note */}
          {formData.onlyMeetupPoint && (
            <div>
              <Label htmlFor="meetupPointNote">Nota de punto de encuentro</Label>
              <Input
                id="meetupPointNote"
                type="text"
                placeholder="Ej: Metro Insurgentes, Plaza Condesa"
                value={formData.meetupPointNote || ''}
                onChange={(e) => handleChange('meetupPointNote', e.target.value)}
              />
              {formData.onlyMeetupPoint && !formData.meetupPointNote?.trim() && (
                <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    Se recomienda especificar el punto de encuentro
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Reason (if not ENABLED) */}
          {formData.status !== 'ENABLED' && (
            <div>
              <Label htmlFor="reason">
                Razón {formData.status === 'DISABLED' && <span className="text-red-500">*</span>}
              </Label>
              <Select
                value={formData.reason || ''}
                onValueChange={(value) => handleChange('reason', value as DisabledReason)}
              >
                <SelectTrigger id="reason" className={errors.reason ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecciona una razón" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DISABLED_REASON_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.reason && <p className="text-sm text-red-500 mt-1">{errors.reason}</p>}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Información adicional sobre este CP..."
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{editingZip ? 'Guardar cambios' : 'Agregar CP'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
