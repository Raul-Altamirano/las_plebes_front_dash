# Ejemplos de Uso - Sistema de Upload

## 1. Uso Básico en Componente

```tsx
import { useState } from 'react';
import { ImagePickerV2 } from './components/ImagePickerV2';
import type { ProductImage } from './data/mockProducts';

export function MyProductForm() {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleImagesChange = (newImages: ProductImage[]) => {
    setImages(newImages);
    // Limpiar error si había
    if (errors.images) {
      const { images, ...rest } = errors;
      setErrors(rest);
    }
  };

  return (
    <div>
      <h3>Imágenes del producto</h3>
      <ImagePickerV2
        images={images}
        onChange={handleImagesChange}
        error={errors.images}
      />
    </div>
  );
}
```

## 2. Con Validación Personalizada

```tsx
import { useState } from 'react';
import { ImagePickerV2 } from './components/ImagePickerV2';
import type { ProductImage } from './data/mockProducts';

export function MyProductForm() {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleImagesChange = (newImages: ProductImage[]) => {
    setImages(newImages);
    
    // Validación personalizada
    if (newImages.length === 0) {
      setErrors({ images: 'Debes agregar al menos una imagen' });
    } else {
      const { images, ...rest } = errors;
      setErrors(rest);
    }
  };

  const handleSubmit = () => {
    // Validar antes de enviar
    if (images.length === 0) {
      setErrors({ images: 'Debes agregar al menos una imagen' });
      return;
    }

    // Continuar con submit...
    console.log('Imágenes válidas:', images);
  };

  return (
    <form onSubmit={handleSubmit}>
      <ImagePickerV2
        images={images}
        onChange={handleImagesChange}
        error={errors.images}
      />
      <button type="submit">Guardar</button>
    </form>
  );
}
```

## 3. Con Control de Permisos

```tsx
import { useState } from 'react';
import { ImagePickerV2 } from './components/ImagePickerV2';
import { useAuth } from './store/AuthContext';
import type { ProductImage } from './data/mockProducts';

export function MyProductForm() {
  const { hasPermission } = useAuth();
  const [images, setImages] = useState<ProductImage[]>([]);

  const canUpload = hasPermission('media:upload');

  return (
    <div>
      {!canUpload && (
        <div className="alert alert-warning">
          No tienes permisos para subir imágenes. Solo puedes ver las existentes.
        </div>
      )}
      
      <ImagePickerV2
        images={images}
        onChange={setImages}
        disabled={!canUpload}
      />
    </div>
  );
}
```

## 4. Con Auditoría Manual

```tsx
import { useState } from 'react';
import { ImagePickerV2 } from './components/ImagePickerV2';
import { useAuth } from './store/AuthContext';
import { useAudit } from './store/AuditContext';
import type { ProductImage } from './data/mockProducts';

export function MyProductForm({ productId, productName }: { productId: string; productName: string }) {
  const { currentUser } = useAuth();
  const { logImageAdded, logImageRemoved, logImageSetPrimary } = useAudit();
  const [images, setImages] = useState<ProductImage[]>([]);

  const handleImagesChange = (newImages: ProductImage[]) => {
    const actor = {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
    };

    // Detectar si se agregó una imagen
    if (newImages.length > images.length) {
      const newImage = newImages[newImages.length - 1];
      logImageAdded(
        { id: productId, name: productName } as any,
        newImage.url,
        actor
      );
    }

    // Detectar si se eliminó una imagen
    if (newImages.length < images.length) {
      const removed = images.find(img => !newImages.some(ni => ni.id === img.id));
      if (removed) {
        logImageRemoved(
          { id: productId, name: productName } as any,
          removed.url,
          actor
        );
      }
    }

    // Detectar si cambió la imagen principal
    const oldPrimary = images.find(img => img.isPrimary);
    const newPrimary = newImages.find(img => img.isPrimary);
    if (oldPrimary?.id !== newPrimary?.id && newPrimary) {
      logImageSetPrimary(
        { id: productId, name: productName } as any,
        newPrimary.url,
        actor
      );
    }

    setImages(newImages);
  };

  return (
    <ImagePickerV2
      images={images}
      onChange={handleImagesChange}
    />
  );
}
```

## 5. Subida Programática (sin ImagePicker)

```tsx
import { uploadFileToS3 } from './services/uploadProvider';

export async function uploadImageProgrammatically(file: File) {
  try {
    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido');
    }

    // Validar tamaño
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Archivo demasiado grande');
    }

    // Subir
    const { publicUrl, key } = await uploadFileToS3(
      file,
      'products', // folder
      (progress) => {
        console.log(`Progreso: ${progress}%`);
      }
    );

    console.log('Subida exitosa!');
    console.log('URL pública:', publicUrl);
    console.log('Key:', key);

    return { publicUrl, key };
  } catch (error) {
    console.error('Error al subir:', error);
    throw error;
  }
}

// Uso
const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const result = await uploadImageProgrammatically(file);
    alert(`Imagen subida: ${result.publicUrl}`);
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
};
```

## 6. Con Estado de Carga Global

```tsx
import { useState } from 'react';
import { ImagePickerV2 } from './components/ImagePickerV2';
import type { ProductImage } from './data/mockProducts';

export function MyProductForm() {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Monitorear estado de subida observando cambios
  // Nota: ImagePickerV2 maneja su propio estado de progreso internamente
  // Este es un ejemplo de cómo podrías trackear si hay uploads en proceso

  return (
    <div>
      <ImagePickerV2
        images={images}
        onChange={setImages}
      />
      
      {isUploading && (
        <div className="mt-2 text-sm text-gray-600">
          Subiendo imágenes...
        </div>
      )}
    </div>
  );
}
```

## 7. Preview Before Upload (No Implementado - Ejemplo Conceptual)

```tsx
// Nota: Esta funcionalidad NO está implementada en ImagePickerV2
// Es un ejemplo de cómo podrías extenderlo

import { useState } from 'react';

export function ImagePreviewExample() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Crear preview local
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    // Aquí iría la lógica de upload real
    console.log('Subir archivo...');
  };

  return (
    <div>
      <input type="file" onChange={handleFileSelect} accept="image/*" />
      
      {previewUrl && (
        <div>
          <img src={previewUrl} alt="Preview" style={{ maxWidth: 200 }} />
          <button onClick={handleUpload}>Subir esta imagen</button>
        </div>
      )}
    </div>
  );
}
```

## 8. Integración con React Hook Form

```tsx
import { useForm, Controller } from 'react-hook-form';
import { ImagePickerV2 } from './components/ImagePickerV2';
import type { ProductImage } from './data/mockProducts';

interface FormData {
  name: string;
  sku: string;
  images: ProductImage[];
}

export function MyProductFormWithRHF() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      sku: '',
      images: [],
    },
  });

  const onSubmit = (data: FormData) => {
    console.log('Form data:', data);
    // Procesar datos...
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Nombre</label>
        <Controller
          name="name"
          control={control}
          rules={{ required: 'El nombre es requerido' }}
          render={({ field }) => (
            <input {...field} />
          )}
        />
        {errors.name && <span>{errors.name.message}</span>}
      </div>

      <div>
        <label>Imágenes</label>
        <Controller
          name="images"
          control={control}
          rules={{ 
            validate: (value) => 
              value.length > 0 || 'Debes agregar al menos una imagen'
          }}
          render={({ field }) => (
            <ImagePickerV2
              images={field.value}
              onChange={field.onChange}
              error={errors.images?.message}
            />
          )}
        />
      </div>

      <button type="submit">Guardar</button>
    </form>
  );
}
```

## 9. Límite Personalizado de Imágenes

```tsx
// Si quieres cambiar el límite de 6 imágenes, necesitas modificar DEFAULT_UPLOAD_CONFIG
// en /src/app/types/upload.ts

// Para un uso específico sin modificar el global:
import { useState } from 'react';
import { ImagePickerV2 } from './components/ImagePickerV2';
import type { ProductImage } from './data/mockProducts';

export function CustomLimitExample() {
  const [images, setImages] = useState<ProductImage[]>([]);
  const MAX_IMAGES = 3; // Límite personalizado

  const handleImagesChange = (newImages: ProductImage[]) => {
    if (newImages.length > MAX_IMAGES) {
      alert(`Máximo ${MAX_IMAGES} imágenes permitidas`);
      return;
    }
    setImages(newImages);
  };

  return (
    <div>
      <p className="text-sm text-gray-600 mb-2">
        Máximo {MAX_IMAGES} imágenes ({images.length}/{MAX_IMAGES})
      </p>
      <ImagePickerV2
        images={images}
        onChange={handleImagesChange}
      />
    </div>
  );
}
```

## 10. Test de Endpoints (Desarrollo)

```tsx
// Componente de prueba para verificar la conexión con el backend
import { useState } from 'react';
import { getPresignedUrl, uploadToSignedUrl } from './services/uploadProvider';

export function UploadTest() {
  const [status, setStatus] = useState<string>('Listo');
  const [result, setResult] = useState<any>(null);

  const testPresign = async () => {
    setStatus('Obteniendo URL firmada...');
    try {
      const data = await getPresignedUrl('test.jpg', 'image/jpeg', 'products');
      setStatus('✅ Presign OK');
      setResult(data);
      console.log('Presign result:', data);
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
      setResult(null);
    }
  };

  const testUpload = async (file: File) => {
    setStatus('Obteniendo URL firmada...');
    try {
      const { uploadUrl } = await getPresignedUrl(
        file.name,
        file.type,
        'products'
      );
      
      setStatus('Subiendo archivo...');
      const uploadResult = await uploadToSignedUrl(
        file,
        uploadUrl,
        (progress) => {
          setStatus(`Subiendo... ${progress}%`);
        }
      );
      
      if (uploadResult.success) {
        setStatus('✅ Upload OK');
        setResult(uploadResult);
      } else {
        setStatus(`❌ Upload falló: ${uploadResult.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-4">Test de Upload</h3>
      
      <div className="space-y-2">
        <button
          onClick={testPresign}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Test Presign
        </button>

        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) testUpload(file);
          }}
          className="block"
        />
      </div>

      <div className="mt-4 p-2 bg-gray-100 rounded">
        <strong>Status:</strong> {status}
      </div>

      {result && (
        <pre className="mt-4 p-2 bg-gray-100 rounded overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

## Notas Importantes

1. **ImagePickerV2 maneja su propio estado de progreso**: No necesitas trackear manualmente el progreso de subida

2. **Auditoría automática**: Los eventos IMAGE_UPLOADED e IMAGE_UPLOAD_FAILED se registran automáticamente dentro de ImagePickerV2

3. **Permisos**: El componente verifica automáticamente el permiso `media:upload`

4. **Validaciones**: Las validaciones de tipo y tamaño se hacen en el componente antes de iniciar la subida

5. **Múltiples subidas**: El componente puede manejar múltiples archivos simultáneamente, cada uno con su propia barra de progreso
