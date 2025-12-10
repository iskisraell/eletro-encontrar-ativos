import { useMemo } from 'react';
import { Equipment } from '../types';
import { hasValue, isActiveValue } from '../schemas/equipment';
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
}

export interface ChartData {
    name: string;
    value: number;
    percentage?: number;
    fill?: string;
    [key: string]: string | number | undefined;
}

export interface DashboardData {
    stats: DashboardStats;
    byWorkArea: ChartData[];
    byNeighborhood: ChartData[];
    byShelterModel: ChartData[];
    byBranch: ChartData[];
    featureDistribution: ChartData[];
}

// Color palette for charts
const CHART_COLORS = [
    '#FF6700', // Eletro orange
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

/**
 * Hook to calculate dashboard statistics and chart data from equipment array
 */
export function useDashboardStats(equipment: Equipment[]): DashboardData {
    return useMemo(() => {
        const total = equipment.length;

        // Calculate stats
        const stats: DashboardStats = {
            total,
            active: equipment.filter(e => e["Status"] === "Ativo").length,
            withWifi: equipment.filter(e => isActiveValue(e["Wi-Fi"]) || hasValue(e["Wi-Fi"])).length,
            withCamera: equipment.filter(e => isActiveValue(e["Câmera"]) || hasValue(e["Câmera"])).length,
            withDigitalPanel: equipment.filter(e => isActiveValue(e["Painel Digital"]) || hasValue(e["Painel Digital"])).length,
            withStaticPanel: equipment.filter(e => isActiveValue(e["Painel Estático - Tipo"]) || hasValue(e["Painel Estático - Tipo"])).length,
            inRiskArea: equipment.filter(e => hasValue(e["Área de Risco"]) && e["Área de Risco"] !== "-").length,
            withLighting: equipment.filter(e => isActiveValue(e["Luminária"]) || hasValue(e["Luminária"])).length,
            energized: equipment.filter(e => isActiveValue(e["Energizado"]) || hasValue(e["Energizado"])).length,
            withPhoto: equipment.filter(e => e["Foto Referência"] && e["Foto Referência"].length > 0 && e["Foto Referência"] !== "Acessar Foto").length,
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
            const model = e["Modelo de Abrigo"];
            if (model && model.trim() && model !== "-") {
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
            { name: 'Painel Digital', value: stats.withDigitalPanel, fill: '#FF6700' },
            { name: 'Painel Estático', value: stats.withStaticPanel, fill: '#8B5CF6' },
            { name: 'Luminária', value: stats.withLighting, fill: '#F59E0B' },
            { name: 'Energizado', value: stats.energized, fill: '#EF4444' },
        ].map(item => ({
            ...item,
            percentage: percentage(item.value, total),
        }));

        return {
            stats,
            byWorkArea,
            byNeighborhood,
            byShelterModel,
            byBranch,
            featureDistribution,
        };
    }, [equipment]);
}

export default useDashboardStats;
