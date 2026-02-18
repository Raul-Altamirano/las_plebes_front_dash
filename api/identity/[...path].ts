export const config = { runtime: "nodejs" };

const UPSTREAM = process.env.IDENTITY_URL!;
// ejemplo: https://bjqd53qndxvche2oljwdzvf6z40zwojf.lambda-url.us-east-1.on.aws

export default async function handler(req: any, res: any) {
  // Preflight
  if (req.method === "OPTIONS") {
    res.status(204);
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-Id");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.end();
  }

  const path = req.query?.path ? `/${req.query.path.join("/")}` : "";
  const qsIndex = req.url?.indexOf("?") ?? -1;
  const qs = qsIndex >= 0 ? req.url.slice(qsIndex) : "";
  const url = `${UPSTREAM.replace(/\/$/, "")}${path}${qs}`;

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers[k] = v;
  }
  delete headers.host;

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : JSON.stringify(req.body ?? {});

  const upstreamRes = await fetch(url, {
    method: req.method,
    headers,
    body,
  });

  const text = await upstreamRes.text();

  res.status(upstreamRes.status);
  upstreamRes.headers.forEach((value, key) => {
    if (!["content-encoding", "transfer-encoding", "connection"].includes(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });

  // Opcional, no estorba
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");

  return res.send(text);
}
