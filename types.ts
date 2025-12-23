// Panel detail data (from full/panels layer)
export interface PanelDetails {
  boxes: number;
  faces: number;
  position: string;
  type: string;
}

// Digital panel details with brand (from panels layer)
export interface DigitalPanelDetails extends PanelDetails {
  brand: string; // BOE, CHINA, LG, BOE/DD, etc.
}

// Panel data object (from panels/full layer)
export interface PanelData {
  digital?: PanelDetails;
  static?: PanelDetails;
  shelterModel: string | null;
  observation: string | null;
  hasDigital: boolean;
  hasStatic: boolean;
  totalPanels: number;
}

// Panel layer record (from layer=panels API response)
export interface PanelLayerRecord {
  "Nº Eletro": string;
  digital?: DigitalPanelDetails;
  static?: PanelDetails;
  shelterModel: string | null;
  observation: string | null;
  hasDigital: boolean;
  hasStatic: boolean;
  totalPanels: number;
}

// Abrigo Amigo layer record (from layer=abrigoamigo API response)
export interface AbrigoAmigoRecord {
  enabled: boolean;
  cliente: 'Claro' | 'Governo' | string;
  paradaOriginal: string;
  "Nº Parada": string;
}

// Abrigo Amigo client types for filtering
export type AbrigoAmigoClient = 'claro' | 'governo';

// API layer types
export type ApiLayer = 'main' | 'panels' | 'full' | 'summary';

// Base equipment interface
export interface Equipment {
  "Nº Eletro"?: string;
  "Nº Parada"?: string | number;
  "Endereço"?: string;
  "Foto Referência"?: string;
  "Cidade"?: string;
  "Bairro"?: string;
  "CEP"?: string;
  "Modelo"?: string;
  "Tipo"?: string;
  "Área de Trabalho"?: string;
  "Modelo de Abrigo"?: string;
  "Status"?: string;
  "Filial"?: string;
  "Área de Risco"?: string;
  "Wi-Fi"?: string;
  "Câmera"?: string;
  "Painel Digital"?: string;
  "Painel Digital - Tipo"?: string;
  "Painel Digital - Posição"?: string;
  "Painel Estático"?: string;
  "Painel Estático - Tipo"?: string;
  "Painel Estático - Posição"?: string;
  "Luminária"?: string;
  "Energizado"?: string;
  "Latitude"?: number | string;
  "Longitude"?: number | string;
  // Summary layer panel fields (when using layer=summary)
  digitalPanels?: number;
  staticPanels?: number;
  totalPanels?: number;
  hasDigital?: boolean;
  hasStatic?: boolean;
  shelterModel?: string | null;
  // Full layer panel object (when using layer=full)
  panels?: PanelData | null;
  [key: string]: string | number | boolean | PanelData | PanelLayerRecord | AbrigoAmigoRecord | null | undefined; // Allow for other dynamic columns
}

// Extended Equipment with merged panel layer data
export interface MergedEquipment extends Equipment {
  _panelData?: PanelLayerRecord;  // Attached panel layer data
  _hasPanelData?: boolean;        // Flag indicating if panels were merged
  _abrigoAmigoData?: AbrigoAmigoRecord;  // Attached Abrigo Amigo data
  _hasAbrigoAmigo?: boolean;      // Flag indicating if Abrigo Amigo data was merged
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
  layer?: ApiLayer;       // Data layer: main, panels, full, summary
  hasDigital?: boolean;   // Filter by has digital panels
  hasStatic?: boolean;    // Filter by has static panels
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
