import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type DragEvent,
} from "react";
import {
  Upload,
  Star,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2,
  ImageIcon,
} from "lucide-react";
import type { ProductImage } from "../types/product";
import { useAuth } from "../store/AuthContext";
import { useAudit } from "../store/AuditContext";
import { uploadFilesToS3 } from "../services/uploadProvider";
import type { UploadOptions } from "../services/uploadProvider";
import { DEFAULT_UPLOAD_CONFIG } from "../types/upload";
import { ConfirmDialog } from "./ConfirmDialog";

type UploadedImage = ProductImage & { _pending?: false };
type PendingImage = {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  _pending: true;
  _file: File;
};
type AnyImage = UploadedImage | PendingImage;
function isPending(img: AnyImage): img is PendingImage {
  return (img as PendingImage)._pending === true;
}

interface ImagePickerV2Props {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  error?: string;
  disabled?: boolean;
  maxImages?: number;
  productId?: string;
  categoryId?: string | null;
  sku?: string;
  uploadRef?: React.MutableRefObject<
    (() => Promise<ProductImage[] | null>) | null
  >;
  variantSku?: string;
}

const MAX_IMAGES = 6;

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
  variantSku,
}: ImagePickerV2Props) {
  const { hasPermission } = useAuth();
  const { auditLog } = useAudit();

  const [allImages, setAllImages] = useState<AnyImage[]>(
    images.map((img) => ({ ...img, _pending: false as const })),
  );

  useEffect(() => {
    if (
      images.length > 0 &&
      allImages.filter((i) => !isPending(i)).length === 0
    ) {
      setAllImages(images.map((img) => ({ ...img, _pending: false as const })));
    }
  }, [images]);

  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    imageId: string;
    imageUrl: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = hasPermission("media:upload") && !disabled;
  const hasReachedMax = allImages.length >= maxImages;

  const uploadPending = useCallback(async (): Promise<
    ProductImage[] | null
  > => {
    const pending = allImages.filter(isPending);
    const uploaded = allImages.filter((i) => !isPending(i)) as UploadedImage[];

    console.log(
      "[uploadPending] allImages:",
      allImages.map((i) => ({
        id: i.id,
        isPending: isPending(i),
        key: (i as any).key,
      })),
    ); // ← agrega
    const getImageFingerprint = (img: any) => img.key || img.url; // ← quita img.id
    const originalKeysSorted = [...images.map(getImageFingerprint)]
      .sort()
      .join(",");
    const currentKeysSorted = [...uploaded.map(getImageFingerprint)]
      .sort()
      .join(",");
    const hasNewImages = pending.length > 0;
    const hasRemovedImages = originalKeysSorted !== currentKeysSorted;
    const hasPrimaryChange = uploaded.some((u) => {
      const orig = images.find(
        (i) => getImageFingerprint(i) === getImageFingerprint(u),
      );
      return orig && orig.isPrimary !== u.isPrimary;
    });
    if (!hasNewImages && !hasRemovedImages && !hasPrimaryChange) return null;
    if (!hasNewImages)
      return uploaded.map(({ _pending, ...rest }) => rest as ProductImage);
    setUploadingIds(new Set(pending.map((p) => p.id)));
    const uploadedFiles = await uploadFilesToS3(
      pending.map((p) => p._file),
      pending,
      { productId, categoryId: categoryId ?? undefined, sku, variantSku },
    );
    let pendingIndex = 0;
    const result = allImages.map((img) => {
      if (!isPending(img)) return img;
      const up = uploadedFiles[pendingIndex++];
      URL.revokeObjectURL(img.url);
      return {
        id: img.id,
        url: up?.publicUrl ?? img.url,
        alt: img.alt,
        isPrimary: up?.isPrimary ?? img.isPrimary,
        key: up?.key,
      };
    });
    setAllImages(result);
    setUploadingIds(new Set());
    return result.filter((i) => !isPending(i)) as ProductImage[];
  }, [allImages, images, productId, categoryId, sku]);

  if (uploadRef) uploadRef.current = uploadPending;

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
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url: URL.createObjectURL(file),
        alt: file.name.replace(/\.[^/.]+$/, ""),
        isPrimary: allImages.length === 0 && newPending.length === 0,
        _pending: true,
        _file: file,
      });
    }
    if (newPending.length > 0) setAllImages((prev) => [...prev, ...newPending]);
  };

  const handleConfirmRemove = () => {
    if (!deleteConfirm) return;
    setAllImages((prev) => {
      const img = prev.find((i) => i.id === deleteConfirm.imageId);
      if (img && isPending(img)) URL.revokeObjectURL(img.url);
      const filtered = prev.filter((i) => i.id !== deleteConfirm.imageId);
      if (filtered.length > 0 && !filtered.some((i) => i.isPrimary))
        filtered[0] = { ...filtered[0], isPrimary: true };
      const uploaded = filtered
        .filter((i): i is UploadedImage => !isPending(i))
        .map(({ _pending, ...rest }) => rest as ProductImage);
      onChange(uploaded);
      return filtered;
    });
    setDeleteConfirm(null);
  };

  const handleSetPrimary = (id: string) =>
    setAllImages((prev) =>
      prev.map((img) => ({ ...img, isPrimary: img.id === id })),
    );
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };
  const handleClickUpload = () => {
    if (canUpload && !hasReachedMax) fileInputRef.current?.click();
  };

  const pendingCount = allImages.filter(isPending).length;
  const uploadingCount = uploadingIds.size;

  return (
    <div className="space-y-4">
      {canUpload && (
        <div>
          {hasReachedMax ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
              <ImageIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Máximo {maxImages} imágenes
              </p>
              <p className="text-xs text-gray-500">
                Elimina una imagen para agregar otra.
              </p>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClickUpload}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={DEFAULT_UPLOAD_CONFIG.allowedTypes.join(",")}
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Haz clic o arrastra imágenes aquí
              </p>
              <p className="text-xs text-gray-500">
                JPEG, PNG, WebP • Max 5MB • {allImages.length}/{maxImages}{" "}
                imágenes
              </p>
            </div>
          )}
        </div>
      )}

      {!canUpload && !disabled && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-yellow-50">
          <AlertCircle className="w-10 h-10 mx-auto text-yellow-600 mb-2" />
          <p className="text-sm font-medium text-gray-700">
            Sin permisos para gestionar imágenes
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Necesitas el permiso <strong>media:upload</strong>.
          </p>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          {uploadingCount > 0 ? (
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>
            {uploadingCount > 0
              ? `Subiendo ${uploadingCount} imagen${uploadingCount > 1 ? "es" : ""}…`
              : `${pendingCount} imagen${pendingCount > 1 ? "es" : ""} pendiente${pendingCount > 1 ? "s" : ""} — se subirán al guardar`}
          </span>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {allImages.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            Imágenes del producto ({allImages.length}/{maxImages})
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {allImages.map((image) => {
              const isHovered = hoveredImageId === image.id;
              const isUploading = uploadingIds.has(image.id);
              return (
                <div
                  key={image.id}
                  onMouseEnter={() => setHoveredImageId(image.id)}
                  onMouseLeave={() => setHoveredImageId(null)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all ${image.isPrimary ? "border-blue-500 shadow-md" : "border-gray-200"} ${isPending(image) ? "opacity-90" : ""}`}
                >
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={image.url}
                      alt={image.alt || "Producto"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/400x400/e5e7eb/64748b?text=Error";
                      }}
                    />
                  </div>

                  {/* Overlay oscuro — solo NO principales */}
                  {!image.isPrimary && (
                    <div
                      className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                      style={{ zIndex: 10, opacity: isHovered ? 0.5 : 0 }}
                    />
                  )}

                  {/* Badge principal */}
                  {image.isPrimary && (
                    <div
                      className="absolute top-2 left-2 flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg"
                      style={{ zIndex: 40 }}
                    >
                      <Star className="w-3 h-3 fill-current" />
                      Principal
                    </div>
                  )}

                  {/* Badge pendiente */}
                  {isPending(image) && (
                    <div
                      className="absolute bottom-2 left-2 flex items-center gap-1 bg-amber-500 text-white text-xs px-2 py-1 rounded shadow-lg"
                      style={{ zIndex: 40 }}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" /> Subiendo
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3" /> Pendiente
                        </>
                      )}
                    </div>
                  )}

                  {/* Botón eliminar */}
                  {canUpload && !isUploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({
                          isOpen: true,
                          imageId: image.id,
                          imageUrl: image.url,
                        });
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all shadow-lg"
                      style={{
                        zIndex: 30,
                        opacity: isHovered ? 1 : 0,
                        visibility: isHovered ? "visible" : "hidden",
                      }}
                      title="Eliminar imagen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Botón hacer principal */}
                  {canUpload && !image.isPrimary && !isUploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimary(image.id);
                      }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-2 bg-white text-gray-900 rounded-md text-sm font-medium hover:bg-gray-100 flex items-center gap-1.5 shadow-lg transition-all"
                      style={{
                        zIndex: 20,
                        opacity: isHovered ? 1 : 0,
                        visibility: isHovered ? "visible" : "hidden",
                      }}
                    >
                      <Star className="w-4 h-4" />
                      Hacer principal
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {allImages.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">
            {canUpload
              ? "No hay imágenes. Haz clic arriba para agregar."
              : "No hay imágenes."}
          </p>
        </div>
      )}

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
