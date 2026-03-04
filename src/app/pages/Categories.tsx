import React, { useState } from 'react';
import { useCategories } from '../store/CategoryContext';
import { useProducts } from '../store/ProductsContext';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { Category } from '../types/category';
import { Button } from '../components/ui/button';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CategoryForm } from '../components/CategoryForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Plus, MoreVertical, Archive, ArchiveRestore, Edit2, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshButton } from '../components/RefreshButton';

export function Categories() {
  const categoriesContext = useCategories();
  const productsContext = useProducts();
  const authContext = useAuth();
  const auditContext = useAudit();

  const {
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
    isNameAvailable,
    isSlugAvailable,
    restoreCategory,
    status,
    lastFetch,
    refresh,
  } = categoriesContext;

  const { products } = productsContext;
  const { hasPermission } = authContext;
  const { auditLog } = auditContext;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [archivingCategory, setArchivingCategory] = useState<Category | null>(null);
  const [restoringCategory, setRestoringCategory] = useState<Category | null>(null);

  const canCreate = hasPermission('category:create');
  const canUpdate = hasPermission('category:update');
  const canArchive = hasPermission('category:archive');

  const getProductsCount = (categoryId: string) =>
    products.filter((p) => p.categoryId === categoryId && !p.isArchived).length;

  const handleCreate = async (data: { name: string; slug: string; description?: string }) => {
    await createCategory(data);
    setIsCreateDialogOpen(false);
  };

  const handleEdit = async (data: { name: string; slug: string; description?: string }) => {
    if (!editingCategory) return;
    await updateCategory(editingCategory.id, data);
    setEditingCategory(null);
  };

  const handleArchive = async () => {
    if (!archivingCategory) return;
    await deleteCategory(archivingCategory.id);
    auditLog({
      action: 'CATEGORY_ARCHIVED',
      entity: { type: 'category', id: archivingCategory.id, label: archivingCategory.name },
    });
    setArchivingCategory(null);
  };

  // Restore: usa updateCategory para marcar isArchived: false
  const handleRestore = async () => {
    if (!restoringCategory) return;
    await restoreCategory(restoringCategory.id, { isArchived: false } as any);
    auditLog({
      action: 'CATEGORY_RESTORED',
      entity: { type: 'category', id: restoringCategory.id, label: restoringCategory.name },
    });
    setRestoringCategory(null);
  };

  // RefreshButton espera FetchStatus con "success", CategoryContext usa "ready"
  // Mapeamos para compatibilidad
  const refreshStatus = status === 'ready' ? 'success' : status;

  const activeCategories = (categories ?? []).filter((c) => !c.deletedAt);
const archivedCategories = (categories ?? []).filter((c) => !!c.deletedAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Categorías</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las categorías de productos de tu catálogo
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshButton status={refreshStatus as any} lastFetch={lastFetch} onRefresh={refresh} />
          {canCreate && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva categoría
            </Button>
          )}
        </div>
      </div>

      {/* Tabla de categorías activas */}
      {activeCategories.length === 0 ? (
        <EmptyState
          icon={<Tag className="w-12 h-12 text-gray-400" />}
          title="No hay categorías"
          description="Comienza creando tu primera categoría"
          action={
            canCreate ? (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear categoría
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última actualización</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCategories.map((category) => {
                const productsCount = getProductsCount(category.id);
                return (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{category.name}</div>
                        {category.description && (
                          <div className="text-sm text-gray-500 mt-0.5">{category.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{category.slug}</code>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-700">{productsCount}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">Activa</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(category.updatedAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {(canUpdate || canArchive) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canUpdate && (
                              <DropdownMenuItem onClick={() => setEditingCategory(category)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {canArchive && (
                              <DropdownMenuItem
                                onClick={() => setArchivingCategory(category)}
                                className="text-red-600"
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                Archivar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Categorías archivadas */}
      {archivedCategories.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Categorías archivadas</h2>
          <div className="bg-white rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="font-medium text-gray-500">{category.name}</div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                        {category.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Archivada</Badge>
                    </TableCell>
                    <TableCell>
                      {canArchive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRestoringCategory(category)}
                        >
                          <ArchiveRestore className="w-4 h-4 mr-2" />
                          Restaurar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Dialog de creación */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
            <DialogDescription>Crea una nueva categoría para organizar tus productos</DialogDescription>
          </DialogHeader>
          <CategoryForm
            isNameAvailable={isNameAvailable}
            isSlugAvailable={isSlugAvailable}
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de edición */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
            <DialogDescription>Actualiza la información de la categoría</DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              category={editingCategory}
              isNameAvailable={isNameAvailable}
              isSlugAvailable={isSlugAvailable}
              onSubmit={handleEdit}
              onCancel={() => setEditingCategory(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm dialog para archivar */}
      {archivingCategory && (
        <ConfirmDialog
          isOpen={true}
          title="Archivar categoría"
          description={
            <>
              <p>¿Estás seguro de que deseas archivar la categoría "{archivingCategory.name}"?</p>
              {getProductsCount(archivingCategory.id) > 0 && (
                <p className="mt-2 text-yellow-700 bg-yellow-50 p-3 rounded-md text-sm">
                  ⚠️ Esta categoría tiene {getProductsCount(archivingCategory.id)} producto(s) asociado(s). Los
                  productos conservarán la categoría, pero esta no aparecerá en los selectores.
                </p>
              )}
            </>
          }
          confirmText="Archivar"
          cancelText="Cancelar"
          onConfirm={handleArchive}
          onCancel={() => setArchivingCategory(null)}
          variant="warning"
        />
      )}

      {/* Confirm dialog para restaurar */}
      {restoringCategory && (
        <ConfirmDialog
          isOpen={true}
          title="Restaurar categoría"
          description={`¿Deseas restaurar la categoría "${restoringCategory.name}"? Volverá a estar disponible en los selectores.`}
          confirmText="Restaurar"
          cancelText="Cancelar"
          onConfirm={handleRestore}
          onCancel={() => setRestoringCategory(null)}
        />
      )}
    </div>
  );
}
