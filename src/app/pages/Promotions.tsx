import { useState, useMemo } from 'react';
import { Plus, Edit, Power, PowerOff, Trash2, Tag, Calendar, Target, AlertTriangle } from 'lucide-react';
import { usePromotions } from '../store/PromotionsContext';
import { useCategories } from '../store/CategoryContext';
import { useProducts } from '../store/ProductsContext';
import { useAudit } from '../store/AuditContext';
import { useToast } from '../store/ToastContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { RefreshButton } from '../components/RefreshButton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import type { Promotion, DiscountType, PromotionScope, PromotionStatus, PromotionWarning } from '../types/promotion';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PromotionStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  ACTIVE:    { label: 'Activa',      variant: 'default'   },
  SCHEDULED: { label: 'Programada',  variant: 'secondary' },
  EXPIRED:   { label: 'Expirada',    variant: 'outline'   },
  INACTIVE:  { label: 'Inactiva',    variant: 'outline'   },
};

function getStatusBadge(promo: Promotion) {
  const config = STATUS_CONFIG[promo.status] ?? STATUS_CONFIG.INACTIVE;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getScopeLabel(scope: PromotionScope) {
  if (scope.all) return 'Todos los productos';
  const parts: string[] = [];
  if (scope.categoryIds?.length) parts.push(`${scope.categoryIds.length} categorías`);
  if (scope.productIds?.length)  parts.push(`${scope.productIds.length} productos`);
  return parts.join(', ') || 'Sin alcance';
}

// ── Tipos de formulario ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  name:             '',
  type:             'PERCENT' as DiscountType,
  value:            '',
  startsAt:         '',
  endsAt:           '',
  isActive:         true,
  couponRequired:   false,
  stackable:        false,
  scopeAll:         true,
  scopeCategoryIds: [] as string[],
  scopeProductIds:  [] as string[],
  // avanzados
  minSubtotal:      '',
  minDiscountPct:   '',
  maxDiscountPct:   '',
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function Promotions() {
  const {
    promotions, createPromotion, updatePromotion,
    togglePromotion, deletePromotion, status, lastFetch, refresh,
  } = usePromotions();
  const { categories } = useCategories();
  const { products }   = useProducts();
  const { auditLog }   = useAudit();
  const { showToast }  = useToast();

  const [isDialogOpen, setIsDialogOpen]         = useState(false);
  const [editingPromo, setEditingPromo]          = useState<Promotion | null>(null);
  const [statusFilter, setStatusFilter]          = useState<PromotionStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery]            = useState('');
  const [showAdvanced, setShowAdvanced]          = useState(false);
  const [formData, setFormData]                  = useState(EMPTY_FORM);
  const [errors, setErrors]                      = useState<Record<string, string>>({});
  const [submitting, setSubmitting]              = useState(false);
  const [activeWarnings, setActiveWarnings]      = useState<PromotionWarning[]>([]);

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const filteredPromotions = useMemo(() => {
    let result = (Array.isArray(promotions) ? promotions : [])
      .filter(p => !p.name.includes('__archived__'));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }
    if (statusFilter !== 'ALL') {
      result = result.filter(p => p.status === statusFilter);
    }
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [promotions, searchQuery, statusFilter]);

  // ── Dialog ───────────────────────────────────────────────────────────────────
  const openCreateDialog = () => {
    setEditingPromo(null);
    setFormData(EMPTY_FORM);
    setErrors({});
    setActiveWarnings([]);
    setShowAdvanced(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (promo: Promotion) => {
    setEditingPromo(promo);
    setFormData({
      name:             promo.name,
      type:             promo.type as DiscountType,
      value:            promo.value.toString(),
      startsAt:         promo.startsAt ? promo.startsAt.split('T')[0] : '',
      endsAt:           promo.endsAt   ? promo.endsAt.split('T')[0]   : '',
      isActive:         promo.isActive,
      couponRequired:   promo.couponRequired,
      stackable:        promo.stackable,
      scopeAll:         promo.scope.all,
      scopeCategoryIds: promo.scope.categoryIds ?? [],
      scopeProductIds:  promo.scope.productIds  ?? [],
      minSubtotal:      promo.minSubtotal    != null ? String(promo.minSubtotal)    : '',
      minDiscountPct:   promo.minDiscountPct != null ? String(promo.minDiscountPct) : '',
      maxDiscountPct:   promo.maxDiscountPct != null ? String(promo.maxDiscountPct) : '',
    });
    setErrors({});
    setActiveWarnings([]);
    setShowAdvanced(!!(promo.minSubtotal || promo.minDiscountPct || promo.maxDiscountPct));
    setIsDialogOpen(true);
  };

  // ── Validación ───────────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'El nombre es requerido';

    const val = parseFloat(formData.value);
    if (isNaN(val)) {
      errs.value = 'El valor debe ser un número';
    } else if (formData.type === 'PERCENT' && (val < 1 || val > 90)) {
      errs.value = 'El porcentaje debe estar entre 1 y 90';
    } else if (formData.type === 'FIXED' && val <= 0) {
      errs.value = 'El monto debe ser mayor a 0';
    }

    if (formData.startsAt && formData.endsAt &&
        new Date(formData.endsAt) <= new Date(formData.startsAt)) {
      errs.endsAt = 'La fecha de fin debe ser posterior a la de inicio';
    }

    if (!formData.scopeAll &&
        formData.scopeCategoryIds.length === 0 &&
        formData.scopeProductIds.length  === 0) {
      errs.scope = 'Selecciona al menos una categoría o producto';
    }

    // Validaciones campos avanzados
    const minPct = parseFloat(formData.minDiscountPct);
    const maxPct = parseFloat(formData.maxDiscountPct);
    if (formData.minDiscountPct && isNaN(minPct)) errs.minDiscountPct = 'Debe ser un número';
    if (formData.maxDiscountPct && isNaN(maxPct)) errs.maxDiscountPct = 'Debe ser un número';
    if (!isNaN(minPct) && !isNaN(maxPct) && minPct >= maxPct) {
      errs.maxDiscountPct = 'El techo debe ser mayor al piso';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);

    const scope: PromotionScope = {
      all:         formData.scopeAll,
      categoryIds: formData.scopeAll ? undefined : formData.scopeCategoryIds,
      productIds:  formData.scopeAll ? undefined : formData.scopeProductIds,
    };

    const dto = {
      name:           formData.name.trim(),
      type:           formData.type,
      value:          parseFloat(formData.value),
      isActive:       formData.isActive,
      couponRequired: formData.couponRequired,
      stackable:      formData.stackable,
      startsAt:       formData.startsAt ? new Date(formData.startsAt).toISOString() : undefined,
      endsAt:         formData.endsAt   ? new Date(formData.endsAt).toISOString()   : undefined,
      scope,
      minSubtotal:    formData.minSubtotal    ? parseFloat(formData.minSubtotal)    : undefined,
      minDiscountPct: formData.minDiscountPct ? parseFloat(formData.minDiscountPct) : undefined,
      maxDiscountPct: formData.maxDiscountPct ? parseFloat(formData.maxDiscountPct) : undefined,
    };

    try {
      setErrors({});
      let warnings: PromotionWarning[] | undefined;

      if (editingPromo) {
        const result = await updatePromotion(editingPromo.id, dto);
        warnings = result.warnings;
        auditLog({
          action: 'PROMO_UPDATED',
          entity: { type: 'promotion', id: editingPromo.id, label: dto.name },
          changes: [{ field: 'promotion', oldValue: editingPromo.name, newValue: dto.name }],
        });
        showToast('success', 'Promoción actualizada correctamente');
      } else {
        const result = await createPromotion(dto);
        warnings = result.warnings;
        auditLog({
          action: 'PROMO_CREATED',
          entity: { type: 'promotion', id: result.promotion.id, label: dto.name },
          changes: [],
        });
        showToast('success', 'Promoción creada correctamente');
      }

      // Si hay conflictos de productos, mostrar warnings sin cerrar el diálogo
      if (warnings?.length) {
        setActiveWarnings(warnings);
        return; // el admin ve los warnings y cierra manualmente
      }

      setIsDialogOpen(false);
    } catch (err: any) {
      const fieldErrors = err?.details?.fieldErrors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        setErrors(fieldErrors);
        showToast('fail', err?.message ?? 'Revisa el formulario');
        return;
      }
      showToast('fail', err?.message ?? 'No se pudo guardar la promoción');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (promo: Promotion) => {
    try {
      await togglePromotion(promo.id, !promo.isActive);
      auditLog({
        action: 'PROMO_TOGGLED',
        entity: { type: 'promotion', id: promo.id, label: promo.name },
        changes: [{ field: 'isActive', oldValue: String(promo.isActive), newValue: String(!promo.isActive) }],
      });
      showToast('success', `Promoción ${!promo.isActive ? 'activada' : 'desactivada'}`);
    } catch (err: any) {
      showToast('fail', err?.message ?? 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async (promo: Promotion) => {
    if (!confirm('¿Estás seguro de eliminar esta promoción?')) return;
    try {
      await deletePromotion(promo.id);
      auditLog({
        action: 'PROMO_DELETED',
        entity: { type: 'promotion', id: promo.id, label: promo.name },
        changes: [],
      });
      showToast('success', 'Promoción eliminada');
    } catch (err: any) {
      showToast('fail', err?.message ?? 'No se pudo eliminar la promoción');
    }
  };

  const set = (key: keyof typeof EMPTY_FORM) => (val: any) =>
    setFormData(prev => ({ ...prev, [key]: val }));

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Promociones</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona descuentos automáticos para tus productos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshButton status={status} lastFetch={lastFetch} onRefresh={refresh} />
          <Button onClick={openCreateDialog}>
            <Plus className="size-4" /> Nueva Promoción
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as PromotionStatus | 'ALL')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ACTIVE">Activas</SelectItem>
            <SelectItem value="SCHEDULED">Programadas</SelectItem>
            <SelectItem value="EXPIRED">Expiradas</SelectItem>
            <SelectItem value="INACTIVE">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      {filteredPromotions.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Tag className="size-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg mb-2">No hay promociones</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No se encontraron promociones con los filtros aplicados'
              : 'Crea tu primera promoción para ofrecer descuentos automáticos'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && (
            <Button onClick={openCreateDialog}>
              <Plus className="size-4" /> Crear Promoción
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descuento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Alcance</TableHead>
                <TableHead>Modo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPromotions.map(promo => (
                <TableRow key={promo.id}>
                  <TableCell className="font-medium">{promo.name}</TableCell>
                  <TableCell>
                    {promo.type === 'PERCENT'
                      ? `${promo.value}%`
                      : `$${promo.value.toFixed(2)}`}
                  </TableCell>
                  <TableCell>{getStatusBadge(promo)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {promo.startsAt || promo.endsAt ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {promo.startsAt ? new Date(promo.startsAt).toLocaleDateString() : '∞'}
                        {' - '}
                        {promo.endsAt ? new Date(promo.endsAt).toLocaleDateString() : '∞'}
                      </div>
                    ) : (
                      <span>Sin límite</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Target className="size-3" />
                      {getScopeLabel(promo.scope)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={promo.couponRequired ? 'secondary' : 'outline'}>
                      {promo.couponRequired ? 'Con código' : 'Automática'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(promo)}>
                        <Edit className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleToggle(promo)}>
                        {promo.isActive
                          ? <PowerOff className="size-4" />
                          : <Power className="size-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(promo)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog create/edit */}
      <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) setActiveWarnings([]); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPromo ? 'Editar Promoción' : 'Nueva Promoción'}</DialogTitle>
            <DialogDescription>
              {editingPromo ? 'Modifica los detalles de la promoción' : 'Crea una nueva promoción automática'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Warnings de conflicto */}
            {activeWarnings.length > 0 && (
              <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-yellow-800 font-medium">
                  <AlertTriangle className="size-4" />
                  <span>Promoción guardada con advertencias</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Los siguientes productos ya tienen una promoción activa y fueron excluidos automáticamente:
                </p>
                <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                  {activeWarnings.map(w => (
                    <li key={w.promotionId}>{w.message}</li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => { setActiveWarnings([]); setIsDialogOpen(false); }}
                >
                  Entendido, cerrar
                </Button>
              </div>
            )}

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => set('name')(e.target.value)}
                placeholder="Ej: Descuento de Primavera"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            {/* Tipo y Valor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Descuento *</Label>
                <Select value={formData.type} onValueChange={v => set('type')(v as DiscountType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Porcentaje (%)</SelectItem>
                    <SelectItem value="FIXED">Monto Fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={e => set('value')(e.target.value)}
                  placeholder={formData.type === 'PERCENT' ? '1-90' : '0.00'}
                  step={formData.type === 'PERCENT' ? '1' : '0.01'}
                />
                {errors.value && <p className="text-sm text-destructive">{errors.value}</p>}
              </div>
            </div>

            {/* Vigencia */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Inicio</Label>
                <Input type="date" value={formData.startsAt} onChange={e => set('startsAt')(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Fin</Label>
                <Input type="date" value={formData.endsAt} onChange={e => set('endsAt')(e.target.value)} />
                {errors.endsAt && <p className="text-sm text-destructive">{errors.endsAt}</p>}
              </div>
            </div>

            {/* Alcance */}
            <div className="space-y-2">
              <Label>Alcance *</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={formData.scopeAll} onChange={() => set('scopeAll')(true)} />
                  <span>Todos los productos</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={!formData.scopeAll} onChange={() => set('scopeAll')(false)} />
                  <span>Productos/Categorías específicas</span>
                </label>
              </div>
              {errors.scope && <p className="text-sm text-destructive">{errors.scope}</p>}
            </div>

            {!formData.scopeAll && (
              <div className="space-y-4 pl-6 border-l-2">
                <div className="space-y-2">
                  <Label>Categorías</Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                    {(Array.isArray(categories) ? categories : []).filter(c => !c.isArchived).map(cat => (
                      <label key={cat.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.scopeCategoryIds.includes(cat.id)}
                          onChange={e => {
                            const ids = e.target.checked
                              ? [...formData.scopeCategoryIds, cat.id]
                              : formData.scopeCategoryIds.filter(id => id !== cat.id);
                            set('scopeCategoryIds')(ids);
                          }}
                        />
                        <span className="text-sm">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Productos</Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                    {(Array.isArray(products) ? products : []).filter(p => !p.isArchived).map(prod => (
                      <label key={prod.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.scopeProductIds.includes(prod.id)}
                          onChange={e => {
                            const ids = e.target.checked
                              ? [...formData.scopeProductIds, prod.id]
                              : formData.scopeProductIds.filter(id => id !== prod.id);
                            set('scopeProductIds')(ids);
                          }}
                        />
                        <span className="text-sm">{prod.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Opciones principales */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.couponRequired}
                  onChange={e => set('couponRequired')(e.target.checked)}
                />
                <span>Solo se activa con cupón <span className="text-muted-foreground text-sm">(no se aplica automáticamente)</span></span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.stackable}
                  onChange={e => set('stackable')(e.target.checked)}
                />
                <span>Permitir acumulación con otras promociones</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => set('isActive')(e.target.checked)}
                />
                <span>Activar inmediatamente</span>
              </label>
            </div>

            {/* Configuración avanzada */}
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setShowAdvanced(v => !v)}
            >
              {showAdvanced ? '▲ Ocultar' : '▼ Mostrar'} configuración avanzada de descuento
            </button>

            {showAdvanced && (
              <div className="space-y-4 pl-4 border-l-2 border-dashed">
                <p className="text-xs text-muted-foreground">
                  Estos límites se calculan sobre el subtotal de los productos participantes.
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Subtotal mínimo ($)</Label>
                    <Input
                      type="number"
                      value={formData.minSubtotal}
                      onChange={e => set('minSubtotal')(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Piso del descuento (%)</Label>
                    <Input
                      type="number"
                      value={formData.minDiscountPct}
                      onChange={e => set('minDiscountPct')(e.target.value)}
                      placeholder="ej: 5"
                      min="0" max="100"
                    />
                    {errors.minDiscountPct && <p className="text-sm text-destructive">{errors.minDiscountPct}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Techo del descuento (%)</Label>
                    <Input
                      type="number"
                      value={formData.maxDiscountPct}
                      onChange={e => set('maxDiscountPct')(e.target.value)}
                      placeholder="ej: 30"
                      min="0" max="100"
                    />
                    {errors.maxDiscountPct && <p className="text-sm text-destructive">{errors.maxDiscountPct}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Guardando...' : (editingPromo ? 'Actualizar' : 'Crear')} Promoción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
