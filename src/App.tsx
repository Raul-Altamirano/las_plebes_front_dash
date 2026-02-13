import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { ProductsProvider } from './app/store/ProductsContext';
import { CategoryProvider } from './app/store/CategoryContext';
import { PromotionsProvider } from './app/store/PromotionsContext';
import { CouponsProvider } from './app/store/CouponsContext';
import { OrdersProvider } from './app/store/OrdersContext';
import { CustomersProvider } from './app/store/CustomersContext';
import { RMAProvider } from './app/store/RMAContext';
import { UsersProvider } from './app/store/UsersContext';
import { RolesProvider } from './app/store/RolesContext';
import { CoverageProvider } from './app/store/CoverageContext';
import { ToastProvider } from './app/store/ToastContext';
import { AuthProvider } from './app/store/AuthContext';
import { AuditProvider } from './app/store/AuditContext';
import { SidebarNav } from './app/components/SidebarNav';
import { MobileDrawerNav } from './app/components/MobileDrawerNav';
import { TopHeader } from './app/components/TopHeader';
import { PageContainer } from './app/components/PageContainer';
import { RequirePermission } from './app/components/RequirePermission';
import { RequireAuth } from './app/components/RequireAuth';
import { PublicOnly } from './app/components/PublicOnly';
import { ErrorBoundary } from './app/components/ErrorBoundary';
import { Dashboard } from './app/pages/Dashboard';
import { Products } from './app/pages/Products';
import { ProductForm } from './app/pages/ProductFormNew';
import { Categories } from './app/pages/Categories';
import Promotions from './app/pages/Promotions';
import Coupons from './app/pages/Coupons';
import { Orders } from './app/pages/Orders';
import { OrderNew } from './app/pages/OrderNew';
import { OrderDetail } from './app/pages/OrderDetail';
import { RMAList } from './app/pages/RMAList';
import { RMANew } from './app/pages/RMANew';
import { RMAPreview } from './app/pages/RMAPreview';
import { RMADetail } from './app/pages/RMADetail';
import { Customers } from './app/pages/Customers';
import { CustomerForm } from './app/pages/CustomerForm';
import { CustomerDetail } from './app/pages/CustomerDetail';
import { Coverage } from './app/pages/Coverage';
import { UsersAndRoles } from './app/pages/UsersAndRoles';
import { Audit } from './app/pages/Audit';
import Login from './app/pages/Login';
import { SearchResults } from './app/pages/SearchResults';

function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/products') return 'Productos';
    if (pathname === '/products/new') return 'Nuevo Producto';
    if (pathname.includes('/products/') && pathname.includes('/edit')) return 'Editar Producto';
    if (pathname === '/categories') return 'Categorías';
    if (pathname === '/promotions') return 'Promociones';
    if (pathname === '/coupons') return 'Cupones';
    if (pathname === '/orders') return 'Pedidos';
    if (pathname === '/orders/new') return 'Nuevo Pedido';
    if (pathname.includes('/orders/')) return 'Detalle de Pedido';
    if (pathname === '/rma') return 'Cambios y Devoluciones';
    if (pathname === '/rma/new') return 'Nueva Devolución/Cambio';
    if (pathname.includes('/rma/')) return 'Detalle RMA';
    if (pathname === '/coverage') return 'Cobertura de Entrega';
    if (pathname === '/customers') return 'Clientes';
    if (pathname === '/customers/new') return 'Nuevo Cliente';
    if (pathname.includes('/customers/') && pathname.includes('/edit')) return 'Editar Cliente';
    if (pathname.includes('/customers/')) return 'Detalle de Cliente';
    if (pathname === '/users') return 'Usuarios y Roles';
    if (pathname === '/audit') return 'Auditoría';
    if (pathname === '/search') return 'Resultados de Búsqueda';
    return 'Dashboard';
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <SidebarNav />

      {/* Mobile Drawer */}
      <MobileDrawerNav 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader 
          title={getPageTitle(location.pathname)}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />
        
        <main className="flex-1">
          <PageContainer>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route 
                path="/products/new" 
                element={
                  <RequirePermission permission="product:create">
                    <ProductForm />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/products/:id/edit" 
                element={
                  <RequirePermission anyOf={['product:update', 'inventory:update']}>
                    <ProductForm />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/categories" 
                element={
                  <RequirePermission permission="category:read">
                    <Categories />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/promotions" 
                element={
                  <RequirePermission permission="promo:read">
                    <Promotions />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/coupons" 
                element={
                  <RequirePermission permission="coupon:read">
                    <Coupons />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/orders" 
                element={
                  <RequirePermission permission="order:read">
                    <Orders />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/orders/new" 
                element={
                  <RequirePermission permission="order:create">
                    <OrderNew />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/orders/:id" 
                element={
                  <RequirePermission permission="order:read">
                    <OrderDetail />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/rma" 
                element={
                  <RequirePermission permission="rma:read">
                    <RMAList />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/rma/new" 
                element={
                  <RequirePermission permission="rma:create">
                    <RMANew />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/rma/preview" 
                element={
                  <RequirePermission permission="rma:create">
                    <RMAPreview />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/rma/:id" 
                element={
                  <RequirePermission permission="rma:read">
                    <RMADetail />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/coverage" 
                element={
                  <RequirePermission permission="coverage:read">
                    <Coverage />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/customers" 
                element={
                  <RequirePermission permission="customer:read">
                    <Customers />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/customers/new" 
                element={
                  <RequirePermission permission="customer:create">
                    <CustomerForm />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/customers/:id/edit" 
                element={
                  <RequirePermission permission="customer:update">
                    <CustomerForm />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/customers/:id" 
                element={
                  <RequirePermission permission="customer:read">
                    <CustomerDetail />
                  </RequirePermission>
                } 
              />
              <Route 
                path="/users" 
                element={<UsersAndRoles />} 
              />
              <Route 
                path="/audit" 
                element={
                  <RequirePermission permission="audit:read">
                    <Audit />
                  </RequirePermission>
                } 
              />
              <Route path="/search" element={<SearchResults />} />
            </Routes>
          </PageContainer>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <RolesProvider>
            <UsersProvider>
              <AuthProvider>
                <Routes>
                  {/* Ruta pública - Login */}
                  <Route 
                    path="/login" 
                    element={
                      <PublicOnly>
                        <Login />
                      </PublicOnly>
                    } 
                  />
                  
                  {/* Rutas protegidas */}
                  <Route
                    path="/*"
                    element={
                      <RequireAuth>
                        <AuditProvider>
                          <ProductsProvider>
                            <CategoryProvider>
                              <PromotionsProvider>
                                <CouponsProvider>
                                  <CustomersProvider>
                                    <CoverageProvider>
                                      <OrdersProvider>
                                        <RMAProvider>
                                          <AppLayout />
                                        </RMAProvider>
                                      </OrdersProvider>
                                    </CoverageProvider>
                                  </CustomersProvider>
                                </CouponsProvider>
                              </PromotionsProvider>
                            </CategoryProvider>
                          </ProductsProvider>
                        </AuditProvider>
                      </RequireAuth>
                    }
                  />
                </Routes>
              </AuthProvider>
            </UsersProvider>
          </RolesProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;