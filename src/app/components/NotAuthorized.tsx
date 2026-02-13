import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';

export function NotAuthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md px-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Acceso no autorizado</h2>
        <p className="text-gray-600 mb-6">
          No tienes permisos para acceder a esta página. Contacta al administrador si necesitas acceso.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Volver
          </Button>
          <Button onClick={() => navigate('/dashboard')}>
            Ir al Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}