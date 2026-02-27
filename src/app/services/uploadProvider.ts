// src/app/services/uploadProvider.ts
import { createApiClient } from '../../api/http';
import type { UploadResult } from '../types/upload';

// cliente apuntando a catalog igual que products/categories
const catalogFetch = createApiClient(
  (import.meta.env.VITE_CATALOG_BASE_URL as string | undefined) ?? '/api/catalog-products'
);

const DEFAULT_FOLDER = 'products';

export type UploadOptions = {
  folder?: string;
  productId?: string;   // PUT
  categoryId?: string;  // POST
  sku?: string;         // POST
};

export async function getPresignedUrl(
  fileName: string,
  fileType: string,
  options?: UploadOptions
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const uploadFolder = options?.folder || import.meta.env.VITE_UPLOAD_FOLDER || 'productos';

  const data = await catalogFetch<{ uploadUrl: string; publicUrl: string; key: string }>(
    '/uploads/signed-url',
    {
      method: 'POST',
      body: JSON.stringify({
        fileName,
        fileType,
        folder:     uploadFolder,
        productId:  options?.productId  ?? null,
        categoryId: options?.categoryId ?? null,
        sku:        options?.sku        ?? null,
      }),
      label: 'uploads.signedUrl',
    }
  );

  return data;
}

export async function uploadFileToS3(
  file: File,
  options?: UploadOptions,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; key: string }> {
  const uniqueFileName = generateUniqueFileName(file.name);
  const { uploadUrl, publicUrl, key } = await getPresignedUrl(uniqueFileName, file.type, options);
  const result = await uploadToSignedUrl(file, uploadUrl, onProgress);
  if (!result.success) throw new Error(result.error || 'Upload failed');
  return { publicUrl, key };
}