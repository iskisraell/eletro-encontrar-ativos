import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { StackedChartData, DIGITAL_PANEL_COLOR, STATIC_PANEL_COLOR } from '../../hooks/useDashboardStats';
import { formatNumber } from '../../lib/utils';
import { Building } from 'lucide-react';
import { ActiveFilterChips } from '../ui/ActiveFilterChip';
import { useIsDark } from '../../hooks/useDarkMode';

interface PanelsByShelterChartProps {
    data: StackedChartData[];
    delay?: number;
    selectedValues?: string[];
    onFilterChange?: (value: string) => void;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const digital = payload.find((p: any) => p.dataKey === 'digital')?.value || 0;
        const staticVal = payload.find((p: any) => p.dataKey === 'static')?.value || 0;
        const total = digital + staticVal;
        
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 p-3">
                <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{label}</p>
                <div className="space-y-1">
                    <p className="text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: DIGITAL_PANEL_COLOR }} />
                        <span className="text-gray-600 dark:text-gray-300">Digital:</span>
                        <span className="font-semibold" style={{ color: DIGITAL_PANEL_COLOR }}>{formatNumber(digital)}</span>
                    </p>
                    <p className="text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STATIC_PANEL_COLOR }} />
                        <span className="text-gray-600 dark:text-gray-300">Estático:</span>
                        <span className="font-semibold" style={{ color: STATIC_PANEL_COLOR }}>{formatNumber(staticVal)}</span>
                    </p>
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Total: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatNumber(total)}</span> painéis
                        </p>
                    </div>
                </div>
                <p className="text-xs text-eletro-orange mt-2">Clique para filtrar</p>
            </div>
        );
    }
    return null;
};

// Custom legend
const CustomLegend = () => (
    <div className="flex justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: DIGITAL_PANEL_COLOR }} />
            <span className="text-xs text-gray-600 dark:text-gray-300">Digital</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATIC_PANEL_COLOR }} />
            <span className="text-xs text-gray-600 dark:text-gray-300">Estático</span>
        </div>
    </div>
);

export const PanelsByShelterChart: React.FC<PanelsByShelterChartProps> = ({
    data,
    delay = 0,
    selectedValues = [],
    onFilterChange
}) => {
    const isDark = useIsDark();
    const hasActiveFilter = selectedValues.length > 0;
    const axisColor = isDark ? '#9CA3AF' : '#374151';

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
            title="Painéis por Modelo"
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
            <div className="h-72">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} horizontal={true} vertical={false} />
                            <XAxis
                                type="number"
                                tickFormatter={(value) => formatNumber(value)}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: axisColor, fontSize: 11 }}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={110}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: axisColor, fontSize: 10 }}
                                tickFormatter={(value) => value.length > 14 ? value.slice(0, 14) + '...' : value}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255, 79, 0, 0.1)' : 'rgba(255, 79, 0, 0.1)' }} />
                            <Legend content={<CustomLegend />} />
                            <Bar
                                dataKey="digital"
                                stackId="panels"
                                fill={DIGITAL_PANEL_COLOR}
                                radius={[0, 0, 0, 0]}
                                onClick={handleBarClick}
                                style={{ cursor: onFilterChange ? 'pointer' : 'default' }}
                                opacity={hasActiveFilter ? 0.6 : 1}
                            />
                            <Bar
                                dataKey="static"
                                stackId="panels"
                                fill={STATIC_PANEL_COLOR}
                                radius={[0, 4, 4, 0]}
                                onClick={handleBarClick}
                                style={{ cursor: onFilterChange ? 'pointer' : 'default' }}
                                opacity={hasActiveFilter ? 0.6 : 1}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        Sem dados de painéis por modelo
                    </div>
                )}
            </div>
        </ChartCard>
    );
};

export default PanelsByShelterChart;
