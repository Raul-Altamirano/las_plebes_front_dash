// src/app/pages/MarketplaceDetail.tsx
import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Loader2, RefreshCw, XCircle, CheckCircle2,
  AlertTriangle, Search,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useMarketplaces } from "../store/MarketplacesContext";
import { useToast } from "../store/ToastContext";
import { FacebookAccountsAccordion } from "../components/FacebookAccountsAccordion";
import { FacebookSetupWizard } from "../components/FacebookSetupWizard";
import type { MarketplacePlatform, SyncStatus } from "../types/marketplace";
import {
  PLATFORM_LABELS, PLATFORM_SHORT_LABELS,
  CONNECTION_STATUS_LABELS, CONNECTION_STATUS_COLORS,
  SYNC_STATUS_LABELS, SYNC_STATUS_COLORS,
} from "../types/marketplace";

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
  const [searchParams, setSearchParams] = useSearchParams();

  const platform = platformParam?.toUpperCase() as MarketplacePlatform;

  const {
    getConnectionStatus, getPlatformStats, getProductStatuses,
    connectPlatform, syncAllProducts, unpublishAllProducts,
    toggleProductPlatform, syncProduct, syncing,
    facebookStatus, showWizard, wizardAccountId, wizardIsFirst,
    openWizard, closeWizard, reloadFacebookStatus,
  } = useMarketplaces();

  const connection = getConnectionStatus(platform);
  const stats = getPlatformStats(platform);
  const productStatuses = getProductStatuses(platform);

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncingProductId, setSyncingProductId] = useState<string | null>(null);

  // ── OAuth callback detection ──
  useEffect(() => {
    const connected = searchParams.get("connected");
    const accountId = searchParams.get("accountId");
    const isFirst = searchParams.get("first");
    const error = searchParams.get("error");
    const message = searchParams.get("message");

    if (connected === "true" && accountId) {
      setSearchParams({});
      // Reload status then open wizard
      reloadFacebookStatus().then(() => {
        openWizard(accountId, isFirst === "1");
      });
    }

    if (error) {
      const messages: Record<string, string> = {
        cancelled: "Cancelaste la conexión con Facebook",
        invalid_callback: "Callback inválido — intenta de nuevo",
        oauth_failed: "Error al conectar con Facebook",
        plan_limit: message || "Límite de tu plan alcanzado",
      };
      showToast(messages[error] || message || "Error desconocido", "error");
      setSearchParams({});
    }
  }, []);

  if (!connection || !stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Plataforma no encontrada</p>
        <button onClick={() => navigate("/marketplaces")} className="mt-4 text-blue-600 hover:underline">
          Volver a Marketplaces
        </button>
      </div>
    );
  }

  const handleConnect = async () => {
    try {
      await connectPlatform(platform);
    } catch (err: any) {
      showToast(err?.message || `Error al conectar ${PLATFORM_SHORT_LABELS[platform]}`, "error");
    }
  };

  const handleSyncAll = async () => {
    try {
      await syncAllProducts(platform);
      showToast("Productos sincronizados exitosamente", "success");
    } catch {
      showToast("Error al sincronizar productos", "error");
    }
  };

  const handleUnpublishAll = async () => {
    if (!confirm(`¿Estás seguro? Esto quitará todos tus productos de ${PLATFORM_SHORT_LABELS[platform]}.`)) return;
    try {
      await unpublishAllProducts(platform);
      showToast("Todos los productos han sido despublicados", "success");
    } catch {
      showToast("Error al despublicar productos", "error");
    }
  };

  const handleToggleProduct = async (productId: string, enabled: boolean) => {
    try {
      await toggleProductPlatform(productId, platform, enabled);
      showToast(enabled ? "Producto sincronizado" : "Producto despublicado", "success");
    } catch {
      showToast("Error al actualizar el producto", "error");
    }
  };

  const handleSyncProduct = async (productId: string) => {
    setSyncingProductId(productId);
    try {
      await syncProduct(productId, platform);
      showToast("Producto sincronizado", "success");
    } catch {
      showToast("Error al sincronizar producto", "error");
    } finally {
      setSyncingProductId(null);
    }
  };

  // ── Filter products ──
  const filteredProducts = productStatuses.filter((product) => {
    if (activeTab === "published" && product.syncStatus !== "SYNCED") return false;
    if (activeTab === "unpublished" && product.syncStatus !== "UNPUBLISHED") return false;
    if (activeTab === "errors" && product.syncStatus !== "ERROR") return false;
    if (searchQuery && !product.productName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const isFacebook = platform === "FACEBOOK";
  const hasAccounts = isFacebook && facebookStatus && facebookStatus.accounts?.length > 0;

  return (
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/marketplaces")} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">{PLATFORM_LABELS[platform]}</h2>
          </div>
          {!hasAccounts && isFacebook && (
            <button onClick={handleConnect} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Conectar con Facebook
            </button>
          )}
        </div>

        {/* Facebook: Accounts accordion */}
        {isFacebook && (
          <FacebookAccountsAccordion />
        )}

        {/* Wizard modal */}
        {showWizard && wizardAccountId && (
          <FacebookSetupWizard
            accountId={wizardAccountId}
            isFirstAccount={wizardIsFirst}
            onClose={closeWizard}
          />
        )}

        {/* Stats */}
        {hasAccounts && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Publicados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPublished}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Sin publicar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUnpublished}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Errores</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalErrors}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Ventas totales</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Ingresos</p>
                <p className="text-2xl font-bold text-green-600">${stats.totalRevenue.toLocaleString("es-MX")}</p>
              </div>
            </div>

            {/* Bulk actions */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <button onClick={handleSyncAll} disabled={syncing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2">
                  {syncing ? (<><Loader2 className="w-4 h-4 animate-spin" />Sincronizando...</>) : (<><RefreshCw className="w-4 h-4" />Sincronizar todos</>)}
                </button>
                <button onClick={handleUnpublishAll} className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 text-sm font-medium flex items-center gap-2">
                  <XCircle className="w-4 h-4" />Despublicar todos
                </button>
              </div>
            </div>

            {/* Products table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex gap-8 px-6">
                  {TABS.map((tab) => {
                    let count = 0;
                    if (tab.key === "all") count = productStatuses.length;
                    else if (tab.key === "published") count = productStatuses.filter((p) => p.syncStatus === "SYNCED").length;
                    else if (tab.key === "unpublished") count = productStatuses.filter((p) => p.syncStatus === "UNPUBLISHED").length;
                    else if (tab.key === "errors") count = productStatuses.filter((p) => p.syncStatus === "ERROR").length;
                    return (
                      <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                        {tab.label} ({count})
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Buscar producto..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-12 text-center">
                  {activeTab === "errors" ? (
                    <><CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">Sin errores</h3><p className="text-gray-500">Todos tus productos están sincronizados correctamente</p></>
                  ) : (
                    <p className="text-gray-500">No hay productos en esta categoría</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última sync</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredProducts.map((product) => {
                        const isSyncing = syncingProductId === product.productId;
                        return (
                          <tr key={`${product.productId}-${product.platform}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">IMG</div>
                                <span className="text-sm font-medium text-gray-900">{product.productName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3"><span className="text-sm text-gray-600 font-mono">{product.productSku}</span></td>
                            <td className="px-4 py-3 text-right"><span className="text-sm text-gray-900">${(product.productPrice || 0).toFixed(2)}</span></td>
                            <td className="px-4 py-3 text-right"><span className="text-sm text-gray-600">{product.productStock || 0}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${SYNC_STATUS_COLORS[product.syncStatus]}`}>{SYNC_STATUS_LABELS[product.syncStatus]}</span>
                                {product.syncStatus === "ERROR" && product.errorMessage && (
                                  <div className="relative group">
                                    <AlertTriangle className="w-4 h-4 text-red-500 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">{product.errorMessage}</div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3"><span className="text-sm text-gray-600">{formatDate(product.lastSyncedAt)}</span></td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={product.isPublished} onChange={(e) => handleToggleProduct(product.productId, e.target.checked)} className="sr-only peer" />
                                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                                </label>
                                {product.syncStatus === "SYNCED" && product.isPublished && (
                                  <button onClick={() => handleSyncProduct(product.productId)} disabled={isSyncing} className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50">
                                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sincronizar"}
                                  </button>
                                )}
                                {product.syncStatus === "PENDING" && <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />}
                                {product.syncStatus === "ERROR" && product.isPublished && (
                                  <button onClick={() => handleSyncProduct(product.productId)} disabled={isSyncing} className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50">
                                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reintentar"}
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
          </>
        )}

        {/* Empty state — no accounts connected */}
        {isFacebook && !hasAccounts && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📘</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Conecta tu cuenta de Facebook</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Vincula tu cuenta para administrar tus páginas, catálogos y sincronizar productos.
            </p>
            <button onClick={handleConnect} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Conectar con Facebook
            </button>
          </div>
        )}
      </div>
    </div>
  );
}