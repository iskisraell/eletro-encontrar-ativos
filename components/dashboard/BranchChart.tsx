import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';
import { ChartCard } from './ChartCard';
import { ChartData } from '../../hooks/useDashboardStats';
import { formatNumber } from '../../lib/utils';
import { GitBranch } from 'lucide-react';
import { ActiveFilterChips } from '../ui/ActiveFilterChip';
import { useIsDark } from '../../hooks/useDarkMode';

interface BranchChartProps {
    data: ChartData[];
    delay?: number;
    selectedValues?: string[];
    onFilterChange?: (value: string) => void;
}

// Color palette for branches
const COLORS = ['#ff4f00', '#1A1A1A', '#6B7280', '#3B82F6', '#10B981'];

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 p-3">
                <p className="font-medium text-gray-900 dark:text-gray-100">Filial {data.name}</p>
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

export const BranchChart: React.FC<BranchChartProps> = ({
    data,
    delay = 0,
    selectedValues = [],
    onFilterChange
}) => {
    const isDark = useIsDark();
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const hasActiveFilter = selectedValues.length > 0;

    const handlePieClick = (_: any, index: number) => {
        if (onFilterChange && data[index]?.name) {
            onFilterChange(data[index].name);
        }
    };

    const handleLegendClick = (name: string) => {
        if (onFilterChange) {
            onFilterChange(name);
        }
    };

    const handleRemoveFilter = (value: string) => {
        if (onFilterChange) {
            onFilterChange(value);
        }
    };

    return (
        <ChartCard
            title="Distribuição por Filial"
            subtitle="Equipamentos por região"
            icon={<GitBranch className="w-4 h-4" />}
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
            <div className="flex items-center gap-6">
                {/* Pie Chart */}
                <div className="h-48 w-48 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={70}
                                paddingAngle={3}
                                dataKey="value"
                                onClick={handlePieClick}
                                style={{ cursor: onFilterChange ? 'pointer' : 'default' }}
                            >
                                {data.map((entry, index) => {
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
                                                transition: 'opacity 0.3s ease-in-out, stroke-width 0.2s ease',
                                                filter: isSelected ? 'drop-shadow(0 0 4px rgba(255, 79, 0, 0.5))' : 'none',
                                            }}
                                        />
                                    );
                                })}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend List - Clickable */}
                <div className="flex-1 space-y-3">
                    {data.map((item, index) => {
                        const isSelected = selectedValues.includes(item.name);
                        const shouldDim = hasActiveFilter && !isSelected;

                        return (
                            <motion.div
                                key={item.name}
                                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${onFilterChange ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
                                    } ${isSelected ? 'bg-eletro-orange/10 ring-1 ring-eletro-orange/30' : ''}`}
                                onClick={() => handleLegendClick(item.name)}
                                whileHover={onFilterChange ? { scale: 1.02 } : {}}
                                whileTap={onFilterChange ? { scale: 0.98 } : {}}
                                style={{ opacity: shouldDim ? 0.4 : 1 }}
                            >
                                <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {item.name}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0">
                                            {formatNumber(item.value)}
                                        </span>
                                    </div>
                                    <div className="mt-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${item.percentage}%`,
                                                backgroundColor: COLORS[index % COLORS.length],
                                            }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </ChartCard>
    );
};

export default BranchChart;
