# 📊 Estructuras de Datos - Backend & Database Schema

Este documento contiene **todos los modelos de datos** del sistema de ecommerce administración, organizados por módulo/API.

---

## 🔐 **AUTH & PERMISSIONS**

### **SystemUser** (Usuarios del sistema admin)
```typescript
interface SystemUser {
  id: string;
  name: string;
  email: string;
  roleId: string;              // FK a SystemRole
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;           // ISO timestamp
  updatedAt: string;
}
```

### **SystemRole** (Roles personalizables)
```typescript
interface SystemRole {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];    // Array de permisos atómicos
  isSystem: boolean;           // true = no se puede eliminar (SUPER_ADMIN, ADMIN, etc.)
  createdAt: string;
  updatedAt: string;
}
```

### **Permission** (Permisos atómicos - 47 total)
```typescript
type Permission =
  // Products
  | 'product:read' | 'product:create' | 'product:update' | 'product:delete'
  | 'product:publish' | 'inventory:update' | 'media:upload'
  // Categories
  | 'category:read' | 'category:create' | 'category:update' | 'category:archive'
  // Promotions
  | 'promo:read' | 'promo:create' | 'promo:update' | 'promo:toggle'
  // Coupons
  | 'coupon:read' | 'coupon:create' | 'coupon:update' | 'coupon:toggle'
  // Orders
  | 'order:read' | 'order:create' | 'order:update' | 'order:fulfill'
  | 'order:cancel' | 'order:refund'
  // Customers
  | 'customer:read' | 'customer:create' | 'customer:update'
  // Costs & Margins
  | 'cost:read' | 'cost:update'
  // RMA (Returns/Exchanges)
  | 'rma:read' | 'rma:create' | 'rma:update' | 'rma:complete' | 'rma:cancel'
  // Coverage (Delivery zones)
  | 'coverage:read' | 'coverage:update' | 'coverage:import' | 'coverage:export'
  // Users & Roles
  | 'user:manage' | 'role:manage'
  // System
  | 'settings:read' | 'audit:read' | 'audit:purge' | 'report:export';
```

### **Roles predefinidos**
```typescript
type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CATALOG' | 'OPS' | 'VIEWER';
```

---

## 📦 **PRODUCTS**

### **Product**
```typescript
interface Product {
  id: string;
  name: string;
  sku: string;                 // SKU maestro (único)
  price: number;               // Precio base (puede ser sobrescrito por variante)
  stock: number;               // Stock total (si no tiene variantes)
  status: ProductStatus;
  categoryId: string | null;   // FK a Category
  descriptionShort?: string;
  images: ProductImage[];
  updatedAt: string;
  isArchived: boolean;
  
  // Variants
  hasVariants?: boolean;       // Si true, usar variants[]
  variants?: ProductVariant[];
  
  // Costs (COGS)
  cost?: number;               // Costo unitario base (COGS)
  trackCost?: boolean;         // Default: true
}

type ProductStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'OUT_OF_STOCK';
```

### **ProductVariant**
```typescript
interface ProductVariant {
  id: string;
  sku: string;                 // SKU de variante (único)
  options: {
    size?: string;             // Ej: "25", "26", "M", "L"
    color?: string;            // Ej: "Negro", "Café", "Rojo"
  };
  price?: number;              // Si no se define, hereda del producto
  stock: number;
  status?: ProductStatus;      // Si no se define, hereda del producto
  imageUrl?: string;           // Imagen específica de variante (opcional)
  cost?: number;               // COGS específico de variante (hereda de product si no existe)
  updatedAt: string;
}
```

### **ProductImage**
```typescript
interface ProductImage {
  id: string;
  url: string;                 // URL pública (S3 o CDN)
  alt?: string;
  isPrimary: boolean;
}
```

---

## 📂 **CATEGORIES**

### **Category**
```typescript
interface Category {
  id: string;
  name: string;                // Ej: "Botas", "Botines", "Sandalias"
  slug: string;                // URL-friendly (único)
  description?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🎯 **PROMOTIONS & COUPONS**

### **Promotion** (Descuento automático sin código)
```typescript
interface Promotion {
  id: string;
  name: string;
  type: DiscountType;          // 'PERCENT' | 'FIXED'
  value: number;               // PERCENT: 1-90, FIXED: > 0
  startsAt?: string;           // ISO timestamp (opcional)
  endsAt?: string;             // ISO timestamp (opcional)
  isActive: boolean;
  scope: PromotionScope;
  stackable: boolean;          // Puede combinarse con otras
  createdAt: string;
  updatedAt: string;
}
```

### **Coupon** (Descuento con código)
```typescript
interface Coupon {
  id: string;
  code: string;                // UPPERCASE, único (Ej: "VERANO2024")
  type: DiscountType;
  value: number;
  minSubtotal?: number;        // Monto mínimo requerido
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;         // Máximo de usos permitidos
  usedCount: number;           // Contador de usos
  scope: PromotionScope;
  isActive: boolean;
  stackable: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### **PromotionScope** (Alcance del descuento)
```typescript
interface PromotionScope {
  all: boolean;                // Si true, aplica a todo el catálogo
  categoryIds?: string[];      // IDs de categorías específicas
  productIds?: string[];       // IDs de productos específicos
}

type DiscountType = 'PERCENT' | 'FIXED';
```

---

## 📝 **ORDERS**

### **Order**
```typescript
interface Order {
  id: string;
  orderNumber: string;         // Ej: "ORD-000123" (único, auto-generado)
  status: OrderStatus;
  channel: SalesChannel;
  paymentMethod: PaymentMethod;
  paymentRef?: string;         // Referencia de pago externa
  
  // Customer
  customerId?: string;         // FK a Customer (opcional)
  customer: CustomerSnapshot;  // Snapshot del cliente al momento de venta
  
  // Items
  items: OrderItem[];
  
  // Totals
  subtotal: number;
  discountTotal: number;
  total: number;
  
  notes?: string;
  deliveryZip?: string;        // Código postal de entrega
  
  createdAt: string;
  updatedAt: string;
}

type OrderStatus = 
  | 'DRAFT'          // Borrador
  | 'PLACED'         // Confirmado (decrementar inventario aquí)
  | 'PAID'           // Pagado
  | 'FULFILLED'      // Entregado
  | 'CANCELLED'      // Cancelado
  | 'REFUNDED'       // Reembolsado
  | 'HOLD_REVIEW';   // En revisión manual

type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD_LINK' | 'OTHER';
type SalesChannel = 'OFFLINE' | 'ONLINE' | 'WHATSAPP' | 'INSTAGRAM';
```

### **OrderItem**
```typescript
interface OrderItem {
  id: string;
  productId: string;           // Referencia al producto
  variantId?: string;          // Si tiene variante
  
  // Snapshots (datos congelados al momento de venta)
  nameSnapshot: string;
  skuSnapshot: string;
  optionsSnapshot?: { size?: string; color?: string };
  
  // Pricing
  unitPrice: number;           // Precio unitario al momento de venta
  qty: number;
  lineTotal: number;           // unitPrice * qty
  
  // Cost tracking (COGS snapshots)
  unitCost?: number;           // Costo unitario al momento de venta
  lineCostTotal?: number;      // unitCost * qty
  lineProfit?: number;         // lineTotal - lineCostTotal
  lineMarginPct?: number;      // (lineProfit / lineTotal) * 100
}
```

### **CustomerSnapshot**
```typescript
interface CustomerSnapshot {
  name: string;
  phone?: string;
  email?: string;
}
```

---

## 👥 **CUSTOMERS**

### **Customer**
```typescript
interface Customer {
  id: string;
  name: string;                // Requerido
  phone?: string;              // Opcional (solo dígitos)
  email?: string;              // Opcional
  tags: CustomerTag[];
  notes?: string;              // Notas internas
  createdAt: string;
  updatedAt: string;
}

type CustomerTag = 
  | 'VIP' 
  | 'MAYOREO' 
  | 'FRECUENTE' 
  | 'RIESGO' 
  | 'NUEVO';
```

---

## 🔄 **RMA (Returns & Exchanges)**

### **RMA** (Return Merchandise Authorization)
```typescript
interface RMA {
  id: string;
  rmaNumber: string;           // Ej: "RMA-000123" (único)
  type: RMAType;               // 'RETURN' | 'EXCHANGE'
  status: RMAStatus;
  
  // Order reference
  orderId: string;             // FK a Order
  orderNumber: string;
  
  // Customer
  customerId?: string;
  customerName?: string;
  
  // Details
  reason?: RMAReturnReason;
  notes?: string;
  
  // Items
  returnItems: RMAItem[];           // Items being returned
  replacementItems: RMAReplacementItem[]; // Items being sent (for exchanges)
  
  // Money
  money: RMAMoney;
  
  createdAt: string;
  updatedAt: string;
  completedAt?: string;        // Cuando se aplicó inventario
  cancelledAt?: string;
}

type RMAType = 'RETURN' | 'EXCHANGE';
type RMAStatus = 'DRAFT' | 'APPROVED' | 'COMPLETED' | 'CANCELLED';
type RMAReturnReason = 'SIZE' | 'DEFECT' | 'NOT_LIKED' | 'WRONG_ITEM' | 'OTHER';
```

### **RMAItem** (Item devuelto)
```typescript
interface RMAItem {
  id: string;
  originalOrderItemId?: string; // Link al OrderItem original
  
  // Snapshots
  skuSnapshot: string;
  nameSnapshot: string;
  optionsSnapshot?: { size?: string; color?: string };
  
  qty: number;
  unitPriceAtSale: number;     // Del snapshot del pedido (no editable)
  unitCostAtSale?: number;     // Si existe (COGS snapshot)
  
  // Para reponer inventario
  productId?: string;
  variantId?: string;
}
```

### **RMAReplacementItem** (Item de reemplazo)
```typescript
interface RMAReplacementItem {
  id: string;
  productId: string;
  variantId?: string;
  
  // Snapshots
  skuSnapshot: string;
  nameSnapshot: string;
  optionsSnapshot?: { size?: string; color?: string };
  
  qty: number;
  unitPrice: number;           // Precio del cambio (editable)
  unitCost?: number;           // COGS (opcional)
}
```

### **RMAMoney** (Cálculo de diferencia)
```typescript
interface RMAMoney {
  subtotalReturn: number;      // sum(return qty * unitPriceAtSale)
  subtotalReplacement: number; // sum(replacement qty * unitPrice)
  difference: number;          // replacement - return
  settlement: RMASettlement;   // 'REFUND_CUSTOMER' | 'CHARGE_CUSTOMER' | 'EVEN'
  method?: RMAPaymentMethod;   // 'CASH' | 'TRANSFER' | 'OTHER'
  ref?: string;                // Referencia de pago
}

type RMASettlement = 'REFUND_CUSTOMER' | 'CHARGE_CUSTOMER' | 'EVEN';
type RMAPaymentMethod = 'CASH' | 'TRANSFER' | 'OTHER';
```

---

## 🗺️ **COVERAGE (Delivery Zones)**

### **CoverageZip**
```typescript
interface CoverageZip {
  id: string;
  zip: string;                 // 5 dígitos (único)
  status: CoverageStatus;
  
  // Delivery rules
  deliveryFee?: number;        // Costo de envío opcional
  minOrder?: number;           // Monto mínimo de pedido
  onlyMeetupPoint: boolean;    // Solo entregas en puntos de encuentro
  meetupPointNote?: string;    // Ej: "solo Metro X / Plaza Y"
  
  // Blocking
  reason?: DisabledReason;     // Requerido si status != 'ENABLED'
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

type CoverageStatus = 'ENABLED' | 'REVIEW' | 'DISABLED';

type DisabledReason = 
  | 'SAFETY_POLICY'            // Política de seguridad
  | 'NO_COVERAGE'              // Sin cobertura
  | 'HIGH_RISK'                // Alto riesgo
  | 'FRAUD_HISTORY'            // Historial de fraude
  | 'OPERATIONAL_LIMIT';       // Límite operacional
```

---

## 📤 **UPLOADS (S3 Integration)**

### **PresignRequest** (Request para obtener URL firmada)
```typescript
interface PresignRequest {
  fileName: string;
  fileType: string;            // MIME type (ej: "image/jpeg")
  folder: string;              // Ej: "products", "categories"
}
```

### **PresignResponse** (Response del backend)
```typescript
interface PresignResponse {
  // URL para subir (PUT request)
  uploadUrl?: string;
  signedUrl?: string;
  url?: string;
  
  // URL pública final (después de subir)
  publicUrl?: string;
  fileUrl?: string;
  fileURL?: string;
  finalUrl?: string;
  
  // Key en S3
  key?: string;
  fileKey?: string;
  path?: string;
}
```

### **UploadResult**
```typescript
interface UploadResult {
  success: boolean;
  publicUrl?: string;
  key?: string;
  error?: string;
}
```

### **UploadProgress** (Para UI)
```typescript
interface UploadProgress {
  fileName: string;
  progress: number;            // 0-100
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}
```

---

## 📊 **ANALYTICS (Front-end events)**

### **AnalyticsEvent** (Eventos del front de usuario)
```typescript
interface AnalyticsEvent {
  ts: number;                  // Epoch milliseconds
  date: string;                // YYYY-MM-DD
  type: EventType;
  tenantId: string;
  sessionId: string;
  userId: string;              // "guest" | user_id
  source: AnalyticsSource;
  payload: Record<string, any>; // Data específica del evento
}

type EventType = 
  | 'product_card_click'       // Click en tarjeta de producto
  | 'favorite_toggle'          // Agregar/remover favorito
  | 'search_query'             // Búsqueda realizada
  | 'variant_select';          // Selección de variante

type AnalyticsSource = 
  | 'PLP'                      // Product Listing Page
  | 'PDP'                      // Product Detail Page
  | 'SEARCH'                   // Search results
  | 'HEADER'                   // Header/Nav
  | 'FAVORITES';               // Favorites page
```

**Payloads por tipo de evento:**

```typescript
// product_card_click
{
  productId: string;
  productName: string;
  price: number;
  categoryId?: string;
}

// favorite_toggle
{
  productId: string;
  variantId?: string;
  action: 'added' | 'removed';
}

// search_query
{
  query: string;
  resultsCount: number;
}

// variant_select
{
  productId: string;
  variantId: string;
  options: { size?: string; color?: string };
}
```

---

## 🔍 **AUDIT LOG**

### **AuditEvent**
```typescript
interface AuditEvent {
  id: string;
  ts: string;                  // ISO timestamp
  actor: {
    id: string;
    name: string;
    roleName?: string;
  };
  action: AuditAction;         // 87 acciones diferentes
  entity?: AuditEntity;
  changes?: AuditChange[];
  metadata?: Record<string, any>;
}
```

### **AuditEntity**
```typescript
interface AuditEntity {
  type: AuditEntityType;
  id: string;
  label: string;               // Human-readable (ej: "CP 03100", "ORD-000123")
}

type AuditEntityType = 
  | 'coverageZip'
  | 'order'
  | 'customer'
  | 'product'
  | 'products'
  | 'category'
  | 'rma'
  | 'role'
  | 'user'
  | 'promotion'
  | 'coupon'
  | 'image';
```

### **AuditChange**
```typescript
interface AuditChange {
  field: string;               // Nombre del campo
  from?: any;                  // Valor anterior
  to?: any;                    // Valor nuevo
}
```

### **AuditAction** (87 acciones - principales)
```typescript
type AuditAction =
  // Products
  | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_PUBLISHED'
  | 'PRODUCT_ARCHIVED' | 'STOCK_ADJUSTED' | 'PRODUCT_COST_UPDATED'
  | 'VARIANT_ADDED' | 'VARIANT_STOCK_ADJUSTED'
  
  // Categories
  | 'CATEGORY_CREATED' | 'CATEGORY_UPDATED' | 'CATEGORY_ARCHIVED'
  
  // Promotions & Coupons
  | 'PROMO_CREATED' | 'PROMO_UPDATED' | 'PROMO_TOGGLED'
  | 'COUPON_CREATED' | 'COUPON_UPDATED' | 'COUPON_TOGGLED'
  
  // Orders
  | 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED' | 'INVENTORY_DECREMENTED'
  | 'ORDER_SOLD_BELOW_COST' | 'ORDER_REVIEW_FLAGGED'
  
  // Customers
  | 'CUSTOMER_CREATED' | 'CUSTOMER_UPDATED' | 'CUSTOMER_TAGS_CHANGED'
  
  // RMA
  | 'RMA_CREATED' | 'RMA_STATUS_CHANGED' | 'RMA_COMPLETED'
  | 'INVENTORY_RESTOCKED_FROM_RETURN' | 'INVENTORY_DECREMENTED_FOR_EXCHANGE'
  
  // Coverage
  | 'COVERAGE_ZIP_CREATED' | 'COVERAGE_ZIP_UPDATED' | 'COVERAGE_ZIP_STATUS_CHANGED'
  | 'COVERAGE_IMPORT' | 'COVERAGE_EXPORT'
  
  // Users & Roles
  | 'USER_CREATED' | 'USER_UPDATED' | 'USER_SUSPENDED'
  | 'ROLE_CREATED' | 'ROLE_UPDATED' | 'ROLE_DELETED'
  
  // Auth
  | 'AUTH_LOGIN_SUCCESS' | 'AUTH_LOGOUT'
  
  // System
  | 'CSV_EXPORTED' | 'AUDIT_PURGED' | 'REPORT_EXPORTED'
  // ... (87 total)
```

---

## 📈 **REPORTS**

### **ReportQuery** (Filtros de reporte)
```typescript
interface ReportQuery {
  from: string;                // YYYY-MM-DD
  to: string;                  // YYYY-MM-DD
  channel: 'ALL' | SalesChannel;
  paymentMethod: 'ALL' | PaymentMethod;
  status: 'ALL' | OrderStatus;
  includeCancelled: boolean;
  revenueMode: RevenueMode;    // 'PAID_FULFILLED' | 'PLACED_PLUS'
}

type RevenueMode = 
  | 'PAID_FULFILLED'           // Solo pedidos pagados/entregados
  | 'PLACED_PLUS';             // Incluye confirmados
```

### **KPIMetrics** (Métricas clave)
```typescript
interface KPIMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  uniqueCustomers: number;
  totalProductsSold: number;
}
```

### **DailySalesData** (Serie temporal)
```typescript
interface DailySalesData {
  date: string;                // YYYY-MM-DD
  revenue: number;
  orders: number;
  averageTicket: number;
}
```

### **TopProductData** (Rankings)
```typescript
interface TopProductData {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  options?: { size?: string; color?: string };
  unitsSold: number;
  revenue: number;
  percentage: number;
}
```

### **TopCustomerData**
```typescript
interface TopCustomerData {
  customerId?: string;
  name: string;
  phone?: string;
  email?: string;
  ordersCount: number;
  totalSpent: number;
  averageTicket: number;
  lastPurchase: string;        // ISO timestamp
}
```

### **LowStockItem**
```typescript
interface LowStockItem {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  options?: { size?: string; color?: string };
  currentStock: number;
  status: string;
}
```

---

## 🗄️ **DATABASE RELATIONSHIPS**

### **Relaciones principales:**

```
SystemRole (1) ──→ (N) SystemUser
  ↓ permissions[]

Category (1) ──→ (N) Product
  
Product (1) ──→ (N) ProductVariant
Product (1) ──→ (N) ProductImage

Promotion/Coupon ──→ PromotionScope
  ↓ categoryIds[] ──→ Category
  ↓ productIds[] ──→ Product

Customer (1) ──→ (N) Order

Order (1) ──→ (N) OrderItem
  ↓ productId ──→ Product
  ↓ variantId ──→ ProductVariant

Order (1) ──→ (N) RMA
  
RMA (1) ──→ (N) RMAItem
RMA (1) ──→ (N) RMAReplacementItem

CoverageZip ←── Order.deliveryZip (validación)

AuditEvent ──→ entity (polimórfico)
  ↓ type + id
```

---

## 🔧 **CONFIGURATION & CONSTANTS**

### **Inventory decrement trigger**
```typescript
const INVENTORY_DECREMENT_ON: OrderStatus = 'PLACED';
```

### **Upload config**
```typescript
const DEFAULT_UPLOAD_CONFIG = {
  maxSizeBytes: 5 * 1024 * 1024,  // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFiles: 6,
};
```

### **Low stock threshold (configurable)**
```typescript
const DEFAULT_LOW_STOCK_THRESHOLD = 5;
```

---

## 📝 **NOTAS IMPORTANTES**

### **Snapshots:**
- `Order.customer`, `OrderItem.*Snapshot`, `RMAItem.*Snapshot` → Datos congelados al momento de creación
- No se actualizan si el producto/cliente original cambia

### **Soft deletes:**
- `isArchived` en Product, Category
- RMA usa `status: 'CANCELLED'` + `cancelledAt`
- Usuarios usan `status: 'SUSPENDED'`

### **COGS tracking:**
- `Product.cost` y `ProductVariant.cost` → COGS base
- `OrderItem.unitCost` → Snapshot del costo al momento de venta
- Si `trackCost: false`, no se rastrea costo

### **Persistencia local (Mock/Dev):**
- Roles, usuarios, audit log → `localStorage`
- Key pattern: `ecommerce.{module}.{entity}`
- Ejemplo: `analytics.chartSeriesEnabled`, `auth.currentUser`

### **IDs generados:**
- Orders: `ORD-000123` (auto-incrementable)
- RMA: `RMA-000123`
- UUID para el resto

---

## 🚀 **APIs RECOMENDADAS (Backend)**

### **REST Endpoints sugeridos:**

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id

GET    /api/roles
POST   /api/roles
PATCH  /api/roles/:id
DELETE /api/roles/:id

GET    /api/products
GET    /api/products/:id
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id
PATCH  /api/products/:id/stock
PATCH  /api/products/:id/variants/:variantId/stock

GET    /api/categories
POST   /api/categories
PATCH  /api/categories/:id
DELETE /api/categories/:id

GET    /api/promotions
POST   /api/promotions
PATCH  /api/promotions/:id
DELETE /api/promotions/:id

GET    /api/coupons
POST   /api/coupons
PATCH  /api/coupons/:id
DELETE /api/coupons/:id

GET    /api/orders
GET    /api/orders/:id
POST   /api/orders
PATCH  /api/orders/:id
PATCH  /api/orders/:id/status

GET    /api/customers
POST   /api/customers
PATCH  /api/customers/:id

GET    /api/rma
GET    /api/rma/:id
POST   /api/rma
PATCH  /api/rma/:id
PATCH  /api/rma/:id/status

GET    /api/coverage
POST   /api/coverage
PATCH  /api/coverage/:id
DELETE /api/coverage/:id
POST   /api/coverage/import
GET    /api/coverage/export

POST   /api/upload/presign
PUT    {signedUrl}  (directo a S3)

GET    /api/analytics/events
GET    /api/analytics/kpis

GET    /api/reports/sales
GET    /api/reports/top-products
GET    /api/reports/top-customers
GET    /api/reports/low-stock

GET    /api/audit
DELETE /api/audit/purge
```

---

## 💾 **SCHEMA SQL SUGERIDO (PostgreSQL)**

```sql
-- Auth & Users
CREATE TABLE system_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id UUID REFERENCES system_roles(id),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description_short TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  has_variants BOOLEAN DEFAULT FALSE,
  cost DECIMAL(10,2),
  track_cost BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL UNIQUE,
  size VARCHAR(50),
  color VARCHAR(50),
  price DECIMAL(10,2),
  stock INTEGER DEFAULT 0,
  status VARCHAR(20),
  image_url TEXT,
  cost DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promotions
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT FALSE,
  scope_all BOOLEAN DEFAULT FALSE,
  scope_category_ids UUID[],
  scope_product_ids UUID[],
  stackable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  min_subtotal DECIMAL(10,2),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT FALSE,
  scope_all BOOLEAN DEFAULT FALSE,
  scope_category_ids UUID[],
  scope_product_ids UUID[],
  stackable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  payment_ref TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_snapshot JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_total DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  delivery_zip VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  name_snapshot VARCHAR(255) NOT NULL,
  sku_snapshot VARCHAR(100) NOT NULL,
  options_snapshot JSONB,
  unit_price DECIMAL(10,2) NOT NULL,
  qty INTEGER NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2),
  line_cost_total DECIMAL(10,2),
  line_profit DECIMAL(10,2),
  line_margin_pct DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RMA
CREATE TABLE rma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rma_number VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_number VARCHAR(50) NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  reason VARCHAR(50),
  notes TEXT,
  money JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE TABLE rma_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rma_id UUID REFERENCES rma(id) ON DELETE CASCADE,
  original_order_item_id UUID,
  sku_snapshot VARCHAR(100) NOT NULL,
  name_snapshot VARCHAR(255) NOT NULL,
  options_snapshot JSONB,
  qty INTEGER NOT NULL,
  unit_price_at_sale DECIMAL(10,2) NOT NULL,
  unit_cost_at_sale DECIMAL(10,2),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE TABLE rma_replacement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rma_id UUID REFERENCES rma(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  sku_snapshot VARCHAR(100) NOT NULL,
  name_snapshot VARCHAR(255) NOT NULL,
  options_snapshot JSONB,
  qty INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2)
);

-- Coverage
CREATE TABLE coverage_zips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zip VARCHAR(10) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL,
  delivery_fee DECIMAL(10,2),
  min_order DECIMAL(10,2),
  only_meetup_point BOOLEAN DEFAULT FALSE,
  meetup_point_note TEXT,
  reason VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor JSONB NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity JSONB,
  changes JSONB,
  metadata JSONB
);
CREATE INDEX idx_audit_ts ON audit_events(ts DESC);
CREATE INDEX idx_audit_action ON audit_events(action);
CREATE INDEX idx_audit_actor_id ON audit_events((actor->>'id'));

-- Analytics (opcional si se persiste)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts BIGINT NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL,
  tenant_id VARCHAR(100) NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_analytics_date ON analytics_events(date);
CREATE INDEX idx_analytics_type ON analytics_events(type);
CREATE INDEX idx_analytics_tenant ON analytics_events(tenant_id);
```

---

**✅ DOCUMENTO COMPLETO**

Este documento incluye:
- ✅ Todos los modelos de datos
- ✅ Relaciones entre entidades
- ✅ Tipos y enums completos
- ✅ APIs REST sugeridas
- ✅ Schema SQL completo (PostgreSQL)
- ✅ Configuraciones importantes
- ✅ Notas de implementación

**Fecha de generación:** 2026-02-11  
**Versión del proyecto:** MVP Completo
