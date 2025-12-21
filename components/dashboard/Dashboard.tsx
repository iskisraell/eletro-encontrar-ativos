import React from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Wifi,
    Camera,
    Monitor,
    AlertTriangle,
    Lightbulb,
    Zap,
    CheckCircle,
    Image,
    PanelTop
} from 'lucide-react';
import { Equipment, MergedEquipment } from '../../types';
import { useDashboardStats, DIGITAL_PANEL_COLOR, STATIC_PANEL_COLOR } from '../../hooks/useDashboardStats';
import { staggerContainer, fadeInUp } from '../../lib/animations';
import { StatsCard } from './StatsCard';
import { WorkAreaChart } from './WorkAreaChart';
import { NeighborhoodChart } from './NeighborhoodChart';
import { ShelterModelChart } from './ShelterModelChart';
import { FeaturesChart } from './FeaturesChart';
import { BranchChart } from './BranchChart';
import { PanelDistributionChart } from './PanelDistributionChart';
import { PanelsByShelterChart } from './PanelsByShelterChart';
import { PanelsByAreaChart } from './PanelsByAreaChart';
import { SkeletonStatsCard, SkeletonChart } from '../ui/Skeleton';

interface DashboardProps {
    equipment: (Equipment | MergedEquipment)[];
    isLoading?: boolean;
    // Filter state from parent
    filters?: {
        workArea: string[];
        neighborhood: string[];
        shelterModel: string[];
        riskArea: string[];
        panelType: string[];
    };
    // Handler to update filters when chart element is clicked
    onChartFilterChange?: (filterKey: string, value: string) => void;
    onPanelFilterChange?: (value: string) => void;
    // Hidden feature filters - only from FeaturesChart
    featureFilters?: string[];
    onFeatureFilterChange?: (featureName: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
    equipment,
    isLoading = false,
    filters,
    onChartFilterChange,
    onPanelFilterChange,
    featureFilters = [],
    onFeatureFilterChange
}) => {
    const { 
        stats, 
        byWorkArea, 
        byNeighborhood, 
        byShelterModel, 
        byBranch, 
        featureDistribution,
        panelDistribution,
        panelsByShelterModel,
        panelsByWorkArea
    } = useDashboardStats(equipment);

    if (isLoading) {
        return (
            <div className="space-y-6">
                {/* Loading Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <SkeletonStatsCard key={i} />
                    ))}
                </div>
                {/* Loading Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SkeletonChart />
                    <SkeletonChart />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="space-y-6"
            initial={false}
            animate="animate"
        >
            {/* Header */}
            <motion.div variants={fadeInUp} className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-eletro-orange/10 flex items-center justify-center">
                    <LayoutDashboard className="w-5 h-5 text-eletro-orange" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Estatísticas e insights dos equipamentos
                        {onChartFilterChange && (
                            <span className="ml-2 text-eletro-orange">• Clique nos gráficos para filtrar</span>
                        )}
                    </p>
                </div>
            </motion.div>

            {/* Stats Grid - Bento Style */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Total - Large card */}
                <div className="col-span-2 sm:col-span-1">
                    <StatsCard
                        title="Total"
                        value={stats.total}
                        subtitle="equipamentos cadastrados"
                        icon={<LayoutDashboard className="w-6 h-6" />}
                        variant="accent"
                        delay={0}
                    />
                </div>

                {/* Active */}
                <StatsCard
                    title="Ativos"
                    value={stats.active}
                    subtitle="em operação"
                    icon={<CheckCircle className="w-6 h-6" />}
                    variant="dark"
                    delay={1}
                />

                {/* With Wi-Fi */}
                <StatsCard
                    title="Wi-Fi"
                    value={stats.withWifi}
                    subtitle="disponíveis"
                    icon={<Wifi className="w-6 h-6" />}
                    delay={2}
                />

                {/* With Camera */}
                <StatsCard
                    title="Câmeras"
                    value={stats.withCamera}
                    subtitle="instaladas"
                    icon={<Camera className="w-6 h-6" />}
                    delay={3}
                />

                {/* Digital Panels */}
                <StatsCard
                    title="Painéis Digitais"
                    value={stats.withDigitalPanel}
                    subtitle="em exibição"
                    icon={<Monitor className="w-6 h-6" />}
                    delay={4}
                />

                {/* Lighting */}
                <StatsCard
                    title="Iluminação"
                    value={stats.withLighting}
                    subtitle="com luminária"
                    icon={<Lightbulb className="w-6 h-6" />}
                    delay={5}
                />

                {/* Energized */}
                <StatsCard
                    title="Energizados"
                    value={stats.energized}
                    subtitle="conectados"
                    icon={<Zap className="w-6 h-6" />}
                    delay={6}
                />

                {/* Risk Areas */}
                <StatsCard
                    title="Área de Risco"
                    value={stats.inRiskArea}
                    subtitle="atenção especial"
                    icon={<AlertTriangle className="w-6 h-6" />}
                    variant="default"
                    delay={7}
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Work Area Distribution */}
                <WorkAreaChart
                    data={byWorkArea}
                    delay={8}
                    selectedValues={filters?.workArea || []}
                    onFilterChange={onChartFilterChange ? (value) => onChartFilterChange('workArea', value) : undefined}
                />

                {/* Branch Distribution */}
                <BranchChart
                    data={byBranch}
                    delay={9}
                    selectedValues={[]} // Branch filter not in current filter schema
                    onFilterChange={undefined} // Could be added to filters if needed
                />
            </div>

            {/* Second Row of Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Neighborhood Chart */}
                <NeighborhoodChart
                    data={byNeighborhood}
                    delay={10}
                    selectedValues={filters?.neighborhood || []}
                    onFilterChange={onChartFilterChange ? (value) => onChartFilterChange('neighborhood', value) : undefined}
                />

                {/* Shelter Model Chart */}
                <ShelterModelChart
                    data={byShelterModel}
                    delay={11}
                    selectedValues={filters?.shelterModel || []}
                    onFilterChange={onChartFilterChange ? (value) => onChartFilterChange('shelterModel', value) : undefined}
                />
            </div>

            {/* Features Chart - Full Width */}
            <div className="grid grid-cols-1">
                <FeaturesChart
                    data={featureDistribution}
                    total={stats.total}
                    delay={12}
                    activeFeatures={featureFilters}
                    onFeatureClick={onFeatureFilterChange}
                />
            </div>

            {/* MUBIS Panel Analysis Section */}
            <motion.div variants={fadeInUp} className="mt-8">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-eletro-orange/20 to-pink-500/20 flex items-center justify-center">
                        <PanelTop className="w-5 h-5 text-eletro-orange" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Análise de Painéis</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Distribuição de painéis digitais e estáticos
                        </p>
                    </div>
                </div>

                {/* Panel Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Panel Distribution (Donut) */}
                    <PanelDistributionChart
                        data={panelDistribution}
                        totalEquipmentWithDigital={stats.totalDigitalPanels}
                        totalEquipmentWithStatic={stats.totalStaticPanels}
                        delay={13}
                        selectedValues={filters?.panelType?.map(t =>
                            t === 'digital' ? 'Digital' : t === 'static' ? 'Estático' : 'Sem Painéis'
                        ) || []}
                        onFilterChange={onPanelFilterChange ? (value) => {
                             // The chart returns "Digital" or "Estático" (matching data names), 
                             // but App expects "Painel Digital" or "Painel Estático"
                             if (value === 'Digital') onPanelFilterChange('Painel Digital');
                             else if (value === 'Estático') onPanelFilterChange('Painel Estático');
                             else onPanelFilterChange(value);
                        } : undefined}
                    />

                    {/* Panels by Shelter Model (Stacked Bar) */}
                    <PanelsByShelterChart
                        data={panelsByShelterModel}
                        delay={14}
                        selectedValues={filters?.shelterModel || []}
                        onFilterChange={onChartFilterChange ? (value) => onChartFilterChange('shelterModel', value) : undefined}
                    />
                </div>

                {/* Panel Charts Row 2 - Full Width */}
                <div className="grid grid-cols-1">
                    <PanelsByAreaChart
                        data={panelsByWorkArea}
                        delay={15}
                        selectedValues={filters?.workArea || []}
                        onFilterChange={onChartFilterChange ? (value) => onChartFilterChange('workArea', value) : undefined}
                    />
                </div>
            </motion.div>

            {/* Insights Section */}
            <motion.div
                variants={fadeInUp}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                {/* Insight Card 1 */}
                <motion.div
                    className="bg-gradient-to-br from-eletro-orange to-orange-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-lg transition-shadow"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onChartFilterChange && byWorkArea[0]?.name && onChartFilterChange('workArea', byWorkArea[0].name)}
                >
                    <h3 className="text-lg font-semibold mb-2">Área mais populosa</h3>
                    <p className="text-3xl font-bold mb-1">
                        {byWorkArea[0]?.name || 'N/A'}
                    </p>
                    <p className="text-white/70 text-sm">
                        {byWorkArea[0]?.value || 0} equipamentos ({byWorkArea[0]?.percentage || 0}%)
                    </p>
                    {onChartFilterChange && (
                        <p className="text-white/50 text-xs mt-2">Clique para filtrar</p>
                    )}
                </motion.div>

                {/* Insight Card 2 */}
                <motion.div
                    className="bg-eletro-black rounded-xl p-6 text-white cursor-pointer hover:shadow-lg transition-shadow"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onChartFilterChange && byNeighborhood[0]?.name && onChartFilterChange('neighborhood', byNeighborhood[0].name)}
                >
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">Bairro líder</h3>
                    <p className="text-3xl font-bold mb-1">
                        {byNeighborhood[0]?.name || 'N/A'}
                    </p>
                    <p className="text-gray-400 text-sm">
                        {byNeighborhood[0]?.value || 0} equipamentos
                    </p>
                    {onChartFilterChange && (
                        <p className="text-gray-500 text-xs mt-2">Clique para filtrar</p>
                    )}
                </motion.div>

                {/* Insight Card 3 */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-2">Conectividade</h3>
                    <p className="text-3xl font-bold text-eletro-orange mb-1">
                        {Math.round((stats.withWifi / stats.total) * 100) || 0}%
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                        dos equipamentos têm Wi-Fi
                    </p>
                </div>
            </motion.div>

        </motion.div>
    );
};

export default Dashboard;
