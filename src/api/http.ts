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

const RAW_BASE = (import.meta.env.VITE_IDENTITY_BASE_URL as string | undefined) ?? "/identity";
const BASE = RAW_BASE.replace(/\/$/, ""); // "" | "/identity" | "https://..."

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

function buildUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;

  // BASE relativo: "/identity" => "/identity/auth/login"
  if (BASE.startsWith("/")) return `${BASE}${p}`;

  // BASE absoluto: "https://..." => "https://.../auth/login"
  if (BASE) return `${BASE}${p}`;

  return p;
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean;      // default true
  tenant?: string;     // si existe, manda X-Tenant-Id
  label?: string;
  debug?: boolean;
};

function shouldDebug(opts?: ApiFetchOptions) {
  const isDev = import.meta.env.DEV;
  if (typeof opts?.debug === "boolean") return opts.debug;
  return isDev;
}

export async function apiFetch<T = any>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const requestId = Math.random().toString(36).slice(2, 10);
  const method = (opts.method || "GET").toUpperCase();
  const auth = opts.auth ?? true;

  const url = buildUrl(path);

  const token = getToken();

  const tenantId =
    opts.tenant ??
    localStorage.getItem(LS_TENANT) ??
    DEFAULT_TENANT;

  // Si viene tenant explícito, persístelo (login + llamadas posteriores)
  if (opts.tenant) localStorage.setItem(LS_TENANT, opts.tenant);

  const headers = new Headers(opts.headers || {});
  if (!headers.has("Content-Type") && opts.body) headers.set("Content-Type", "application/json");

  // ✅ Tenant header automático (clave para tu login spec)
  if (tenantId) headers.set("X-Tenant-Id", tenantId);

  // ✅ Auth header (cuando aplica)
  if (auth && token) headers.set("Authorization", `Bearer ${token}`);

  if (shouldDebug(opts)) {
    console.log(`API → ${method} ${url} ${opts.label ? `[${opts.label}]` : ""}`, {
      requestId,
      base: BASE,
      path,
      tenant: tenantId,
      auth: auth ? "on" : "off",
      hasBody: !!opts.body,
    });
  }

  const t0 = performance.now();
  const res = await fetch(url, { ...opts, headers });
  const ms = Math.round(performance.now() - t0);

  let data: any = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) data = await res.json().catch(() => null);
  else data = await res.text().catch(() => null);

  if (shouldDebug(opts)) {
    console.log(`API ← ${res.status} ${method} ${url} (${ms}ms)`, { requestId, response: data });
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
