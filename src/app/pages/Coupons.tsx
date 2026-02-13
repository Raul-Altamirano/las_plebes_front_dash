import { useState, useMemo } from 'react';
import { Plus, Edit, Power, PowerOff, Trash2, Ticket, Calendar, Target, RotateCcw } from 'lucide-react';
import { useCoupons } from '../store/CouponsContext';
import { useCategories } from '../store/CategoryContext';
import { useProducts } from '../store/ProductsContext';
import { useAudit } from '../store/AuditContext';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { getPromotionStatus, validateCouponCode } from '../utils/promotionHelpers';
import type { Coupon, DiscountType, PromotionScope, PromotionStatus } from '../types/promotion';

export default function Coupons() {
  const { coupons, addCoupon, updateCoupon, toggleCoupon, deleteCoupon, resetUsageCount, getCouponByCode } = useCoupons();
  const { categories } = useCategories();
  const { products } = useProducts();
  const { auditLog } = useAudit();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [statusFilter, setStatusFilter] = useState<PromotionStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENT' as DiscountType,
    value: '',
    minSubtotal: '',
    startsAt: '',
    endsAt: '',
    usageLimit: '',
    isActive: true,
    scopeAll: true,
    scopeCategoryIds: [] as string[],
    scopeProductIds: [] as string[],
    stackable: false,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filtrar cupones
  const filteredCoupons = useMemo(() => {
    let result = coupons.filter(c => !c.code.includes('__archived__'));
    
    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(coupon =>
        coupon.code.toLowerCase().includes(query)
      );
    }
    
    // Filtrar por estado
    if (statusFilter !== 'ALL') {
      result = result.filter(coupon => {
        const status = getPromotionStatus(coupon.isActive, coupon.startsAt, coupon.endsAt);
        return status === statusFilter;
      });
    }
    
    return result.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [coupons, searchQuery, statusFilter]);

  const openCreateDialog = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      type: 'PERCENT',
      value: '',
      minSubtotal: '',
      startsAt: '',
      endsAt: '',
      usageLimit: '',
      isActive: true,
      scopeAll: true,
      scopeCategoryIds: [],
      scopeProductIds: [],
      stackable: false,
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value.toString(),
      minSubtotal: coupon.minSubtotal ? coupon.minSubtotal.toString() : '',
      startsAt: coupon.startsAt ? coupon.startsAt.split('T')[0] : '',
      endsAt: coupon.endsAt ? coupon.endsAt.split('T')[0] : '',
      usageLimit: coupon.usageLimit ? coupon.usageLimit.toString() : '',
      isActive: coupon.isActive,
      scopeAll: coupon.scope.all,
      scopeCategoryIds: coupon.scope.categoryIds || [],
      scopeProductIds: coupon.scope.productIds || [],
      stackable: coupon.stackable,
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validar código
    const codeValidation = validateCouponCode(formData.code);
    if (!codeValidation.valid) {
      newErrors.code = codeValidation.error!;
    } else {
      // Verificar que no exista otro cupón con el mismo código
      const existingCoupon = getCouponByCode(formData.code);
      if (existingCoupon && (!editingCoupon || existingCoupon.id !== editingCoupon.id)) {
        newErrors.code = 'Ya existe un cupón con este código';
      }
    }
    
    // Validar valor
    const value = parseFloat(formData.value);
    if (isNaN(value)) {
      newErrors.value = 'El valor debe ser un número';
    } else if (formData.type === 'PERCENT' && (value < 1 || value > 90)) {
      newErrors.value = 'El porcentaje debe estar entre 1 y 90';
    } else if (formData.type === 'FIXED' && value <= 0) {
      newErrors.value = 'El monto debe ser mayor a 0';
    }
    
    // Validar minSubtotal
    if (formData.minSubtotal) {
      const minSubtotal = parseFloat(formData.minSubtotal);
      if (isNaN(minSubtotal) || minSubtotal < 0) {
        newErrors.minSubtotal = 'El subtotal mínimo debe ser un número válido';
      }
    }
    
    // Validar usageLimit
    if (formData.usageLimit) {
      const usageLimit = parseInt(formData.usageLimit);
      if (isNaN(usageLimit) || usageLimit < 1) {
        newErrors.usageLimit = 'El límite de usos debe ser un número entero mayor a 0';
      }
    }
    
    // Validar fechas
    if (formData.startsAt && formData.endsAt) {
      if (new Date(formData.endsAt) <= new Date(formData.startsAt)) {
        newErrors.endsAt = 'La fecha de fin debe ser posterior a la de inicio';
      }
    }
    
    // Validar alcance
    if (!formData.scopeAll && formData.scopeCategoryIds.length === 0 && formData.scopeProductIds.length === 0) {
      newErrors.scope = 'Debes seleccionar al menos una categoría o producto';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    const scope: PromotionScope = {
      all: formData.scopeAll,
      categoryIds: formData.scopeAll ? undefined : formData.scopeCategoryIds,
      productIds: formData.scopeAll ? undefined : formData.scopeProductIds,
    };
    
    const couponData = {
      code: formData.code.trim().toUpperCase(),
      type: formData.type,
      value: parseFloat(formData.value),
      minSubtotal: formData.minSubtotal ? parseFloat(formData.minSubtotal) : undefined,
      startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : undefined,
      endsAt: formData.endsAt ? new Date(formData.endsAt).toISOString() : undefined,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
      isActive: formData.isActive,
      scope,
      stackable: formData.stackable,
    };
    
    if (editingCoupon) {
      updateCoupon(editingCoupon.id, couponData);
      auditLog({
        action: 'COUPON_UPDATED',
        entity: {
          type: 'coupon',
          id: editingCoupon.id,
          label: couponData.code,
        },
        changes: [
          { field: 'coupon', oldValue: editingCoupon.code, newValue: couponData.code }
        ]
      });
      showToast('Cupón actualizado correctamente', 'success');
    } else {
      const newCoupon = addCoupon(couponData);
      auditLog({
        action: 'COUPON_CREATED',
        entity: {
          type: 'coupon',
          id: newCoupon.id,
          label: newCoupon.code,
        },
        changes: []
      });
      showToast('Cupón creado correctamente', 'success');
    }
    
    setIsDialogOpen(false);
  };

  const handleToggle = (coupon: Coupon) => {
    toggleCoupon(coupon.id);
    auditLog({
      action: 'COUPON_TOGGLED',
      entity: {
        type: 'coupon',
        id: coupon.id,
        label: coupon.code,
      },
      changes: [
        { field: 'isActive', oldValue: coupon.isActive.toString(), newValue: (!coupon.isActive).toString() }
      ]
    });
    showToast(`Cupón ${!coupon.isActive ? 'activado' : 'desactivado'}`, 'success');
  };

  const handleDelete = (coupon: Coupon) => {
    if (confirm('¿Estás seguro de eliminar este cupón?')) {
      deleteCoupon(coupon.id);
      auditLog({
        action: 'COUPON_DELETED',
        entity: {
          type: 'coupon',
          id: coupon.id,
          label: coupon.code,
        },
        changes: []
      });
      showToast('Cupón eliminado', 'success');
    }
  };

  const handleResetUsage = (coupon: Coupon) => {
    if (confirm('¿Estás seguro de reiniciar el contador de usos?')) {
      resetUsageCount(coupon.id);
      auditLog({
        action: 'COUPON_RESET_USEDCOUNT',
        entity: {
          type: 'coupon',
          id: coupon.id,
          label: coupon.code,
        },
        changes: [
          { field: 'usedCount', oldValue: coupon.usedCount.toString(), newValue: '0' }
        ]
      });
      showToast('Contador reiniciado', 'success');
    }
  };

  const getStatusBadge = (coupon: Coupon) => {
    const status = getPromotionStatus(coupon.isActive, coupon.startsAt, coupon.endsAt);
    
    const variants = {
      ACTIVE: { label: 'Activo', variant: 'default' as const },
      SCHEDULED: { label: 'Programado', variant: 'secondary' as const },
      EXPIRED: { label: 'Expirado', variant: 'outline' as const },
      INACTIVE: { label: 'Inactivo', variant: 'outline' as const },
    };
    
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getScopeLabel = (scope: PromotionScope) => {
    if (scope.all) return 'Todos los productos';
    
    const parts: string[] = [];
    if (scope.categoryIds && scope.categoryIds.length > 0) {
      parts.push(`${scope.categoryIds.length} categorías`);
    }
    if (scope.productIds && scope.productIds.length > 0) {
      parts.push(`${scope.productIds.length} productos`);
    }
    
    return parts.join(', ') || 'Sin alcance';
  };

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
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Nuevo Cupón
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PromotionStatus | 'ALL')}>
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
              : 'Crea tu primer cupón para ofrecer descuentos con código'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && (
            <Button onClick={openCreateDialog}>
              <Plus className="size-4" />
              Crear Cupón
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descuento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Min. Subtotal</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Alcance</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <code className="font-mono font-medium bg-muted px-2 py-1 rounded">
                      {coupon.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {coupon.type === 'PERCENT' ? `${coupon.value}%` : `$${coupon.value.toFixed(2)}`}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(coupon)}</TableCell>
                  <TableCell className="text-sm">
                    {coupon.minSubtotal ? (
                      <span>${coupon.minSubtotal.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {coupon.usageLimit ? (
                      <span>
                        {coupon.usedCount} / {coupon.usageLimit}
                      </span>
                    ) : (
                      <span>{coupon.usedCount} / ∞</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {coupon.startsAt || coupon.endsAt ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="size-3" />
                        <span>
                          {coupon.startsAt ? new Date(coupon.startsAt).toLocaleDateString() : '∞'}
                          {' - '}
                          {coupon.endsAt ? new Date(coupon.endsAt).toLocaleDateString() : '∞'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin límite</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Target className="size-3" />
                      {getScopeLabel(coupon.scope)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(coupon)}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(coupon)}
                      >
                        {coupon.isActive ? (
                          <PowerOff className="size-4" />
                        ) : (
                          <Power className="size-4" />
                        )}
                      </Button>
                      {hasPermission('user:manage') && coupon.usedCount > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResetUsage(coupon)}
                          title="Reiniciar contador"
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(coupon)}
                      >
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

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}
            </DialogTitle>
            <DialogDescription>
              {editingCoupon ? 'Modifica los detalles del cupón' : 'Crea un nuevo código de descuento'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Código */}
            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="Ej: VERANO2026"
                maxLength={20}
                className="font-mono"
              />
              {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
              <p className="text-xs text-muted-foreground">
                El código será convertido a mayúsculas y sin espacios
              </p>
            </div>

            {/* Tipo y Valor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Descuento *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: DiscountType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Porcentaje (%)</SelectItem>
                    <SelectItem value="FIXED">Monto Fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valor *</Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === 'PERCENT' ? '1-90' : '0.00'}
                  step={formData.type === 'PERCENT' ? '1' : '0.01'}
                />
                {errors.value && <p className="text-sm text-destructive">{errors.value}</p>}
              </div>
            </div>

            {/* Subtotal mínimo y límite de usos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minSubtotal">Subtotal Mínimo</Label>
                <Input
                  id="minSubtotal"
                  type="number"
                  value={formData.minSubtotal}
                  onChange={(e) => setFormData({ ...formData, minSubtotal: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                />
                {errors.minSubtotal && <p className="text-sm text-destructive">{errors.minSubtotal}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="usageLimit">Límite de Usos</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="Ilimitado"
                  step="1"
                  min="1"
                />
                {errors.usageLimit && <p className="text-sm text-destructive">{errors.usageLimit}</p>}
              </div>
            </div>

            {/* Vigencia */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Fecha de Inicio</Label>
                <Input
                  id="startsAt"
                  type="date"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">Fecha de Fin</Label>
                <Input
                  id="endsAt"
                  type="date"
                  value={formData.endsAt}
                  onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                />
                {errors.endsAt && <p className="text-sm text-destructive">{errors.endsAt}</p>}
              </div>
            </div>

            {/* Alcance */}
            <div className="space-y-2">
              <Label>Alcance *</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={formData.scopeAll}
                    onChange={() => setFormData({ ...formData, scopeAll: true })}
                  />
                  <span>Todos los productos</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!formData.scopeAll}
                    onChange={() => setFormData({ ...formData, scopeAll: false })}
                  />
                  <span>Productos/Categorías específicas</span>
                </label>
              </div>
              {errors.scope && <p className="text-sm text-destructive">{errors.scope}</p>}
            </div>

            {/* Selección de categorías/productos */}
            {!formData.scopeAll && (
              <div className="space-y-4 pl-6 border-l-2">
                <div className="space-y-2">
                  <Label>Categorías</Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                    {categories.filter(c => !c.isArchived).map(cat => (
                      <label key={cat.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.scopeCategoryIds.includes(cat.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                scopeCategoryIds: [...formData.scopeCategoryIds, cat.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                scopeCategoryIds: formData.scopeCategoryIds.filter(id => id !== cat.id)
                              });
                            }
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
                    {products.filter(p => !p.isArchived).map(prod => (
                      <label key={prod.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.scopeProductIds.includes(prod.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                scopeProductIds: [...formData.scopeProductIds, prod.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                scopeProductIds: formData.scopeProductIds.filter(id => id !== prod.id)
                              });
                            }
                          }}
                        />
                        <span className="text-sm">{prod.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Opciones adicionales */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.stackable}
                  onChange={(e) => setFormData({ ...formData, stackable: e.target.checked })}
                />
                <span>Permitir acumulación con promociones</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span>Activar inmediatamente</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingCoupon ? 'Actualizar' : 'Crear'} Cupón
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}