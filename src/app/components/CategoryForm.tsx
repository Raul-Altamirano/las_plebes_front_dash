import React, { useState, useEffect } from 'react';
import { type Category, type CategoryFormData } from '../types/category';
import { generateSlug } from '../store/CategoryContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { AlertCircle } from 'lucide-react';

interface CategoryFormProps {
  category?: Category;
  isNameAvailable: (name: string, currentId?: string) => boolean;
  isSlugAvailable: (slug: string, currentId?: string) => boolean;
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
}

export function CategoryForm({
  category,
  isNameAvailable,
  isSlugAvailable,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '');
  const [slug, setSlug] = useState(category?.slug || '');
  const [description, setDescription] = useState(category?.description || '');
  const [autoGenerateSlug, setAutoGenerateSlug] = useState(!category);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generar slug mientras el usuario escribe el nombre
  useEffect(() => {
    if (autoGenerateSlug && name) {
      setSlug(generateSlug(name));
    }
  }, [name, autoGenerateSlug]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar nombre
    if (!name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (!isNameAvailable(name, category?.id)) {
      newErrors.name = 'Este nombre ya está en uso';
    }

    // Validar slug
    if (!slug.trim()) {
      newErrors.slug = 'El slug es requerido';
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      newErrors.slug = 'El slug solo puede contener letras minúsculas, números y guiones';
    } else if (!isSlugAvailable(slug, category?.id)) {
      newErrors.slug = 'Este slug ya está en uso';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleSlugChange = (value: string) => {
    setAutoGenerateSlug(false);
    setSlug(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nombre */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Nombre <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Botas, Botines, Accesorios"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.name}
          </p>
        )}
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">
          Slug <span className="text-red-500">*</span>
        </Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="botas-vaqueras"
          className={errors.slug ? 'border-red-500' : ''}
        />
        <p className="text-xs text-gray-500">
          El slug se usa en URLs. Solo letras minúsculas, números y guiones.
        </p>
        {errors.slug && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.slug}
          </p>
        )}
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción breve de la categoría"
          rows={3}
        />
      </div>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {category ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
      </div>
    </form>
  );
}
