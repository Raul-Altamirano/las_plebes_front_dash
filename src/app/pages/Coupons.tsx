import { useState, useMemo } from 'react';
import { Plus, Edit, Power, PowerOff, Trash2, Ticket, Calendar, Hash } from 'lucide-react';
import { useCoupons } from '../store/CouponsContext';
import { usePromotions } from '../store/PromotionsContext';
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
import type { Coupon, Promotion } from '../types/promotion';
import type { CreateCouponDto } from '../../api/coupons.api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCouponStatus(coupon: Coupon): 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SCHEDULED' {
  const now = new Date();
  if (coupon.endsAt && now > new Date(coupon.endsAt))       return 'EXPIRED';
  if (!coupon.isActive)                                      return 'INACTIVE';
  if (coupon.startsAt && now < new Date(coupon.startsAt))    return 'SCHEDULED';
  return 'ACTIVE';
}

function getStatusBadge(coupon: Coupon) {
  const s = getCouponStatus(coupon);
  const map = {
    ACTIVE:    { label: 'Activo',      variant: 'default'   as const },
    INACTIVE:  { label: 'Inactivo',    variant: 'outline'   as const },
    EXPIRED:   { label: 'Expirado',    variant: 'outline'   as const },
    SCHEDULED: { label: 'Programado',  variant: 'secondary' as const },
  };
  const { label, variant } = map[s];
  return <Badge variant={variant}>{label}</Badge>;
}

function promoLabel(promo: Promotion) {
  const discount = promo.type === 'PERCENT'
    ? `${promo.value}%`
    : `$${promo.value.toFixed(2)}`;
  return `${promo.name} — ${discount}`;
}

// ── Tipos de formulario ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  code:             '',
  promotionId:      '',
  startsAt:         '',
  endsAt:           '',
  usageLimit:       '',
  perCustomerLimit: '1',
  isActive:         true,
};

type CouponStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SCHEDULED';

// ── Componente ────────────────────────────────────────────────────────────────

export default function Coupons() {
  const { coupons, createCoupon, updateCoupon, deleteCoupon, loading, refresh } = useCoupons();
  const { promotions } = usePromotions();
  const { auditLog }   = useAudit();
  const { showToast }  = useToast();

  const [isDialogOpen, setIsDialogOpen]   = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [statusFilter, setStatusFilter]   = useState<CouponStatusFilter>('ALL');
  const [searchQuery, setSearchQuery]     = useState('');
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [submitting, setSubmitting]       = useState(false);

  // Solo promos disponibles para vincular a un cupón
  // Mostramos todas (el admin decide), pero marcamos las que son couponRequired
  const availablePromos = useMemo(() =>
    (Array.isArray(promotions) ? promotions : [])
      .filter(p => p.status !== 'EXPIRED')
      .sort((a, b) => a.name.localeCompare(b.name)),
    [promotions],
  );

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const filteredCoupons = useMemo(() => {
    let result = Array.isArray(coupons) ? coupons : [];

    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase();
      result = result.filter(c => c.code.includes(q));
    }
    if (statusFilter !== 'ALL') {
      result = result.filter(c => getCouponStatus(c) === statusFilter);
    }
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [coupons, searchQuery, statusFilter]);

  // ── Dialog ───────────────────────────────────────────────────────────────────
  const openCreateDialog = () => {
    setEditingCoupon(null);
    setFormData(EMPTY_FORM);
    setErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code:             coupon.code,
      promotionId:      coupon.promotionId,
      startsAt:         coupon.startsAt ? coupon.startsAt.split('T')[0] : '',
      endsAt:           coupon.endsAt   ? coupon.endsAt.split('T')[0]   : '',
      usageLimit:       coupon.usageLimit != null ? String(coupon.usageLimit) : '',
      perCustomerLimit: String(coupon.perCustomerLimit ?? 1),
      isActive:         coupon.isActive,
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  // ── Validación ───────────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    const code = formData.code.trim().toUpperCase();
    if (!code) errs.code = 'El código es requerido';
    else if (/\s/.test(code)) errs.code = 'El código no puede contener espacios';

    if (!formData.promotionId) errs.promotionId = 'Debes seleccionar una promoción';

    if (formData.usageLimit) {
      const n = parseInt(formData.usageLimit);
      if (isNaN(n) || n < 1) errs.usageLimit = 'Debe ser un número mayor a 0';
    }

    if (formData.startsAt && formData.endsAt &&
        new Date(formData.endsAt) <= new Date(formData.startsAt)) {
      errs.endsAt = 'La fecha de fin debe ser posterior a la de inicio';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);

    const dto: CreateCouponDto = {
      code:             formData.code.trim().toUpperCase(),
      promotionId:      formData.promotionId,
      isActive:         formData.isActive,
      startsAt:         formData.startsAt ? new Date(formData.startsAt).toISOString() : undefined,
      endsAt:           formData.endsAt   ? new Date(formData.endsAt).toISOString()   : undefined,
      usageLimit:       formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
      perCustomerLimit: parseInt(formData.perCustomerLimit) || 1,
    };

    try {
      setErrors({});
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, dto);
        auditLog({
          action: 'COUPON_UPDATED',
          entity: { type: 'coupon', id: editingCoupon.id, label: dto.code },
          changes: [],
        });
        showToast('success', 'Cupón actualizado correctamente');
      } else {
        const created = await createCoupon(dto);
        auditLog({
          action: 'COUPON_CREATED',
          entity: { type: 'coupon', id: created.id, label: created.code },
          changes: [],
        });
        showToast('success', 'Cupón creado correctamente');
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      showToast('fail', err?.message ?? 'No se pudo guardar el cupón');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      await updateCoupon(coupon.id, { isActive: !coupon.isActive });
      auditLog({
        action: 'COUPON_TOGGLED',
        entity: { type: 'coupon', id: coupon.id, label: coupon.code },
        changes: [{ field: 'isActive', oldValue: String(coupon.isActive), newValue: String(!coupon.isActive) }],
      });
      showToast('success', `Cupón ${!coupon.isActive ? 'activado' : 'desactivado'}`);
    } catch (err: any) {
      showToast('fail', err?.message ?? 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`¿Eliminar el cupón "${coupon.code}"?`)) return;
    try {
      await deleteCoupon(coupon.id);
      auditLog({
        action: 'COUPON_DELETED',
        entity: { type: 'coupon', id: coupon.id, label: coupon.code },
        changes: [],
      });
      showToast('success', 'Cupón eliminado');
    } catch (err: any) {
      showToast('fail', err?.message ?? 'No se pudo eliminar el cupón');
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
          <h1 className="text-2xl">Cupones</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona códigos de descuento para tus clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshButton status={loading ? 'loading' : 'success'} lastFetch={null} onRefresh={refresh} />
          <Button onClick={openCreateDialog}>
            <Plus className="size-4" /> Nuevo Cupón
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por código..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as CouponStatusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ACTIVE">Activos</SelectItem>
            <SelectItem value="SCHEDULED">Programados</SelectItem>
            <SelectItem value="EXPIRED">Expirados</SelectItem>
            <SelectItem value="INACTIVE">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      {filteredCoupons.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Ticket className="size-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg mb-2">No hay cupones</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No se encontraron cupones con los filtros aplicados'
              : 'Crea tu primer cupón de descuento'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && (
            <Button onClick={openCreateDialog}>
              <Plus className="size-4" /> Crear Cupón
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Promoción vinculada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.map(coupon => {
                const linkedPromo = promotions.find(p => p.id === coupon.promotionId);
                return (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Hash className="size-3 text-muted-foreground" />
                        <span className="font-mono font-semibold">{coupon.code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {linkedPromo ? (
                        <div className="space-y-0.5">
                          <div className="font-medium">{linkedPromo.name}</div>
                          <div className="text-muted-foreground">
                            {linkedPromo.type === 'PERCENT'
                              ? `${linkedPromo.value}% de descuento`
                              : `$${linkedPromo.value.toFixed(2)} de descuento`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Promo no encontrada</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(coupon)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {coupon.startsAt || coupon.endsAt ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {coupon.startsAt ? new Date(coupon.startsAt).toLocaleDateString() : '∞'}
                          {' - '}
                          {coupon.endsAt ? new Date(coupon.endsAt).toLocaleDateString() : '∞'}
                        </div>
                      ) : (
                        <span>Sin límite</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{coupon.usedCount}</span>
                      {coupon.usageLimit != null && (
                        <span className="text-muted-foreground"> / {coupon.usageLimit}</span>
                      )}
                      {coupon.usageLimit == null && (
                        <span className="text-muted-foreground"> / ∞</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(coupon)}>
                          <Edit className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleToggle(coupon)}>
                          {coupon.isActive
                            ? <PowerOff className="size-4" />
                            : <Power className="size-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog create/edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}</DialogTitle>
            <DialogDescription>
              {editingCoupon
                ? 'Modifica los detalles del cupón'
                : 'Crea un nuevo código de descuento'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Código */}
            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={e => set('code')(e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="Ej: VERANO2026"
                disabled={!!editingCoupon}  // el código no se puede cambiar una vez creado
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                El código será convertido a mayúsculas y sin espacios
              </p>
              {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
            </div>

            {/* Promoción vinculada */}
            <div className="space-y-2">
              <Label>Promoción vinculada *</Label>
              <Select value={formData.promotionId} onValueChange={set('promotionId')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una promoción..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePromos.length === 0 ? (
                    <SelectItem value="" disabled>
                      No hay promociones disponibles
                    </SelectItem>
                  ) : (
                    availablePromos.map(promo => (
                      <SelectItem key={promo.id} value={promo.id}>
                        <div className="flex items-center gap-2">
                          <span>{promoLabel(promo)}</span>
                          {promo.couponRequired && (
                            <Badge variant="secondary" className="text-xs">Exclusiva</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {formData.promotionId && (() => {
                const p = promotions.find(x => x.id === formData.promotionId);
                if (!p) return null;
                return (
                  <div className="text-xs text-muted-foreground bg-muted rounded p-2 space-y-0.5">
                    <div><span className="font-medium">Descuento:</span> {p.type === 'PERCENT' ? `${p.value}%` : `$${p.value.toFixed(2)}`}</div>
                    {p.minSubtotal ? <div><span className="font-medium">Subtotal mín:</span> ${p.minSubtotal.toFixed(2)}</div> : null}
                    {p.maxDiscountPct ? <div><span className="font-medium">Techo:</span> {p.maxDiscountPct}%</div> : null}
                    <div><span className="font-medium">Alcance:</span> {p.scope.all ? 'Todos los productos' : 'Específico'}</div>
                  </div>
                );
              })()}
              {errors.promotionId && <p className="text-sm text-destructive">{errors.promotionId}</p>}
            </div>

            {/* Vigencia */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Inicio</Label>
                <Input type="date" value={formData.startsAt} onChange={e => set('startsAt')(e.target.value)} />
                <p className="text-xs text-muted-foreground">Estrecha las fechas de la promo</p>
              </div>
              <div className="space-y-2">
                <Label>Fecha de Fin</Label>
                <Input type="date" value={formData.endsAt} onChange={e => set('endsAt')(e.target.value)} />
                {errors.endsAt && <p className="text-sm text-destructive">{errors.endsAt}</p>}
              </div>
            </div>

            {/* Límites */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Límite de usos <span className="text-muted-foreground">(global)</span></Label>
                <Input
                  type="number"
                  value={formData.usageLimit}
                  onChange={e => set('usageLimit')(e.target.value)}
                  placeholder="Ilimitado"
                  min="1"
                />
                {errors.usageLimit && <p className="text-sm text-destructive">{errors.usageLimit}</p>}
              </div>
              <div className="space-y-2">
                <Label>Usos por cliente</Label>
                <Input
                  type="number"
                  value={formData.perCustomerLimit}
                  onChange={e => set('perCustomerLimit')(e.target.value)}
                  min="1"
                />
              </div>
            </div>

            {/* Activar */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={e => set('isActive')(e.target.checked)}
              />
              <span>Activar inmediatamente</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Guardando...' : (editingCoupon ? 'Actualizar' : 'Crear')} Cupón
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
