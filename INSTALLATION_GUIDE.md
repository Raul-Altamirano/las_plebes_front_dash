# 🚀 Guía de Instalación - Dashboard E-commerce

> **Para:** Deploy local y producción del sistema completo
> **Tiempo estimado:** 10-15 minutos

---

## 📋 **Tabla de Contenidos**

1. [Requisitos Previos](#-requisitos-previos)
2. [Opción 1: Clonar y Descargar](#-opción-1-clonar-y-descargar-recomendado)
3. [Opción 2: Desde Cero Manual](#-opción-2-desde-cero-manual-avanzado)
4. [Instalación de Dependencias](#-instalación-de-dependencias)
5. [Configuración](#-configuración)
6. [Ejecutar en Local](#-ejecutar-en-local)
7. [Deploy a Vercel](#-deploy-a-vercel)
8. [Verificación Post-Instalación](#-verificación-post-instalación)
9. [Troubleshooting](#-troubleshooting)

---

## ✅ **Requisitos Previos**

Antes de empezar, asegúrate de tener instalado:

```bash
# Node.js (versión 18 o superior)
node --version
# Debe mostrar: v18.x.x o superior

# npm (viene con Node.js)
npm --version
# Debe mostrar: 9.x.x o superior

# Git
git --version
# Debe mostrar: git version 2.x.x
```

Si no tienes Node.js instalado, descárgalo desde: https://nodejs.org/

---

## 📦 **Opción 1: Clonar y Descargar (Recomendado)**

### 1️⃣ Descargar el Proyecto

```bash
# Opción A: Si tienes Git
git clone <URL_DEL_REPOSITORIO> las-plebes-ecommerce
cd las-plebes-ecommerce

# Opción B: Si descargaste ZIP
# 1. Descomprime el archivo ZIP
# 2. Renombra la carpeta a "las-plebes-ecommerce"
cd las-plebes-ecommerce
```

### 2️⃣ Instalar Dependencias

```bash
# Con npm (recomendado)
npm install

# O con pnpm (si lo prefieres)
pnpm install

# O con yarn
yarn install
```

> ⏱️ **Tiempo estimado:** 2-5 minutos dependiendo de tu conexión.

### 3️⃣ Listo para Desarrollo

```bash
# Ver la sección "Ejecutar en Local" más abajo
npm run dev
```

---

## 🛠️ **Opción 2: Desde Cero Manual (Avanzado)**

> ⚠️ **Solo para desarrollo avanzado.** Si clonaste el repo, salta a [Configuración](#-configuración).

### 1️⃣ Crear Proyecto Base con Vite

```bash
# Crear proyecto React + TypeScript
npm create vite@latest las-plebes-ecommerce -- --template react-ts

# Entrar al directorio
cd las-plebes-ecommerce

# Instalar dependencias base
npm install
```

### 2️⃣ Copiar Archivos del Proyecto Descargado

Reemplazar/copiar estos archivos y carpetas:

```
las-plebes-ecommerce/
├── src/                    ← COPIAR COMPLETA
│   ├── app/
│   ├── styles/
│   └── types/
├── package.json            ← REEMPLAZAR
├── vite.config.ts          ← REEMPLAZAR
├── tsconfig.json           ← REEMPLAZAR
├── tsconfig.node.json      ← REEMPLAZAR (si existe)
├── postcss.config.mjs      ← COPIAR
├── vercel.json             ← COPIAR
└── *.md                    ← COPIAR (toda la documentación)
```

### 3️⃣ Instalar Dependencias

```bash
npm install
```

Luego continúa con la [Instalación de Dependencias](#-instalación-de-dependencias) si necesitas instalar paquetes adicionales.

---

## 📦 **Instalación de Dependencias**

> 💡 **NOTA:** Si copiaste el `package.json` del proyecto (Opción 1 o 2), **NO NECESITAS** instalar nada más. Solo ejecuta `npm install` y listo.

Las siguientes instrucciones son **solo para referencia** o instalación manual desde cero.

---

### ⚠️ **Versiones Críticas (OBLIGATORIAS)**

Estos paquetes **DEBEN** instalarse con versión específica:

```bash
# React Hook Form (versión específica requerida)
npm install react-hook-form@7.55.0

# Tailwind CSS v4 (el proyecto usa v4, no v3)
npm install -D tailwindcss@4.1.12 @tailwindcss/vite@4.1.12

# Vite (compatibilidad)
npm install -D @vitejs/plugin-react@4.7.0 vite@6.3.5
```

---

### ✅ **Dependencias Principales**

#### UI Components (Radix UI)

```bash
npm install \
  @radix-ui/react-accordion \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar \
  @radix-ui/react-checkbox \
  @radix-ui/react-collapsible \
  @radix-ui/react-context-menu \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-hover-card \
  @radix-ui/react-label \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-popover \
  @radix-ui/react-progress \
  @radix-ui/react-radio-group \
  @radix-ui/react-scroll-area \
  @radix-ui/react-select \
  @radix-ui/react-separator \
  @radix-ui/react-slider \
  @radix-ui/react-slot \
  @radix-ui/react-switch \
  @radix-ui/react-tabs \
  @radix-ui/react-toggle \
  @radix-ui/react-toggle-group \
  @radix-ui/react-tooltip
```

#### Utilidades de Estilos

```bash
npm install \
  class-variance-authority \
  clsx \
  tailwind-merge
```

#### Iconos

```bash
npm install lucide-react
```

#### Material UI (Opcional, para componentes adicionales)

```bash
npm install \
  @mui/material \
  @mui/icons-material \
  @emotion/react \
  @emotion/styled
```

#### Formularios y Validación

```bash
npm install input-otp
```

#### Animaciones

```bash
npm install \
  motion \
  react-slick \
  embla-carousel-react
```

#### Gráficos y Charts

```bash
npm install \
  recharts \
  react-responsive-masonry
```

#### Drag & Drop

```bash
npm install \
  react-dnd \
  react-dnd-html5-backend
```

#### Routing

```bash
npm install react-router
```

> ⚠️ **IMPORTANTE:** Usar `react-router` (NO `react-router-dom` - no funciona en este entorno)

#### Utilidades Generales

```bash
npm install \
  sonner \
  next-themes \
  react-day-picker \
  date-fns \
  @popperjs/core \
  react-popper \
  react-resizable-panels \
  cmdk \
  vaul \
  tw-animate-css
```

---

### 📋 **Comando Todo-en-Uno (Instalación Manual Completa)**

Si prefieres instalar todo de una vez (solo si NO copiaste package.json):

```bash
# Dependencias de producción
npm install \
  @emotion/react@11.14.0 \
  @emotion/styled@11.14.1 \
  @mui/icons-material@7.3.5 \
  @mui/material@7.3.5 \
  @popperjs/core@2.11.8 \
  @radix-ui/react-accordion@1.2.3 \
  @radix-ui/react-alert-dialog@1.1.6 \
  @radix-ui/react-aspect-ratio@1.1.2 \
  @radix-ui/react-avatar@1.1.3 \
  @radix-ui/react-checkbox@1.1.4 \
  @radix-ui/react-collapsible@1.1.3 \
  @radix-ui/react-context-menu@2.2.6 \
  @radix-ui/react-dialog@1.1.6 \
  @radix-ui/react-dropdown-menu@2.1.6 \
  @radix-ui/react-hover-card@1.1.6 \
  @radix-ui/react-label@2.1.2 \
  @radix-ui/react-menubar@1.1.6 \
  @radix-ui/react-navigation-menu@1.2.5 \
  @radix-ui/react-popover@1.1.6 \
  @radix-ui/react-progress@1.1.2 \
  @radix-ui/react-radio-group@1.2.3 \
  @radix-ui/react-scroll-area@1.2.3 \
  @radix-ui/react-select@2.1.6 \
  @radix-ui/react-separator@1.1.2 \
  @radix-ui/react-slider@1.2.3 \
  @radix-ui/react-slot@1.1.2 \
  @radix-ui/react-switch@1.1.3 \
  @radix-ui/react-tabs@1.1.3 \
  @radix-ui/react-toggle@1.1.2 \
  @radix-ui/react-toggle-group@1.1.2 \
  @radix-ui/react-tooltip@1.1.8 \
  class-variance-authority@0.7.1 \
  clsx@2.1.1 \
  cmdk@1.1.1 \
  date-fns@3.6.0 \
  embla-carousel-react@8.6.0 \
  input-otp@1.4.2 \
  lucide-react@0.487.0 \
  motion@12.23.24 \
  next-themes@0.4.6 \
  react-day-picker@8.10.1 \
  react-dnd@16.0.1 \
  react-dnd-html5-backend@16.0.1 \
  react-hook-form@7.55.0 \
  react-popper@2.3.0 \
  react-resizable-panels@2.1.7 \
  react-responsive-masonry@2.7.1 \
  react-router@7.13.0 \
  react-slick@0.31.0 \
  recharts@2.15.2 \
  sonner@2.0.3 \
  tailwind-merge@3.2.0 \
  tw-animate-css@1.3.8 \
  vaul@1.1.2

# Dependencias de desarrollo
npm install -D \
  @tailwindcss/vite@4.1.12 \
  @vitejs/plugin-react@4.7.0 \
  tailwindcss@4.1.12 \
  vite@6.3.5
```

---

## ⚙️ **Configuración**

### 1️⃣ Variables de Entorno (Opcional)

Si vas a usar el sistema de upload a S3, crea un archivo `.env` en la raíz:

```bash
# .env
VITE_PRESIGN_ENDPOINT=https://tu-api-gateway.amazonaws.com/dev/vehicles/upload-url
VITE_UPLOAD_FOLDER=products
```

> 📝 **Nota:** El sistema funciona sin estas variables, pero el upload de imágenes requiere configuración AWS.

### 2️⃣ Verificar Archivos de Configuración

Asegúrate de que estos archivos existen:

```bash
# Verificar
ls -la vite.config.ts
ls -la tsconfig.json
ls -la postcss.config.mjs
ls -la vercel.json
```

Todos deberían existir si clonaste/copiaste el proyecto correctamente.

---

## 🏃 **Ejecutar en Local**

### Modo Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# O con pnpm
pnpm dev

# O con yarn
yarn dev
```

El servidor se ejecutará en:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### Credenciales de Prueba

```
Usuario: super@admin.com
Password: super123

# O cualquiera de estos roles:
admin@admin.com    / admin123
catalog@admin.com  / catalog123
ops@admin.com      / ops123
viewer@admin.com   / viewer123
```

Ver más en [USUARIOS_Y_CREDENCIALES.md](./USUARIOS_Y_CREDENCIALES.md)

---

## 🚀 **Deploy a Vercel**

### Opción 1: Deploy Automático (Recomendado)

```bash
# Instalar Vercel CLI si no lo tienes
npm install -g vercel

# Login en Vercel
vercel login

# Deploy a producción
vercel --prod
```

### Opción 2: Deploy desde GitHub

1. Sube tu código a GitHub
2. Ve a [vercel.com](https://vercel.com)
3. Click en "Import Project"
4. Selecciona tu repositorio
5. Click en "Deploy"

### Variables de Entorno en Vercel

Si usas S3 upload:

```
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   - VITE_PRESIGN_ENDPOINT = <tu-endpoint>
   - VITE_UPLOAD_FOLDER = products
4. Redeploy
```

---

## ✅ **Verificación Post-Instalación**

### Checklist de Verificación

```bash
# ✅ 1. Servidor arranca sin errores
npm run dev

# ✅ 2. Página de login carga
# Abre http://localhost:5173/login

# ✅ 3. Login funciona
# Usa: super@admin.com / super123

# ✅ 4. Dashboard carga
# Deberías ver métricas y gráficas

# ✅ 5. Navegación funciona
# Prueba ir a: Productos, Categorías, etc.

# ✅ 6. RBAC funciona
# Logout y prueba con: viewer@admin.com / viewer123
# No deberías ver botones de edición

# ✅ 7. Auditoría funciona
# Ve a Configuración → Auditoría
# Deberías ver eventos AUTH_LOGIN_SUCCESS
```

### Rutas Principales

```
http://localhost:5173/login          → Login
http://localhost:5173/dashboard      → Dashboard principal
http://localhost:5173/products       → Gestión de productos
http://localhost:5173/categories     → Categorías
http://localhost:5173/orders         → Pedidos
http://localhost:5173/customers      → Clientes
http://localhost:5173/promotions     → Promociones
http://localhost:5173/coupons        → Cupones
http://localhost:5173/rma            → Cambios y Devoluciones
http://localhost:5173/coverage       → Cobertura de entregas
http://localhost:5173/settings/users → Usuarios y Roles
http://localhost:5173/settings/audit → Auditoría
```

---

## 🔧 **Troubleshooting**

### ❌ Error: "Cannot find module 'react-router'"

```bash
# Solución: Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### ❌ Error: "Failed to resolve import figma:asset/..."

```bash
# Solución: El logo ya está configurado localmente
# Si ves este error, verifica que existe:
ls -la src/assets/logo.svg

# Si no existe, revisa la guía:
cat LOGO_SETUP.md
```

### ❌ Error: "Vite: Failed to resolve entry"

```bash
# Solución: Verifica que existe /src/app/App.tsx
ls -la src/app/App.tsx

# Si no existe, revisa que copiaste la carpeta /src completa
```

### ❌ Error: "Module not found: Can't resolve 'lucide-react'"

```bash
# Solución: Instalar iconos
npm install lucide-react
```

### ❌ Página en blanco después del login

```bash
# Solución: Verifica la consola del navegador
# Presiona F12 → Console
# Si ves errores de "router", reinstala react-router:
npm install react-router@7.13.0
```

### ❌ Estilos rotos / Tailwind no funciona

```bash
# Solución: Reinstalar Tailwind v4
npm install -D tailwindcss@4.1.12 @tailwindcss/vite@4.1.12

# Verifica postcss.config.mjs existe
cat postcss.config.mjs
```

### ❌ Error: "react-hook-form" issues

```bash
# Solución: Instalar versión específica
npm install react-hook-form@7.55.0 --force
```

### ❌ Build falla en Vercel

```bash
# Solución:
1. Verifica package.json tenga:
   "build": "vite build"

2. Verifica vite.config.ts existe

3. En Vercel:
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
```

---

## 📚 **Documentación Adicional**

```
📄 README.md                     → Resumen del proyecto
📄 RESUMEN_ES.md                 → Resumen en español
📄 QUICK_START.md                → Inicio rápido (sistema upload)
📄 DEPLOYMENT.md                 → Guía de deploy detallada
📄 USUARIOS_Y_CREDENCIALES.md   → Lista de usuarios de prueba
📄 AUDIT_SYSTEM.md              → Sistema de auditoría
📄 LOGIN_SYSTEM_README.md       → Sistema de autenticación
📄 PRE_DEPLOY_CHECKLIST.md      → Checklist pre-deploy
📄 MIGRATION_NOTES.md           → Notas de migración
```

---

## 🎯 **Próximos Pasos**

```bash
# 1. ✅ Instalar dependencias
npm install

# 2. ✅ Ejecutar en local
npm run dev

# 3. ✅ Probar login
# → super@admin.com / super123

# 4. ✅ Explorar módulos
# → Productos, Categorías, Pedidos, etc.

# 5. ✅ Deploy a Vercel
vercel --prod

# 6. 🎉 ¡Listo para usar!
```

---

## 🆘 **¿Necesitas Ayuda?**

### Checklist de Debug

```bash
# 1. Verifica versión de Node
node --version
# Debe ser v18.x.x o superior

# 2. Borra caché y reinstala
rm -rf node_modules package-lock.json
npm install

# 3. Verifica que package.json tenga todas las dependencias
cat package.json

# 4. Revisa logs de error
npm run dev
# Lee los errores en consola

# 5. Verifica estructura de archivos
ls -la src/app/App.tsx
ls -la vite.config.ts
ls -la package.json
```

### Archivos Críticos

Si algo falla, verifica que estos archivos existen y están completos:

```
✅ /package.json            → Todas las dependencias
✅ /vite.config.ts          → Configuración de Vite
✅ /tsconfig.json           → Configuración de TypeScript
✅ /postcss.config.mjs      → Configuración de PostCSS
✅ /src/app/App.tsx         → Componente principal
✅ /src/app/routes.ts       → Configuración de rutas
✅ /src/styles/index.css    → Estilos principales
✅ /src/styles/tailwind.css → Estilos de Tailwind
```

---

## 🎉 **¡Éxito!**

Si llegaste hasta aquí y todo funciona:

```
✅ Dependencias instaladas
✅ Servidor corriendo
✅ Login funcionando
✅ Dashboard visible
✅ Navegación completa
✅ RBAC activo
✅ Auditoría registrando

🚀 ¡Listo para development!
🎯 ¡Listo para producción!
```

---

**Última actualización:** 2026-02-12

**Status:** ✅ **PRODUCCIÓN-READY**