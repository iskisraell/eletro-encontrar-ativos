import { useMemo } from 'react';
import { Equipment } from '../types';
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
}

// Color palette for charts
const CHART_COLORS = [
    '#ff4f00', // Eletro orange
    '#1A1A1A', // Black
    '#6B7280', // Gray
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#EC4899', // Pink
];

// Panel colors
export const DIGITAL_PANEL_COLOR = '#ff4f00'; // Eletro orange
export const STATIC_PANEL_COLOR = '#ff74ff'; // Pink for static

/**
 * Helper to check if equipment has digital panels
 * Uses new summary fields when available, falls back to legacy
 * Only Abrigos (shelters) can have panels - TOTEMs cannot
 */
const hasDigitalPanel = (e: Equipment): boolean => {
    // Only Abrigos (shelters) can have panels
    if (!isAbrigo(e)) return false;
    
    // New API fields (summary layer)
    if (typeof e.hasDigital === 'boolean') return e.hasDigital;
    if (typeof e.digitalPanels === 'number') return e.digitalPanels > 0;
    // Legacy fallback
    return isActiveValue(e["Painel Digital"]) || hasValue(e["Painel Digital"]);
};

/**
 * Helper to check if equipment has static panels
 * Uses new summary fields when available, falls back to legacy
 * Only Abrigos (shelters) can have panels - TOTEMs cannot
 */
const hasStaticPanel = (e: Equipment): boolean => {
    // Only Abrigos (shelters) can have panels
    if (!isAbrigo(e)) return false;
    
    // New API fields (summary layer)
    if (typeof e.hasStatic === 'boolean') return e.hasStatic;
    if (typeof e.staticPanels === 'number') return e.staticPanels > 0;
    // Legacy fallback
    return isActiveValue(e["Painel Estático - Tipo"]) || hasValue(e["Painel Estático - Tipo"]);
};

/**
 * Get digital panel count for equipment
 * Only Abrigos (shelters) can have panels - TOTEMs return 0
 */
const getDigitalPanelCount = (e: Equipment): number => {
    // Only Abrigos (shelters) can have panels
    if (!isAbrigo(e)) return 0;
    
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
 * Only Abrigos (shelters) can have panels - TOTEMs return 0
 */
const getStaticPanelCount = (e: Equipment): number => {
    // Only Abrigos (shelters) can have panels
    if (!isAbrigo(e)) return 0;
    
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
 * Get shelter model for equipment
 * Prefers main layer "Modelo de Abrigo", with panels layer "shelterModel" as complement
 */
const getShelterModel = (e: Equipment): string | null => {
    const mainModel = e["Modelo de Abrigo"];
    if (mainModel && mainModel !== '-' && mainModel.trim()) {
        return mainModel;
    }
    // Fallback to panels layer shelterModel if main is empty
    if (e.shelterModel && e.shelterModel.trim()) {
        return e.shelterModel;
    }
    return null;
};

/**
 * Hook to calculate dashboard statistics and chart data from equipment array
 */
export function useDashboardStats(equipment: Equipment[]): DashboardData {
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
            { name: 'Wi-Fi', value: stats.withWifi, fill: '#3B82F6' },
            { name: 'Câmera', value: stats.withCamera, fill: '#10B981' },
            { name: 'Painel Digital', value: stats.withDigitalPanel, fill: DIGITAL_PANEL_COLOR },
            { name: 'Painel Estático', value: stats.withStaticPanel, fill: STATIC_PANEL_COLOR },
            { name: 'Luminária', value: stats.withLighting, fill: '#F59E0B' },
            { name: 'Energizado', value: stats.energized, fill: '#EF4444' },
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
        };
    }, [equipment]);
}

export default useDashboardStats;
