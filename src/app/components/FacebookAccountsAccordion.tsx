// src/app/components/FacebookAccountsAccordion.tsx
import React, { useState } from "react";
import { ChevronRight, Loader2, RefreshCw, Trash2, AlertTriangle, Crown } from "lucide-react";
import { useMarketplaces } from "../store/MarketplacesContext";
import { useToast } from "../store/ToastContext";
import type { FacebookAccount, FacebookPage } from "../../api/marketplaces";

export function FacebookAccountsAccordion() {
  const {
    facebookStatus,
    connectPlatform,
    setAsPrimary,
    togglePage,
    setCatalog,
    refreshCatalogs,
    removeAccount,
  } = useMarketplaces();
  const { showToast } = useToast();

  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (!facebookStatus) return null;

  const { accounts, primaryAccountId, plan, usage } = facebookStatus;
  const maxPages = plan?.limits?.facebookPages ?? 1;
  const maxAccounts = plan?.limits?.facebookAccounts ?? 1;
  const activePages = usage?.activePages ?? 0;
  const canAddAccount = maxAccounts === -1 || accounts.length < maxAccounts;

  const toggleAccordion = (set: Set<string>, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  };

  const handleTogglePage = async (accountId: string, pageId: string, active: boolean) => {
    const key = `toggle-${pageId}`;
    setLoadingAction(key);
    try {
      await togglePage(accountId, pageId, active);
      showToast(active ? "Página activada" : "Página desactivada", "success");
    } catch (err: any) {
      showToast(err?.message || "Error al cambiar estado", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    setLoadingAction(`primary-${accountId}`);
    try {
      await setAsPrimary(accountId);
      showToast("Cuenta marcada como principal", "success");
    } catch (err: any) {
      showToast(err?.message || "Error", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveAccount = async (accountId: string, userName: string) => {
    if (!confirm(`¿Estás seguro de desconectar la cuenta de ${userName}? Se desactivarán todas sus páginas.`)) return;
    setLoadingAction(`remove-${accountId}`);
    try {
      await removeAccount(accountId);
      showToast("Cuenta desconectada", "success");
    } catch (err: any) {
      showToast(err?.message || "Error", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRefreshCatalogs = async (accountId: string, pageId: string) => {
    setLoadingAction(`refresh-${pageId}`);
    try {
      const result = await refreshCatalogs(accountId, pageId);
      showToast(`${result.catalogs.length} catálogo(s) encontrado(s)`, "success");
    } catch {
      showToast("Error al actualizar catálogos", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSelectCatalog = async (accountId: string, pageId: string, catalogId: string) => {
    setLoadingAction(`catalog-${pageId}`);
    try {
      await setCatalog(accountId, pageId, catalogId);
      showToast("Catálogo seleccionado", "success");
    } catch (err: any) {
      showToast(err?.message || "Error", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAddAccount = async () => {
    try {
      await connectPlatform("FACEBOOK");
    } catch (err: any) {
      showToast(err?.message || "Error al conectar", "error");
    }
  };

  // ── Usage bar ──
  const usagePercent = maxPages === -1 ? 0 : Math.round((activePages / maxPages) * 100);

  // ── Inactive pages warning ──
  const inactivePages = accounts.flatMap((a) => a.pages.filter((p) => !p.isActive));
  const hasInactiveByLimit = maxPages !== -1 && inactivePages.length > 0 && activePages >= maxPages;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Cuentas conectadas</h3>
        {canAddAccount ? (
          <button
            onClick={handleAddAccount}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Agregar cuenta
          </button>
        ) : (
          <button
            onClick={() => showToast("Mejora tu plan para agregar más cuentas", "info")}
            className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            Límite de cuentas alcanzado
          </button>
        )}
      </div>

      {/* Usage bar */}
      {maxPages !== -1 && (
        <div className="text-xs text-gray-500">
          Páginas: {activePages} de {maxPages} usadas (plan {plan?.planId})
          <div className="h-1 bg-gray-100 rounded-full mt-1">
            <div
              className={`h-1 rounded-full transition-all ${usagePercent >= 100 ? "bg-red-500" : usagePercent >= 75 ? "bg-amber-500" : "bg-blue-500"}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Accounts */}
      {accounts.map((account) => {
        const isExpanded = expandedAccounts.has(account.accountId);
        const initials = account.userName.split(" ").map((w) => w[0]).join("").slice(0, 2);

        return (
          <div key={account.accountId} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Account header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedAccounts((s) => toggleAccordion(s, account.accountId))}
            >
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center text-xs font-medium">{initials}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{account.userName}</p>
                <p className="text-xs text-gray-500">{account.pages.length} página{account.pages.length !== 1 ? "s" : ""}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${account.isPrimary ? "bg-blue-50 text-blue-800" : "bg-gray-100 text-gray-500"}`}>
                {account.isPrimary ? "Principal" : "Adicional"}
              </span>
              {/* Actions */}
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {!account.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(account.accountId)}
                    disabled={loadingAction === `primary-${account.accountId}`}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                    title="Marcar como principal"
                  >
                    <Crown className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleRemoveAccount(account.accountId, account.userName)}
                  disabled={loadingAction === `remove-${account.accountId}`}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                  title="Desconectar cuenta"
                >
                  {loadingAction === `remove-${account.accountId}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Pages (expanded) */}
            {isExpanded && (
              <div className="border-t border-gray-200">
                {account.pages.map((page) => {
                  const pageKey = `${account.accountId}-${page.pageId}`;
                  const isPageExpanded = expandedPages.has(pageKey);
                  const pageInitials = page.pageName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  const isToggling = loadingAction === `toggle-${page.pageId}`;
                  const canActivate = page.isActive || maxPages === -1 || activePages < maxPages;

                  return (
                    <div key={page.pageId}>
                      <div className="flex items-center gap-3 px-4 py-3 pl-12 border-b border-gray-100">
                        <ChevronRight
                          className={`w-3.5 h-3.5 text-gray-400 cursor-pointer transition-transform ${isPageExpanded ? "rotate-90" : ""}`}
                          onClick={() => setExpandedPages((s) => toggleAccordion(s, pageKey))}
                        />
                        <div className="w-7 h-7 rounded bg-teal-50 text-teal-800 flex items-center justify-center text-xs font-medium">{pageInitials}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{page.pageName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400">ID: {page.pageId}</span>
                            {page.instagramId && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-pink-50 text-pink-800">IG: @{page.instagramUsername || "vinculado"}</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${page.isActive ? "bg-green-50 text-green-800" : "bg-gray-100 text-gray-400"}`}>
                          {page.isActive ? "Activa" : "Inactiva"}
                        </span>
                        {/* Toggle */}
                        <button
                          onClick={() => handleTogglePage(account.accountId, page.pageId, !page.isActive)}
                          disabled={isToggling || (!page.isActive && !canActivate)}
                          className="relative w-9 h-5 rounded-full transition-colors disabled:opacity-40"
                          style={{ background: page.isActive ? "#2563eb" : "#e5e7eb" }}
                        >
                          {isToggling ? (
                            <Loader2 className="w-3 h-3 animate-spin absolute top-1 left-3 text-gray-500" />
                          ) : (
                            <div
                              className="absolute top-0.5 w-4 h-4 rounded-full bg-white border border-gray-200 transition-all"
                              style={{ left: page.isActive ? "18px" : "2px" }}
                            />
                          )}
                        </button>
                      </div>

                      {/* Catalog row (expanded page) */}
                      {isPageExpanded && (
                        <div className="bg-gray-50 px-4 py-3 pl-20 border-b border-gray-100">
                          {page.catalogs.length > 0 ? (
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${page.activeCatalogId ? "bg-green-500" : "bg-gray-300"}`} />
                              {page.catalogs.length === 1 ? (
                                <span className="text-xs text-gray-700">
                                  {page.catalogs[0].name || `Catálogo ${page.catalogs[0].id}`}
                                  <span className="text-gray-400 ml-2 font-mono">{page.catalogs[0].id}</span>
                                </span>
                              ) : (
                                <select
                                  value={page.activeCatalogId || ""}
                                  onChange={(e) => handleSelectCatalog(account.accountId, page.pageId, e.target.value)}
                                  disabled={loadingAction === `catalog-${page.pageId}`}
                                  className="text-xs border border-gray-200 rounded px-2 py-1 flex-1 disabled:opacity-50"
                                >
                                  <option value="">Seleccionar catálogo</option>
                                  {page.catalogs.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name || c.id}</option>
                                  ))}
                                </select>
                              )}
                              <button
                                onClick={() => handleRefreshCatalogs(account.accountId, page.pageId)}
                                disabled={loadingAction === `refresh-${page.pageId}`}
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
                              >
                                <RefreshCw className={`w-3 h-3 ${loadingAction === `refresh-${page.pageId}` ? "animate-spin" : ""}`} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-orange-700">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                              <span>Sin catálogo —</span>
                              <a href="https://business.facebook.com/commerce" target="_blank" rel="noopener noreferrer" className="underline">
                                Crear en Facebook
                              </a>
                              <button
                                onClick={() => handleRefreshCatalogs(account.accountId, page.pageId)}
                                disabled={loadingAction === `refresh-${page.pageId}`}
                                className="ml-2 text-blue-600 underline disabled:opacity-50"
                              >
                                {loadingAction === `refresh-${page.pageId}` ? "Buscando..." : "Refrescar"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Warning: inactive pages by plan limit */}
      {hasInactiveByLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span>
            Hay {inactivePages.length} página{inactivePages.length !== 1 ? "s" : ""} inactiva{inactivePages.length !== 1 ? "s" : ""} por límite de tu plan.
          </span>
          <button className="ml-auto text-xs font-medium text-amber-900 underline whitespace-nowrap">Mejorar plan</button>
        </div>
      )}

      {/* Empty state */}
      {accounts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 mb-3">No hay cuentas de Facebook conectadas</p>
          <button
            onClick={handleAddAccount}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Conectar con Facebook
          </button>
        </div>
      )}
    </div>
  );
}
