import { Navigate } from 'react-router';
import { useAuth } from '../store/AuthContext';

interface PublicOnlyProps {
  children: React.ReactNode;
}

export function PublicOnly({ children }: PublicOnlyProps) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    // Si ya está autenticado, redirigir al dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
