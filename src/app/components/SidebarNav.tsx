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
  MapPin
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import logo from '../../assets/logo_las_plabes.jpg';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, disabled: false, permission: undefined },
  { path: '/products', label: 'Productos', icon: Package, disabled: false, permission: 'product:read' as const },
  { path: '/categories', label: 'Categorías', icon: Tags, disabled: false, permission: 'category:read' as const },
  { path: '/promotions', label: 'Promociones', icon: Percent, disabled: false, permission: 'promo:read' as const },
  { path: '/coupons', label: 'Cupones', icon: Ticket, disabled: false, permission: 'coupon:read' as const },
  { path: '/orders', label: 'Pedidos', icon: ShoppingCart, disabled: false, permission: 'order:read' as const },
  { path: '/rma', label: 'Cambios/Devoluciones', icon: RefreshCw, disabled: false, permission: 'rma:read' as const },
  { path: '/coverage', label: 'Cobertura', icon: MapPin, disabled: false, permission: 'coverage:read' as const },
  { path: '/customers', label: 'Clientes', icon: UserCircle, disabled: false, permission: 'customer:read' as const },
  { path: '/users', label: 'Usuarios y Roles', icon: Users, disabled: false, anyPermission: ['user:manage', 'role:manage'] as const },
  { path: '/audit', label: 'Auditoría', icon: FileText, disabled: false, permission: 'audit:read' as const },
  { path: '/settings', label: 'Configuración', icon: Settings, disabled: true, permission: undefined },
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
          // Ocultar si no tiene permiso
          if (item.permission && !hasPermission(item.permission)) {
            return null;
          }
          
          // Ocultar si requiere any permission y no tiene ninguno
          if (item.anyPermission && !hasAnyPermission(item.anyPermission)) {
            return null;
          }

          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          if (item.disabled) {
            return (
              <div
                key={item.path}
                className="flex items-center gap-3 px-3 py-2 text-gray-400 rounded-lg cursor-not-allowed"
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
                <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Pronto</span>
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
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