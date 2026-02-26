import { RefreshCw } from "lucide-react";
import type { FetchStatus } from "../store/ProductsContext"; // mismo tipo en todos

interface RefreshButtonProps {
  status: FetchStatus;
  lastFetch: number | null;
  onRefresh: () => Promise<void>;
  label?: string;
}

export function RefreshButton({ status, lastFetch, onRefresh, label }: RefreshButtonProps) {
  const isLoading = status === "loading";

  const lastFetchLabel = lastFetch
    ? new Intl.RelativeTimeFormat("es", { numeric: "auto" }).format(
        Math.round((lastFetch - Date.now()) / 60000),
        "minute"
      )
    : null;

  return (
    <div className="flex items-center gap-2">
      {lastFetchLabel && (
        <span className="text-xs text-gray-400">
          Actualizado {lastFetchLabel}
        </span>
      )}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        title={label ?? "Actualizar"}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw
          size={14}
          className={isLoading ? "animate-spin" : ""}
        />
        {label ?? "Actualizar"}
      </button>
    </div>
  );
}