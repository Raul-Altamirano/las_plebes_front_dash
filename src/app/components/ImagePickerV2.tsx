import { useState, useRef, useCallback, useEffect, type DragEvent } from 'react';
import { Upload, Star, Loader2, AlertCircle, CheckCircle, Trash2, ImageIcon } from 'lucide-react';
import type { ProductImage } from '../types/product';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { uploadFilesToS3 } from '../services/uploadProvider';
import type { UploadOptions } from '../services/uploadProvider';
import { DEFAULT_UPLOAD_CONFIG } from '../types/upload';
import { ConfirmDialog } from './ConfirmDialog';

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Imagen ya subida a S3 */
type UploadedImage = ProductImage & { _pending?: false };

/** Imagen pendiente — solo en memoria, aún no en S3 */
type PendingImage = {
  id: string;           // tempId
  url: string;          // object URL local para preview
  alt: string;
  isPrimary: boolean;
  _pending: true;
  _file: File;
};

type AnyImage = UploadedImage | PendingImage;

function isPending(img: AnyImage): img is PendingImage {
  return (img as PendingImage)._pending === true;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ImagePickerV2Props {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  error?: string;
  disabled?: boolean;
  maxImages?: number;
  productId?: string;
  categoryId?: string | null;
  sku?: string;
  /** Ref que expone uploadPending() para que el padre lo llame al guardar */
  uploadRef?: React.MutableRefObject<(() => Promise<ProductImage[]>) | null>;
}

const MAX_IMAGES = 6;

// ─── Componente ───────────────────────────────────────────────────────────────

export function ImagePickerV2({
  images,
  onChange,
  error,
  disabled = false,
  maxImages = MAX_IMAGES,
  productId,
  categoryId,
  sku,
  uploadRef,
}: ImagePickerV2Props) {
  const { hasPermission } = useAuth();
  const { auditLog } = useAudit();

  // Lista interna que mezcla imágenes ya subidas + pendientes
  const [allImages, setAllImages] = useState<AnyImage[]>(
    images.map((img) => ({ ...img, _pending: false as const }))
  );
  // Sincronizar cuando las imágenes del producto carguen del BE
useEffect(() => {
  if (images.length > 0 && allImages.filter(i => !isPending(i)).length === 0) {
    setAllImages(images.map((img) => ({ ...img, _pending: false as const })));
  }
}, [images]);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    imageId: string;
    imageUrl: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = hasPermission('media:upload') && !disabled;
  const hasReachedMax = allImages.length >= maxImages;

  // ─── Exponer uploadPending al padre ─────────────────────────────────────────
const uploadPending = useCallback(async (): Promise<ProductImage[] | null> => {
  const pending  = allImages.filter(isPending);
  const uploaded = allImages.filter(i => !isPending(i)) as UploadedImage[];

  // Detectar cambios comparando por key de S3 (no por id temporal)
const getImageFingerprint = (img: any) => img.key || img.url || img.id;

const originalKeysSorted = [...images.map(getImageFingerprint)].sort().join(',');
const currentKeysSorted  = [...uploaded.map(getImageFingerprint)].sort().join(',');


  const hasNewImages      = pending.length > 0;
  const hasRemovedImages  = originalKeysSorted !== currentKeysSorted;
const hasPrimaryChange = uploaded.some(u => {
  const orig = images.find(i => getImageFingerprint(i) === getImageFingerprint(u));
  return orig && orig.isPrimary !== u.isPrimary;
});

  // Si no cambió nada → devolver null para que el padre no mande images al BE
  if (!hasNewImages && !hasRemovedImages && !hasPrimaryChange) return null;

  // Si solo hay cambios en uploaded (eliminadas o cambio de principal) → no subir nada
  if (!hasNewImages) return uploaded.map(({ _pending, ...rest }) => rest as ProductImage);

  // Si hay pendientes → subirlas
  setUploadingIds(new Set(pending.map(p => p.id)));

  const uploadedFiles = await uploadFilesToS3(
    pending.map(p => p._file),
    pending,
    { productId, categoryId: categoryId ?? undefined, sku },
  );

  let pendingIndex = 0;
  const result = allImages.map((img) => {
    if (!isPending(img)) return img;
    const up = uploadedFiles[pendingIndex++];
    URL.revokeObjectURL(img.url);
    return {
      id:        img.id,
      url:       up?.publicUrl ?? img.url,
      alt:       img.alt,
      isPrimary: up?.isPrimary ?? img.isPrimary,
      key:       up?.key,
    };
  });

  setAllImages(result);
  setUploadingIds(new Set());
  return result.filter(i => !isPending(i)) as ProductImage[];

}, [allImages, images, productId, categoryId, sku]);
  // Exponer al padre via ref
  if (uploadRef) uploadRef.current = uploadPending;

  // ─── Selección de archivos ───────────────────────────────────────────────────
  const handleFileSelect = (files: FileList | null) => {
    if (!files || !canUpload) return;

    const fileArray = Array.from(files);
    const availableSlots = maxImages - allImages.length;

    if (availableSlots <= 0) {
      alert(`Máximo ${maxImages} imágenes permitidas`);
      return;
    }

    const filesToAdd = fileArray.slice(0, availableSlots);
    const newPending: PendingImage[] = [];

    for (const file of filesToAdd) {
      if (!DEFAULT_UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
        alert(`Tipo no permitido: ${file.name}\nSolo JPEG, PNG, WebP`);
        continue;
      }
      if (file.size > DEFAULT_UPLOAD_CONFIG.maxSizeBytes) {
        const mb = DEFAULT_UPLOAD_CONFIG.maxSizeBytes / (1024 * 1024);
        alert(`Archivo muy grande: ${file.name}\nMáximo ${mb}MB`);
        continue;
      }

      newPending.push({
        id:        `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url:       URL.createObjectURL(file),
        alt:       file.name.replace(/\.[^/.]+$/, ''),
        isPrimary: allImages.length === 0 && newPending.length === 0,
        _pending:  true,
        _file:     file,
      });
    }

    if (newPending.length > 0) {
      setAllImages((prev) => [...prev, ...newPending]);
    }
  };

  // ─── Eliminar imagen ─────────────────────────────────────────────────────────
  const handleConfirmRemove = () => {
    if (!deleteConfirm) return;

    setAllImages((prev) => {
      const img = prev.find((i) => i.id === deleteConfirm.imageId);

      // Revocar object URL si era pendiente
      if (img && isPending(img)) URL.revokeObjectURL(img.url);

      const filtered = prev.filter((i) => i.id !== deleteConfirm.imageId);

      // Si se eliminó la principal, hacer la primera la principal
      if (filtered.length > 0 && !filtered.some((i) => i.isPrimary)) {
        filtered[0] = { ...filtered[0], isPrimary: true };
      }

      // Notificar al padre solo con las ya subidas
      const uploaded = filtered
        .filter((i): i is UploadedImage => !isPending(i))
        .map(({ _pending, ...rest }) => rest as ProductImage);
      onChange(uploaded);

      return filtered;
    });

    setDeleteConfirm(null);
  };

  // ─── Hacer principal ─────────────────────────────────────────────────────────
  const handleSetPrimary = (id: string) => {
    setAllImages((prev) =>
      prev.map((img) => ({ ...img, isPrimary: img.id === id }))
    );
  };

  // ─── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };
  const handleClickUpload = () => {
    if (canUpload && !hasReachedMax) fileInputRef.current?.click();
  };

  const pendingCount   = allImages.filter(isPending).length;
  const uploadingCount = uploadingIds.size;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Zona de drop */}
      {canUpload && (
        <div>
          {hasReachedMax ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
              <ImageIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700 mb-1">Máximo {maxImages} imágenes</p>
              <p className="text-xs text-gray-500">Elimina una imagen para agregar otra.</p>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClickUpload}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
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
                JPEG, PNG, WebP • Max 5MB • {allImages.length}/{maxImages} imágenes
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sin permisos */}
      {!canUpload && !disabled && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-yellow-50">
          <AlertCircle className="w-10 h-10 mx-auto text-yellow-600 mb-2" />
          <p className="text-sm font-medium text-gray-700">Sin permisos para gestionar imágenes</p>
          <p className="text-xs text-gray-500 mt-1">Necesitas el permiso <strong>media:upload</strong>.</p>
        </div>
      )}

      {/* Banner de pendientes */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          {uploadingCount > 0
            ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>
            {uploadingCount > 0
              ? `Subiendo ${uploadingCount} imagen${uploadingCount > 1 ? 'es' : ''}…`
              : `${pendingCount} imagen${pendingCount > 1 ? 'es' : ''} pendiente${pendingCount > 1 ? 's' : ''} — se subirán al guardar`}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Galería */}
      {allImages.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            Imágenes ({allImages.length}/{maxImages})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {allImages.map((image) => (
              <div
                key={image.id}
                className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                  image.isPrimary ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
                } ${isPending(image) ? 'opacity-90' : ''}`}
              >
                <div className="aspect-square bg-gray-100">
                  <img
                    src={image.url}
                    alt={image.alt || 'Producto'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://placehold.co/400x400/e5e7eb/64748b?text=Error';
                    }}
                  />
                </div>

                {/* Badge principal */}
                {image.isPrimary && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg">
                    <Star className="w-3 h-3 fill-current" />
                    Principal
                  </div>
                )}

                {/* Badge pendiente */}
                {isPending(image) && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-amber-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                    {uploadingIds.has(image.id)
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Subiendo</>
                      : <><CheckCircle className="w-3 h-3" /> Pendiente</>}
                  </div>
                )}

                {/* Botón eliminar */}
                {canUpload && !uploadingIds.has(image.id) && (
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({ isOpen: true, imageId: image.id, imageUrl: image.url })
                    }
                    className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                    title="Eliminar imagen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Hacer principal */}
                {canUpload && !image.isPrimary && !uploadingIds.has(image.id) && (
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allImages.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">
            {canUpload ? 'No hay imágenes. Haz clic arriba para agregar.' : 'No hay imágenes.'}
          </p>
        </div>
      )}

      {/* Confirm eliminar */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="¿Eliminar esta imagen?"
          message="La imagen se eliminará de la lista. Si ya estaba guardada, se borrará al guardar el producto."
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={handleConfirmRemove}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}