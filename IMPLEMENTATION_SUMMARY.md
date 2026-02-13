# Implementación: Sistema de Subida de Imágenes a S3

## ✅ Completado

### A) HttpPresignUploadProvider
- ✅ Servicio HTTP que llama al endpoint de presign
- ✅ Mapper robusto para diferentes formatos de respuesta
- ✅ Soporte para `uploadUrl`, `signedUrl`, `url`
- ✅ Soporte para `publicUrl`, `fileUrl`, `fileURL`, `finalUrl`
- ✅ Construcción de publicUrl desde key si es necesario
- ✅ Ubicación: `/src/app/services/uploadProvider.ts`

### B) Subida PUT con Progreso Real
- ✅ Implementación con XMLHttpRequest (no fetch para tener progreso)
- ✅ PUT a uploadUrl con Content-Type del archivo
- ✅ Reporte de progreso por archivo (0-100%)
- ✅ Manejo de errores (status >= 400, network, abort)
- ✅ Función: `uploadToSignedUrl()`

### C) ImagePickerV2 para Productos
- ✅ Drag & Drop funcional
- ✅ File picker tradicional
- ✅ Validación de tipos: JPEG, PNG, WebP
- ✅ Validación de tamaño: máximo 5MB
- ✅ Subida múltiple: hasta 6 imágenes
- ✅ Progreso individual por archivo
- ✅ Estados: pending, uploading, success, error
- ✅ Al terminar: agrega a product.images[] con url, isPrimary, alt
- ✅ Ubicación: `/src/app/components/ImagePickerV2.tsx`

### D) Parámetros para Presign
- ✅ `fileName`: generado único con timestamp y random string
- ✅ `fileType`: usa file.type del archivo
- ✅ `folder`: usa "products" por defecto (configurable con env var)
- ✅ Función: `generateUniqueFileName()`

### E) Permisos RBAC
- ✅ Verifica permiso `media:upload`
- ✅ Si no tiene permiso: ImagePicker en modo solo lectura
- ✅ Sin botones de agregar/eliminar si no tiene permiso
- ✅ Mensaje claro indicando falta de permisos

### F) Auditoría
- ✅ Evento `IMAGE_UPLOADED`: incluye publicUrl y key
- ✅ Evento `IMAGE_UPLOAD_FAILED`: incluye fileName y error
- ✅ Evento `IMAGE_REMOVED`: heredado de implementación anterior
- ✅ Evento `IMAGE_SET_PRIMARY`: heredado de implementación anterior
- ✅ Integración completa con AuditContext

### G) Variables de Entorno
- ✅ `VITE_PRESIGN_ENDPOINT`: endpoint del backend (con default)
- ✅ `VITE_UPLOAD_FOLDER`: carpeta destino en S3 (default: "products")
- ✅ `VITE_S3_BASE_URL`: (opcional) URL base del bucket
- ✅ Archivo `.env.example` creado
- ✅ Archivo `vercel.json` con configuración

## 📁 Archivos Creados/Modificados

### Nuevos Archivos
1. `/src/app/types/upload.ts` - Types para el sistema de upload
2. `/src/app/services/uploadProvider.ts` - Servicio de upload a S3
3. `/src/app/components/ImagePickerV2.tsx` - Componente principal
4. `/.env.example` - Ejemplo de variables de entorno
5. `/UPLOAD_SYSTEM.md` - Documentación completa del sistema
6. `/DEPLOYMENT.md` - Guía de deployment en Vercel
7. `/vercel.json` - Configuración de Vercel

### Archivos Modificados
1. `/src/app/types/audit.ts` - Agregados eventos IMAGE_UPLOADED e IMAGE_UPLOAD_FAILED
2. `/src/app/store/AuditContext.tsx` - Agregadas funciones de auditoría
3. `/src/app/pages/ProductFormNew.tsx` - Integrado ImagePickerV2 en lugar de ImagePickerV1

### Archivos Sin Cambios (compatibilidad)
- `/src/app/components/ImagePickerV1.tsx` - Mantenido para referencia
- `/src/app/data/mockProducts.ts` - ProductImage sigue igual
- Todos los demás archivos del proyecto

## 🔧 Configuración Requerida

### En Vercel (Environment Variables)
```bash
VITE_PRESIGN_ENDPOINT=https://bqpimqkhkl.execute-api.us-east-1.amazonaws.com/dev/vehicles/upload-url
VITE_UPLOAD_FOLDER=products
```

### En AWS Lambda/API Gateway
El endpoint debe recibir:
```json
{
  "fileName": "1707145234567_abc123_foto.jpg",
  "fileType": "image/jpeg",
  "folder": "products"
}
```

Y devolver:
```json
{
  "uploadUrl": "https://presigned-url...",
  "publicUrl": "https://public-url...",
  "key": "products/filename.jpg"
}
```

### En S3 Bucket
CORS Configuration:
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

## 🧪 Testing

### Test Manual Paso a Paso

1. **Deploy a Vercel**
   ```bash
   vercel --prod
   ```

2. **Configura variables de entorno en Vercel Dashboard**
   - Settings → Environment Variables
   - Agrega `VITE_PRESIGN_ENDPOINT` y `VITE_UPLOAD_FOLDER`

3. **Redeploy para aplicar cambios**
   ```bash
   vercel --prod --force
   ```

4. **Prueba la aplicación**
   - Ve a Productos → Nuevo Producto
   - En la sección "Imágenes", intenta:
     - [ ] Drag & drop de una imagen JPEG
     - [ ] File picker con una imagen PNG
     - [ ] Archivo muy grande (>5MB) - debe dar error
     - [ ] Archivo no permitido (.pdf) - debe dar error
     - [ ] Múltiples archivos a la vez
   - Verifica:
     - [ ] Barra de progreso aparece
     - [ ] Imagen se muestra al completar
     - [ ] URL es de S3
     - [ ] Evento en Audit Log

5. **Prueba permisos RBAC**
   - Cambia rol a OPS (no tiene media:upload)
   - Verifica que el ImagePicker esté en solo lectura
   - Cambia rol a CATALOG (tiene media:upload)
   - Verifica que puedas subir imágenes

6. **Verifica Audit Log**
   - Ve a la página de Auditoría
   - Busca eventos:
     - IMAGE_UPLOADED
     - IMAGE_UPLOAD_FAILED (si hubo errores)

## 🚨 Troubleshooting Común

### Error: "No upload URL returned"
**Solución:** Verifica que el endpoint de presign esté correcto y responda con `uploadUrl`

### Error: "CORS error"
**Solución:** Agrega configuración CORS al bucket S3

### Error: "403 Forbidden"
**Solución:** Verifica permisos IAM del rol de Lambda

### Imágenes no se cargan
**Solución:** Verifica que `publicUrl` sea accesible públicamente

## 📊 Estado de Permisos por Rol

| Rol | Puede Subir Imágenes | Puede Ver Imágenes | Notas |
|-----|---------------------|-------------------|-------|
| SUPER_ADMIN | ✅ Sí | ✅ Sí | Acceso completo |
| ADMIN | ✅ Sí | ✅ Sí | Acceso completo |
| CATALOG | ✅ Sí | ✅ Sí | Puede gestionar catálogo |
| OPS | ❌ No | ✅ Sí | Solo lectura (ajuste de stock) |
| VIEWER | ❌ No | ✅ Sí | Solo lectura |

## 🔐 Seguridad

### Implementado
- ✅ Validación de tipo de archivo en frontend
- ✅ Validación de tamaño en frontend
- ✅ Nombres de archivo únicos y seguros
- ✅ Permisos RBAC
- ✅ Auditoría completa

### Recomendaciones Adicionales
- 🔄 Validación de tipo en backend
- 🔄 Validación de tamaño en backend
- 🔄 Rate limiting por IP/usuario
- 🔄 Virus scanning
- 🔄 Encriptación SSE-S3

## 📈 Próximos Pasos Sugeridos

1. **Mejoras de UX**
   - Compresión de imágenes antes de subir
   - Recorte/edición de imágenes
   - Vista previa en lightbox
   - Reordenamiento con drag & drop

2. **Optimización**
   - Subida paralela de múltiples archivos
   - Reintentos automáticos
   - Cache de URLs firmadas
   - CDN (CloudFront)

3. **Features Adicionales**
   - Soporte para videos
   - Múltiples carpetas/categorías
   - Búsqueda de imágenes
   - Biblioteca de medios compartida

## 📝 Notas Importantes

1. **Compatibilidad:** ImagePickerV1 sigue disponible para referencia, pero ProductFormNew usa ImagePickerV2

2. **Folder por defecto:** Aunque el backend usa "vehicles", el dashboard usa "products" por defecto. Esto es configurable con `VITE_UPLOAD_FOLDER`

3. **URLs públicas:** El sistema asume que las URLs de S3 son públicas. Si usas bucket privado, necesitas CloudFront o URL firmada para lectura

4. **Persistencia:** Las imágenes solo se guardan en el estado del producto. No hay tabla separada de "Media Library"

5. **Audit Log:** Se guarda en localStorage. En producción, considera mover a backend para persistencia real

## ✨ Características Destacadas

- 🎨 **UX Premium:** Drag & drop fluido, progreso en tiempo real
- 🔒 **Seguro:** Validaciones múltiples, permisos RBAC
- 📱 **Responsive:** Funciona en desktop y mobile
- 🐛 **Robusto:** Manejo completo de errores
- 📊 **Observable:** Audit log detallado
- 🚀 **Performante:** Progreso real con XHR, sin bloqueo de UI

---

**Estado:** ✅ LISTO PARA DEPLOY

**Última actualización:** 2026-02-05
