// src/app/components/FacebookSetupWizard.tsx
import React, { useState, useMemo } from "react";
import { X, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { useMarketplaces } from "../store/MarketplacesContext";
import { useToast } from "../store/ToastContext";
import type { FacebookAccount, FacebookPage, SetupAccountConfig } from "../../api/marketplaces";

interface Props {
  accountId: string;
  isFirstAccount: boolean;
  onClose: () => void;
}

type Step = "account-type" | "select-pages" | "select-catalogs";

export function FacebookSetupWizard({ accountId, isFirstAccount, onClose }: Props) {
  const { facebookStatus, setupAccount, refreshCatalogs } = useMarketplaces();
  const { showToast } = useToast();

  const account = facebookStatus?.accounts?.find((a) => a.accountId === accountId);
  const planLimits = facebookStatus?.plan?.limits;
  const currentActivePages = facebookStatus?.usage?.activePages ?? 0;

  // Step management
  const initialStep: Step = isFirstAccount ? "select-pages" : "account-type";
  const [step, setStep] = useState<Step>(initialStep);

  // Step 1 state
  const [isPrimary, setIsPrimary] = useState(isFirstAccount);

  // Step 2 state — which pages are selected
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());

  // Step 3 state — catalog per page
  const [catalogSelections, setCatalogSelections] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [refreshingPage, setRefreshingPage] = useState<string | null>(null);

  // How many pages can this account activate?
  const maxAllowedPages = planLimits?.facebookPages === -1
    ? Infinity
    : (planLimits?.facebookPages ?? 1);
  const activePagesOtherAccounts = currentActivePages; // pages already active in other accounts
  const availableSlots = Math.max(0, maxAllowedPages - activePagesOtherAccounts);

  if (!account) return null;

  const pages = account.pages || [];

  // Steps config
  const steps: Step[] = isFirstAccount
    ? ["select-pages", "select-catalogs"]
    : ["account-type", "select-pages", "select-catalogs"];

  const stepIndex = steps.indexOf(step);
  const isLast = stepIndex === steps.length - 1;

  // ── Step 1: Account type ──
  const renderAccountType = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-medium text-sm">
          {account.userName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">{account.userName}</p>
          <p className="text-xs text-gray-500">{pages.length} páginas encontradas</p>
        </div>
      </div>

      <div
        onClick={() => setIsPrimary(true)}
        className={`p-4 border rounded-lg cursor-pointer transition-colors ${isPrimary ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center ${isPrimary ? "border-blue-600" : "border-gray-300"}`}>
            {isPrimary && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900">Establecer como cuenta principal</p>
            <p className="text-xs text-gray-500 mt-1">Es tu cuenta personal o la de tu negocio.</p>
          </div>
        </div>
      </div>

      <div
        onClick={() => setIsPrimary(false)}
        className={`p-4 border rounded-lg cursor-pointer transition-colors ${!isPrimary ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center ${!isPrimary ? "border-blue-600" : "border-gray-300"}`}>
            {!isPrimary && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900">Agregar como cuenta adicional</p>
            <p className="text-xs text-gray-500 mt-1">Es la cuenta de un socio, cliente o colaborador.</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 2: Select pages ──
  const togglePage = (pageId: string) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        if (next.size < availableSlots) {
          next.add(pageId);
        }
      }
      return next;
    });
  };

  const renderSelectPages = () => (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Tu plan permite hasta <span className="font-medium">{maxAllowedPages === Infinity ? "ilimitadas" : maxAllowedPages}</span> páginas en total.
        {activePagesOtherAccounts > 0 && ` Ya usas ${activePagesOtherAccounts}.`}
      </p>

      {pages.map((page) => {
        const isSelected = selectedPages.has(page.pageId);
        const isDisabled = !isSelected && selectedPages.size >= availableSlots;

        return (
          <div
            key={page.pageId}
            onClick={() => !isDisabled && togglePage(page.pageId)}
            className={`p-3 border rounded-lg flex items-center gap-3 transition-colors ${
              isSelected ? "border-blue-600 bg-blue-50" : isDisabled ? "border-gray-100 opacity-50 cursor-not-allowed" : "border-gray-200 hover:bg-gray-50 cursor-pointer"
            }`}
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs text-white ${isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}>
              {isSelected && "✓"}
            </div>
            <div className="w-8 h-8 rounded bg-teal-50 text-teal-800 flex items-center justify-center text-xs font-medium">
              {page.pageName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{page.pageName}</p>
              <p className="text-xs text-gray-500">
                {page.catalogs.length} catálogo{page.catalogs.length !== 1 ? "s" : ""}
                {page.instagramId && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-pink-50 text-pink-800">IG vinculado</span>
                )}
              </p>
            </div>
          </div>
        );
      })}

      {selectedPages.size >= availableSlots && availableSlots < pages.length && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          Has seleccionado {selectedPages.size} de {availableSlots} páginas disponibles. Mejora tu plan para agregar más.
        </div>
      )}
    </div>
  );

  // ── Step 3: Select catalogs ──
  const handleRefreshCatalogs = async (pageId: string) => {
    setRefreshingPage(pageId);
    try {
      await refreshCatalogs(accountId, pageId);
      showToast("Catálogos actualizados", "success");
    } catch {
      showToast("Error al actualizar catálogos", "error");
    } finally {
      setRefreshingPage(null);
    }
  };

  const renderSelectCatalogs = () => {
    const selectedPagesList = pages.filter((p) => selectedPages.has(p.pageId));

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Selecciona el catálogo activo para cada página.</p>

        {selectedPagesList.map((page) => (
          <div key={page.pageId} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-900">{page.pageName}</p>
              <button
                onClick={() => handleRefreshCatalogs(page.pageId)}
                disabled={refreshingPage === page.pageId}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${refreshingPage === page.pageId ? "animate-spin" : ""}`} />
                Refrescar
              </button>
            </div>

            {page.catalogs.length > 0 ? (
              <select
                value={catalogSelections[page.pageId] || page.catalogs[0]?.id || ""}
                onChange={(e) => setCatalogSelections((prev) => ({ ...prev, [page.pageId]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {page.catalogs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || `Catálogo ${c.id}`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-orange-800">
                  <p className="font-medium">Sin catálogo</p>
                  <a
                    href="https://business.facebook.com/commerce"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Crea uno en Facebook →
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ── Navigation ──
  const handleNext = () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < steps.length) {
      setStep(steps[nextIdx]);
    }
  };

  const handleBack = () => {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) {
      setStep(steps[prevIdx]);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const config: SetupAccountConfig = {
        isPrimary: isFirstAccount ? true : isPrimary,
        pages: pages.map((p) => ({
          pageId: p.pageId,
          isActive: selectedPages.has(p.pageId),
          activeCatalogId: selectedPages.has(p.pageId)
            ? (catalogSelections[p.pageId] || p.catalogs[0]?.id || null)
            : null,
        })),
      };

      await setupAccount(accountId, config);
      showToast("Cuenta configurada exitosamente", "success");
    } catch (err: any) {
      showToast(err?.message || "Error al configurar cuenta", "error");
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === "account-type") return true;
    if (step === "select-pages") return selectedPages.size > 0;
    if (step === "select-catalogs") return true;
    return false;
  };

  // ── Render ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 overflow-hidden shadow-lg">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Configurar cuenta de Facebook</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">{account.userName}</p>

          {/* Progress */}
          <div className="flex gap-2 mt-3">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full ${
                  i < stepIndex ? "bg-blue-600" : i === stepIndex ? "bg-blue-300" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {step === "account-type" && renderAccountType()}
          {step === "select-pages" && renderSelectPages()}
          {step === "select-catalogs" && renderSelectCatalogs()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={stepIndex > 0 ? handleBack : onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {stepIndex > 0 ? "Atrás" : "Cancelar"}
          </button>

          {isLast ? (
            <button
              onClick={handleFinish}
              disabled={saving || !canProceed()}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Guardando..." : "Finalizar"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Siguiente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
