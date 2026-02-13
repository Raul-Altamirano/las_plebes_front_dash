import { useState } from 'react';
import { Plus, X, Star } from 'lucide-react';
import type { ProductImage } from '../types/product';

interface ImagePickerV1Props {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  error?: string;
}

export function ImagePickerV1({ images, onChange, error }: ImagePickerV1Props) {
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  const handleAddImage = () => {
    if (!imageUrl.trim()) return;

    const newImage: ProductImage = {
      id: Math.random().toString(36).substring(7),
      url: imageUrl.trim(),
      alt: imageAlt.trim() || undefined,
      isPrimary: images.length === 0 // First image is primary by default
    };

    onChange([...images, newImage]);
    setImageUrl('');
    setImageAlt('');
  };

  const handleRemoveImage = (imageId: string) => {
    const filtered = images.filter(img => img.id !== imageId);
    
    // If we removed the primary image, make the first remaining image primary
    if (filtered.length > 0 && !filtered.some(img => img.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    
    onChange(filtered);
  };

  const handleSetPrimary = (imageId: string) => {
    const updated = images.map(img => ({
      ...img,
      isPrimary: img.id === imageId
    }));
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Add Image Form */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL de la imagen
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handleAddImage()}
            />
            <button
              type="button"
              onClick={handleAddImage}
              disabled={!imageUrl.trim()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Texto alternativo (opcional)
          </label>
          <input
            type="text"
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            placeholder="Descripción de la imagen"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            onKeyPress={(e) => e.key === 'Enter' && handleAddImage()}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className={`relative group rounded-lg overflow-hidden border-2 ${
                image.isPrimary ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              <img
                src={image.url}
                alt={image.alt || 'Producto'}
                className="w-full h-32 object-cover"
              />
              
              {/* Primary Badge */}
              {image.isPrimary && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                  <Star className="w-3 h-3 fill-current" />
                  Principal
                </div>
              )}

              {/* Actions Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {!image.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(image.id)}
                    className="px-2 py-1 bg-white text-gray-900 rounded text-xs hover:bg-gray-100 flex items-center gap-1"
                  >
                    <Star className="w-3 h-3" />
                    Hacer principal
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(image.id)}
                  className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">
            No hay imágenes agregadas. Agrega una URL arriba para comenzar.
          </p>
        </div>
      )}
    </div>
  );
}