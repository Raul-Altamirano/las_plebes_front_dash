import React, { useState } from 'react';
import { Store, Loader2, ExternalLink, AlertCircle, TrendingUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useMarketplaces } from '../store/MarketplacesContext';
import { useToast } from '../store/ToastContext';
import type { MarketplacePlatform } from '../types/marketplace';
import {
  PLATFORM_LABELS,
  PLATFORM_SHORT_LABELS,
  PLATFORM_COLORS,
  CONNECTION_STATUS_LABELS,
  CONNECTION_STATUS_COLORS,
} from '../types/marketplace';

// Íconos por plataforma (usando emojis simples para este ejemplo)
const PLATFORM_ICONS: Record<MarketplacePlatform, string> = {
  FACEBOOK: '📘',
  INSTAGRAM: '📸',
  WHATSAPP: '💬',
  TIKTOK: '🎵',
};

export function Marketplaces() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    connections,
    platformStats,
    loading,
    connectPlatform,
    disconnectPlatform,
  } = useMarketplaces();

  const [connectingPlatform, setConnectingPlatform] = useState<MarketplacePlatform | null>(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<MarketplacePlatform | null>(null);

  const handleConnect = async (platform: MarketplacePlatform) => {
    setConnectingPlatform(platform);
    try {
      await connectPlatform(platform);
      showToast(`${PLATFORM_SHORT_LABELS[platform]} conectado exitosamente`, 'success');
    } catch (error) {
      showToast(`Error al conectar ${PLATFORM_SHORT_LABELS[platform]}`, 'error');
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (platform: MarketplacePlatform) => {
    if (!confirm(`¿Estás seguro de desconectar ${PLATFORM_SHORT_LABELS[platform]}? Todos los productos se despublicarán.`)) {
      return;
    }

    setDisconnectingPlatform(platform);
    try {
      await disconnectPlatform(platform);
      showToast(`${PLATFORM_SHORT_LABELS[platform]} desconectado`, 'success');
    } catch (error) {
      showToast(`Error al desconectar ${PLATFORM_SHORT_LABELS[platform]}`, 'error');
    } finally {
      setDisconnectingPlatform(null);
    }
  };

  const connectedPlatforms = connections.filter(c => c.status === 'CONNECTED');
  const totalErrors = platformStats.reduce((sum, stat) => sum + stat.totalErrors, 0);
  const totalPending = platformStats.reduce((sum, stat) => {
    const platform = connections.find(c => c.platform === stat.platform);
    return platform?.status === 'CONNECTED' ? sum + stat.totalUnpublished : sum;
  }, 0);

  // Plataforma con mejor rendimiento
  const bestPlatform = platformStats
    .filter(stat => stat.totalSales > 0)
    .sort((a, b) => b.totalSales - a.totalSales)[0];

if (loading) {
  console.log('Marketplaces render:', { connections, platformStats, loading });
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sección 1: Cards de plataformas */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Plataformas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections.map((connection) => {
            const stats = platformStats.find(s => s.platform === connection.platform);
            const isConnecting = connectingPlatform === connection.platform;
            const isDisconnecting = disconnectingPlatform === connection.platform;

            return (
              <div
                key={connection.platform}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{PLATFORM_ICONS[connection.platform]}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {PLATFORM_LABELS[connection.platform]}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CONNECTION_STATUS_COLORS[connection.status]}`}>
                        {CONNECTION_STATUS_LABELS[connection.status]}
                      </span>
                    </div>
                  </div>
                </div>

                {connection.status === 'CONNECTED' && (
                  <>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Cuenta:</span> {connection.accountName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Conectado el {new Date(connection.connectedAt!).toLocaleDateString('es-MX')}
                      </p>
                      {stats && (
                        <div className="flex items-center gap-4 text-sm text-gray-600 pt-2">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            {stats.totalPublished} publicados
                          </span>
                          {stats.totalErrors > 0 && (
                            <span className="flex items-center gap-1 text-red-600">
                              <XCircle className="w-4 h-4" />
                              {stats.totalErrors} errores
                            </span>
                          )}
                          <span className="font-medium text-gray-900">
                            ${stats.totalRevenue.toLocaleString('es-MX')} MXN
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => navigate(`/marketplaces/${connection.platform.toLowerCase()}`)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Ver detalle →
                      </button>
                      <button
                        onClick={() => handleDisconnect(connection.platform)}
                        disabled={isDisconnecting}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                      >
                        {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Desconectar'}
                      </button>
                    </div>
                  </>
                )}

                {connection.status === 'DISCONNECTED' && (
                  <div className="pt-2">
                    <p className="text-sm text-gray-600 mb-4">
                      Conecta tu cuenta para empezar a publicar productos
                    </p>
                    <button
                      onClick={() => handleConnect(connection.platform)}
                      disabled={isConnecting}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {isConnecting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Conectando...</>
                      ) : 'Conectar'}
                    </button>
                  </div>
                )}

                {connection.status === 'ERROR' && (
                  <div className="pt-2">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-800">
                        {connection.errorMessage || 'Error al conectar con la plataforma'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleConnect(connection.platform)}
                      disabled={isConnecting}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {isConnecting ? 'Reconectando...' : 'Reconectar'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sección 2: Comparativa de rendimiento */}
      {connectedPlatforms.length >= 2 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Comparativa de rendimiento</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plataforma</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Publicados</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Sin publicar</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Errores</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ventas</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ingresos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {platformStats
                    .filter(stat => connections.find(c => c.platform === stat.platform)?.status === 'CONNECTED')
                    .map((stat) => {
                      const isBest = bestPlatform?.platform === stat.platform;
                      return (
                        <tr key={stat.platform} className={isBest ? 'bg-green-50' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${PLATFORM_COLORS[stat.platform]}`}>
                                {PLATFORM_SHORT_LABELS[stat.platform]}
                              </span>
                              {isBest && <span className="text-xs font-medium text-green-700">🏆 Mejor rendimiento</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">{stat.totalPublished}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600">{stat.totalUnpublished}</td>
                          <td className="px-4 py-3 text-center">
                            {stat.totalErrors > 0
                              ? <span className="text-sm text-red-600 font-medium">{stat.totalErrors}</span>
                              : <span className="text-sm text-gray-400">-</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">{stat.totalSales}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">${stat.totalRevenue.toLocaleString('es-MX')}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sección 3: Alertas rápidas */}
      {(totalErrors > 0 || totalPending > 0) && (
        <div className="space-y-3">
          {totalErrors > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    {totalErrors} producto{totalErrors !== 1 ? 's tienen' : ' tiene'} errores de sincronización
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">Revisa los detalles de cada plataforma para corregir los errores</p>
                </div>
              </div>
            </div>
          )}
          {totalPending > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    {totalPending} producto{totalPending !== 1 ? 's pendientes' : ' pendiente'} de sincronizar
                  </p>
                  <p className="text-sm text-blue-700 mt-1">Ve a cada plataforma para sincronizar los productos pendientes</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {connectedPlatforms.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Conecta tus primeras plataformas</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Empieza a vender en Facebook, Instagram, WhatsApp y TikTok. Conecta tus cuentas para sincronizar tus productos automáticamente.
          </p>
        </div>
      )}
    </div>
  );
}
