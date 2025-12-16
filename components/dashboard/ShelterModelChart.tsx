import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { ChartCard } from './ChartCard';
import { ChartData } from '../../hooks/useDashboardStats';
import { formatNumber } from '../../lib/utils';
import { Building } from 'lucide-react';
import { ActiveFilterChips } from '../ui/ActiveFilterChip';
import { useIsDark } from '../../hooks/useDarkMode';

interface ShelterModelChartProps {
    data: ChartData[];
    delay?: number;
    selectedValues?: string[];
    onFilterChange?: (value: string) => void;
}

// Color palette for pie slices
const COLORS = ['#ff4f00', '#1A1A1A', '#6B7280', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 p-3">
                <p className="font-medium text-gray-900 dark:text-gray-100">{data.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-eletro-orange">{formatNumber(data.value)}</span> equipamentos
                </p>
                {data.percentage !== undefined && (
                    <p className="text-xs text-gray-400">{data.percentage}% do total</p>
                )}
                <p className="text-xs text-eletro-orange mt-1">Clique para filtrar</p>
            </div>
        );
    }
    return null;
};

interface CustomLegendProps {
    payload?: any[];
    selectedValues: string[];
    hasActiveFilter: boolean;
    onItemClick: (value: string) => void;
    isClickable: boolean;
}

// Custom legend - Clickable
const CustomLegend: React.FC<CustomLegendProps> = ({
    payload,
    selectedValues,
    hasActiveFilter,
    onItemClick,
    isClickable
}) => {
    if (!payload) return null;

    return (
        <div className="flex flex-wrap justify-center gap-3 mt-4">
            {payload.slice(0, 6).map((entry: any, index: number) => {
                const isSelected = selectedValues.includes(entry.value);
                const shouldDim = hasActiveFilter && !isSelected;

                return (
                    <motion.div
                        key={`legend-${index}`}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${isClickable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''
                            } ${isSelected ? 'bg-eletro-orange/10 ring-1 ring-eletro-orange/30' : ''}`}
                        onClick={() => isClickable && onItemClick(entry.value)}
                        whileHover={isClickable ? { scale: 1.05 } : {}}
                        whileTap={isClickable ? { scale: 0.95 } : {}}
                        style={{ opacity: shouldDim ? 0.4 : 1 }}
                    >
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-300 max-w-[100px] truncate" title={entry.value}>
                            {entry.value}
                        </span>
                    </motion.div>
                );
            })}
            {payload.length > 6 && (
                <span className="text-xs text-gray-400">+{payload.length - 6} mais</span>
            )}
        </div>
    );
};

export const ShelterModelChart: React.FC<ShelterModelChartProps> = ({
    data,
    delay = 0,
    selectedValues = [],
    onFilterChange
}) => {
    const isDark = useIsDark();
    // Filter out items with very small values for better visualization
    const significantData = data.filter(item => item.value > 0).slice(0, 8);
    const hasActiveFilter = selectedValues.length > 0;

    const handlePieClick = (_: any, index: number) => {
        if (onFilterChange && significantData[index]?.name) {
            onFilterChange(significantData[index].name);
        }
    };

    const handleLegendClick = (value: string) => {
        if (onFilterChange) {
            onFilterChange(value);
        }
    };

    const handleRemoveFilter = (value: string) => {
        if (onFilterChange) {
            onFilterChange(value);
        }
    };

    return (
        <ChartCard
            title="Modelos de Abrigo"
            subtitle="Distribuição por tipo de abrigo"
            icon={<Building className="w-4 h-4" />}
            delay={delay}
            headerExtra={
                hasActiveFilter && (
                    <ActiveFilterChips
                        values={selectedValues}
                        onRemove={handleRemoveFilter}
                        color="#ff4f00"
                    />
                )
            }
        >
            <div className="h-64">
                {significantData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={significantData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                onClick={handlePieClick}
                                style={{ cursor: onFilterChange ? 'pointer' : 'default' }}
                            >
                                {significantData.map((entry, index) => {
                                    const isSelected = selectedValues.includes(entry.name);
                                    const shouldDim = hasActiveFilter && !isSelected;

                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            stroke={isDark ? '#1f2937' : 'white'}
                                            strokeWidth={isSelected ? 3 : 2}
                                            opacity={shouldDim ? 0.3 : 1}
                                            style={{
                                                transition: 'opacity 0.3s ease-in-out',
                                                filter: isSelected ? 'drop-shadow(0 0 4px rgba(255, 103, 0, 0.5))' : 'none',
                                            }}
                                        />
                                    );
                                })}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                content={
                                    <CustomLegend
                                        selectedValues={selectedValues}
                                        hasActiveFilter={hasActiveFilter}
                                        onItemClick={handleLegendClick}
                                        isClickable={!!onFilterChange}
                                    />
                                }
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        Sem dados disponíveis
                    </div>
                )}
            </div>
        </ChartCard>
    );
};

export default ShelterModelChart;
