// src/app/services/uploadProvider.ts
import { createApiClient } from '../../api/http';
import type { UploadResult } from '../types/upload';

const catalogFetch = createApiClient(
  (import.meta.env.VITE_CATALOG_BASE_URL as string | undefined) ?? '/api/catalog-products'
);

export type UploadOptions = {
  folder?: string;
  productId?: string;
  categoryId?: string;
  sku?: string;
};

export type PendingImage = {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  _pending: true;
  _file: File;
};

// ─── Presigned URLs ───────────────────────────────────────────────────────────

export async function getPresignedUrls(
  files: Array<{ fileName: string; fileType: string; isPrimary?: boolean }>,
  options?: UploadOptions
): Promise<Array<{ fileName: string; uploadUrl: string; publicUrl: string; key: string; isPrimary: boolean }>> {
  const data = await catalogFetch<{ status: string; data: Array<{ fileName: string; uploadUrl: string; publicUrl: string; key: string; isPrimary: boolean }> }>(
    '/uploads/signed-urls',
    {
      method: 'POST',
      body: JSON.stringify({
        files,
        productId:  options?.productId  ?? null,
        categoryId: options?.categoryId ?? null,
        sku:        options?.sku        ?? null,
      }),
      label: 'uploads.signedUrls',
    }
  );
  // El BE devuelve { status: 'ok', data: [...] }
  return (data as any).data ?? data;
}

// ─── Upload a S3 ──────────────────────────────────────────────────────────────
export async function uploadFilesToS3(
  files: File[],
  pendingImages: PendingImage[],
  options?: UploadOptions,
  onProgress?: (fileName: string, progress: number) => void
): Promise<Array<{ publicUrl: string; key: string; isPrimary: boolean }>> {

  const filesMeta = files.map((f, i) => ({
    fileName:  generateUniqueFileName(f.name),
    fileType:  f.type,
    isPrimary: pendingImages[i]?.isPrimary ?? false,
  }));

  const signedUrls = await getPresignedUrls(filesMeta, options);

  const results = await Promise.allSettled(
    files.map((file, i) =>
      uploadToSignedUrl(file, signedUrls[i].uploadUrl).then((result) => {
        console.log('[uploadFilesToS3] result:', file.name, result);
        if (!result.success) throw new Error(result.error ?? 'Upload failed');
        return {
          publicUrl: signedUrls[i].publicUrl,
          key:       signedUrls[i].key,
          isPrimary: signedUrls[i].isPrimary,
        };
      })
    )
  );

  console.log('[uploadFilesToS3] allSettled:', JSON.stringify(results));

  const uploaded: Array<{ publicUrl: string; key: string; isPrimary: boolean }> = [];
  const failed: string[] = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      uploaded.push(result.value);
    } else {
      console.error('[uploadFilesToS3] failed:', files[i].name, result.reason);
      failed.push(files[i].name);
    }
  });

  if (failed.length > 0) {
    throw new Error(`Fallaron: ${failed.join(', ')}`);
  }

  return uploaded;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateUniqueFileName(originalFileName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  const safeName  = originalFileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_');
  const parts = safeName.split('.');
  const ext   = parts.length > 1 ? parts.pop() : 'jpg';
  const name  = parts.join('_');
  return `${timestamp}_${randomStr}_${name}.${ext}`;
}

export async function uploadToSignedUrl(
  file: File,
  uploadUrl: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
    });
    console.log('[uploadToSignedUrl] status:', response.status, 'ok:', response.ok, file.name);
    // S3 devuelve 200 o 204 en éxito
    if (response.status === 200 || response.status === 204) {
      return { success: true };
    }
    const text = await response.text();
    console.error('[uploadToSignedUrl] error body:', text);
    return { success: false, error: `Upload failed with status ${response.status}` };
  } catch (err) {
    console.error('[uploadToSignedUrl] network error:', err);
    return { success: false, error: 'Network error' };
  }
}
