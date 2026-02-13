# Checklist Pre-Deploy ✅

## 📋 Checklist de Verificación

Usa este checklist antes de hacer deploy a producción.

### 1. Código y Build

- [ ] El proyecto compila sin errores (`npm run build` o `pnpm build`)
- [ ] No hay warnings críticos en la consola
- [ ] Todos los tipos TypeScript están correctos
- [ ] No hay imports faltantes
- [ ] Los componentes se cargan correctamente en desarrollo

### 2. Variables de Entorno

- [ ] `.env.example` está actualizado con todas las variables
- [ ] Las variables están configuradas en Vercel Dashboard
- [ ] `VITE_PRESIGN_ENDPOINT` apunta al endpoint correcto
- [ ] `VITE_UPLOAD_FOLDER` está configurado correctamente
- [ ] (Opcional) `VITE_S3_BASE_URL` está configurado si es necesario

### 3. Backend (AWS)

#### Lambda / API Gateway
- [ ] El endpoint de presign está deployado
- [ ] El endpoint responde correctamente (test con Postman/curl)
- [ ] Devuelve `uploadUrl`, `publicUrl`, y `key`
- [ ] Timeout configurado (recomendado: 30 segundos)
- [ ] Variables de entorno configuradas en Lambda

#### S3 Bucket
- [ ] El bucket existe y está accesible
- [ ] CORS configurado correctamente
- [ ] Los origins permitidos incluyen tu dominio de Vercel
- [ ] Bucket Policy permite GetObject (si es público)
- [ ] Folder "products" existe (o se crea automáticamente)

#### IAM
- [ ] El rol de Lambda tiene permisos s3:PutObject
- [ ] El rol de Lambda tiene permisos s3:GetObject
- [ ] El rol de Lambda tiene permisos s3:PutObjectAcl (si es necesario)

### 4. Funcionalidades

#### Subida de Imágenes
- [ ] El área de drag & drop funciona
- [ ] El file picker funciona
- [ ] Se validan los tipos de archivo (JPEG, PNG, WebP)
- [ ] Se valida el tamaño máximo (5MB)
- [ ] Se muestra la barra de progreso
- [ ] Las imágenes se agregan al producto al completar
- [ ] Las URLs de las imágenes son correctas (S3)
- [ ] Las imágenes se ven correctamente en el preview

#### Gestión de Imágenes
- [ ] Puedes eliminar imágenes
- [ ] Puedes marcar una imagen como principal
- [ ] La primera imagen es principal por defecto
- [ ] El límite de 6 imágenes funciona

#### Permisos RBAC
- [ ] SUPER_ADMIN puede subir imágenes
- [ ] ADMIN puede subir imágenes
- [ ] CATALOG puede subir imágenes
- [ ] OPS NO puede subir imágenes (solo lectura)
- [ ] VIEWER NO puede subir imágenes (solo lectura)
- [ ] El mensaje de permisos se muestra correctamente

#### Auditoría
- [ ] Evento IMAGE_UPLOADED se registra
- [ ] Evento IMAGE_UPLOAD_FAILED se registra en caso de error
- [ ] Evento IMAGE_REMOVED se registra
- [ ] Evento IMAGE_SET_PRIMARY se registra
- [ ] Los eventos incluyen toda la información necesaria
- [ ] El audit log se muestra correctamente en la página de Auditoría

### 5. UX y Diseño

- [ ] El componente es responsive (desktop y mobile)
- [ ] Los colores y estilos son consistentes
- [ ] Los mensajes de error son claros
- [ ] Los estados de carga son visibles
- [ ] Los iconos se muestran correctamente
- [ ] Las animaciones son fluidas
- [ ] No hay texto cortado o desbordado

### 6. Manejo de Errores

#### Errores de Red
- [ ] Se muestra error si el endpoint no responde
- [ ] Se muestra error si hay problema de CORS
- [ ] Se muestra error si la URL firmada expiró
- [ ] Los errores se registran en el audit log

#### Errores de Validación
- [ ] Error claro si el tipo de archivo no es permitido
- [ ] Error claro si el tamaño excede el límite
- [ ] Error claro si se alcanza el límite de imágenes
- [ ] Los errores no bloquean el resto de la aplicación

### 7. Performance

- [ ] La carga de imágenes no bloquea la UI
- [ ] Múltiples uploads funcionan simultáneamente
- [ ] El progreso se actualiza suavemente
- [ ] No hay memory leaks (revisar en DevTools)
- [ ] Las imágenes grandes no causan lag

### 8. Seguridad

- [ ] No hay API keys hardcodeadas en el código
- [ ] Las variables de entorno son privadas (prefijo VITE_)
- [ ] Las URLs firmadas tienen tiempo de expiración
- [ ] No se exponen datos sensibles en logs del cliente
- [ ] Los permisos RBAC funcionan correctamente

### 9. Compatibilidad

- [ ] Funciona en Chrome
- [ ] Funciona en Firefox
- [ ] Funciona en Safari
- [ ] Funciona en Edge
- [ ] Funciona en móviles (iOS y Android)

### 10. Deploy en Vercel

- [ ] El proyecto está conectado a Vercel
- [ ] Las variables de entorno están configuradas
- [ ] El dominio está configurado (si aplica)
- [ ] SSL está activo
- [ ] El build se completa sin errores
- [ ] La aplicación se carga correctamente en producción

## 🧪 Tests Funcionales

### Test 1: Subida Exitosa
1. Ir a Productos → Nuevo Producto
2. Arrastrar una imagen JPEG al área de drop
3. Verificar que se muestre la barra de progreso
4. Verificar que la imagen se agregue correctamente
5. Verificar que la URL sea de S3
6. Guardar el producto
7. Verificar que se vea en la lista de productos

**Resultado esperado:** ✅ Imagen subida y visible

### Test 2: Validación de Tipo
1. Ir a Productos → Nuevo Producto
2. Intentar subir un archivo .pdf
3. Verificar que se muestre error de tipo no permitido

**Resultado esperado:** ❌ Error claro, subida rechazada

### Test 3: Validación de Tamaño
1. Ir a Productos → Nuevo Producto
2. Intentar subir una imagen >5MB
3. Verificar que se muestre error de tamaño excedido

**Resultado esperado:** ❌ Error claro, subida rechazada

### Test 4: Múltiples Archivos
1. Ir a Productos → Nuevo Producto
2. Seleccionar 3 imágenes a la vez
3. Verificar que se suban todas simultáneamente
4. Verificar que cada una tenga su propia barra de progreso

**Resultado esperado:** ✅ Todas las imágenes se suben

### Test 5: Límite de Imágenes
1. Ir a Productos → Nuevo Producto
2. Subir 6 imágenes
3. Intentar subir una 7ma imagen
4. Verificar que se muestre error de límite alcanzado

**Resultado esperado:** ❌ Error claro, 7ma imagen rechazada

### Test 6: Permisos OPS
1. Cambiar rol a OPS
2. Ir a editar un producto existente
3. Verificar que las imágenes sean de solo lectura
4. Verificar que no aparezcan botones de agregar/eliminar

**Resultado esperado:** ✅ Solo lectura, sin botones de edición

### Test 7: Auditoría
1. Subir una imagen
2. Ir a la página de Auditoría
3. Buscar el evento IMAGE_UPLOADED
4. Verificar que incluya la URL y el key

**Resultado esperado:** ✅ Evento registrado con datos completos

### Test 8: Error de Red
1. Desactivar la conexión a internet (o cambiar endpoint a URL inválida)
2. Intentar subir una imagen
3. Verificar que se muestre error de red
4. Verificar que se registre IMAGE_UPLOAD_FAILED

**Resultado esperado:** ❌ Error claro, evento de error registrado

## 🚀 Procedimiento de Deploy

### Paso 1: Pre-deploy
```bash
# Instalar dependencias
pnpm install

# Build local
pnpm build

# Verificar que no haya errores
# Verificar que dist/ se creó correctamente
```

### Paso 2: Configurar Vercel
1. Ir a vercel.com
2. Importar el proyecto desde Git
3. Configurar variables de entorno
4. Framework Preset: Vite
5. Build Command: `pnpm build`
6. Output Directory: `dist`

### Paso 3: Deploy
```bash
# Deploy a preview
vercel

# Deploy a producción
vercel --prod
```

### Paso 4: Verificación Post-Deploy
1. Abrir la URL de producción
2. Ejecutar todos los tests funcionales
3. Revisar Vercel Analytics
4. Revisar CloudWatch Logs (AWS)
5. Monitorear errores en las primeras 24 horas

## 📊 Métricas de Éxito

Después del deploy, monitorea:

- **Tasa de éxito de uploads:** >95%
- **Tiempo promedio de upload:** <5 segundos para imagen de 2MB
- **Errores de red:** <2%
- **Errores de validación:** Esperado (usuarios)
- **Tiempo de carga de página:** <2 segundos
- **Core Web Vitals:** LCP <2.5s, FID <100ms, CLS <0.1

## 🔧 Troubleshooting

Si algo falla:

1. **Revisar variables de entorno en Vercel**
2. **Revisar logs de CloudWatch (Lambda)**
3. **Revisar Network tab en DevTools**
4. **Revisar Console tab en DevTools**
5. **Verificar configuración CORS de S3**
6. **Verificar permisos IAM**
7. **Probar endpoint con Postman**

## 📞 Contactos de Emergencia

- **Backend:** [Contacto del equipo de backend]
- **DevOps:** [Contacto del equipo de DevOps]
- **AWS Support:** [Enlace al support case]

---

**Última actualización:** 2026-02-05

**Status:** ✅ LISTO PARA DEPLOY
