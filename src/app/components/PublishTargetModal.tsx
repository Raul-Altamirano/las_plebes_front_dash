// src/app/components/PublishTargetModal.tsx
import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useMarketplaces } from "../store/MarketplacesContext";
import type { FacebookAccount, FacebookPage } from "../../api/marketplaces";

interface Props {
  mode: "sync-all" | "sync-one" | "unpublish-all";
  productId?: string;
  productName?: string;
  onConfirm: (pageId: string, catalogId: string) => Promise<void>;
  onClose: () => void;
}

export function PublishTargetModal({ mode, productId, productName, onConfirm, onClose }: Props) {
  const { facebookStatus } = useMarketplaces();

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!facebookStatus) return null;

  // Get all active pages with catalogs across all accounts
  const activePages: { account: FacebookAccount; page: FacebookPage }[] = [];
  for (const account of facebookStatus.accounts || []) {
    for (const page of account.pages) {
      if (page.isActive && page.activeCatalogId) {
        activePages.push({ account, page });
      }
    }
  }

  const titles: Record<string, string> = {
    "sync-all": "Sincronizar todos los productos",
    "sync-one": productName ? `Sincronizar: ${productName}` : "Sincronizar producto",
    "unpublish-all": "Despublicar todos los productos",
  };

  const confirmLabels: Record<string, string> = {
    "sync-all": "Sincronizar todos",
    "sync-one": "Sincronizar",
    "unpublish-all": "Despublicar todos",
  };

  const handleConfirm = async () => {
    const target = activePages.find((ap) => ap.page.pageId === selectedPageId);
    if (!target) return;

    setLoading(true);
    try {
      await onConfirm(target.page.pageId, target.page.activeCatalogId!);
      onClose();
    } catch {
      // error handled by caller
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 overflow-hidden shadow-lg">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{titles[mode]}</h3>
          <button onClick={onClose} disabled={loading} className="p-1 hover:bg-gray-100 rounded disabled:opacity-50">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            Selecciona la página y catálogo destino:
          </p>

          {activePages.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500">
              No hay páginas activas con catálogo configurado.
              <br />
              <span className="text-xs text-gray-400">Activa una página y selecciona su catálogo primero.</span>
            </div>
          ) : (
            activePages.map(({ account, page }) => {
              const isSelected = selectedPageId === page.pageId;
              const catalogName = page.catalogs.find((c) => c.id === page.activeCatalogId)?.name || page.activeCatalogId;
              const initials = page.pageName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

              return (
                <div
                  key={page.pageId}
                  onClick={() => !loading && setSelectedPageId(page.pageId)}
                  className={`p-3 border rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  } ${loading ? "pointer-events-none opacity-60" : ""}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "border-blue-600" : "border-gray-300"
                  }`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                  </div>
                  <div className="w-8 h-8 rounded bg-teal-50 text-teal-800 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{page.pageName}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {catalogName}
                      <span className="text-gray-300 mx-1">·</span>
                      {account.userName}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedPageId || loading || activePages.length === 0}
            className={`px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 ${
              mode === "unpublish-all"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Procesando..." : confirmLabels[mode]}
          </button>
        </div>
      </div>
    </div>
  );
}
