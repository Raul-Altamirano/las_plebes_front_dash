import React, { useState, useEffect } from 'react';
import { type Category, type CategoryFormData, LEVEL_LABELS } from '../types/category';
import { generateSlug } from '../store/CategoryContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { AlertCircle, FolderOpen } from 'lucide-react';

interface CategoryFormProps {
  category?:       Category;
  parentCategory?: Category;
  categories:      Category[];
  isNameAvailable: (name: string, currentId?: string) => boolean;
  isSlugAvailable: (slug: string, currentId?: string) => boolean;
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
}

const HINTS = {
  0: {
    namePlaceholder: 'Ej: Botas, Zapatos, Accesorios',
    nameHint:        'El grupo más general. Agrupa tipos de productos.',
    slugPlaceholder: 'botas',
    descPlaceholder: 'Ej: Todo tipo de botas para hombre y mujer',
  },
  1: {
    namePlaceholder: 'Ej: Botas Texanas, Botines, Mocasines',
    nameHint:        'Un tipo específico dentro del departamento.',
    slugPlaceholder: 'botas-texanas',
    descPlaceholder: 'Ej: Botas texanas de diferentes materiales',
  },
  2: {
    namePlaceholder: 'Ej: Cuero Mujer, Sintético Hombre',
    nameHint:        'La clasificación más específica. Aquí van los productos.',
    slugPlaceholder: 'cuero-mujer',
    descPlaceholder: 'Ej: Botas texanas de cuero genuino para mujer',
  },
} as const;

export function CategoryForm({
  category,
  parentCategory,
  isNameAvailable,
  isSlugAvailable,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const rawLevel  = parentCategory ? ((parentCategory.level ?? 0) + 1) : (category?.level ?? 0);
  const level     = Math.min(Math.max(Number(rawLevel) || 0, 0), 2) as 0 | 1 | 2;
  const hints     = HINTS[level] ?? HINTS[0];

  const [name,             setName]             = useState(category?.name        || '');
  const [slug,             setSlug]             = useState(category?.slug        || '');
  const [description,      setDescription]      = useState(category?.description || '');
  const [autoGenerateSlug, setAutoGenerateSlug] = useState(!category);
  const [errors,           setErrors]           = useState<Record<string, string>>({});

  useEffect(() => {
    if (autoGenerateSlug && name) setSlug(generateSlug(name));
  }, [name, autoGenerateSlug]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (!isNameAvailable(name, category?.id)) {
      newErrors.name = 'Este nombre ya está en uso';
    }
    if (!slug.trim()) {
      newErrors.slug = 'El slug es requerido';
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      newErrors.slug = 'Solo letras minúsculas, números y guiones';
    } else if (!isSlugAvailable(slug, category?.id)) {
      newErrors.slug = 'Este slug ya está en uso';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSubmit({
      name:        name.trim(),
      slug:        slug.trim(),
      description: description.trim() || undefined,
      parentId:    parentCategory?.id ?? null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Banner contexto */}
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 flex items-start gap-3">
        <FolderOpen className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          {parentCategory ? (
            <>
              <p className="font-medium text-blue-800">
                {LEVEL_LABELS[level]} dentro de <span className="text-blue-600">"{parentCategory.name}"</span>
              </p>
              <p className="text-blue-600 text-xs mt-0.5">
                Path: <code className="bg-blue-100 px-1 rounded">{parentCategory.path}/{slug || '…'}</code>
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-blue-800">Nuevo departamento</p>
              <p className="text-blue-600 text-xs mt-0.5">Nivel raíz — agrupará categorías del mismo tipo</p>
            </>
          )}
        </div>
      </div>

      {/* Nombre */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={hints.namePlaceholder}
          className={errors.name ? 'border-red-500' : ''}
          autoFocus
        />
        <p className="text-xs text-gray-400">{hints.nameHint}</p>
        {errors.name && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />{errors.name}
          </p>
        )}
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug <span className="text-red-500">*</span></Label>
        <Input
          id="slug"
          value={slug}
          onChange={e => { setAutoGenerateSlug(false); setSlug(e.target.value); }}
          placeholder={hints.slugPlaceholder}
          className={errors.slug ? 'border-red-500' : ''}
        />
        <p className="text-xs text-gray-400">Solo minúsculas, números y guiones. Se genera automáticamente.</p>
        {errors.slug && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />{errors.slug}
          </p>
        )}
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción <span className="text-gray-400 font-normal">(opcional)</span></Label>
        <Textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={hints.descPlaceholder}
          rows={3}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">
          {category ? 'Guardar cambios' : `Crear ${LEVEL_LABELS[level].toLowerCase()}`}
        </Button>
      </div>
    </form>
  );
}