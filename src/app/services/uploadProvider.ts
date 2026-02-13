// HttpPresignUploadProvider: Servicio para obtener URLs firmadas del backend

import { PresignRequest, PresignResponse, UploadResult } from '../types/upload';

const DEFAULT_PRESIGN_ENDPOINT =
  'https://bqpimqkhkl.execute-api.us-east-1.amazonaws.com/dev/vehicles/upload-url';

const DEFAULT_FOLDER = 'products';

/**
 * Obtiene una URL firmada del backend para subir un archivo a S3
 */
export async function getPresignedUrl(
  fileName: string,
  fileType: string,
  folder?: string
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const endpoint = import.meta.env.VITE_PRESIGN_ENDPOINT || DEFAULT_PRESIGN_ENDPOINT;
  const uploadFolder = folder || import.meta.env.VITE_UPLOAD_FOLDER || DEFAULT_FOLDER;

  const requestBody: PresignRequest = {
    fileName,
    fileType,
    folder: uploadFolder,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Presign request failed: ${response.status} ${response.statusText}`);
    }

    const data: PresignResponse = await response.json();

    // Mapper robusto para diferentes formatos de respuesta
    const uploadUrl = data.uploadUrl || data.signedUrl || data.url;
    if (!uploadUrl) {
      throw new Error('No upload URL returned from presign endpoint');
    }

    // Intentar obtener la URL pública final
    let publicUrl = data.publicUrl || data.fileUrl || data.fileURL || data.finalUrl;
    
    // Si no hay publicUrl pero hay key, intentar construirla
    const key = data.key || data.fileKey || data.path;
    
    if (!publicUrl && key) {
      // Construcción básica de URL pública (puede ajustarse si existe VITE_S3_BASE_URL)
      const baseUrl = import.meta.env.VITE_S3_BASE_URL;
      if (baseUrl) {
        publicUrl = `${baseUrl}/${key}`;
      } else {
        // Si no hay base URL, usar la uploadUrl como aproximación (asumiendo que S3 es público)
        // Esto es una fallback, normalmente el backend debería devolver publicUrl
        publicUrl = uploadUrl.split('?')[0]; // Quitar query params
      }
    }

    if (!publicUrl) {
      throw new Error('Could not determine public URL for uploaded file');
    }

    return {
      uploadUrl,
      publicUrl,
      key: key || fileName,
    };
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    throw error;
  }
}

/**
 * Sube un archivo a S3 usando una URL firmada con seguimiento de progreso
 */
export function uploadToSignedUrl(
  file: File,
  uploadUrl: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Seguimiento de progreso
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        onProgress(percentComplete);
      }
    });

    // Manejo de éxito
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          success: true,
        });
      } else {
        resolve({
          success: false,
          error: `Upload failed with status ${xhr.status}`,
        });
      }
    });

    // Manejo de errores
    xhr.addEventListener('error', () => {
      resolve({
        success: false,
        error: 'Network error during upload',
      });
    });

    xhr.addEventListener('abort', () => {
      resolve({
        success: false,
        error: 'Upload aborted',
      });
    });

    // Iniciar la subida
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Genera un nombre de archivo único y seguro
 */
export function generateUniqueFileName(originalFileName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  
  // Limpiar el nombre original: solo caracteres alfanuméricos, guiones y puntos
  const safeName = originalFileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_');
  
  // Extraer extensión
  const parts = safeName.split('.');
  const ext = parts.length > 1 ? parts.pop() : 'jpg';
  const name = parts.join('_');
  
  return `${timestamp}_${randomStr}_${name}.${ext}`;
}

/**
 * Función principal: sube un archivo completo a S3
 */
export async function uploadFileToS3(
  file: File,
  folder?: string,
  onProgress?: (progress: number) => void
): Promise<{ publicUrl: string; key: string }> {
  // Generar nombre único
  const uniqueFileName = generateUniqueFileName(file.name);
  
  // Obtener URL firmada
  const { uploadUrl, publicUrl, key } = await getPresignedUrl(
    uniqueFileName,
    file.type,
    folder
  );
  
  // Subir archivo
  const result = await uploadToSignedUrl(file, uploadUrl, onProgress);
  
  if (!result.success) {
    throw new Error(result.error || 'Upload failed');
  }
  
  return { publicUrl, key };
}
