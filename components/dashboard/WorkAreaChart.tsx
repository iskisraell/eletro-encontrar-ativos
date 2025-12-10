import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { ChartCard } from './ChartCard';
import { ChartData } from '../../hooks/useDashboardStats';
import { formatNumber } from '../../lib/utils';
import { MapPin } from 'lucide-react';
import { ActiveFilterChips } from '../ui/ActiveFilterChip';
import { useIsDark } from '../../hooks/useDarkMode';

interface WorkAreaChartProps {
    data: ChartData[];
    delay?: number;
    selectedValues?: string[];
    onFilterChange?: (value: string) => void;
}

// Color palette for bars
const COLORS = ['#FF6700', '#1A1A1A', '#6B7280', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

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
                    <p className="text-xs text-gray-400">
                        {data.percentage}% do total
                    </p>
                )}
                <p className="text-xs text-eletro-orange mt-1">Clique para filtrar</p>
            </div>
        );
    }
    return null;
};

export const WorkAreaChart: React.FC<WorkAreaChartProps> = ({
    data,
    delay = 0,
    selectedValues = [],
    onFilterChange
}) => {
    const isDark = useIsDark();
    const hasActiveFilter = selectedValues.length > 0;
    const axisColor = isDark ? '#9CA3AF' : '#374151'; // gray-400 : gray-700

    const handleBarClick = (data: any) => {
        if (onFilterChange && data?.name) {
            onFilterChange(data.name);
        }
    };

    const handleRemoveFilter = (value: string) => {
        if (onFilterChange) {
            onFilterChange(value);
        }
    };

    return (
        <ChartCard
            title="Distribuição por Área de Trabalho"
            subtitle="Equipamentos por zona"
            icon={<MapPin className="w-4 h-4" />}
            delay={delay}
            headerExtra={
                hasActiveFilter && (
                    <ActiveFilterChips
                        values={selectedValues}
                        onRemove={handleRemoveFilter}
                        color="#FF6700"
                    />
                )
            }
        >
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                        <XAxis
                            type="number"
                            tickFormatter={(value) => formatNumber(value)}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: axisColor, fontSize: 12 }}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={120}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: axisColor, fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 103, 0, 0.1)' }} />
                        <Bar
                            dataKey="value"
                            radius={[0, 4, 4, 0]}
                            maxBarSize={24}
                            onClick={handleBarClick}
                            style={{ cursor: onFilterChange ? 'pointer' : 'default' }}
                        >
                            {data.map((entry, index) => {
                                const isSelected = selectedValues.includes(entry.name);
                                const shouldDim = hasActiveFilter && !isSelected;

                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                        opacity={shouldDim ? 0.3 : 1}
                                        style={{
                                            transition: 'opacity 0.3s ease-in-out',
                                        }}
                                    />
                                );
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </ChartCard>
    );
};

export default WorkAreaChart;
