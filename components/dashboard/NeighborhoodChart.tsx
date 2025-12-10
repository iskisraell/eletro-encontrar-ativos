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
import { ChartCard } from './ChartCard';
import { ChartData } from '../../hooks/useDashboardStats';
import { formatNumber } from '../../lib/utils';
import { Home } from 'lucide-react';
import { ActiveFilterChips } from '../ui/ActiveFilterChip';

interface NeighborhoodChartProps {
    data: ChartData[];
    delay?: number;
    selectedValues?: string[];
    onFilterChange?: (value: string) => void;
}

// Gradient colors
const COLORS = ['#FF6700', '#FF7E1F', '#FF953D', '#FFAC5A', '#FFC378', '#1A1A1A', '#333333', '#4D4D4D', '#666666', '#808080', '#999999', '#B3B3B3', '#CCCCCC', '#E6E6E6', '#F0F0F0'];

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

export const NeighborhoodChart: React.FC<NeighborhoodChartProps> = ({
    data,
    delay = 0,
    selectedValues = [],
    onFilterChange
}) => {
    // Take top 10 neighborhoods
    const topData = data.slice(0, 10);
    const hasActiveFilter = selectedValues.length > 0;

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
            title="Top 10 Bairros"
            subtitle="Bairros com mais equipamentos"
            icon={<Home className="w-4 h-4" />}
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
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={topData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                        <XAxis
                            type="number"
                            tickFormatter={(value) => formatNumber(value)}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={100}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#374151', fontSize: 11 }}
                            tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 103, 0, 0.1)' }} />
                        <Bar
                            dataKey="value"
                            radius={[0, 4, 4, 0]}
                            maxBarSize={20}
                            onClick={handleBarClick}
                            style={{ cursor: onFilterChange ? 'pointer' : 'default' }}
                        >
                            {topData.map((entry, index) => {
                                const isSelected = selectedValues.includes(entry.name);
                                const shouldDim = hasActiveFilter && !isSelected;
                                const baseColor = index === 0 ? '#FF6700' : index < 3 ? '#1A1A1A' : '#6B7280';

                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={baseColor}
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

export default NeighborhoodChart;
