/**
 * src/app/components/ConnectFacebookButton.tsx
 * Botón para conectar Facebook desde el dashboard.
 *
 * Flujo:
 * 1. Llama a POST /auth/facebook/init con JWT
 * 2. Lambda valida JWT + permiso marketplace:connect
 * 3. Lambda devuelve URL firmada de Meta
 * 4. Frontend redirige a esa URL
 * 5. Al volver, useOAuthCallback detecta ?connected=true
 */

import { useState } from 'react';
import { Facebook, Loader2 } from 'lucide-react';

interface Props {
  className?: string;
}

const META_LAMBDA_URL = 'https://mrc94l3hc6.execute-api.us-east-1.amazonaws.com';

export function ConnectFacebookButton({ className }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken'); // ajusta al key que uses

      const res = await fetch(`${META_LAMBDA_URL}/auth/facebook/init`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
      });

      const data = await res.json();

      if (data.status !== 'ok') throw new Error(data.message || 'Error al iniciar OAuth');

      // Redirigir a la URL firmada de Meta
      window.location.href = data.data.authUrl;

    } catch (err) {
      setLoading(false);
      console.error('[ConnectFacebookButton]', err);
      // Aquí puedes mostrar un toast de error
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#166FE5]
                 text-white rounded-lg font-medium transition-colors 
                 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {loading
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <Facebook className="w-4 h-4" />
      }
      {loading ? 'Conectando...' : 'Conectar con Facebook'}
    </button>
  );
}