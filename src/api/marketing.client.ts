// marketing.client.ts
import { createApiClient } from "./http";

const MARKETING_BASE =
  (import.meta.env.VITE_MARKETING_BASE_URL as string | undefined) ?? "/api/marketing";

const rawFetch = createApiClient(MARKETING_BASE);

/** Desempaqueta el envelope { response, requestId } que usa el BE de marketing */
export async function marketingFetch<T = any>(
  path: string,
  opts?: Parameters<typeof rawFetch>[1]
): Promise<T> {
  const res = await rawFetch<any>(path, opts);
  // Lista paginada: { response: { items, page, limit, total } }
  // Entidad única:  { response: { ...entity } }
  return (res?.response ?? res) as T;
}