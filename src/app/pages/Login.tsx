import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Loader2, Mail, AlertCircle, Lock } from "lucide-react";
import logo from "../../assets/logo_las_plabes.jpg";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [tenantId] = useState("lasplebes"); // ✅ hook arriba, fijo
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Por favor completa todos los campos");
      return;
    }

    if (!validateEmail(email)) {
      setError("Email inválido");
      return;
    }

    setIsLoading(true);

    try {
await login(email, password, tenantId);

console.log("LOGIN OK -> before nav:", window.location.href);
navigate("/dashboard", { replace: true });
setTimeout(() => console.log("after nav:", window.location.href), 50);
    } catch (err: any) {
      const code = err?.code || err?.error?.code;
      const msg = err?.message || err?.error?.message;

      let errorMessage = msg || "Error al iniciar sesión";

      if (err?.status === 401) errorMessage = "Credenciales inválidas";
      if (err?.status === 403) errorMessage = "No tienes permisos";
      if (code === "VALIDATION_ERROR") errorMessage = "Datos inválidos";
      if (code === "USER_NOT_FOUND") errorMessage = "Usuario no encontrado";
      if (code === "USER_SUSPENDED") errorMessage = "Usuario suspendido. Contacta al administrador";
      if (code === "INVALID_PASSWORD") errorMessage = "Contraseña inválida";

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mx-auto mb-4">
              <img src={logo} alt="Las Plebes Logo" className="w-32 h-32 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Las Plebes</h1>
            <p className="text-sm text-gray-600">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full" size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700 font-semibold mb-2">🔑 Credenciales de prueba (5 roles):</p>
              <div className="space-y-1.5 text-xs text-blue-600">
                <div><strong>Super Admin:</strong> sadmin@local.dev</div>
                <div><strong>Administrador:</strong> admin@local.dev</div>
                <div><strong>Catálogo:</strong> catalog@example.com</div>
                <div><strong>Operaciones:</strong> ops@example.com</div>
                <div><strong>Viewer:</strong> viewer@example.com</div>
              </div>
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-gray-500 mt-6">
          Dashboard Las Plebes © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
