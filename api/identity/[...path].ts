export const config = {
  runtime: "nodejs",
};

function setCors(res: any, origin?: string) {
  const o = origin || "*";
  res.setHeader("Access-Control-Allow-Origin", o);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-Id");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
}

export default async function handler(req: any, res: any) {
  const origin = req.headers?.origin as string | undefined;

  // Preflight
  if (req.method === "OPTIONS") {
    setCors(res, origin);
    return res.status(204).end();
  }

  setCors(res, origin);

  const base = process.env.IDENTITY_UPSTREAM_BASE_URL;
  if (!base) return res.status(500).json({ message: "Missing IDENTITY_UPSTREAM_BASE_URL env var" });

  const pathParts = req.query?.path;
  const restPath = Array.isArray(pathParts) ? pathParts.join("/") : String(pathParts || "");

  const url = `${base.replace(/\/$/, "")}/${restPath}`;

  // Vercel ya te parsea body si es JSON a veces, pero aquí lo mandamos crudo:
  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : typeof req.body === "string"
        ? req.body
        : req.body
          ? JSON.stringify(req.body)
          : undefined;

  // Forward headers (limpio host/content-length)
  const fwdHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (!v) continue;
    const key = k.toLowerCase();
    if (key === "host" || key === "content-length") continue;
    fwdHeaders[k] = Array.isArray(v) ? v.join(",") : String(v);
  }

  const upstream = await fetch(url, {
    method: req.method,
    headers: fwdHeaders,
    body,
  });

  // Copy status + content-type
  res.status(upstream.status);
  const ct = upstream.headers.get("content-type");
  if (ct) res.setHeader("content-type", ct);

  const buf = Buffer.from(await upstream.arrayBuffer());
  return res.end(buf);
}
