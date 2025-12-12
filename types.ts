export interface Equipment {
  "Nº Eletro"?: string;
  "Nº Parada"?: string;
  "Endereço"?: string;
  "Foto Referência"?: string;
  "Cidade"?: string;
  "Bairro"?: string;
  "CEP"?: string;
  "Modelo"?: string;
  "Tipo"?: string;
  [key: string]: string | undefined; // Allow for other dynamic columns from GSheet
}

export interface ApiResponse {
  status: "success" | "error";
  code?: number;
  message?: string;
  meta?: {
    count: number;
    total: number;
    cached?: boolean;
    retryAfter?: number;  // For rate limit errors (429)
  };
  data?: Equipment[];
  // Legacy fields for backward compatibility
  count?: number;
  total?: number;
}

export interface SearchParams {
  q?: string;
  start?: number;
  limit?: number;
  after?: string;         // Cursor pagination (Nº Eletro)
  status?: string;        // Filter by status
  cidade?: string;        // Filter by city
  estado?: string;        // Filter by state
  bairro?: string;        // Filter by neighborhood
  lat?: number;           // Geospatial: latitude
  lon?: number;           // Geospatial: longitude
  radius?: number;        // Geospatial: radius in km
}

// Custom error for rate limiting
export class RateLimitError extends Error {
  retryAfter: number;

  constructor(retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter} seconds.`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}
