import { createApiClient } from './http';

const http = createApiClient('/api/marketing/coverage');

export type CoverageZipStatus = 'ENABLED' | 'DISABLED' | 'REVIEW';

export interface CoverageZip {
  id: string;
  tenantId: string;
  cp: string;
  status: CoverageZipStatus;
  city?: string;
  state?: string;
  deliveryDays?: number;       // días estimados de entrega
  shippingCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateCoverageZipDto = Omit<CoverageZip, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;

export interface ValidateCpResponse {
  cp: string;
  status: CoverageZipStatus;
  deliveryDays?: number;
  shippingCost?: number;
  message: string;             // "Disponible" | "No disponible" | "En revisión"
}

export const coverageApi = {
  list: (): Promise<CoverageZip[]> =>
    http.get('/'),

  get: (id: string): Promise<CoverageZip> =>
    http.get(`/${id}`),

  create: (dto: CreateCoverageZipDto): Promise<CoverageZip> =>
    http.post('/', dto),

  update: (id: string, dto: Partial<CreateCoverageZipDto>): Promise<CoverageZip> =>
    http.put(`/${id}`, dto),

  remove: (id: string): Promise<void> =>
    http.delete(`/${id}`),

  // Valida un CP al crear pedido (usado desde OrdersContext)
  validate: (cp: string): Promise<ValidateCpResponse> =>
    http.get(`/validate/${cp}`),

  // Import masivo CSV
  importCsv: (formData: FormData): Promise<{ imported: number; errors: string[] }> =>
    http.post('/import', formData),

  // Export CSV (retorna URL o blob)
  exportCsv: (): Promise<Blob> =>
    http.get('/export.csv'),
};