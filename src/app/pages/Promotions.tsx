import { useState, useMemo } from 'react';
import { Plus, Edit, Power, PowerOff, Trash2, Tag, Calendar, Target } from 'lucide-react';
import { usePromotions } from '../store/PromotionsContext';
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
import { getPromotionStatus } from '../utils/promotionHelpers';
import type { Promotion, DiscountType, PromotionScope, PromotionStatus } from '../types/promotion';

export default function Promotions() {
  const { promotions, addPromotion, updatePromotion, togglePromotion, deletePromotion } = usePromotions();
  const { categories } = useCategories();
  const { products } = useProducts();
  const { auditLog } = useAudit();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [statusFilter, setStatusFilter] = useState<PromotionStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'PERCENT' as DiscountType,
    value: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
    scopeAll: true,
    scopeCategoryIds: [] as string[],
    scopeProductIds: [] as string[],
    stackable: false,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filtrar promociones
  const filteredPromotions = useMemo(() => {
    let result = promotions.filter(promo => !promo.name.includes('__archived__'));
    
    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(promo =>
        promo.name.toLowerCase().includes(query)
      );
    }
    
    // Filtrar por estado
    if (statusFilter !== 'ALL') {
      result = result.filter(promo => {
        const status = getPromotionStatus(promo.isActive, promo.startsAt, promo.endsAt);
        return status === statusFilter;
      });
    }
    
    return result.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [promotions, searchQuery, statusFilter]);

  const openCreateDialog = () => {
    setEditingPromo(null);
    setFormData({
      name: '',
      type: 'PERCENT',
      value: '',
      startsAt: '',
      endsAt: '',
      isActive: true,
      scopeAll: true,
      scopeCategoryIds: [],
      scopeProductIds: [],
      stackable: false,
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (promo: Promotion) => {
    setEditingPromo(promo);
    setFormData({
      name: promo.name,
      type: promo.type,
      value: promo.value.toString(),
      startsAt: promo.startsAt ? promo.startsAt.split('T')[0] : '',
      endsAt: promo.endsAt ? promo.endsAt.split('T')[0] : '',
      isActive: promo.isActive,
      scopeAll: promo.scope.all,
      scopeCategoryIds: promo.scope.categoryIds || [],
      scopeProductIds: promo.scope.productIds || [],
      stackable: promo.stackable,
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    
    const value = parseFloat(formData.value);
    if (isNaN(value)) {
      newErrors.value = 'El valor debe ser un número';
    } else if (formData.type === 'PERCENT' && (value < 1 || value > 90)) {
      newErrors.value = 'El porcentaje debe estar entre 1 y 90';
    } else if (formData.type === 'FIXED' && value <= 0) {
      newErrors.value = 'El monto debe ser mayor a 0';
    }
    
    if (formData.startsAt && formData.endsAt) {
      if (new Date(formData.endsAt) <= new Date(formData.startsAt)) {
        newErrors.endsAt = 'La fecha de fin debe ser posterior a la de inicio';
      }
    }
    
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
    
    const promoData = {
      name: formData.name.trim(),
      type: formData.type,
      value: parseFloat(formData.value),
      startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : undefined,
      endsAt: formData.endsAt ? new Date(formData.endsAt).toISOString() : undefined,
      isActive: formData.isActive,
      scope,
      stackable: formData.stackable,
    };
    
    if (editingPromo) {
      updatePromotion(editingPromo.id, promoData);
      auditLog({
        action: 'PROMO_UPDATED',
        entity: {
          type: 'promotion',
          id: editingPromo.id,
          label: promoData.name,
        },
        changes: [
          { field: 'promotion', oldValue: editingPromo.name, newValue: promoData.name }
        ]
      });
      showToast('Promoción actualizada correctamente', 'success');
    } else {
      const newPromo = addPromotion(promoData);
      auditLog({
        action: 'PROMO_CREATED',
        entity: {
          type: 'promotion',
          id: newPromo.id,
          label: newPromo.name,
        },
        changes: []
      });
      showToast('Promoción creada correctamente', 'success');
    }
    
    setIsDialogOpen(false);
  };

  const handleToggle = (promo: Promotion) => {
    togglePromotion(promo.id);
    auditLog({
      action: 'PROMO_TOGGLED',
      entity: {
        type: 'promotion',
        id: promo.id,
        label: promo.name,
      },
      changes: [
        { field: 'isActive', oldValue: promo.isActive.toString(), newValue: (!promo.isActive).toString() }
      ]
    });
    showToast(`Promoción ${!promo.isActive ? 'activada' : 'desactivada'}`, 'success');
  };

  const handleDelete = (promo: Promotion) => {
    if (confirm('¿Estás seguro de eliminar esta promoción?')) {
      deletePromotion(promo.id);
      auditLog({
        action: 'PROMO_DELETED',
        entity: {
          type: 'promotion',
          id: promo.id,
          label: promo.name,
        },
        changes: []
      });
      showToast('Promoción eliminada', 'success');
    }
  };

  const getStatusBadge = (promo: Promotion) => {
    const status = getPromotionStatus(promo.isActive, promo.startsAt, promo.endsAt);
    
    const variants = {
      ACTIVE: { label: 'Activa', variant: 'default' as const },
      SCHEDULED: { label: 'Programada', variant: 'secondary' as const },
      EXPIRED: { label: 'Expirada', variant: 'outline' as const },
      INACTIVE: { label: 'Inactiva', variant: 'outline' as const },
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
          <h1 className="text-2xl">Promociones</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona descuentos automáticos para tus productos
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Nueva Promoción
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nombre..."
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
              <Plus className="size-4" />
              Crear Promoción
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
                <TableHead>Stackable</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPromotions.map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell>{promo.name}</TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {promo.type === 'PERCENT' ? `${promo.value}%` : `$${promo.value.toFixed(2)}`}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(promo)}</TableCell>
                  <TableCell className="text-sm">
                    {promo.startsAt || promo.endsAt ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="size-3" />
                        <span>
                          {promo.startsAt ? new Date(promo.startsAt).toLocaleDateString() : '∞'}
                          {' - '}
                          {promo.endsAt ? new Date(promo.endsAt).toLocaleDateString() : '∞'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin límite</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Target className="size-3" />
                      {getScopeLabel(promo.scope)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {promo.stackable && <Badge variant="outline">Sí</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(promo)}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(promo)}
                      >
                        {promo.isActive ? (
                          <PowerOff className="size-4" />
                        ) : (
                          <Power className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(promo)}
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
              {editingPromo ? 'Editar Promoción' : 'Nueva Promoción'}
            </DialogTitle>
            <DialogDescription>
              {editingPromo ? 'Modifica los detalles de la promoción' : 'Crea una nueva promoción automática'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Descuento de Primavera"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
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
                <span>Permitir acumulación con otras promociones</span>
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
              {editingPromo ? 'Actualizar' : 'Crear'} Promoción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}