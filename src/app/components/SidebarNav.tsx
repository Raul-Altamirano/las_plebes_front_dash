import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tags,
  Percent,
  Ticket,
  ShoppingCart,
  UserCircle,
  Users,
  Settings,
  FileText,
  RefreshCw,
  MapPin,
  Share2,
  MessageSquare,
  StickyNote,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import logo from '../../assets/logo_las_plabes.jpg';

const menuItems = [
  { path: '/dashboard',    label: 'Dashboard',           icon: LayoutDashboard, permission: undefined },
  { path: '/products',     label: 'Productos',           icon: Package,         permission: 'product:read'  as const },
  { path: '/categories',   label: 'Categorías',          icon: Tags,            permission: 'category:read' as const },
  { path: '/promotions',   label: 'Promociones',         icon: Percent,         permission: 'promo:read'    as const },
  { path: '/colors',       label: 'Color',               icon: Ticket,          permission: 'coupon:read'   as const },
  { path: '/coupons',      label: 'Cupones',             icon: Ticket,          permission: 'coupon:read'   as const },
  { path: '/orders',       label: 'Pedidos',             icon: ShoppingCart,    permission: 'order:read'    as const },
  { path: '/rma',          label: 'Cambios/Devoluciones',icon: RefreshCw,       permission: 'rma:read'      as const },
  { path: '/notes',        label: 'Notas',               icon: StickyNote,      permission: 'notes:read'    as const },
  { path: '/marketplaces', label: 'Marketplaces',        icon: Share2,          permission: 'meta:read'     as const },
  // 💳 Pagos — permiso correcto: payments:read
  { path: '/payments',     label: 'Pagos',               icon: CreditCard,      permission: 'payments:read' as const },
  { path: '/inbox',        label: 'Inbox',               icon: MessageSquare,   permission: 'order:read'    as const },
  { path: '/coverage',     label: 'Cobertura',           icon: MapPin,          permission: 'coverage:read' as const },
  { path: '/customers',    label: 'Clientes',            icon: UserCircle,      permission: 'customer:read' as const },
  {
    path: '/users', label: 'Usuarios y Roles', icon: Users,
    anyPermission: ['user:manage', 'role:manage'] as const,
  },
  { path: '/audit',        label: 'Auditoría',           icon: FileText,        permission: 'audit:read'    as const },
  { path: '/settings',     label: 'Configuración',       icon: Settings,        disabled: true, permission: undefined },
];

export function SidebarNav() {
  const location = useLocation();
  const { hasPermission, hasAnyPermission } = useAuth();

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 flex flex-col items-center">
        <img src={logo} alt="Las Plebes" className="w-24 h-24 object-contain mb-2" />
        <h1 className="text-lg font-semibold text-gray-900">Las Plebes</h1>
        <p className="text-xs text-gray-500 mt-0.5">Dashboard Admin</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          if ('anyPermission' in item && item.anyPermission) {
            if (!hasAnyPermission(item.anyPermission)) return null;
          } else if (item.permission && !hasPermission(item.permission)) {
            return null;
          }

          const Icon     = item.icon;
          const isActive = location.pathname === item.path;

          if ('disabled' in item && item.disabled) {
            return (
              <div
                key={item.path}
                className="flex items-center gap-3 px-3 py-2 text-gray-400 rounded-lg cursor-not-allowed"
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
                <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                  Pronto
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
