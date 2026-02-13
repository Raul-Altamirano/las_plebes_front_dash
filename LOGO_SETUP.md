# 🎨 Configuración del Logo - Guía Rápida

## ✅ **Problema Resuelto**

Los errores de `figma:asset/...` han sido corregidos. Ahora el proyecto usa un logo local profesional.

**Logo actual:** `/src/assets/logo.svg` - Logo placeholder profesional con gradiente azul-morado

---

## 📁 **Ubicación del Logo**

```
/src/assets/logo.svg
```

Este logo SVG se usa en 3 lugares:
1. **SidebarNav** (sidebar desktop)
2. **MobileDrawerNav** (drawer mobile)
3. **Login** (página de login)

---

## 🚀 **Cómo Reemplazar con TU Logo (3 pasos)**

### ✨ **Opción 1: Usar tu Logo PNG/JPG (Más Fácil)**

```bash
# Paso 1: Copia tu logo a la carpeta assets
# Asegúrate que se llame logo.png (o logo.jpg)
cp /ruta/a/tu-logo.png src/assets/logo.png
```

Luego actualiza **3 archivos** (cambia `.svg` por `.png`):

**Archivo 1:** `/src/app/components/SidebarNav.tsx` (línea ~17)
```typescript
// Cambia de:
import logo from '../../assets/logo.svg';
// A:
import logo from '../../assets/logo.png';
```

**Archivo 2:** `/src/app/components/MobileDrawerNav.tsx` (línea ~21)
```typescript
// Cambia de:
import logo from '../../assets/logo.svg';
// A:
import logo from '../../assets/logo.png';
```

**Archivo 3:** `/src/app/pages/Login.tsx` (línea ~7)
```typescript
// Cambia de:
import logo from '../../assets/logo.svg';
// A:
import logo from '../../assets/logo.png';
```

✅ **¡Listo!** Tu logo ahora aparecerá en todo el dashboard.

---

### ✨ **Opción 2: Usar tu Logo SVG (Profesional)**

```bash
# Simplemente reemplaza el archivo SVG actual
cp /ruta/a/tu-logo.svg src/assets/logo.svg
```

✅ **¡Listo!** No necesitas cambiar ningún código, solo reemplaza el archivo.

**Ventajas del SVG:**
- ✅ Escala perfectamente (sin pixelado)
- ✅ Tamaño de archivo pequeño
- ✅ Se ve nítido en pantallas Retina
- ✅ Fácil de editar colores

---

### ✨ **Opción 3: Personalizar el SVG Actual**

Edita `/src/assets/logo.svg`:

```xml
<svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Cambia el color de fondo -->
  <rect width="120" height="40" rx="8" fill="#TU_COLOR"/>
  
  <!-- Cambia el texto -->
  <text x="60" y="25" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">
    TU MARCA
  </text>
</svg>
```

**Colores sugeridos:**
```
Azul actual:   #2563EB
Verde:         #10B981
Morado:        #8B5CF6
Naranja:       #F59E0B
Rojo:          #EF4444
Negro:         #1F2937
```

---

### ✨ **Opción 4: Crear Logo con Figma/Canva**

1. **Crea tu logo** en Figma, Canva, Adobe Illustrator, etc.
2. **Exporta** en formato PNG (alta resolución, fondo transparente)
3. **Tamaño recomendado:**
   - Sidebar: 120x120px (cuadrado)
   - Login: 200x200px (cuadrado)
4. **Copia** a `/src/assets/logo.png`
5. **Actualiza** las importaciones (ver Opción 1)

---

## 📏 **Tamaños Actuales**

### SidebarNav.tsx
```tsx
<img src={logo} alt="Las Plebes" className="w-24 h-24 object-contain mb-2" />
```
- Desktop sidebar: 96x96px (w-24 h-24)

### MobileDrawerNav.tsx
```tsx
<img src={logo} alt="Las Plebes" className="w-20 h-20 object-contain mb-1" />
```
- Mobile drawer: 80x80px (w-20 h-20)

### Login.tsx
```tsx
<img src={logo} alt="Las Plebes Logo" className="w-32 h-32 object-contain" />
```
- Login page: 128x128px (w-32 h-32)

---

## 🎨 **Personalizar Tamaños**

Si quieres cambiar el tamaño del logo, ajusta las clases de Tailwind:

```tsx
// Más pequeño
className="w-16 h-16 object-contain"

// Más grande
className="w-40 h-40 object-contain"

// Rectangular (ancho)
className="w-48 h-24 object-contain"
```

---

## 🚨 **Si Usas Imágenes Externas (URL)**

Si quieres usar una URL externa (no recomendado para producción):

```tsx
// En lugar de importar
import logo from '../../assets/logo.svg';

// Usa directamente en src
<img src="https://tu-dominio.com/logo.png" alt="Logo" />
```

⚠️ **Advertencia:** No recomendado para producción porque:
- Depende de servidor externo
- Más lento
- Puede fallar si la URL cambia

---

## ✅ **Checklist de Verificación**

Después de cambiar el logo, verifica:

```bash
# 1. Desarrollo local
npm run dev

# 2. Verifica estos lugares:
✓ Sidebar izquierdo (desktop)
✓ Drawer móvil (responsive < 1024px)
✓ Página de login (/login)

# 3. Build para producción
npm run build

# 4. Vista previa del build
npm run preview
```

---

## 🐛 **Solución de Problemas**

### Error: "Cannot find module '../../assets/logo.png'"

**Solución:**
```bash
# Verifica que el archivo existe
ls -la src/assets/

# Si no existe, créalo
mkdir -p src/assets
cp tu-logo.png src/assets/logo.png
```

### El logo no se muestra

**Solución:**
1. Verifica la ruta de importación es correcta
2. Verifica el archivo existe
3. Limpia caché:
```bash
rm -rf node_modules/.vite
npm run dev
```

### El logo se ve pixelado

**Solución:**
1. Usa un logo de mayor resolución (mínimo 256x256px)
2. Usa formato SVG en lugar de PNG
3. Exporta PNG con @2x o @3x de resolución

---

## 🎯 **Resultado Final**

Después de configurar tu logo:

```
✅ Logo aparece en sidebar
✅ Logo aparece en mobile drawer
✅ Logo aparece en página de login
✅ No hay errores de "figma:asset"
✅ Build funciona correctamente
```

---

## 📝 **Ejemplo Completo con Logo PNG**

```tsx
// 1. Copia tu logo
cp mi-logo.png src/assets/logo.png

// 2. Actualiza SidebarNav.tsx
import logo from '../../assets/logo.png';

// 3. Actualiza MobileDrawerNav.tsx
import logo from '../../assets/logo.png';

// 4. Actualiza Login.tsx
import logo from '../../assets/logo.png';

// 5. Listo! 🎉
npm run dev
```

---

**Última actualización:** 2026-02-12

**Status:** ✅ **LOGOS LOCALES - SIN ERRORES**