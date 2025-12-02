export interface Equipment {
  "Nº Eletro"?: string;
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
  count?: number;
  total?: number;
  data?: Equipment[];
  message?: string;
}

export interface SearchParams {
  q?: string;
  start?: number;
  limit?: number;
}
