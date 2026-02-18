// api/identity/[...path].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const UPSTREAM_BASE = process.env.IDENTITY_UPSTREAM_BASE_URL;

// Opcional: CSV de orígenes permitidos exactos (prod custom domains, etc)
const EXTRA_ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// Permite prod + previews de Vercel (regex) + extra explícitos
function resolveAllowedOrigin(origin?: string) {
  if (!origin) return "";

  const isVercelPreview =
    /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/i.test(origin) ||
    // previews típicos: https://project-git-branch-team.vercel.app
    /^https:\/\/[a-z0-9-]+-git-[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/i.test(origin);

  if (isVercelPreview) return origin;

  if (EXTRA_ALLOWED_ORIGINS.includes(origin)) return origin;

  return "";
}

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = Array.isArray(req.headers.origin)
    ? req.headers.origin[0]
    : req.headers.origin;

  const allowed = resolveAllowedOrigin(origin);

  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", allowed);
    res.setHeader("Vary", "Origin");
    // Si vas a usar cookies/sesión, esto debe ser true.
    // Si solo usas Authorization header, puedes dejarlo también.
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Tenant-Id, X-Requested-With"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
}

async function readRawBody(req: VercelRequest): Promise<Buffer | undefined> {
  const method = (req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") return undefined;

  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0)));
    req.on("error", reject);
  });
}

function pickForwardHeaders(req: VercelRequest) {
  const h = req.headers;

  // Solo reenvía lo que necesitas, evita meter basura hop-by-hop.
  const out: Record<string, string> = {};

  const allowList = [
    "authorization",
    "content-type",
    "accept",
    "x-tenant-id"
  ];

  for (const key of allowList) {
    const v = h[key];
    if (!v) continue;
    out[key] = Array.isArray(v) ? v.join(",") : String(v);
  }

  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!UPSTREAM_BASE) {
    res.status(500).json({ error: "Missing IDENTITY_UPSTREAM_BASE_URL env var" });
    return;
  }

  // Debug: confirma que ESTÁS en la function (no en index.html)
  if (req.query.__ping === "1") {
    setCors(req, res);
    res.status(200).json({
      ok: true,
      where: "vercel-function",
      method: req.method,
      path: req.url
    });
    return;
  }

  setCors(req, res);

  // Preflight
  if ((req.method || "").toUpperCase() === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // Path dinámico: /api/identity/<...>
  const pathParam = req.query.path;
  const pathParts = Array.isArray(pathParam)
    ? pathParam
    : typeof pathParam === "string"
      ? [pathParam]
      : [];

  // Construye URL destino
  const upstream = new URL(UPSTREAM_BASE.replace(/\/$/, "") + "/" + pathParts.join("/"));

  // Copia querystring menos "path"
  for (const [k, v] of Object.entries(req.query)) {
    if (k === "path") continue;
    if (typeof v === "undefined") continue;
    if (Array.isArray(v)) v.forEach(val => upstream.searchParams.append(k, String(val)));
    else upstream.searchParams.set(k, String(v));
  }

  const method = (req.method || "GET").toUpperCase();
  const body = await readRawBody(req);

  const upstreamResp = await fetch(upstream.toString(), {
    method,
    headers: pickForwardHeaders(req),
    body: body as any
  });

  // Headers de respuesta: copia los que sirven
  res.setHeader("X-Proxy", "vercel-identity-bff");

  const passthroughHeaders = ["content-type", "set-cookie", "cache-control"];
  for (const key of passthroughHeaders) {
    const val = upstreamResp.headers.get(key);
    if (val) res.setHeader(key, val);
  }

  // Si necesitas reenviar más headers, agrégalos arriba.

  const respBuf = Buffer.from(await upstreamResp.arrayBuffer());
  res.status(upstreamResp.status).send(respBuf);
}
