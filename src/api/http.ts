// src/api/http.ts
export type ApiError = {
  status: number;
  code?: string;
  message: string;
  details?: any;
  _req?: {
    method: string;
    url: string;
    path: string;
    tenant?: string;
    hasAuth?: boolean;
    requestId?: string;
  };
};

const DEFAULT_TENANT = (import.meta.env.VITE_TENANT_ID as string | undefined) ?? "lasplebes";
const LS_TOKEN = "accessToken";
const LS_TENANT = "tenantId";

export function getToken() {
  return localStorage.getItem(LS_TOKEN);
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem(LS_TOKEN);
  else localStorage.setItem(LS_TOKEN, token);
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
  tenant?: string;
  label?: string;
  debug?: boolean;
};

// ================== Debug Utilities ==================
const HTTP_DEBUG_DEFAULT =
  (import.meta as any)?.env?.VITE_HTTP_DEBUG === "true" ||
  (import.meta as any)?.env?.DEV === true;

function shouldDebug(opts?: ApiFetchOptions) {
  if (typeof opts?.debug === "boolean") return opts.debug;
  return HTTP_DEBUG_DEFAULT;
}

function redactAuth(v?: string | null) {
  if (!v) return v;
  const parts = v.split(" ");
  if (parts.length !== 2) return "***";
  const token = parts[1] || "";
  if (token.length <= 12) return `${parts[0]} ***`;
  return `${parts[0]} ${token.slice(0, 6)}…${token.slice(-4)}`;
}

function headersToObject(h: Headers) {
  const obj: Record<string, string> = {};
  h.forEach((value, key) => {
    obj[key] = key.toLowerCase() === "authorization" ? (redactAuth(value) ?? "***") : value;
  });
  return obj;
}

function bodyPreview(body: any) {
  if (!body) return null;

  if (typeof body === "string") {
    const s = body.trim();
    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
      try {
        return JSON.parse(s);
      } catch {
        /* ignore */
      }
    }
    return s.length > 1200 ? `${s.slice(0, 1200)}…(truncated)` : s;
  }

  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const entries: Record<string, string> = {};
    body.forEach((v, k) => {
      entries[k] = typeof v === "string" ? v : "[file]";
    });
    return { _type: "FormData", entries };
  }

  try {
    return JSON.parse(JSON.stringify(body));
  } catch {
    return { _type: typeof body };
  }
}

// ================== API Client Factory ==================
export function createApiClient(rawBase: string) {
  const BASE = rawBase.replace(/\/$/, "");

  function buildUrl(path: string) {
    const p = path.startsWith("/") ? path : `/${path}`;
    return BASE ? `${BASE}${p}` : p;
  }

  async function apiFetch<T = any>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
    const requestId = Math.random().toString(36).slice(2, 10);
    const method = (opts.method || "GET").toUpperCase();
    const auth = opts.auth ?? true;
    const url = buildUrl(path);
    const token = getToken();

    const tenantId = opts.tenant ?? localStorage.getItem(LS_TENANT) ?? DEFAULT_TENANT;
    if (opts.tenant) localStorage.setItem(LS_TENANT, opts.tenant);

    const headers = new Headers(opts.headers || {});
    if (!headers.has("Content-Type") && opts.body) headers.set("Content-Type", "application/json");
    if (tenantId) headers.set("X-Tenant-Id", tenantId);
    if (auth && token) headers.set("Authorization", `Bearer ${token}`);

    const debug = shouldDebug(opts);

    if (debug) {
      console.log(`API → ${method} ${url} ${opts.label ? `[${opts.label}]` : ""}`, {
        requestId,
        base: BASE,
        path,
        tenant: tenantId,
        auth: auth ? "on" : "off",
        headers: headersToObject(headers),
        body: bodyPreview(opts.body),
      });
    }

    const t0 = performance.now();
    const res = await fetch(url, { ...opts, headers });
    const ms = Math.round(performance.now() - t0);

    const contentType = res.headers.get("content-type") || "";
    let data: any = null;
    if (contentType.includes("application/json")) data = await res.json().catch(() => null);
    else data = await res.text().catch(() => null);

    if (debug) {
      console.log(`API ← ${res.status} ${method} ${url} (${ms}ms) ${opts.label ? `[${opts.label}]` : ""}`, {
        requestId,
        response: data,
        // si quieres headers de respuesta también, descomenta:
        // responseHeaders: headersToObject(res.headers as any),
      });
    }

    if (!res.ok) {
      const err: ApiError = {
        status: res.status,
        code: data?.code,
        message: data?.message || "Request failed",
        details: data?.details,
        _req: { method, url, path, tenant: tenantId, hasAuth: auth, requestId },
      };
      throw err;
    }

    return data as T;
  }

  return apiFetch;
}

// ─── Cliente default (identity) ───────────────────────────────────────────────
const IDENTITY_BASE = (import.meta.env.VITE_IDENTITY_BASE_URL as string | undefined) ?? "/api/identity";
export const apiFetch = createApiClient(IDENTITY_BASE);