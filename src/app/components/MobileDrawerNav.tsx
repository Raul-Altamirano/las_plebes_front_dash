import { Link, useLocation } from 'react-router';
import { useNavigate } from 'react-router';
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
  X,
  LogOut
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import logo from '../../assets/logo_las_plabes.jpg';

interface MobileDrawerNavProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export function MobileDrawerNav({ isOpen, onClose }: MobileDrawerNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, hasAnyPermission, logout, currentUser } = useAuth();
  const { auditLog } = useAudit();

  const handleLinkClick = () => {
    onClose();
  };

  const handleLogout = () => {
    // Registrar logout en auditoría
    if (currentUser) {
      auditLog({
        action: 'AUTH_LOGOUT',
        entity: {
          type: 'user',
          id: currentUser.id,
          label: currentUser.name,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 lg:hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Close */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 flex flex-col items-center">
              <img src={logo} alt="Las Plebes" className="w-20 h-20 object-contain mb-1" />
              <h1 className="text-lg font-semibold text-gray-900">Las Plebes</h1>
              <p className="text-xs text-gray-500">Dashboard Admin</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
                onClick={handleLinkClick}
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

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-colors text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}