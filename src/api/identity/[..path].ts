// api/identity/[...path].ts
// BFF: proxies requests from the frontend to the Lambda upstream.
// Works as a Vercel Serverless Function (Node.js runtime).

import type { VercelRequest, VercelResponse } from "@vercel/node";

const UPSTREAM = (process.env.IDENTITY_URL ?? "").replace(/\/$/, "");
// Set IDENTITY_URL in Vercel env vars:
// https://bjqd53qndxvche2oljwdzvf6z40zwojf.lambda-url.us-east-1.on.aws

// ─── CORS ────────────────────────────────────────────────────────────────────

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = Array.isArray(req.headers.origin)
    ? req.headers.origin[0]
    : req.headers.origin ?? "*";

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-Id");
  res.setHeader("Access-Control-Max-Age", "86400");
}

// ─── Only forward safe headers to Lambda ────────────────────────────────────

function pickHeaders(req: VercelRequest): Record<string, string> {
  const allowed = ["authorization", "content-type", "accept", "x-tenant-id"];
  const out: Record<string, string> = {};

  for (const key of allowed) {
    const val = req.headers[key];
    if (!val) continue;
    out[key] = Array.isArray(val) ? val.join(",") : val;
  }

  return out;
}

// ─── Read raw body (Vercel does NOT pre-parse for you in Node runtime) ───────

function readBody(req: VercelRequest): Promise<Buffer | undefined> {
  const method = (req.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") return Promise.resolve(undefined);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    req.on("end", () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
    req.on("error", reject);
  });
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Guard: env var must be set
  if (!UPSTREAM) {
    res.status(500).json({ error: "IDENTITY_URL env var is not set" });
    return;
  }

  // Always set CORS headers (preflight + real requests)
  setCors(req, res);

  // Handle preflight
  if ((req.method ?? "").toUpperCase() === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // Build upstream URL
  const pathParam = req.query.path;
  const pathParts = Array.isArray(pathParam)
    ? pathParam
    : typeof pathParam === "string"
    ? [pathParam]
    : [];

  const upstreamUrl = new URL(`${UPSTREAM}/${pathParts.join("/")}`);

  // Forward query string (skip internal "path" key)
  for (const [k, v] of Object.entries(req.query)) {
    if (k === "path") continue;
    if (Array.isArray(v)) v.forEach((val) => upstreamUrl.searchParams.append(k, val));
    else if (v) upstreamUrl.searchParams.set(k, v);
  }

  // Read body and call Lambda
  const body = await readBody(req);

  const upstreamRes = await fetch(upstreamUrl.toString(), {
    method: req.method ?? "GET",
    headers: pickHeaders(req),
    body: body ? new Uint8Array(body) : undefined,
  });

  // Forward safe response headers
  const passHeaders = ["content-type", "cache-control", "set-cookie"];
  for (const key of passHeaders) {
    const val = upstreamRes.headers.get(key);
    if (val) res.setHeader(key, val);
  }

  const buffer = Buffer.from(await upstreamRes.arrayBuffer());
  res.status(upstreamRes.status).send(buffer);
}