// Tipos para el sistema de subida de archivos a S3

export interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface PresignRequest {
  fileName: string;
  fileType: string;
  folder: string;
}

export interface PresignResponse {
  uploadUrl?: string;
  signedUrl?: string;
  url?: string;
  publicUrl?: string;
  fileUrl?: string;
  fileURL?: string;
  finalUrl?: string;
  key?: string;
  fileKey?: string;
  path?: string;
}

export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  key?: string;
  error?: string;
}

export interface UploadConfig {
  maxSizeBytes: number;
  allowedTypes: string[];
  maxFiles: number;
}

export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFiles: 6,
};
