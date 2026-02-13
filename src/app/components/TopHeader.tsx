import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, Menu, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useAudit } from '../store/AuditContext';
import { GlobalSearchModal } from './GlobalSearchModal';

interface TopHeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function TopHeader({ title, onMenuClick }: TopHeaderProps) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { auditLog } = useAudit();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Hotkey Cmd/Ctrl+K para abrir búsqueda
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutHint = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Menu + Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h2>
            </div>

            {/* Search & Profile */}
            <div className="flex items-center gap-3">
              {/* Global Search */}
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 min-w-[240px] hover:bg-gray-100 transition-colors"
              >
                <Search className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400 flex-1 text-left">Buscar...</span>
                <kbd className="hidden lg:inline-block px-2 py-1 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded">
                  {shortcutHint}
                </kbd>
              </button>

              {/* Mobile Search Icon */}
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="sm:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                aria-label="Buscar"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Profile Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900">{currentUser?.name}</div>
                    <div className="text-xs text-gray-500">{currentUser?.role}</div>
                  </div>
                  <ChevronDown className="hidden md:block w-4 h-4 text-gray-400" />
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{currentUser?.email}</p>
                      <p className="text-xs text-gray-400 mt-1">Rol: {currentUser?.role}</p>
                    </div>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      <GlobalSearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
    </>
  );
}