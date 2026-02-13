# Guía de Deploy - Dashboard E-commerce

## Deploy en Vercel

### 1. Variables de Entorno

Antes de hacer deploy, configura las siguientes variables de entorno en Vercel:

#### Settings → Environment Variables

```
VITE_PRESIGN_ENDPOINT=https://bqpimqkhkl.execute-api.us-east-1.amazonaws.com/dev/vehicles/upload-url
VITE_UPLOAD_FOLDER=products
```

**Opcional:**
```
VITE_S3_BASE_URL=https://your-bucket.s3.amazonaws.com
```

### 2. Build Settings

Vercel debería detectar automáticamente la configuración, pero verifica:

- **Framework Preset:** Vite
- **Build Command:** `pnpm build` o `npm run build`
- **Output Directory:** `dist` (default)

### 3. Deploy

```bash
# Instala Vercel CLI si no lo tienes
npm i -g vercel

# Deploy
vercel

# Deploy a producción
vercel --prod
```

### 4. Verificación Post-Deploy

1. **Variables de entorno:** Ve a Settings → Environment Variables y verifica que estén configuradas
2. **Upload test:** Intenta subir una imagen en el formulario de producto
3. **Audit log:** Revisa que los eventos se registren correctamente
4. **Permisos:** Prueba con diferentes roles (ADMIN, CATALOG, OPS, VIEWER)

## Configuración del Backend (AWS)

### Lambda / API Gateway

Tu endpoint debe:

1. **Recibir POST con:**
```json
{
  "fileName": "string",
  "fileType": "string",
  "folder": "string"
}
```

2. **Devolver JSON con:**
```json
{
  "uploadUrl": "https://presigned-url...",
  "publicUrl": "https://public-url...",
  "key": "products/filename.jpg"
}
```

### S3 Bucket

1. **CORS Configuration:**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["https://your-domain.vercel.app", "http://localhost:5173"],
    "ExposeHeaders": ["ETag"]
  }
]
```

2. **Bucket Policy** (si es público):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### IAM Role

El rol usado por Lambda debe tener:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

## Troubleshooting

### Error: "Presign request failed"

**Causa:** El backend no está respondiendo o está mal configurado.

**Solución:**
1. Verifica que `VITE_PRESIGN_ENDPOINT` esté correcta en Vercel
2. Prueba el endpoint con Postman/curl
3. Revisa los logs de CloudWatch en Lambda

### Error: "CORS error"

**Causa:** El bucket S3 no permite requests desde tu dominio.

**Solución:**
1. Agrega tu dominio de Vercel a `AllowedOrigins` en CORS
2. Redeploy después de cambiar CORS

### Error: "Upload failed with status 403"

**Causa:** La URL firmada no tiene permisos o expiró.

**Solución:**
1. Verifica que Lambda tenga permisos de `s3:PutObject`
2. Aumenta el tiempo de expiración de la URL firmada
3. Verifica que el bucket permita PutObject

### Imágenes no se ven después de subir

**Causa:** Las URLs públicas no son accesibles.

**Solución:**
1. Verifica que el bucket sea público (o configura CloudFront)
2. Agrega la Bucket Policy para permitir GetObject
3. Verifica que `publicUrl` retornada por el backend sea correcta

## Monitoreo

### Vercel Analytics

Activa Vercel Analytics para monitorear:
- Performance
- Core Web Vitals
- Errores en tiempo real

### CloudWatch (AWS)

Monitorea:
- Invocaciones de Lambda
- Errores 4xx/5xx
- Latencia del API Gateway

### Audit Log Local

El dashboard registra todas las acciones en `localStorage` bajo la key:
```
ecommerce_admin_audit_log
```

## Costos Estimados

### Vercel
- **Hobby Plan:** Gratis (100GB bandwidth)
- **Pro Plan:** $20/mes (1TB bandwidth)

### AWS
- **Lambda:** ~$0.20 por millón de requests
- **S3:** ~$0.023 por GB/mes
- **API Gateway:** ~$3.50 por millón de requests
- **CloudFront (opcional):** ~$0.085 por GB

**Estimado para 1,000 uploads/mes:**
- Lambda: < $0.01
- S3: ~$0.05 (asumiendo 50MB total)
- API Gateway: < $0.01
- **Total: < $0.10/mes**

## Seguridad

### Recomendaciones

1. **Validación de tamaño en backend:** Limita el tamaño máximo de archivos
2. **Validación de tipo en backend:** Solo permite JPEG, PNG, WebP
3. **Rate limiting:** Implementa límites de requests por IP/usuario
4. **Virus scanning:** Usa Lambda para escanear archivos antes de servir
5. **Encriptación:** Usa SSE-S3 o SSE-KMS para encriptar archivos en reposo

### Headers de Seguridad

Agrega en `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## Próximos Pasos

1. ✅ Deploy a staging en Vercel
2. ✅ Configurar variables de entorno
3. ✅ Probar subida de imágenes
4. ✅ Verificar permisos RBAC
5. ✅ Revisar audit log
6. ✅ Deploy a producción
7. 🔄 Configurar dominio custom (opcional)
8. 🔄 Configurar CloudFront (para mejor performance)
9. 🔄 Implementar monitoring con Sentry/DataDog

## Soporte

Para más información:
- [Documentación de Vercel](https://vercel.com/docs)
- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
