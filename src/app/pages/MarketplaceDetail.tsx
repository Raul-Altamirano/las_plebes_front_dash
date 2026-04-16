// src/app/pages/MarketplaceDetail.tsx
import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { PageContainer } from "../components/PageContainer";
import { useMarketplaces } from "../store/MarketplacesContext";
import { useToast } from "../store/ToastContext";
import type { MarketplacePlatform, SyncStatus } from "../types/marketplace";
import {
  PLATFORM_LABELS,
  PLATFORM_SHORT_LABELS,
  CONNECTION_STATUS_LABELS,
  CONNECTION_STATUS_COLORS,
  SYNC_STATUS_LABELS,
  SYNC_STATUS_COLORS,
} from "../types/marketplace";
import {
  getFacebookStatus,
  selectFacebookCatalog,
  refreshFacebookCatalogs,
} from "../../api/marketplaces";

type TabKey = "all" | "published" | "unpublished" | "errors";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "published", label: "Publicados" },
  { key: "unpublished", label: "Sin publicar" },
  { key: "errors", label: "Con errores" },
];

export function MarketplaceDetail() {
  const navigate = useNavigate();
  const { platform: platformParam } = useParams<{ platform: string }>();
  const { showToast } = useToast();

  const platform = platformParam?.toUpperCase() as MarketplacePlatform;

  const {
    getConnectionStatus,
    getPlatformStats,
    getProductStatuses,
    connectPlatform,
    disconnectPlatform,
    syncAllProducts,
    unpublishAllProducts,
    toggleProductPlatform,
    syncProduct,
    syncing,
  } = useMarketplaces();

  const connection = getConnectionStatus(platform);
  const stats = getPlatformStats(platform);
  const productStatuses = getProductStatuses(platform);

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [connectingOrDisconnecting, setConnectingOrDisconnecting] =
    useState(false);
  const [syncingProductId, setSyncingProductId] = useState<string | null>(null);

  const [refreshingCatalogs, setRefreshingCatalogs] = useState(false);

  // ── OAuth callback detection ─────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalogs, setCatalogs] = useState<{ id: string; name: string }[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState("");
  const [savingCatalog, setSavingCatalog] = useState(false);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const page = searchParams.get("page");
    const error = searchParams.get("error");

    if (connected === "true") {
      showToast("success", `${page || "Facebook"} conectado exitosamente`);
      setSearchParams({});

      // Obtener catálogos disponibles
      getFacebookStatus()
        .then((fb) => {
          console.log("[DEBUG] Facebook status:", JSON.stringify(fb));
          if (fb?.catalogs && fb.catalogs.length > 0) {
            setCatalogs(fb.catalogs);
            setSelectedCatalog(fb.catalogId || fb.catalogs[0].id);
          }
        })
        .catch(console.error);
    }

    if (error) {
      const messages: Record<string, string> = {
        cancelled: "Cancelaste la conexión con Facebook",
        invalid_callback: "Callback inválido — intenta de nuevo",
        oauth_failed: "Error al conectar con Facebook",
      };
      showToast("error", messages[error] || "Error desconocido");
      setSearchParams({});
    }
  }, []);

  // ── Cargar catálogos si Facebook ya está conectado ──
  useEffect(() => {
    if (platform === "FACEBOOK" && connection?.status === "CONNECTED") {
      getFacebookStatus()
        .then((fb) => {
          if (fb?.catalogs && fb.catalogs.length > 0) {
            setCatalogs(fb.catalogs);
            setSelectedCatalog(fb.catalogId || fb.catalogs[0].id);
          }
        })
        .catch(console.error);
    }
  }, [platform, connection?.status]);

  const handleSaveCatalog = async () => {
    setSavingCatalog(true);
    try {
      await selectFacebookCatalog(selectedCatalog);
      showToast("success", "Catálogo seleccionado");
      setCatalogs([]);
    } catch {
      showToast("error", "Error al guardar catálogo");
    } finally {
      setSavingCatalog(false);
    }
  };

  if (!connection || !stats) {
    return (
      <div title="Marketplace">
        <div className="text-center py-12">
          <p className="text-gray-500">Plataforma no encontrada</p>
          <button
            onClick={() => navigate("/marketplaces")}
            className="mt-4 text-blue-600 hover:underline"
          >
            Volver a Marketplaces
          </button>
        </div>
      </div>
    );
  }

  const handleConnect = async () => {
    setConnectingOrDisconnecting(true);
    try {
      await connectPlatform(platform);
      // Para Facebook, connectPlatform redirige a Meta (window.location.href)
      // El finally solo se ejecuta si NO es Facebook (mock)
      showToast(
        "success",
        `${PLATFORM_SHORT_LABELS[platform]} conectado exitosamente`,
      );
    } catch (error) {
      showToast(
        "error",
        `Error al conectar ${PLATFORM_SHORT_LABELS[platform]}`,
      );
    } finally {
      setConnectingOrDisconnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        `¿Estás seguro de desconectar ${PLATFORM_SHORT_LABELS[platform]}? Todos los productos se despublicarán.`,
      )
    ) {
      return;
    }

    setConnectingOrDisconnecting(true);
    try {
      await disconnectPlatform(platform);
      showToast("success", `${PLATFORM_SHORT_LABELS[platform]} desconectado`);
    } catch (error) {
      showToast(
        "error",
        `Error al desconectar ${PLATFORM_SHORT_LABELS[platform]}`,
      );
    } finally {
      setConnectingOrDisconnecting(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      await syncAllProducts(platform);
      showToast("success", "Productos sincronizados exitosamente");
    } catch (error) {
      showToast("error", "Error al sincronizar productos");
    }
  };

  const handleUnpublishAll = async () => {
    if (
      !confirm(
        `¿Estás seguro? Esto quitará todos tus productos de ${PLATFORM_SHORT_LABELS[platform]}.`,
      )
    ) {
      return;
    }

    try {
      await unpublishAllProducts(platform);
      showToast("success", "Todos los productos han sido despublicados");
    } catch (error) {
      showToast("error", "Error al despublicar productos");
    }
  };

  const handleToggleProduct = async (productId: string, enabled: boolean) => {
    try {
      await toggleProductPlatform(productId, platform, enabled);
      showToast(
        "success",
        enabled
          ? "Producto agregado a la plataforma"
          : "Producto quitado de la plataforma",
      );
    } catch (error) {
      showToast("error", "Error al actualizar el producto");
    }
  };

  const handleSyncProduct = async (productId: string) => {
    setSyncingProductId(productId);
    try {
      await syncProduct(productId, platform);
      showToast("success", "Producto sincronizado");
    } catch (error) {
      showToast("error", "Error al sincronizar producto");
    } finally {
      setSyncingProductId(null);
    }
  };

  const handleRefreshCatalogs = async () => {
    setRefreshingCatalogs(true);
    try {
      const fb = await refreshFacebookCatalogs();
      if (fb?.catalogs && fb.catalogs.length > 0) {
        setCatalogs(fb.catalogs);
        setSelectedCatalog(fb.catalogId || fb.catalogs[0].id);
        showToast(
          "success",
          `${fb.catalogs.length} catálogo(s) encontrado(s)`,
        );
      } else {
        showToast(
          "error",
          "No se encontraron catálogos — crea uno en Facebook primero",
        );
      }
    } catch {
      showToast("error", "Error al actualizar catálogos");
    } finally {
      setRefreshingCatalogs(false);
    }
  };

  // Filtrar productos según tab y búsqueda
  const filteredProducts = productStatuses.filter((product) => {
    // Filtro por tab
    if (activeTab === "published" && product.syncStatus !== "SYNCED")
      return false;
    if (activeTab === "unpublished" && product.syncStatus !== "UNPUBLISHED")
      return false;
    if (activeTab === "errors" && product.syncStatus !== "ERROR") return false;

    // Filtro por búsqueda
    if (
      searchQuery &&
      !product.productName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="space-y-6">
        {/* Header con botones */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/marketplaces")}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span
              className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${CONNECTION_STATUS_COLORS[connection.status]}`}
            >
              {CONNECTION_STATUS_LABELS[connection.status]}
            </span>
          </div>

          <div>
            {connection.status === "CONNECTED" ? (
              <button
                onClick={handleDisconnect}
                disabled={connectingOrDisconnecting}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
              >
                {connectingOrDisconnecting ? "Desconectando..." : "Desconectar"}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connectingOrDisconnecting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {connectingOrDisconnecting ? "Conectando..." : "Conectar"}
              </button>
            )}
          </div>
        </div>

        {/* Selector de catálogo — aparece solo si hay múltiples catálogos */}
        {catalogs.length > 1 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="font-medium text-yellow-800 mb-2">
              📦 Tienes {catalogs.length} catálogos disponibles. Selecciona el
              que quieres sincronizar:
            </p>
            <div className="flex items-center gap-3">
              <select
                value={selectedCatalog}
                onChange={(e) => setSelectedCatalog(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {catalogs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveCatalog}
                disabled={savingCatalog}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {savingCatalog ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        )}

        {/* Banner sin catálogo */}
        {connection.status === "CONNECTED" && catalogs.length === 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-orange-800">
                Sin catálogo de productos
              </p>
              <p className="text-sm text-orange-700 mt-1">
                Tu página no tiene un catálogo de productos en Facebook. Para
                sincronizar productos necesitas crear uno.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handleRefreshCatalogs}
                  disabled={refreshingCatalogs}
                  className="flex items-center gap-2 text-sm bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${refreshingCatalogs ? "animate-spin" : ""}`}
                  />
                  {refreshingCatalogs
                    ? "Buscando..."
                    : "Ya creé mi catálogo, actualizar"}
                </button>

                <a
                  href="https://business.facebook.com/commerce"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-orange-700 underline"
                >
                  Crear catálogo en Facebook →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Stats rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Publicados</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalPublished}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Sin publicar</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalUnpublished}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Errores</p>
            <p className="text-2xl font-bold text-red-600">
              {stats.totalErrors}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Ventas totales</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalSales}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Ingresos</p>
            <p className="text-2xl font-bold text-green-600">
              ${stats.totalRevenue.toLocaleString("es-MX")}
            </p>
          </div>
        </div>

        {/* Acciones masivas */}
        {connection.status === "CONNECTED" && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Sincronizar todos
                  </>
                )}
              </button>

              <button
                onClick={handleUnpublishAll}
                className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 text-sm font-medium flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Despublicar todos
              </button>
            </div>
          </div>
        )}

        {/* Tabs y tabla de productos */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-8 px-6">
              {TABS.map((tab) => {
                let count = 0;
                if (tab.key === "all") count = productStatuses.length;
                else if (tab.key === "published")
                  count = productStatuses.filter(
                    (p) => p.syncStatus === "SYNCED",
                  ).length;
                else if (tab.key === "unpublished")
                  count = productStatuses.filter(
                    (p) => p.syncStatus === "UNPUBLISHED",
                  ).length;
                else if (tab.key === "errors")
                  count = productStatuses.filter(
                    (p) => p.syncStatus === "ERROR",
                  ).length;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.key
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label} ({count})
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Buscador */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Tabla */}
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              {activeTab === "errors" ? (
                <>
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    ✓ Sin errores
                  </h3>
                  <p className="text-gray-500">
                    Todos tus productos están sincronizados correctamente
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-500">
                    No hay productos en esta categoría
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Última sync
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const isSyncing = syncingProductId === product.productId;

                    return (
                      <tr
                        key={`${product.productId}-${product.platform}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                              IMG
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {product.productName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 font-mono">
                            {product.productSku}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-900">
                            ${(product.productPrice || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-600">
                            {product.productStock || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${SYNC_STATUS_COLORS[product.syncStatus]}`}
                            >
                              {SYNC_STATUS_LABELS[product.syncStatus]}
                            </span>
                            {product.syncStatus === "ERROR" &&
                              product.errorMessage && (
                                <div className="relative group">
                                  <AlertTriangle className="w-4 h-4 text-red-500 cursor-help" />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                                    {product.errorMessage}
                                  </div>
                                </div>
                              )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {formatDate(product.lastSyncedAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Switch */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={product.isPublished}
                                onChange={(e) =>
                                  handleToggleProduct(
                                    product.productId,
                                    e.target.checked,
                                  )
                                }
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>

                            {/* Botón de acción */}
                            {product.syncStatus === "SYNCED" &&
                              product.isPublished && (
                                <button
                                  onClick={() =>
                                    handleSyncProduct(product.productId)
                                  }
                                  disabled={isSyncing}
                                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                                >
                                  {isSyncing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Sincronizar"
                                  )}
                                </button>
                              )}

                            {product.syncStatus === "PENDING" && (
                              <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
                            )}

                            {product.syncStatus === "ERROR" &&
                              product.isPublished && (
                                <button
                                  onClick={() =>
                                    handleSyncProduct(product.productId)
                                  }
                                  disabled={isSyncing}
                                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                >
                                  {isSyncing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Reintentar"
                                  )}
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
