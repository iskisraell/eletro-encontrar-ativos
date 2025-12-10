import { z } from 'zod';

/**
 * Zod schemas for equipment data validation
 */

// Equipment schema matching the API/Excel data structure
export const EquipmentSchema = z.object({
    "Nº Eletro": z.string().optional(),
    "Nº Parada": z.string().optional(),
    "Ponto": z.string().optional(),
    "Área de Trabalho": z.string().optional(),
    "Endereço": z.string().optional(),
    "Bairro": z.string().optional(),
    "Cidade": z.string().optional(),
    "Estado": z.string().optional(),
    "Praça": z.string().optional(),
    "Tipo de Estabelecimento": z.string().optional(),
    "Latitude": z.union([z.string(), z.number()]).optional(),
    "Longitude": z.union([z.string(), z.number()]).optional(),
    "Status": z.string().optional(),
    "Data Cadastro": z.string().optional(),
    "Filial": z.string().optional(),
    "Área de Risco": z.string().optional(),
    "Modelo de Abrigo": z.string().optional(),
    "Tipo de Adesivo": z.string().optional(),
    "Tipo de Piso": z.string().optional(),
    "Energizado": z.string().optional(),
    "Luminária": z.string().optional(),
    "Abrigo Amigo": z.string().optional(),
    "Wi-Fi": z.string().optional(),
    "Câmera": z.string().optional(),
    "Altura do Totem": z.string().optional(),
    "Painel Digital": z.string().optional(),
    "Painel Digital - Tipo": z.string().optional(),
    "Painel Digital - Posição": z.string().optional(),
    "Painel Estático": z.string().optional(),
    "Painel Estático - Tipo": z.string().optional(),
    "Painel Estático - Posição": z.string().optional(),
    "Link Operações": z.string().optional(),
    "Foto Referência": z.string().optional(),
}).passthrough(); // Allow additional properties

// API Response schema
export const ApiResponseSchema = z.object({
    status: z.enum(["success", "error"]),
    count: z.number().optional(),
    total: z.number().optional(),
    data: z.array(EquipmentSchema).optional(),
    message: z.string().optional(),
});

// Filter state schema
export const FilterStateSchema = z.object({
    workArea: z.array(z.string()),
    neighborhood: z.array(z.string()),
    shelterModel: z.array(z.string()),
    riskArea: z.array(z.string()),
    hasPhoto: z.boolean(),
});

// Sort state schema
export const SortStateSchema = z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc']),
});

// Dashboard stats schema
export const DashboardStatsSchema = z.object({
    total: z.number(),
    active: z.number(),
    withWifi: z.number(),
    withCamera: z.number(),
    withDigitalPanel: z.number(),
    inRiskArea: z.number(),
    withLighting: z.number(),
    energized: z.number(),
});

// Chart data item schema
export const ChartDataItemSchema = z.object({
    name: z.string(),
    value: z.number(),
    percentage: z.number().optional(),
    fill: z.string().optional(),
});

// Type exports
export type Equipment = z.infer<typeof EquipmentSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type FilterState = z.infer<typeof FilterStateSchema>;
export type SortState = z.infer<typeof SortStateSchema>;
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type ChartDataItem = z.infer<typeof ChartDataItemSchema>;

// Validation helpers
export const validateEquipment = (data: unknown) => {
    return EquipmentSchema.safeParse(data);
};

export const validateApiResponse = (data: unknown) => {
    return ApiResponseSchema.safeParse(data);
};

export const validateEquipmentArray = (data: unknown) => {
    return z.array(EquipmentSchema).safeParse(data);
};

// Helper to check if a field value is considered "active" or "yes"
export const isActiveValue = (value: string | number | undefined): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value !== 'string') return false;
    const normalizedValue = value.toLowerCase().trim();
    return ['sim', 'yes', 'ativo', 'active', 's', 'y', '1', 'true'].includes(normalizedValue);
};

// Helper to check if a field has a meaningful value (not "-" or empty)
export const hasValue = (value: string | number | undefined): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'number') return true;
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return trimmed !== '' && trimmed !== '-' && trimmed !== 'N/A';
};
