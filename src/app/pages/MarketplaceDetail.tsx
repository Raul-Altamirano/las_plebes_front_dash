// src/app/pages/MarketplaceDetail.tsx
import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Loader2, RefreshCw, XCircle, CheckCircle2,
  AlertTriangle, Search, Upload,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useMarketplaces } from "../store/MarketplacesContext";
import { useToast } from "../store/ToastContext";
import { FacebookAccountsAccordion } from "../components/FacebookAccountsAccordion";
import { FacebookSetupWizard } from "../components/FacebookSetupWizard";
import { PublishTargetModal } from "../components/PublishTargetModal";
import type { MarketplacePlatform } from "../types/marketplace";
import {
  PLATFORM_LABELS, PLATFORM_SHORT_LABELS,
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

  // Loading states
  const [connecting, setConnecting] = useState(false);
  const [syncingProductId, setSyncingProductId] = useState<string | null>(null);

  // Publish modal
  const [publishModal, setPublishModal] = useState<{
    mode: "sync-all" | "sync-one" | "unpublish-all";
    productId?: string;
    productName?: string;
  } | null>(null);

  // ── OAuth callback detection ──
  useEffect(() => {
    const connected = searchParams.get("connected");
    const accountId = searchParams.get("accountId");
    const isFirst = searchParams.get("first");
    const error = searchParams.get("error");
    const message = searchParams.get("message");

    if (connected === "true" && accountId) {
      setSearchParams({});
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
    setConnecting(true);
    try {
      await connectPlatform(platform);
      // For Facebook, this redirects — connecting stays true until page unloads
    } catch (err: any) {
      showToast(err?.message || `Error al conectar ${PLATFORM_SHORT_LABELS[platform]}`, "error");
      setConnecting(false);
    }
  };

  // ── Publish modal handlers ──
  const handleSyncAllConfirm = async (pageId: string) => {
    await syncAllProducts(platform, pageId);
    showToast("Productos sincronizados exitosamente", "success");
  };

  const handleSyncOneConfirm = async (pageId: string) => {
    if (!publishModal?.productId) return;
    await syncProduct(publishModal.productId, platform, pageId);
    showToast("Producto sincronizado", "success");
  };

  const handleUnpublishAllConfirm = async (pageId: string) => {
    await unpublishAllProducts(platform, pageId);
    showToast("Todos los productos han sido despublicados", "success");
  };

  const handleToggleProduct = async (productId: string, enabled: boolean) => {
    if (enabled) {
      // Open modal to select where to publish
      const product = productStatuses.find((p) => p.productId === productId);
      setPublishModal({
        mode: "sync-one",
        productId,
        productName: product?.productName,
      });
    } else {
      // Unpublish doesn't need page selection — it removes from wherever it was
      setSyncingProductId(productId);
      try {
        await toggleProductPlatform(productId, platform, false);
        showToast("Producto despublicado", "success");
      } catch {
        showToast("Error al despublicar", "error");
      } finally {
        setSyncingProductId(null);
      }
    }
  };

  const handleSyncProduct = async (productId: string) => {
    const product = productStatuses.find((p) => p.productId === productId);
    setPublishModal({
      mode: "sync-one",
      productId,
      productName: product?.productName,
    });
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
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
              {connecting ? "Conectando..." : "Conectar con Facebook"}
            </button>
          )}
        </div>

        {/* Facebook: Accounts accordion */}
        {isFacebook && <FacebookAccountsAccordion />}

        {/* Wizard modal */}
        {showWizard && wizardAccountId && (
          <FacebookSetupWizard
            accountId={wizardAccountId}
            isFirstAccount={wizardIsFirst}
            onClose={closeWizard}
          />
        )}

        {/* Publish target modal */}
        {publishModal && (
          <PublishTargetModal
            mode={publishModal.mode}
            productId={publishModal.productId}
            productName={publishModal.productName}
            onConfirm={
              publishModal.mode === "sync-all"
                ? handleSyncAllConfirm
                : publishModal.mode === "unpublish-all"
                ? handleUnpublishAllConfirm
                : handleSyncOneConfirm
            }
            onClose={() => setPublishModal(null)}
          />
        )}

        {/* Stats + Products */}
        {hasAccounts && (
          <>
            {/* Stats */}
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
                <button
                  onClick={() => setPublishModal({ mode: "sync-all" })}
                  disabled={syncing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {syncing ? "Sincronizando..." : "Sincronizar todos"}
                </button>
                <button
                  onClick={() => setPublishModal({ mode: "unpublish-all" })}
                  disabled={syncing}
                  className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Despublicar todos
                </button>
              </div>
            </div>

            {/* Products table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Tabs */}
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

              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Buscar producto..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              {/* Table */}
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
                                {product.productImage ? (
                                  <img src={product.productImage} alt="" className="w-10 h-10 rounded object-cover" />
                                ) : (
                                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">IMG</div>
                                )}
                                <span className="text-sm font-medium text-gray-900">{product.productName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3"><span className="text-sm text-gray-600 font-mono">{product.productSku}</span></td>
                            <td className="px-4 py-3 text-right"><span className="text-sm text-gray-900">${(product.productPrice || 0).toFixed(2)}</span></td>
                            <td className="px-4 py-3 text-right"><span className="text-sm text-gray-600">{product.productStock || 0}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${SYNC_STATUS_COLORS[product.syncStatus]}`}>
                                  {SYNC_STATUS_LABELS[product.syncStatus]}
                                </span>
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
                                {/* Publish button — opens modal */}
                                {(!product.isPublished || product.syncStatus === "UNPUBLISHED") && (
                                  <button
                                    onClick={() => handleToggleProduct(product.productId, true)}
                                    disabled={isSyncing}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                    Publicar
                                  </button>
                                )}

                                {/* Re-sync button */}
                                {product.syncStatus === "SYNCED" && product.isPublished && (
                                  <button
                                    onClick={() => handleSyncProduct(product.productId)}
                                    disabled={isSyncing}
                                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    Re-sync
                                  </button>
                                )}

                                {/* Retry button */}
                                {product.syncStatus === "ERROR" && (
                                  <button
                                    onClick={() => handleSyncProduct(product.productId)}
                                    disabled={isSyncing}
                                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    Reintentar
                                  </button>
                                )}

                                {/* Unpublish button */}
                                {product.isPublished && product.syncStatus === "SYNCED" && (
                                  <button
                                    onClick={() => handleToggleProduct(product.productId, false)}
                                    disabled={isSyncing}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                    Quitar
                                  </button>
                                )}

                                {/* Pending spinner */}
                                {product.syncStatus === "PENDING" && (
                                  <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
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

        {/* Empty state */}
        {isFacebook && !hasAccounts && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📘</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Conecta tu cuenta de Facebook</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Vincula tu cuenta para administrar tus páginas, catálogos y sincronizar productos.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
              {connecting ? "Conectando..." : "Conectar con Facebook"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}