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
import { Monitor } from 'lucide-react';
import { ActiveFilterChips } from '../ui/ActiveFilterChip';
import { useIsDark } from '../../hooks/useDarkMode';

interface PanelDistributionChartProps {
    data: ChartData[];
    totalEquipmentWithDigital: number;
    totalEquipmentWithStatic: number;
    delay?: number;
    selectedValues?: string[];
    onFilterChange?: (value: string) => void;
}

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 p-3">
                <p className="font-medium text-gray-900 dark:text-gray-100">{data.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-semibold" style={{ color: data.fill }}>{formatNumber(data.value)}</span> painéis
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

const PanelDistributionChartComponent: React.FC<PanelDistributionChartProps> = ({
    data,
    totalEquipmentWithDigital,
    totalEquipmentWithStatic,
    delay = 0,
    selectedValues = [],
    onFilterChange
}) => {
    const isDark = useIsDark();
    const hasActiveFilter = selectedValues.length > 0;
    const totalPanels = data.reduce((sum, d) => sum + d.value, 0);

    const handlePieClick = (_: any, index: number) => {
        if (onFilterChange && data[index]?.name) {
            // Map chart name to filter value
            const filterValue = data[index].name === 'Digital' ? 'Painel Digital' : 'Painel Estático';
            onFilterChange(filterValue);
        }
    };

    const handleRemoveFilter = (value: string) => {
        if (onFilterChange) {
            onFilterChange(value);
        }
    };

    // Map selected filter values to chart segment names for highlighting
    const selectedSegments = selectedValues.map(v => 
        v === 'Painel Digital' ? 'Digital' : v === 'Painel Estático' ? 'Estático' : v
    );

    return (
        <ChartCard
            title="Distribuição de Painéis"
            subtitle="Digital vs Estático"
            icon={<Monitor className="w-4 h-4" />}
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
            <div className="h-64 relative">
                {totalPanels > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="value"
                                onClick={handlePieClick}
                                style={{ cursor: onFilterChange ? 'pointer' : 'default' }}
                            >
                                {data.map((entry, index) => {
                                    const isSelected = selectedSegments.includes(entry.name);
                                    const shouldDim = hasActiveFilter && !isSelected;

                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.fill}
                                            stroke={isDark ? '#1f2937' : 'white'}
                                            strokeWidth={isSelected ? 3 : 2}
                                            opacity={shouldDim ? 0.3 : 1}
                                            style={{
                                                transition: 'opacity 0.3s ease-in-out',
                                                filter: isSelected ? 'drop-shadow(0 0 6px rgba(255, 79, 0, 0.5))' : 'none',
                                            }}
                                        />
                                    );
                                })}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            {/* Center text */}
                            <text
                                x="50%"
                                y="45%"
                                textAnchor="middle"
                                dominantBaseline="central"
                                className="fill-gray-900 dark:fill-gray-100"
                                fontSize="24"
                                fontWeight="bold"
                            >
                                {formatNumber(totalPanels)}
                            </text>
                            <text
                                x="50%"
                                y="55%"
                                textAnchor="middle"
                                dominantBaseline="central"
                                className="fill-gray-500 dark:fill-gray-400"
                                fontSize="11"
                            >
                                painéis
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        Sem dados de painéis disponíveis
                    </div>
                )}
            </div>

            {/* Legend with equipment counts */}
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {data.map((item, index) => {
                    const isSelected = selectedSegments.includes(item.name);
                    const shouldDim = hasActiveFilter && !isSelected;
                    const equipmentCount = item.name === 'Digital' ? totalEquipmentWithDigital : totalEquipmentWithStatic;

                    return (
                        <motion.div
                            key={index}
                            className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                                onFilterChange ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
                            } ${isSelected ? 'bg-gray-50 dark:bg-gray-700 ring-1 ring-eletro-orange/30' : ''}`}
                            onClick={() => onFilterChange && handlePieClick(null, index)}
                            whileHover={onFilterChange ? { scale: 1.05 } : {}}
                            whileTap={onFilterChange ? { scale: 0.95 } : {}}
                            style={{ opacity: shouldDim ? 0.4 : 1 }}
                        >
                            <div
                                className="w-4 h-4 rounded-full mb-2"
                                style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {item.name}
                            </span>
                            <span className="text-lg font-bold" style={{ color: item.fill }}>
                                {formatNumber(item.value)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatNumber(equipmentCount)} equip.
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        </ChartCard>
    );
};

// Memoized chart component to prevent unnecessary re-renders
export const PanelDistributionChart = React.memo(PanelDistributionChartComponent);

export default PanelDistributionChart;
