import { useMemo } from 'react';
import { Equipment, MergedEquipment, PanelLayerRecord } from '../types';
import { hasValue, isActiveValue, isAbrigo } from '../schemas/equipment';
import { percentage, getTopN } from '../lib/utils';

export interface DashboardStats {
    total: number;
    active: number;
    withWifi: number;
    withCamera: number;
    withDigitalPanel: number;
    withStaticPanel: number;
    inRiskArea: number;
    withLighting: number;
    energized: number;
    withPhoto: number;
    // New panel stats
    totalDigitalPanels: number;
    totalStaticPanels: number;
}

export interface ChartData {
    name: string;
    value: number;
    percentage?: number;
    fill?: string;
    [key: string]: string | number | undefined;
}

// Extended chart data for stacked charts
export interface StackedChartData {
    name: string;
    digital: number;
    static: number;
    total: number;
    percentage?: number;
}

export interface BrandChartData {
    name: string;
    value: number;
    percentage?: number;
    fill?: string;
}

export interface DashboardData {
    stats: DashboardStats;
    byWorkArea: ChartData[];
    byNeighborhood: ChartData[];
    byShelterModel: ChartData[];
    byBranch: ChartData[];
    featureDistribution: ChartData[];
    // New panel chart data
    panelDistribution: ChartData[];
    panelsByShelterModel: StackedChartData[];
    panelsByWorkArea: StackedChartData[];
    // Brand distribution from panels layer
    byDigitalBrand: BrandChartData[];
}

// Color palette for charts
const CHART_COLORS = [
    '#ff4f00', // Eletro orange (primary)
    '#6342ff', // Purple (Secondary accent)
    '#31b11c', // Green (Success)
    '#ff8231', // Secondary orange
    '#ff74ff', // Pink (Static panels)
    '#1A1A1A', // Black (Dark bg/text)
    '#dc3545', // Error red
    '#6B7280', // Gray (Neutral)
];

// Panel colors
export const DIGITAL_PANEL_COLOR = '#ff4f00'; // Eletro orange
export const STATIC_PANEL_COLOR = '#ff74ff'; // Pink for static

/**
 * Helper to check if equipment has merged panel data
 */
const hasMergedPanelData = (e: Equipment | MergedEquipment): e is MergedEquipment & { _panelData: PanelLayerRecord } => {
    return '_hasPanelData' in e && e._hasPanelData === true && '_panelData' in e && e._panelData !== undefined;
};

/**
 * Helper to check if equipment has digital panels
 * Uses merged panel data when available, falls back to legacy
 * Only Abrigos (shelters) can have panels - TOTEMs cannot
 */
const hasDigitalPanel = (e: Equipment | MergedEquipment): boolean => {
    // Only Abrigos (shelters) can have panels
    if (!isAbrigo(e)) return false;
    
    // Check merged panel data first (from panels layer)
    if (hasMergedPanelData(e)) {
        return e._panelData.hasDigital;
    }
    
    // New API fields (summary layer)
    if (typeof e.hasDigital === 'boolean') return e.hasDigital;
    if (typeof e.digitalPanels === 'number') return e.digitalPanels > 0;
    // Legacy fallback
    return isActiveValue(e["Painel Digital"]) || hasValue(e["Painel Digital"]);
};

/**
 * Helper to check if equipment has static panels
 * Uses merged panel data when available, falls back to legacy
 * Only Abrigos (shelters) can have panels - TOTEMs cannot
 */
const hasStaticPanel = (e: Equipment | MergedEquipment): boolean => {
    // Only Abrigos (shelters) can have panels
    if (!isAbrigo(e)) return false;
    
    // Check merged panel data first (from panels layer)
    if (hasMergedPanelData(e)) {
        return e._panelData.hasStatic;
    }
    
    // New API fields (summary layer)
    if (typeof e.hasStatic === 'boolean') return e.hasStatic;
    if (typeof e.staticPanels === 'number') return e.staticPanels > 0;
    // Legacy fallback
    return isActiveValue(e["Painel Estático - Tipo"]) || hasValue(e["Painel Estático - Tipo"]);
};

/**
 * Get digital panel count for equipment
 * Uses merged panel data when available
 * Only Abrigos (shelters) can have panels - TOTEMs return 0
 */
const getDigitalPanelCount = (e: Equipment | MergedEquipment): number => {
    // Only Abrigos (shelters) can have panels
    if (!isAbrigo(e)) return 0;
    
    // Check merged panel data first (from panels layer)
    if (hasMergedPanelData(e) && e._panelData.digital) {
        return e._panelData.digital.boxes || 1;
    }
    
    if (typeof e.digitalPanels === 'number') return e.digitalPanels;
    // Legacy: try to parse from string field
    const value = e["Painel Digital"];
    if (value && value !== '-') {
        const num = parseInt(String(value), 10);
        return isNaN(num) ? (hasDigitalPanel(e) ? 1 : 0) : num;
    }
    return 0;
};

/**
 * Get static panel count for equipment
 * Uses merged panel data when available
 * Only Abrigos (shelters) can have panels - TOTEMs return 0
 */
const getStaticPanelCount = (e: Equipment | MergedEquipment): number => {
    // Only Abrigos (shelters) can have panels
    if (!isAbrigo(e)) return 0;
    
    // Check merged panel data first (from panels layer)
    if (hasMergedPanelData(e) && e._panelData.static) {
        return e._panelData.static.boxes || 1;
    }
    
    if (typeof e.staticPanels === 'number') return e.staticPanels;
    // Legacy: try to parse from string field
    const value = e["Painel Estático"];
    if (value && value !== '-') {
        const num = parseInt(String(value), 10);
        return isNaN(num) ? (hasStaticPanel(e) ? 1 : 0) : num;
    }
    return 0;
};

/**
 * Get total panel count for equipment
 * Uses merged panel data when available
 */
const getTotalPanelCount = (e: Equipment | MergedEquipment): number => {
    if (!isAbrigo(e)) return 0;
    
    // Check merged panel data first
    if (hasMergedPanelData(e)) {
        return e._panelData.totalPanels || 0;
    }
    
    return getDigitalPanelCount(e) + getStaticPanelCount(e);
};

/**
 * Get digital panel brand for equipment
 * Only available from merged panel data (panels layer)
 */
const getDigitalPanelBrand = (e: Equipment | MergedEquipment): string | null => {
    if (!isAbrigo(e)) return null;
    
    if (hasMergedPanelData(e) && e._panelData.digital?.brand) {
        return e._panelData.digital.brand;
    }
    
    return null;
};

/**
 * Get shelter model for equipment
 * Prefers main layer "Modelo de Abrigo", with panels layer "shelterModel" as complement
 */
const getShelterModel = (e: Equipment | MergedEquipment): string | null => {
    const mainModel = e["Modelo de Abrigo"];
    if (mainModel && mainModel !== '-' && mainModel.trim()) {
        return mainModel;
    }
    
    // Try merged panel data shelter model
    if (hasMergedPanelData(e) && e._panelData.shelterModel) {
        return e._panelData.shelterModel;
    }
    
    // Fallback to legacy shelterModel field
    if (e.shelterModel && e.shelterModel.trim()) {
        return e.shelterModel;
    }
    return null;
};

/**
 * Hook to calculate dashboard statistics and chart data from equipment array
 * Supports both Equipment[] and MergedEquipment[] with panel data
 */
export function useDashboardStats(equipment: (Equipment | MergedEquipment)[]): DashboardData {
    return useMemo(() => {
        const total = equipment.length;

        // Calculate panel counts using new helpers
        const digitalPanelEquipment = equipment.filter(hasDigitalPanel);
        const staticPanelEquipment = equipment.filter(hasStaticPanel);
        const totalDigitalPanels = equipment.reduce((sum, e) => sum + getDigitalPanelCount(e), 0);
        const totalStaticPanels = equipment.reduce((sum, e) => sum + getStaticPanelCount(e), 0);

        // Calculate stats
        const stats: DashboardStats = {
            total,
            active: equipment.filter(e => e["Status"] === "Ativo").length,
            withWifi: equipment.filter(e => isActiveValue(e["Wi-Fi"]) || hasValue(e["Wi-Fi"])).length,
            withCamera: equipment.filter(e => isActiveValue(e["Câmera"]) || hasValue(e["Câmera"])).length,
            withDigitalPanel: digitalPanelEquipment.length,
            withStaticPanel: staticPanelEquipment.length,
            inRiskArea: equipment.filter(e => hasValue(e["Área de Risco"]) && e["Área de Risco"] !== "-").length,
            withLighting: equipment.filter(e => isActiveValue(e["Luminária"]) || hasValue(e["Luminária"])).length,
            energized: equipment.filter(e => isActiveValue(e["Energizado"]) || hasValue(e["Energizado"])).length,
            withPhoto: equipment.filter(e => e["Foto Referência"] && String(e["Foto Referência"]).length > 0 && e["Foto Referência"] !== "Acessar Foto").length,
            // New panel totals
            totalDigitalPanels,
            totalStaticPanels,
        };

        // Group by Work Area
        const workAreaMap = new Map<string, number>();
        equipment.forEach(e => {
            const area = e["Área de Trabalho"];
            if (area && area.trim()) {
                workAreaMap.set(area, (workAreaMap.get(area) || 0) + 1);
            }
        });
        const byWorkArea: ChartData[] = Array.from(workAreaMap.entries())
            .map(([name, value], i) => ({
                name,
                value,
                percentage: percentage(value, total),
                fill: CHART_COLORS[i % CHART_COLORS.length],
            }))
            .sort((a, b) => b.value - a.value);

        // Group by Neighborhood (Top 15)
        const neighborhoodMap = new Map<string, number>();
        equipment.forEach(e => {
            const bairro = e["Bairro"];
            if (bairro && bairro.trim()) {
                neighborhoodMap.set(bairro, (neighborhoodMap.get(bairro) || 0) + 1);
            }
        });
        const byNeighborhood: ChartData[] = getTopN(
            Array.from(neighborhoodMap.entries()).map(([name, value], i) => ({
                name,
                value,
                count: value,
                percentage: percentage(value, total),
                fill: CHART_COLORS[i % CHART_COLORS.length],
            })),
            15
        );

        // Group by Shelter Model
        const shelterModelMap = new Map<string, number>();
        equipment.forEach(e => {
            const model = getShelterModel(e);
            if (model) {
                shelterModelMap.set(model, (shelterModelMap.get(model) || 0) + 1);
            }
        });
        const byShelterModel: ChartData[] = Array.from(shelterModelMap.entries())
            .map(([name, value], i) => ({
                name: name || 'Não especificado',
                value,
                percentage: percentage(value, total),
                fill: CHART_COLORS[i % CHART_COLORS.length],
            }))
            .sort((a, b) => b.value - a.value);

        // Group by Branch (Filial)
        const branchMap = new Map<string, number>();
        equipment.forEach(e => {
            const filial = e["Filial"];
            if (filial && filial.trim()) {
                branchMap.set(filial, (branchMap.get(filial) || 0) + 1);
            }
        });
        const byBranch: ChartData[] = Array.from(branchMap.entries())
            .map(([name, value], i) => ({
                name,
                value,
                percentage: percentage(value, total),
                fill: CHART_COLORS[i % CHART_COLORS.length],
            }))
            .sort((a, b) => b.value - a.value);

        // Feature distribution
        const featureDistribution: ChartData[] = [
            { name: 'Wi-Fi', value: stats.withWifi, fill: '#6342ff' }, // Purple
            { name: 'Câmera', value: stats.withCamera, fill: '#31b11c' }, // Green
            { name: 'Painel Digital', value: stats.withDigitalPanel, fill: DIGITAL_PANEL_COLOR },
            { name: 'Painel Estático', value: stats.withStaticPanel, fill: STATIC_PANEL_COLOR },
            { name: 'Luminária', value: stats.withLighting, fill: '#ff8231' }, // Secondary Orange
            { name: 'Energizado', value: stats.energized, fill: '#dc3545' }, // Error/Red
        ].map(item => ({
            ...item,
            percentage: percentage(item.value, total),
        }));

        // Panel Distribution (Digital vs Static) - for donut chart
        const panelDistribution: ChartData[] = [
            { 
                name: 'Digital', 
                value: totalDigitalPanels, 
                fill: DIGITAL_PANEL_COLOR,
                percentage: percentage(totalDigitalPanels, totalDigitalPanels + totalStaticPanels),
            },
            { 
                name: 'Estático', 
                value: totalStaticPanels, 
                fill: STATIC_PANEL_COLOR,
                percentage: percentage(totalStaticPanels, totalDigitalPanels + totalStaticPanels),
            },
        ];

        // Panels by Shelter Model - for stacked bar chart
        const shelterPanelMap = new Map<string, { digital: number; static: number }>();
        equipment.forEach(e => {
            const model = getShelterModel(e);
            if (model) {
                const current = shelterPanelMap.get(model) || { digital: 0, static: 0 };
                current.digital += getDigitalPanelCount(e);
                current.static += getStaticPanelCount(e);
                shelterPanelMap.set(model, current);
            }
        });
        const panelsByShelterModel: StackedChartData[] = Array.from(shelterPanelMap.entries())
            .map(([name, counts]) => ({
                name,
                digital: counts.digital,
                static: counts.static,
                total: counts.digital + counts.static,
            }))
            .filter(item => item.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);

        // Panels by Work Area - for stacked bar chart
        const areaPanelMap = new Map<string, { digital: number; static: number }>();
        equipment.forEach(e => {
            const area = e["Área de Trabalho"];
            if (area && area.trim()) {
                const current = areaPanelMap.get(area) || { digital: 0, static: 0 };
                current.digital += getDigitalPanelCount(e);
                current.static += getStaticPanelCount(e);
                areaPanelMap.set(area, current);
            }
        });
        const panelsByWorkArea: StackedChartData[] = Array.from(areaPanelMap.entries())
            .map(([name, counts]) => ({
                name,
                digital: counts.digital,
                static: counts.static,
                total: counts.digital + counts.static,
            }))
            .sort((a, b) => b.total - a.total);

        // Brand distribution - using merged panel data
        const brandMap = new Map<string, number>();
        equipment.forEach(e => {
            const brand = getDigitalPanelBrand(e);
            if (brand) {
                // Normalize brand names (e.g., "BOE/DD" -> "BOE")
                const normalizedBrand = brand.split('/')[0].trim().toUpperCase();
                brandMap.set(normalizedBrand, (brandMap.get(normalizedBrand) || 0) + 1);
            }
        });
        const byDigitalBrand: BrandChartData[] = Array.from(brandMap.entries())
            .map(([name, value], i) => ({
                name,
                value,
                percentage: percentage(value, digitalPanelEquipment.length),
                fill: CHART_COLORS[i % CHART_COLORS.length],
            }))
            .sort((a, b) => b.value - a.value);

        return {
            stats,
            byWorkArea,
            byNeighborhood,
            byShelterModel,
            byBranch,
            featureDistribution,
            panelDistribution,
            panelsByShelterModel,
            panelsByWorkArea,
            byDigitalBrand,
        };
    }, [equipment]);
}

export default useDashboardStats;
