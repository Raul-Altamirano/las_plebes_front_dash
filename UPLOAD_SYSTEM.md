# Sistema de Subida de Imágenes a S3

## Descripción

Este dashboard incluye un sistema completo de subida de imágenes a S3 mediante URLs firmadas, con las siguientes características:

- ✅ Subida real a S3 con URLs firmadas
- ✅ Drag & Drop + File Picker
- ✅ Validación de tipos: JPEG, PNG, WebP
- ✅ Tamaño máximo: 5MB por archivo
- ✅ Límite: 6 imágenes por producto
- ✅ Progreso individual por archivo
- ✅ Integración con RBAC (permisos `media:upload`)
- ✅ Auditoría completa de todas las acciones
- ✅ Manejo robusto de errores

## Componentes Principales

### 1. ImagePickerV2
Componente principal para subir y gestionar imágenes de productos.

**Ubicación:** `/src/app/components/ImagePickerV2.tsx`

**Características:**
- Drag & Drop de archivos
- File picker tradicional
- Preview de imágenes
- Barra de progreso por archivo
- Marcado de imagen principal
- Solo lectura si no tiene permisos

### 2. UploadProvider
Servicio HTTP para obtener URLs firmadas y subir a S3.

**Ubicación:** `/src/app/services/uploadProvider.ts`

**Funciones principales:**
- `getPresignedUrl()`: Obtiene URL firmada del backend
- `uploadToSignedUrl()`: Sube archivo con XMLHttpRequest y progreso
- `uploadFileToS3()`: Función completa todo-en-uno
- `generateUniqueFileName()`: Genera nombres únicos y seguros

### 3. Types
Tipos TypeScript para el sistema de upload.

**Ubicación:** `/src/app/types/upload.ts`

## Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Endpoint para obtener URLs firmadas
VITE_PRESIGN_ENDPOINT=https://bqpimqkhkl.execute-api.us-east-1.amazonaws.com/dev/vehicles/upload-url

# Carpeta destino en S3 (default: products)
VITE_UPLOAD_FOLDER=products

# (Opcional) URL base de S3
# VITE_S3_BASE_URL=https://your-bucket.s3.amazonaws.com
```

### Deploy en Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega las variables:
   - `VITE_PRESIGN_ENDPOINT`
   - `VITE_UPLOAD_FOLDER`
   - `VITE_S3_BASE_URL` (opcional)

## Backend - Formato de Presign

### Request (POST)

```json
{
  "fileName": "1707145234567_abc123_foto.jpg",
  "fileType": "image/jpeg",
  "folder": "products"
}
```

### Response Esperada

El mapper es robusto y soporta múltiples formatos:

**Opción 1 - Completo:**
```json
{
  "uploadUrl": "https://bucket.s3.amazonaws.com/...",
  "publicUrl": "https://bucket.s3.amazonaws.com/products/file.jpg",
  "key": "products/1707145234567_abc123_foto.jpg"
}
```

**Opción 2 - Mínimo:**
```json
{
  "signedUrl": "https://bucket.s3.amazonaws.com/...",
  "fileKey": "products/1707145234567_abc123_foto.jpg"
}
```

**Opción 3 - Solo URL:**
```json
{
  "url": "https://bucket.s3.amazonaws.com/...",
  "path": "products/1707145234567_abc123_foto.jpg"
}
```

## Permisos RBAC

Para subir imágenes, el usuario debe tener el permiso `media:upload`:

- ✅ **SUPER_ADMIN**: Tiene el permiso
- ✅ **ADMIN**: Tiene el permiso
- ✅ **CATALOG**: Tiene el permiso
- ❌ **OPS**: NO tiene el permiso (solo lectura)
- ❌ **VIEWER**: NO tiene el permiso (solo lectura)

## Auditoría

Todas las acciones de imágenes se registran en el audit log:

- `IMAGE_UPLOADED`: Subida exitosa con publicUrl y key
- `IMAGE_UPLOAD_FAILED`: Error al subir con mensaje de error
- `IMAGE_ADDED`: Imagen agregada al producto
- `IMAGE_REMOVED`: Imagen eliminada del producto
- `IMAGE_SET_PRIMARY`: Imagen marcada como principal

## Uso en Código

### Ejemplo Básico

```tsx
import { ImagePickerV2 } from './components/ImagePickerV2';

function ProductForm() {
  const [images, setImages] = useState<ProductImage[]>([]);

  return (
    <ImagePickerV2
      images={images}
      onChange={setImages}
      error={errors.images}
    />
  );
}
```

### Ejemplo con Permisos

```tsx
import { ImagePickerV2 } from './components/ImagePickerV2';
import { useAuth } from './store/AuthContext';

function ProductForm() {
  const { hasPermission } = useAuth();
  const [images, setImages] = useState<ProductImage[]>([]);

  return (
    <ImagePickerV2
      images={images}
      onChange={setImages}
      disabled={!hasPermission('media:upload')}
    />
  );
}
```

## Validaciones

### Tipos de Archivo
Solo se permiten:
- `image/jpeg`
- `image/png`
- `image/webp`

### Tamaño Máximo
- 5 MB por archivo

### Cantidad Máxima
- 6 imágenes por producto

## Estructura de Datos

### ProductImage

```typescript
interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
}
```

### UploadProgress

```typescript
interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}
```

## Manejo de Errores

El sistema maneja errores en múltiples niveles:

1. **Validación de archivo** (frontend)
   - Tipo no permitido
   - Tamaño excedido
   - Límite de archivos alcanzado

2. **Error de presign** (backend)
   - Endpoint no disponible
   - Respuesta inválida
   - Sin uploadUrl en respuesta

3. **Error de subida** (S3)
   - Network error
   - Status >= 400
   - Upload aborted

Todos los errores se muestran al usuario y se registran en el audit log.

## Mejoras Futuras

Posibles mejoras para implementar:

- [ ] Compresión de imágenes antes de subir
- [ ] Recorte/edición de imágenes
- [ ] Vista previa en lightbox
- [ ] Reordenamiento con drag & drop
- [ ] Subida paralela de múltiples archivos
- [ ] Reintentos automáticos en caso de error
- [ ] Cache de URLs firmadas
- [ ] Soporte para videos

## Troubleshooting

### "No upload URL returned from presign endpoint"

**Causa:** El backend no devolvió una URL válida.

**Solución:** Verifica que el endpoint devuelva `uploadUrl`, `signedUrl` o `url`.

### "Could not determine public URL for uploaded file"

**Causa:** El backend no devolvió `publicUrl` y no hay `VITE_S3_BASE_URL` configurada.

**Solución:** Configura `VITE_S3_BASE_URL` o actualiza el backend para devolver `publicUrl`.

### "CORS error"

**Causa:** El bucket de S3 no tiene CORS configurado correctamente.

**Solución:** Agrega la configuración CORS al bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### "403 Forbidden" al subir

**Causa:** La URL firmada expiró o no tiene permisos.

**Solución:** Verifica que el backend genere URLs con permisos correctos y tiempo de expiración adecuado.

## Contacto

Si tienes problemas con el sistema de subida, revisa:
1. Variables de entorno en Vercel
2. Configuración del bucket S3
3. Permisos del rol IAM
4. Logs del audit log en el dashboard
