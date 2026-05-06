import React, { useState } from 'react';
import { useCategories } from '../store/CategoryContext';
import { useProducts } from '../store/ProductsContext';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { Category, LEVEL_LABELS } from '../types/category';
import { Button } from '../components/ui/button';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CategoryForm } from '../components/CategoryForm';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Plus, MoreVertical, Archive, ArchiveRestore, Edit2, Tag, ChevronRight, FolderPlus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshButton } from '../components/RefreshButton';

// ─── Safe date formatter ─────────────────────────────────────────────────────

function safeFormatDate(value: unknown): string {
  if (!value) return '—';
  const raw = typeof value === 'object' && value !== null && '$date' in value
    ? (value as any).$date
    : value;
  const d = new Date(raw as string);
  if (isNaN(d.getTime())) return '—';
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

// ─── Árbol ────────────────────────────────────────────────────────────────────

function buildTree(cats: Category[]) {
  const map = new Map<string, Category & { children: (Category & { children: any[] })[] }>();
  const roots: (Category & { children: any[] })[] = [];
  cats.forEach(c => map.set(c.id, { ...c, children: [] }));
  cats.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parentId) map.get(c.parentId)?.children.push(node);
    else roots.push(node);
  });
  return roots;
}

function flattenTree(
  nodes: (Category & { children: any[] })[],
  depth = 0,
  result: { category: Category; depth: number }[] = []
): { category: Category; depth: number }[] {
  nodes.forEach(node => {
    result.push({ category: node, depth });
    if (node.children?.length) flattenTree(node.children, depth + 1, result);
  });
  return result;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function Categories() {
  const { categories, createCategory, updateCategory, deleteCategory,
          isNameAvailable, isSlugAvailable, restoreCategory,
          status, lastFetch, refresh } = useCategories();
  const { products }      = useProducts();
  const { hasPermission } = useAuth();
  const { auditLog }      = useAudit();

  // parentForCreate = null → departamento raíz | Category → hijo de ese nodo
  const [parentForCreate,   setParentForCreate]   = useState<Category | null | undefined>(undefined);
  const [editingCategory,   setEditingCategory]   = useState<Category | null>(null);
  const [archivingCategory, setArchivingCategory] = useState<Category | null>(null);
  const [restoringCategory, setRestoringCategory] = useState<Category | null>(null);

  const isCreateOpen = parentForCreate !== undefined;

  const canCreate  = hasPermission('category:create');
  const canUpdate  = hasPermission('category:update');
  const canArchive = hasPermission('category:archive');

  const getProductsCount = (id: string) =>
    products.filter(p => p.categoryId === id && !p.isArchived).length;

  const handleCreate = async (data: any) => {
    await createCategory(data);
    setParentForCreate(undefined);
  };

  const handleEdit = async (data: any) => {
    if (!editingCategory) return;
    await updateCategory(editingCategory.id, data);
    setEditingCategory(null);
  };

  const handleArchive = async () => {
    if (!archivingCategory) return;
    await deleteCategory(archivingCategory.id);
    auditLog({ action: 'CATEGORY_ARCHIVED', entity: { type: 'category', id: archivingCategory.id, label: archivingCategory.name } });
    setArchivingCategory(null);
  };

  const handleRestore = async () => {
    if (!restoringCategory) return;
    await restoreCategory(restoringCategory.id);
    auditLog({ action: 'CATEGORY_RESTORED', entity: { type: 'category', id: restoringCategory.id, label: restoringCategory.name } });
    setRestoringCategory(null);
  };

  const activeCategories   = (categories ?? []).filter(c => !c.deletedAt);
  const archivedCategories = (categories ?? []).filter(c => !!c.deletedAt);
  const refreshStatus      = status === 'ready' ? 'success' : status;
  const flatRows           = flattenTree(buildTree(activeCategories));

  const levelRowStyle: Record<number, string> = {
    0: 'bg-blue-50/60',
    1: 'bg-gray-50/40',
    2: '',
  };

  const levelBorderStyle: Record<number, string> = {
    0: 'border-l-4 border-blue-400',
    1: 'border-l-4 border-gray-300',
    2: 'border-l-4 border-gray-100',
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Categorías</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organiza tu catálogo en departamentos, categorías y subcategorías
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshButton status={refreshStatus as any} lastFetch={lastFetch} onRefresh={refresh} />
          {canCreate && (
            <Button onClick={() => setParentForCreate(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo departamento
            </Button>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-5 text-xs text-gray-500">
        {([
          { color: 'bg-blue-400',  label: 'Departamento (nivel 0)' },
          { color: 'bg-gray-300',  label: 'Categoría (nivel 1)' },
          { color: 'bg-gray-200',  label: 'Subcategoría (nivel 2)' },
        ] as const).map(({ color, label }, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${color} inline-block`} />
            {label}
          </span>
        ))}
      </div>

      {/* Árbol */}
      {flatRows.length === 0 ? (
        <EmptyState
          icon={<Tag className="w-12 h-12 text-gray-400" />}
          title="No hay categorías"
          description='Comienza creando tu primer departamento — por ejemplo "Botas" o "Zapatos"'
          action={canCreate ? (
            <Button onClick={() => setParentForCreate(null)}>
              <Plus className="w-4 h-4 mr-2" />Crear departamento
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {flatRows.map(({ category, depth }) => {
                const count    = getProductsCount(category.id);
                const canAddChild = category.level < 2;
                return (
                  <TableRow
                    key={category.id}
                    className={`${levelRowStyle[depth] ?? ''} ${levelBorderStyle[depth] ?? ''}`}
                  >
                    {/* Nombre con indentación */}
                    <TableCell>
                      <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 20}px` }}>
                        {depth > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                        <div>
                          <div className={`font-medium text-gray-900 ${depth === 0 ? 'text-base' : 'text-sm'}`}>
                            {category.name}
                          </div>
                          {category.description && (
                            <div className="text-xs text-gray-400 mt-0.5">{category.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-gray-500">
                        {LEVEL_LABELS[category.level as 0 | 1 | 2]}
                      </span>
                    </TableCell>

                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                        {category.path || category.slug}
                      </code>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm text-gray-700">{count}</span>
                    </TableCell>

                    <TableCell>
                      <Badge variant="success">Activa</Badge>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {safeFormatDate(category.updatedAt)}
                      </span>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* Botón "+" para agregar hijo */}
                        {canCreate && canAddChild && (
<Button
  variant="ghost"
  size="sm"
  title={`Agregar ${LEVEL_LABELS[(category.level + 1) as 1 | 2].toLowerCase()}`}
  onClick={() => {
    console.log('parentForCreate:', JSON.stringify(category));
    setParentForCreate(category);
  }}
>
  <FolderPlus className="w-4 h-4 text-gray-400" />
</Button>
                        )}

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
                                  <Edit2 className="w-4 h-4 mr-2" />Editar
                                </DropdownMenuItem>
                              )}
                              {canArchive && (
                                <DropdownMenuItem
                                  onClick={() => setArchivingCategory(category)}
                                  className="text-red-600"
                                >
                                  <Archive className="w-4 h-4 mr-2" />Archivar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Archivadas */}
      {archivedCategories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-900">Archivadas</h2>
          <div className="bg-white rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedCategories.map(category => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="font-medium text-gray-400">{category.name}</div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-400">
                        {category.path || category.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Archivada</Badge>
                    </TableCell>
                    <TableCell>
                      {canArchive && (
                        <Button variant="ghost" size="sm" onClick={() => setRestoringCategory(category)}>
                          <ArchiveRestore className="w-4 h-4 mr-2" />Restaurar
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

      {/* Dialog crear */}
      <Dialog open={isCreateOpen} onOpenChange={open => !open && setParentForCreate(undefined)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {parentForCreate
                ? `Nueva ${LEVEL_LABELS[(parentForCreate.level + 1) as 1 | 2].toLowerCase()}`
                : 'Nuevo departamento'}
            </DialogTitle>
            <DialogDescription>
              {parentForCreate
                ? `Se agregará dentro de "${parentForCreate.name}"`
                : 'El nivel raíz que agrupa tipos de productos'}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            parentCategory={parentForCreate ?? undefined}
            categories={activeCategories}
            isNameAvailable={isNameAvailable}
            isSlugAvailable={isSlugAvailable}
            onSubmit={handleCreate}
            onCancel={() => setParentForCreate(undefined)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog editar */}
      <Dialog open={!!editingCategory} onOpenChange={open => !open && setEditingCategory(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
            <DialogDescription>Actualiza nombre, slug o descripción</DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              category={editingCategory}
              parentCategory={activeCategories.find(c => c.id === editingCategory.parentId)}
              categories={activeCategories}
              isNameAvailable={isNameAvailable}
              isSlugAvailable={isSlugAvailable}
              onSubmit={handleEdit}
              onCancel={() => setEditingCategory(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm archivar */}
      {archivingCategory && (
        <ConfirmDialog
          isOpen={true}
          title="Archivar categoría"
          description={
            <>
              <p>¿Archivar <strong>"{archivingCategory.name}"</strong>?</p>
              {getProductsCount(archivingCategory.id) > 0 && (
                <p className="mt-2 text-yellow-700 bg-yellow-50 p-3 rounded-md text-sm">
                  ⚠️ Tiene {getProductsCount(archivingCategory.id)} producto(s) asociado(s).
                  Los productos conservarán la referencia pero la categoría no aparecerá en selectores.
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

      {/* Confirm restaurar */}
      {restoringCategory && (
        <ConfirmDialog
          isOpen={true}
          title="Restaurar categoría"
          description={`¿Restaurar "${restoringCategory.name}"? Volverá a aparecer en selectores.`}
          confirmText="Restaurar"
          cancelText="Cancelar"
          onConfirm={handleRestore}
          onCancel={() => setRestoringCategory(null)}
        />
      )}
    </div>
  );
}