import { useState, useRef, type DragEvent } from 'react';
import { Upload, X, Star, Loader2, AlertCircle, CheckCircle, Trash2, ImageIcon } from 'lucide-react';
import type { ProductImage } from '../types/product';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { uploadFileToS3 } from '../services/uploadProvider';
import { DEFAULT_UPLOAD_CONFIG, type UploadProgress } from '../types/upload';
import { ConfirmDialog } from './ConfirmDialog';

interface ImagePickerV2Props {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  error?: string;
  disabled?: boolean;
  maxImages?: number;
  productId?: string; // Para auditoría
}

const MAX_IMAGES = 6;

export function ImagePickerV2({ 
  images, 
  onChange, 
  error, 
  disabled = false,
  maxImages = MAX_IMAGES,
  productId 
}: ImagePickerV2Props) {
  const { currentUser, hasPermission } = useAuth();
  const { logImageUploaded, logImageUploadFailed, auditLog } = useAudit();
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgresses, setUploadProgresses] = useState<Record<string, UploadProgress>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; imageId: string; imageUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar permisos
  const canUpload = hasPermission('media:upload') && !disabled;
  const hasReachedMax = images.length >= maxImages;

  const handleFileSelect = (files: FileList | null) => {
    if (!files || !canUpload) return;

    const fileArray = Array.from(files);
    
    // Validar cantidad máxima
    const currentCount = images.length;
    const uploadingCount = Object.values(uploadProgresses).filter(p => p.status === 'uploading' || p.status === 'pending').length;
    const availableSlots = maxImages - currentCount - uploadingCount;
    
    if (availableSlots <= 0) {
      alert(`Máximo ${maxImages} imágenes permitidas`);
      
      // Auditoría: intento de subir más imágenes del límite
      if (productId) {
        auditLog({
          action: 'IMAGE_LIMIT_REACHED',
          entity: {
            type: 'product',
            id: productId,
            label: `Límite de ${maxImages} imágenes`,
          },
          metadata: {
            maxImages,
            currentCount,
            attemptedCount: fileArray.length,
          },
        });
      }
      return;
    }

    const filesToUpload = fileArray.slice(0, availableSlots);

    // Validar cada archivo
    for (const file of filesToUpload) {
      // Validar tipo
      if (!DEFAULT_UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
        alert(`Tipo de archivo no permitido: ${file.name}\nSolo se permiten: JPEG, PNG, WebP`);
        continue;
      }

      // Validar tamaño
      if (file.size > DEFAULT_UPLOAD_CONFIG.maxSizeBytes) {
        const maxSizeMB = DEFAULT_UPLOAD_CONFIG.maxSizeBytes / (1024 * 1024);
        alert(`Archivo demasiado grande: ${file.name}\nTamaño máximo: ${maxSizeMB}MB`);
        continue;
      }

      // Iniciar subida
      uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Inicializar progreso
    setUploadProgresses(prev => ({
      ...prev,
      [tempId]: {
        fileName: file.name,
        progress: 0,
        status: 'uploading',
      },
    }));

    try {
      // Subir a S3
      const { publicUrl, key } = await uploadFileToS3(
        file,
        import.meta.env.VITE_UPLOAD_FOLDER || 'products',
        (progress) => {
          setUploadProgresses(prev => ({
            ...prev,
            [tempId]: {
              ...prev[tempId],
              progress,
              status: 'uploading',
            },
          }));
        }
      );

      // Marcar como completado
      setUploadProgresses(prev => ({
        ...prev,
        [tempId]: {
          ...prev[tempId],
          progress: 100,
          status: 'success',
        },
      }));

      // Auditoría: imagen subida exitosamente
      logImageUploaded(publicUrl, key, {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      });

      // Agregar a la lista de imágenes
      const newImage: ProductImage = {
        id: Math.random().toString(36).substring(7),
        url: publicUrl,
        alt: file.name.replace(/\.[^/.]+$/, ''), // Nombre sin extensión
        isPrimary: images.length === 0, // Primera imagen es principal
      };

      onChange([...images, newImage]);

      // Limpiar progreso después de 2 segundos
      setTimeout(() => {
        setUploadProgresses(prev => {
          const updated = { ...prev };
          delete updated[tempId];
          return updated;
        });
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      
      // Marcar como error
      setUploadProgresses(prev => ({
        ...prev,
        [tempId]: {
          ...prev[tempId],
          status: 'error',
          error: errorMessage,
        },
      }));

      // Auditoría: error al subir imagen
      logImageUploadFailed(file.name, errorMessage, {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      });

      // Limpiar progreso después de 5 segundos
      setTimeout(() => {
        setUploadProgresses(prev => {
          const updated = { ...prev };
          delete updated[tempId];
          return updated;
        });
      }, 5000);
    }
  };

  const handleRemoveImageClick = (imageId: string, imageUrl: string) => {
    if (!canUpload) return;
    setDeleteConfirm({ isOpen: true, imageId, imageUrl });
  };

  const handleConfirmRemove = () => {
    if (!deleteConfirm) return;
    
    const imageToRemove = images.find(img => img.id === deleteConfirm.imageId);
    const filtered = images.filter(img => img.id !== deleteConfirm.imageId);
    
    // Si removemos la imagen principal, hacer la primera restante principal
    if (filtered.length > 0 && !filtered.some(img => img.isPrimary)) {
      filtered[0].isPrimary = true;
    }
    
    onChange(filtered);

    // Auditoría: imagen eliminada
    if (productId && imageToRemove) {
      auditLog({
        action: 'IMAGE_REMOVED',
        entity: {
          type: 'product',
          id: productId,
          label: `Imagen eliminada`,
        },
        metadata: {
          imageId: deleteConfirm.imageId,
          imageUrl: deleteConfirm.imageUrl,
          wasPrimary: imageToRemove.isPrimary,
        },
      });
    }
    
    setDeleteConfirm(null);
  };

  const handleSetPrimary = (imageId: string) => {
    if (!canUpload) return;

    const updated = images.map(img => ({
      ...img,
      isPrimary: img.id === imageId,
    }));
    onChange(updated);

    // Auditoría: imagen marcada como principal
    if (productId) {
      const image = images.find(img => img.id === imageId);
      if (image) {
        auditLog({
          action: 'IMAGE_SET_PRIMARY',
          entity: {
            type: 'product',
            id: productId,
            label: `Imagen principal actualizada`,
          },
          metadata: {
            imageId,
            imageUrl: image.url,
          },
        });
      }
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (canUpload && !hasReachedMax) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (canUpload && !hasReachedMax) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleClickUpload = () => {
    if (canUpload && !hasReachedMax && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const uploadProgressList = Object.entries(uploadProgresses);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canUpload && (
        <div>
          {hasReachedMax ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
              <ImageIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Máximo {maxImages} imágenes
              </p>
              <p className="text-xs text-gray-500">
                Has alcanzado el límite. Elimina una imagen existente para subir otra.
              </p>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClickUpload}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={DEFAULT_UPLOAD_CONFIG.allowedTypes.join(',')}
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              
              <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Haz clic o arrastra imágenes aquí
              </p>
              <p className="text-xs text-gray-500">
                JPEG, PNG, WebP • Max 5MB por archivo • {images.length}/{maxImages} imágenes
              </p>
            </div>
          )}
        </div>
      )}

      {/* Permission Warning */}
      {!canUpload && !disabled && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-yellow-50">
          <AlertCircle className="w-10 h-10 mx-auto text-yellow-600 mb-2" />
          <p className="text-sm font-medium text-gray-700 mb-1">
            Sin permisos para gestionar imágenes
          </p>
          <p className="text-xs text-gray-500">
            Necesitas el permiso <strong>media:upload</strong> para subir, eliminar o cambiar imágenes principales.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Progress List */}
      {uploadProgressList.length > 0 && (
        <div className="space-y-2">
          {uploadProgressList.map(([id, progress]) => (
            <div
              key={id}
              className="border border-gray-200 rounded-lg p-3 bg-white"
            >
              <div className="flex items-center gap-3">
                {progress.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                )}
                {progress.status === 'success' && (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
                {progress.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {progress.fileName}
                  </p>
                  {progress.status === 'uploading' && (
                    <div className="mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {progress.status === 'error' && progress.error && (
                    <p className="text-xs text-red-600 mt-1">{progress.error}</p>
                  )}
                  {progress.status === 'success' && (
                    <p className="text-xs text-green-600 mt-1">Subida exitosa</p>
                  )}
                </div>
                
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {progress.progress}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Images Gallery Grid */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              Imágenes del producto ({images.length}/{maxImages})
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                  image.isPrimary 
                    ? 'border-blue-500 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Image */}
                <div className="aspect-square bg-gray-100">
                  <img
                    src={image.url}
                    alt={image.alt || 'Producto'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback si la imagen no carga
                      (e.target as HTMLImageElement).src = `https://placehold.co/400x400/e5e7eb/64748b?text=Error`;
                    }}
                  />
                </div>
                
                {/* Primary Badge */}
                {image.isPrimary && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg">
                    <Star className="w-3 h-3 fill-current" />
                    Principal
                  </div>
                )}

                {/* Delete Button in Corner (always visible on hover) */}
                {canUpload && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImageClick(image.id, image.url)}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                    title="Eliminar imagen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* "Hacer principal" button - centered overlay on hover */}
                {canUpload && !image.isPrimary && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(image.id)}
                      className="px-3 py-2 bg-white text-gray-900 rounded-md text-sm font-medium hover:bg-gray-100 flex items-center gap-1.5 shadow-lg"
                    >
                      <Star className="w-4 h-4" />
                      Hacer principal
                    </button>
                  </div>
                )}

                {/* No permissions overlay */}
                {!canUpload && (
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                    title="Sin permisos para gestionar imágenes"
                  >
                    <div className="bg-white rounded-md px-3 py-2 text-xs text-gray-600 shadow-lg">
                      🔒 Sin permisos
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && uploadProgressList.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">
            {canUpload
              ? 'No hay imágenes. Haz clic arriba para agregar.'
              : 'No hay imágenes agregadas.'}
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="¿Eliminar esta imagen?"
          message="Esta acción no se puede deshacer. La imagen será eliminada permanentemente."
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={handleConfirmRemove}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}