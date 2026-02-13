import { type Product,type ProductStatus } from '../types/product';

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Botas Vaqueras Clásicas',
    sku: 'BV-001',
    price: 189.99,
    stock: 42,
    status: 'ACTIVE',
    categoryId: 'cat-1', // Botas
    descriptionShort: 'Botas vaqueras de cuero genuino con diseño clásico y acabado premium.',
    images: [
      { id: 'img1', url: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=400', isPrimary: true }
    ],
    updatedAt: '2026-02-03T10:30:00Z',
    isArchived: false,
    hasVariants: true,
    variants: [
      {
        id: 'var1-1',
        sku: 'BV-001-25-CAF',
        options: { size: '25', color: 'Café' },
        stock: 8,
        updatedAt: '2026-02-03T10:30:00Z'
      },
      {
        id: 'var1-2',
        sku: 'BV-001-26-CAF',
        options: { size: '26', color: 'Café' },
        stock: 12,
        updatedAt: '2026-02-03T10:30:00Z'
      },
      {
        id: 'var1-3',
        sku: 'BV-001-27-CAF',
        options: { size: '27', color: 'Café' },
        stock: 10,
        updatedAt: '2026-02-03T10:30:00Z'
      },
      {
        id: 'var1-4',
        sku: 'BV-001-25-NEG',
        options: { size: '25', color: 'Negro' },
        stock: 5,
        updatedAt: '2026-02-03T10:30:00Z'
      },
      {
        id: 'var1-5',
        sku: 'BV-001-26-NEG',
        options: { size: '26', color: 'Negro' },
        stock: 7,
        updatedAt: '2026-02-03T10:30:00Z'
      }
    ]
  },
  {
    id: '2',
    name: 'Botines Tejanos Negros',
    sku: 'BT-002-BLK',
    price: 149.99,
    stock: 12,
    status: 'ACTIVE',
    categoryId: 'cat-2', // Botines
    descriptionShort: 'Botines tejanos de cuero negro con detalles bordados.',
    images: [
      { id: 'img2', url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400', isPrimary: true }
    ],
    updatedAt: '2026-02-02T14:20:00Z',
    isArchived: false
  },
  {
    id: '3',
    name: 'Cinturón de Cuero Premium',
    sku: 'CN-003-BRN',
    price: 59.99,
    stock: 45,
    status: 'ACTIVE',
    categoryId: 'cat-3', // Accesorios
    descriptionShort: 'Cinturón de cuero genuino con hebilla western plateada.',
    images: [
      { id: 'img3', url: 'https://images.unsplash.com/photo-1624222247344-550fb60583c2?w=400', isPrimary: true }
    ],
    updatedAt: '2026-02-01T09:15:00Z',
    isArchived: false
  },
  {
    id: '4',
    name: 'Botas Rancheras Piel Exótica',
    sku: 'BR-004-TAN',
    price: 299.99,
    stock: 0,
    status: 'OUT_OF_STOCK',
    categoryId: 'cat-1', // Botas
    descriptionShort: 'Botas rancheras de piel exótica con diseño artesanal único.',
    images: [
      { id: 'img4', url: 'https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=400', isPrimary: true }
    ],
    updatedAt: '2026-01-30T16:45:00Z',
    isArchived: false
  },
  {
    id: '5',
    name: 'Sombrero Vaquero Negro',
    sku: 'SV-005-BLK',
    price: 79.99,
    stock: 18,
    status: 'ACTIVE',
    categoryId: 'cat-3', // Accesorios
    descriptionShort: 'Sombrero vaquero tradicional de fieltro negro.',
    images: [
      { id: 'img5', url: 'https://images.unsplash.com/photo-1529958030586-3aae4ca485ff?w=400', isPrimary: true }
    ],
    updatedAt: '2026-01-28T11:30:00Z',
    isArchived: false
  },
  {
    id: '6',
    name: 'Botas Camperas Cafe',
    sku: 'BC-006-BRN',
    price: 169.99,
    stock: 8,
    status: 'PAUSED',
    categoryId: 'cat-1', // Botas
    descriptionShort: 'Botas camperas de cuero café con suela resistente.',
    images: [
      { id: 'img6', url: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=400', isPrimary: true }
    ],
    updatedAt: '2026-01-25T13:20:00Z',
    isArchived: false
  },
  {
    id: '7',
    name: 'Hebilla Western Plateada',
    sku: 'HW-007-SLV',
    price: 34.99,
    stock: 67,
    status: 'ACTIVE',
    categoryId: 'cat-3', // Accesorios
    descriptionShort: 'Hebilla de cinturón estilo western con acabado plateado.',
    images: [
      { id: 'img7', url: 'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=400', isPrimary: true }
    ],
    updatedAt: '2026-01-22T10:00:00Z',
    isArchived: false
  },
  {
    id: '8',
    name: 'Botines Chelsea Cuero',
    sku: 'BCH-008-BRN',
    price: 139.99,
    stock: 15,
    status: 'ACTIVE',
    categoryId: 'cat-2', // Botines
    descriptionShort: 'Botines Chelsea de cuero marrón con elásticos laterales.',
    images: [
      { id: 'img8', url: 'https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=400', isPrimary: true }
    ],
    updatedAt: '2026-01-20T15:45:00Z',
    isArchived: false
  },
  {
    id: '9',
    name: 'Botas Texanas Premium',
    sku: 'BT-009-BLK',
    price: 249.99,
    stock: 5,
    status: 'DRAFT',
    categoryId: 'cat-1', // Botas
    descriptionShort: 'Botas texanas de lujo con bordados especiales.',
    images: [
      { id: 'img9', url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400', isPrimary: true }
    ],
    updatedAt: '2026-01-18T09:30:00Z',
    isArchived: false
  },
  {
    id: '10',
    name: 'Cartera de Piel Grabada',
    sku: 'CP-010-BRN',
    price: 44.99,
    stock: 32,
    status: 'ACTIVE',
    categoryId: 'cat-3', // Accesorios
    descriptionShort: 'Cartera de piel genuina con grabados artesanales.',
    images: [
      { id: 'img10', url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', isPrimary: true }
    ],
    updatedAt: '2026-01-15T12:00:00Z',
    isArchived: false
  },
  {
    id: '11',
    name: 'Botas de Trabajo Reforzadas',
    sku: 'BTR-011-BLK',
    price: 179.99,
    stock: 3,
    status: 'ACTIVE',
    categoryId: 'cat-1', // Botas
    descriptionShort: 'Botas de trabajo con puntera de acero y suela antiderrapante.',
    images: [
      { id: 'img11', url: 'https://images.unsplash.com/photo-1542280756-74b2f55e73ab?w=400', isPrimary: true }
    ],
    updatedAt: '2026-01-12T08:15:00Z',
    isArchived: false
  },
  {
    id: '12',
    name: 'Camisa Western Bordada',
    sku: 'CWB-012-BLU',
    price: 89.99,
    stock: 22,
    status: 'DRAFT',
    categoryId: 'cat-4', // Ropa
    descriptionShort: 'Camisa western con bordados tradicionales y botones de nácar.',
    images: [
      { id: 'img12', url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', isPrimary: true }
    ],
    updatedAt: '2026-01-10T14:30:00Z',
    isArchived: false
  },
  {
    id: 'test-6images',
    name: 'Producto con 6 imágenes (Test)',
    sku: 'TEST-6IMG',
    price: 199.99,
    stock: 100,
    status: 'ACTIVE',
    categoryId: 'cat-1', // Botas
    descriptionShort: 'Producto de prueba con galería completa de 6 imágenes para validar la funcionalidad de la galería.',
    images: [
      { 
        id: 'test-img1', 
        url: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600', 
        alt: 'Imagen principal - Botas clásicas',
        isPrimary: true 
      },
      { 
        id: 'test-img2', 
        url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600', 
        alt: 'Detalle lateral',
        isPrimary: false 
      },
      { 
        id: 'test-img3', 
        url: 'https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=600', 
        alt: 'Vista frontal',
        isPrimary: false 
      },
      { 
        id: 'test-img4', 
        url: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600', 
        alt: 'Detalle de costura',
        isPrimary: false 
      },
      { 
        id: 'test-img5', 
        url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600', 
        alt: 'Vista trasera',
        isPrimary: false 
      },
      { 
        id: 'test-img6', 
        url: 'https://images.unsplash.com/photo-1542280756-74b2f55e73ab?w=600', 
        alt: 'Detalle de suela',
        isPrimary: false 
      }
    ],
    updatedAt: '2026-02-09T12:00:00Z',
    isArchived: false,
    cost: 80.00,
    trackCost: true
  }
];

export const categories = ['Botas', 'Botines', 'Accesorios', 'Ropa'] as const;
export const statuses: ProductStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'OUT_OF_STOCK'];