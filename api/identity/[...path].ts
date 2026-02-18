// /api/identity/[...path].ts
export const config = {
  runtime: "nodejs",
};

function corsHeaders(origin?: string) {
  // Permite Vercel prod + previews
  const o = origin || "*";
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tenant-Id",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

export default async function handler(req: any, res: any) {
  const origin = req.headers?.origin as string | undefined;

  // Preflight
  if (req.method === "OPTIONS") {
    const h = corsHeaders(origin);
    Object.entries(h).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(204).end();
  }

  const base = process.env.IDENTITY_UPSTREAM_BASE_URL; // ej: https://xxxxx.lambda-url.us-east-1.on.aws
  if (!base) {
    return res.status(500).json({ message: "Missing IDENTITY_UPSTREAM_BASE_URL env var" });
  }

  const pathParts = req.query?.path;
  const restPath = Array.isArray(pathParts) ? pathParts.join("/") : String(pathParts || "");
  const url = `${base.replace(/\/$/, "")}/${restPath}`;

  // Body raw
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve) => {
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve());
  });
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  // Forward headers (limpio lo que estorba)
  const fwdHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (!v) continue;
    const key = k.toLowerCase();
    if (key === "host" || key === "content-length") continue;
    fwdHeaders[k] = Array.isArray(v) ? v.join(",") : String(v);
  }

  // OJO: si tú dependes del tenant, asegúrate de mandar X-Tenant-Id desde FE
  // aquí solo lo “pasa” si viene.

  const upstream = await fetch(url, {
    method: req.method,
    headers: fwdHeaders,
    body: body as any,
  });

  // Set CORS
  const h = corsHeaders(origin);
  Object.entries(h).forEach(([k, v]) => res.setHeader(k, v));

  // Copy status + content-type
  res.statusCode = upstream.status;
  const ct = upstream.headers.get("content-type");
  if (ct) res.setHeader("content-type", ct);

  // Copy upstream response body
  const buf = Buffer.from(await upstream.arrayBuffer());
  return res.end(buf);
}
