import { createApiClient } from "./http";

const MARKETING_BASE =
  (import.meta.env.VITE_MARKETING_BASE_URL as string | undefined) ?? "/api/marketing";

export const marketingFetch = createApiClient(MARKETING_BASE);