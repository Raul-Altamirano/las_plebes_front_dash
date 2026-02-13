# 🔄 Cambio Rápido de Logo - 2 Minutos

## 📋 **Tu Logo → Dashboard en 3 Pasos**

### **Paso 1: Copia tu logo**
```bash
# Copia tu logo a la carpeta assets
cp /ruta/a/mi-logo.png src/assets/logo.png

# O si es SVG (más fácil)
cp /ruta/a/mi-logo.svg src/assets/logo.svg
```

---

### **Paso 2: Solo si usas PNG/JPG**

Si usaste PNG/JPG, actualiza estas 3 líneas:

#### 📄 Archivo 1: `/src/app/components/SidebarNav.tsx`
**Línea 17** - Cambia:
```typescript
import logo from '../../assets/logo.svg';
```
Por:
```typescript
import logo from '../../assets/logo.png';
```

#### 📄 Archivo 2: `/src/app/components/MobileDrawerNav.tsx`
**Línea 21** - Cambia:
```typescript
import logo from '../../assets/logo.svg';
```
Por:
```typescript
import logo from '../../assets/logo.png';
```

#### 📄 Archivo 3: `/src/app/pages/Login.tsx`
**Línea 7** - Cambia:
```typescript
import logo from '../../assets/logo.svg';
```
Por:
```typescript
import logo from '../../assets/logo.png';
```

---

### **Paso 3: Verifica**
```bash
npm run dev
# Abre http://localhost:5173/login
```

---

## ✅ **Verifica que tu logo aparezca en:**
- ✅ Sidebar izquierdo (desktop)
- ✅ Menu hamburguesa (mobile)
- ✅ Página de login

---

## 💡 **Recomendaciones de Tamaño**

### Si usas PNG/JPG:
- **Tamaño ideal:** 512x512px (cuadrado)
- **Formato:** PNG con fondo transparente
- **Resolución:** Mínimo 256x256px, máximo 1024x1024px

### Si usas SVG:
- **Ventaja:** Escala perfectamente a cualquier tamaño
- **Solo reemplaza:** `src/assets/logo.svg` con tu SVG
- **Sin editar código:** ¡Funciona automáticamente! ✨

---

## 🎯 **Versión Ultra-Rápida (SVG)**

```bash
# 1. Reemplaza el SVG
cp mi-logo.svg src/assets/logo.svg

# 2. ¡Listo! No necesitas editar nada más
npm run dev
```

**Tiempo total:** 30 segundos ⚡

---

## 📸 **Ubicaciones del Logo**

```
Login:          [LOGO GRANDE 128x128px]
                Bienvenida

Sidebar:        ┌─────────────────┐
                │                 │
                │  [LOGO 96x96]   │
                │                 │
                │  Dashboard      │
                │  Productos      │
                │  Pedidos        │
                └─────────────────┘

Mobile Menu:    ≡ [LOGO 80x80] Usuario ▼
```

---

## ⚡ **Atajos de Terminal**

```bash
# Ver logo actual
ls -lh src/assets/logo.*

# Reemplazar con tu logo PNG
cp ~/Downloads/mi-logo.png src/assets/logo.png

# Reemplazar con tu logo SVG
cp ~/Downloads/mi-logo.svg src/assets/logo.svg

# Ver cambios en tiempo real
npm run dev
```

---

## 🎨 **Logos de Prueba Gratis**

Si necesitas un logo temporal:
- **Canva:** https://canva.com (crea logo gratis)
- **LogoMakr:** https://logomakr.com (rápido y simple)
- **Hatchful:** https://hatchful.shopify.com (logos e-commerce)

**Exporta en:** PNG (512x512px) con fondo transparente

---

**Creado:** 2026-02-12  
**Tiempo estimado:** 2-3 minutos  
**Dificultad:** 🟢 Fácil
