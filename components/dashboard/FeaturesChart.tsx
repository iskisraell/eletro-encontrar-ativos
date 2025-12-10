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
import { formatNumber, percentage } from '../../lib/utils';
import { Zap } from 'lucide-react';
import { ActiveFilterChips } from '../ui/ActiveFilterChip';
import { useIsDark } from '../../hooks/useDarkMode';

interface FeaturesChartProps {
    data: ChartData[];
    total: number;
    delay?: number;
    activeFeatures?: string[];
    onFeatureClick?: (featureName: string) => void;
}

// Feature name to filter key mapping
const FEATURE_FILTER_MAP: Record<string, string> = {
    'Wi-Fi': 'hasWifi',
    'Câmera': 'hasCamera',
    'Painel Digital': 'hasDigitalPanel',
    'Painel Estático': 'hasStaticPanel',
    'Luminária': 'hasLighting',
    'Energizado': 'hasEnergized',
};

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 p-3">
                <p className="font-medium text-gray-900 dark:text-gray-100">{data.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-semibold" style={{ color: data.fill }}>{formatNumber(data.value)}</span> equipamentos
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

export const FeaturesChart: React.FC<FeaturesChartProps> = ({
    data,
    total,
    delay = 0,
    activeFeatures = [],
    onFeatureClick
}) => {
    const isDark = useIsDark();
    const hasActiveFilter = activeFeatures.length > 0;
    const axisColor = isDark ? '#9CA3AF' : '#374151'; // gray-400 : gray-700
    const tickColor = isDark ? '#D1D5DB' : '#4B5563'; // gray-300 : gray-600

    const handleBarClick = (entry: any) => {
        if (onFeatureClick && entry?.name) {
            onFeatureClick(entry.name);
        }
    };

    const handleBadgeClick = (featureName: string) => {
        if (onFeatureClick) {
            onFeatureClick(featureName);
        }
    };

    const handleRemoveFilter = (featureName: string) => {
        if (onFeatureClick) {
            onFeatureClick(featureName);
        }
    };

    return (
        <ChartCard
            title="Recursos Disponíveis"
            subtitle="Equipamentos por funcionalidade"
            icon={<Zap className="w-4 h-4" />}
            delay={delay}
            headerExtra={
                hasActiveFilter && (
                    <ActiveFilterChips
                        values={activeFeatures}
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
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#f0f0f0'} vertical={false} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: axisColor, fontSize: 11 }}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis
                            tickFormatter={(value) => formatNumber(value)}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: axisColor, fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }} />
                        <Bar
                            dataKey="value"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={50}
                            onClick={handleBarClick}
                            style={{ cursor: onFeatureClick ? 'pointer' : 'default' }}
                        >
                            {data.map((entry, index) => {
                                const isActive = activeFeatures.includes(entry.name);
                                const shouldDim = hasActiveFilter && !isActive;

                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.fill || '#FF6700'}
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

            {/* Summary badges - Clickable */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {data.map((feature, index) => {
                    const isActive = activeFeatures.includes(feature.name);
                    const shouldDim = hasActiveFilter && !isActive;

                    return (
                        <motion.div
                            key={index}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${onFeatureClick ? 'cursor-pointer' : ''
                                } ${isActive ? 'ring-2 ring-offset-1' : ''}`}
                            style={{
                                backgroundColor: `${feature.fill}15`,
                                color: feature.fill,
                                opacity: shouldDim ? 0.4 : 1,
                                // ringColor is not a valid style prop, handled by class if needed
                            }}
                            onClick={() => handleBadgeClick(feature.name)}
                            whileHover={onFeatureClick ? { scale: 1.05 } : {}}
                            whileTap={onFeatureClick ? { scale: 0.95 } : {}}
                        >
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: feature.fill }}
                            />
                            {feature.name}: {feature.percentage}%
                        </motion.div>
                    );
                })}
            </div>
        </ChartCard>
    );
};

export default FeaturesChart;
